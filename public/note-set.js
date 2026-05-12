/**
 * Client-side app for flashcard viewer
 */

let noteSetId = null;
let flashcardSet = null;
let progress = null;
let sections = null;
let currentCardId = null;
let showingAnswer = false;
let dueOnlyMode = false;
let askAiMessages = [];
let askAiLoading = false;

const sessionState = {
  reviewedCardIds: new Set(),
  attempts: 0,
  correct: 0,
};

const DUE_ONLY_STORAGE_KEY = 'jackflash:due-only:';
const ASK_AI_STORAGE_KEY = 'jackflash:ask-ai:';

/**
 * Get note set ID from URL query parameter
 */
function getNoteSetIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Load flashcards and progress from API
 */
async function loadFlashcards() {
  try {
    noteSetId = getNoteSetIdFromUrl();
    if (!noteSetId) {
      displayError('No note set ID provided');
      return;
    }

    if (localStorage.getItem(`${DUE_ONLY_STORAGE_KEY}${noteSetId}`) !== null) {
      dueOnlyMode = localStorage.getItem(`${DUE_ONLY_STORAGE_KEY}${noteSetId}`) === 'true';
    }

    loadAskAiSession();
    renderAskAiMessages();

    // Load flashcards
    const fcResponse = await fetch(`/api/flashcards/${noteSetId}`);
    if (!fcResponse.ok) {
      throw new Error('Failed to load flashcards');
    }
    flashcardSet = await fcResponse.json();

    // Load sections
    const secResponse = await fetch(`/api/sections/${noteSetId}`);
    if (secResponse.ok) {
      const secData = await secResponse.json();
      sections = secData.sections || [];
    } else {
      sections = [];
    }

    // Load progress
    const progResponse = await fetch(`/api/progress/${noteSetId}`);
    if (!progResponse.ok) {
      throw new Error('Failed to load progress');
    }
    const progData = await progResponse.json();
    progress = progData.progress || {};

    if (flashcardSet.count === 0) {
      displayError('No flashcards found in this note set.');
      return;
    }

    // Update page
    document.getElementById('note-title').textContent = flashcardSet.title;

    // Preserve current card when possible after reprioritization
    const activeCards = getActiveCards();
    if (!currentCardId || !activeCards.some((c) => c.id === currentCardId)) {
      currentCardId = pickNextCardId(activeCards);
    }

    renderCard();
    renderNotes();
  } catch (error) {
    console.error('Error loading flashcards:', error);
    displayError('Failed to load flashcards. Please try again.');
  }
}

/**
 * Shuffle flashcards array
 */
function shuffleFlashcards() {
  const array = flashcardSet.flashcards;

  const dueCards = array.filter((c) => (c.daysUntilDue || 1) <= 0);
  const futureCards = array.filter((c) => (c.daysUntilDue || 1) > 0);

  // Shuffle each group independently
  for (let i = dueCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dueCards[i], dueCards[j]] = [dueCards[j], dueCards[i]];
  }
  for (let i = futureCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [futureCards[i], futureCards[j]] = [futureCards[j], futureCards[i]];
  }

  flashcardSet.flashcards = [...dueCards, ...futureCards];
}

function getActiveCards() {
  if (!flashcardSet) return [];
  if (!dueOnlyMode) return flashcardSet.flashcards;
  return flashcardSet.flashcards.filter((c) => (c.daysUntilDue ?? 1) <= 0);
}

function pickNextCardId(cards) {
  if (cards.length === 0) return null;
  const firstUnreviewed = cards.find((c) => !sessionState.reviewedCardIds.has(c.id));
  return (firstUnreviewed || cards[0]).id;
}

function getSessionWeakest(cards) {
  const attemptedCards = cards
    .map((card) => ({ card, p: progress[card.id] }))
    .filter((x) => x.p && x.p.attempts > 0)
    .sort((a, b) => a.p.performanceScore - b.p.performanceScore)
    .slice(0, 3)
    .map((x) => ({
      question: x.card.question,
      section: x.card.section,
      score: Math.round(x.p.performanceScore * 100),
    }));

  const bySection = new Map();
  cards.forEach((card) => {
    const p = progress[card.id];
    if (!p || p.attempts === 0) return;
    const current = bySection.get(card.section) || { total: 0, count: 0 };
    current.total += p.performanceScore;
    current.count += 1;
    bySection.set(card.section, current);
  });

  const weakestSections = [...bySection.entries()]
    .map(([section, val]) => ({
      section,
      score: Math.round((val.total / val.count) * 100),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return { attemptedCards, weakestSections };
}

function renderSessionSummary(activeCards) {
  const mainContent = document.getElementById('flashcard-container');
  const accuracy = sessionState.attempts
    ? Math.round((sessionState.correct / sessionState.attempts) * 100)
    : 0;
  const dueTomorrow = flashcardSet.flashcards.filter((c) => (c.daysUntilDue ?? 99) === 1).length;
  const { attemptedCards, weakestSections } = getSessionWeakest(flashcardSet.flashcards);

  mainContent.innerHTML = `
    <div class="session-summary">
      <h3>Session Complete</h3>
      <div class="summary-grid">
        <div class="stat-item"><div class="stat-label">Accuracy</div><div class="stat-value">${accuracy}%</div></div>
        <div class="stat-item"><div class="stat-label">Answered</div><div class="stat-value">${sessionState.attempts}</div></div>
        <div class="stat-item"><div class="stat-label">Due Tomorrow</div><div class="stat-value">${dueTomorrow}</div></div>
      </div>
      <div class="summary-list">
        <h4>Weakest Cards</h4>
        ${attemptedCards.length ? `<ul>${attemptedCards.map((c) => `<li>${c.score}% - ${c.question}</li>`).join('')}</ul>` : '<p>No attempted cards yet.</p>'}
      </div>
      <div class="summary-list">
        <h4>Weakest Topics</h4>
        ${weakestSections.length ? `<ul>${weakestSections.map((s) => `<li>${s.score}% - ${s.section}</li>`).join('')}</ul>` : '<p>No topic data yet.</p>'}
      </div>
      <div class="flashcard-controls">
        <button class="btn btn-secondary" id="btn-restart-session">Restart Session</button>
        <button class="btn btn-primary" id="btn-refresh-priority">Refresh Priorities</button>
      </div>
    </div>
  `;

  document.getElementById('btn-restart-session').addEventListener('click', () => {
    sessionState.reviewedCardIds.clear();
    sessionState.attempts = 0;
    sessionState.correct = 0;
    showingAnswer = false;
    currentCardId = pickNextCardId(getActiveCards());
    renderCard();
  });

  document.getElementById('btn-refresh-priority').addEventListener('click', async () => {
    sessionState.reviewedCardIds.clear();
    sessionState.attempts = 0;
    sessionState.correct = 0;
    showingAnswer = false;
    currentCardId = null;
    await loadFlashcards();
  });
}

/**
 * Render the current flashcard
 */
function renderCard() {
  const mainContent = document.getElementById('flashcard-container');
  const activeCards = getActiveCards();

  if (activeCards.length === 0) {
    mainContent.innerHTML = `
      <div class="empty-state">
        <p>No cards are due right now.</p>
        <p>Turn off "Due Only" to browse the full deck.</p>
      </div>
    `;
    return;
  }

  if (!currentCardId || !activeCards.some((c) => c.id === currentCardId)) {
    currentCardId = pickNextCardId(activeCards);
  }

  const currentCardIndex = activeCards.findIndex((c) => c.id === currentCardId);
  const card = activeCards[currentCardIndex];

  if (!card) {
    mainContent.innerHTML = '<p>All cards reviewed!</p>';
    return;
  }

  const completedCount = activeCards.filter((c) => sessionState.reviewedCardIds.has(c.id)).length;
  if (completedCount === activeCards.length && activeCards.length > 0) {
    renderSessionSummary(activeCards);
    return;
  }

  const cardProgress = progress[card.id] || {
    attempts: 0,
    correct: 0,
    performanceScore: 0,
  };

  const progressPercent = (completedCount / activeCards.length) * 100;

  const dueTodayCount = flashcardSet.flashcards.filter((c) => (c.daysUntilDue ?? 1) <= 0).length;
  const overdueCount = flashcardSet.flashcards.filter((c) => (c.daysUntilDue ?? 1) < 0).length;
  const upcomingCount = flashcardSet.flashcards.length - dueTodayCount;

  // Format due date info
  let dueInfo = '';
  if (card.daysUntilDue !== undefined) {
    if (card.daysUntilDue < 0) {
      dueInfo = `⚠️ Overdue (${Math.abs(card.daysUntilDue)} day${Math.abs(card.daysUntilDue) !== 1 ? 's' : ''} ago)`;
    } else if (card.daysUntilDue === 0) {
      dueInfo = '🔴 Review today';
    } else if (card.daysUntilDue <= 3) {
      dueInfo = `📅 Due in ${card.daysUntilDue} day${card.daysUntilDue !== 1 ? 's' : ''}`;
    }
  }

  let html = `
    <div class="flashcard-progress">
      <div class="deck-toolbar">
        <button class="btn btn-secondary btn-small ${dueOnlyMode ? 'due-toggle-active' : ''}" id="btn-toggle-due-only">
          ${dueOnlyMode ? 'Due Only: On' : 'Due Only: Off'}
        </button>
        <span class="deck-pill">Due/Overdue: ${dueTodayCount}</span>
        <span class="deck-pill">Overdue: ${overdueCount}</span>
        <span class="deck-pill">Upcoming: ${upcomingCount}</span>
      </div>
      <div class="progress-text">
        <span>Card ${currentCardIndex + 1} of ${activeCards.length}</span>
        <span id="card-score">${(cardProgress.performanceScore * 100).toFixed(0)}% score</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>
      ${dueInfo ? `<div style="font-size: 0.85rem; color: ${card.daysUntilDue < 0 ? '#e74c3c' : '#f39c12'}; margin-top: 5px;">${dueInfo}</div>` : ''}
    </div>

    <div class="flashcard-wrapper">
      <div class="flashcard ${showingAnswer ? 'revealed' : ''}" id="flashcard">
        <div class="flashcard-side">
          <div class="flashcard-label">${showingAnswer ? 'Answer' : 'Question'}</div>
          <div class="flashcard-content">
            ${showingAnswer ? card.answer : card.question}
          </div>
          <div class="flashcard-section">from: ${card.section}</div>
          <div class="flashcard-hint">${showingAnswer ? '' : 'Click to reveal answer'}</div>
        </div>
      </div>

      <div class="flashcard-controls">
        <button class="btn btn-secondary btn-small" id="btn-shuffle">
          🔀 Shuffle
        </button>
        <button class="btn btn-secondary btn-small" id="btn-ask-ai-from-card">
          💬 Ask AI About This Card
        </button>
        ${
          showingAnswer
            ? `
          <button class="btn btn-danger" id="btn-again">
            Again
          </button>
          <button class="btn btn-warning" id="btn-hard">
            Hard
          </button>
          <button class="btn btn-success" id="btn-good">
            Good
          </button>
          <button class="btn btn-primary" id="btn-easy">
            Easy
          </button>
        `
            : `
          <button class="btn btn-primary" id="btn-show-answer">
            Show Answer
          </button>
        `
        }
      </div>

      <div class="flashcard-nav">
        <button ${currentCardIndex === 0 ? 'disabled' : ''} id="btn-prev">
          ← Previous
        </button>
        <button ${currentCardIndex === activeCards.length - 1 ? 'disabled' : ''} id="btn-next">
          Next →
        </button>
      </div>

      <div class="flashcard-stats">
        <div class="stat-item">
          <div class="stat-label">Attempts</div>
          <div class="stat-value">${cardProgress.attempts}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Correct</div>
          <div class="stat-value">${cardProgress.correct}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Total Cards</div>
          <div class="stat-value">${activeCards.length}</div>
        </div>
      </div>
    </div>
  `;

  mainContent.innerHTML = html;

  // Attach event listeners
  document.getElementById('flashcard').addEventListener('click', toggleShowAnswer);

  if (showingAnswer) {
    document.getElementById('btn-again').addEventListener('click', () => recordGrade('again'));
    document.getElementById('btn-hard').addEventListener('click', () => recordGrade('hard'));
    document.getElementById('btn-good').addEventListener('click', () => recordGrade('good'));
    document.getElementById('btn-easy').addEventListener('click', () => recordGrade('easy'));
  } else {
    document.getElementById('btn-show-answer').addEventListener('click', revealAnswer);
  }

  document.getElementById('btn-ask-ai-from-card').addEventListener('click', askAiFromCurrentCard);
  document.getElementById('btn-toggle-due-only').addEventListener('click', toggleDueOnlyMode);
  document.getElementById('btn-shuffle').addEventListener('click', shuffleAndReset);
  document.getElementById('btn-prev').addEventListener('click', goToPrevious);
  document.getElementById('btn-next').addEventListener('click', goToNext);
}

/**
 * Toggle showing the answer
 */
function toggleShowAnswer(e) {
  if (e && e.target.id && e.target.id.startsWith('btn-')) return; // Ignore button clicks
  showingAnswer = !showingAnswer;
  renderCard();
}

function revealAnswer() {
  if (!showingAnswer) {
    showingAnswer = true;
    renderCard();
  }
}

function getGradePayload(grade) {
  if (grade === 'again') return { correct: false, confidence: 1 };
  if (grade === 'hard') return { correct: true, confidence: 2 };
  if (grade === 'easy') return { correct: true, confidence: 4 };
  return { correct: true, confidence: 3 }; // good
}

async function recordGrade(grade) {
  try {
    const activeCards = getActiveCards();
    const card = activeCards.find((c) => c.id === currentCardId);
    if (!card) return;

    const payload = getGradePayload(grade);

    const response = await fetch(`/api/progress/${noteSetId}/${card.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to record attempt');
    }

    const data = await response.json();
    progress[card.id] = data.cardProgress;

    sessionState.reviewedCardIds.add(card.id);
    sessionState.attempts += 1;
    if (payload.correct) {
      sessionState.correct += 1;
    }

    showingAnswer = false;

    // Live re-prioritization after each answer
    await loadFlashcards();

    const updatedActiveCards = getActiveCards();
    currentCardId = pickNextCardId(updatedActiveCards);
    renderCard();
  } catch (error) {
    console.error('Error recording grade:', error);
    alert('Failed to save progress.');
  }
}

/**
 * Navigate to next card
 */
function goToNext() {
  const activeCards = getActiveCards();
  const currentCardIndex = activeCards.findIndex((c) => c.id === currentCardId);
  if (currentCardIndex < activeCards.length - 1) {
    currentCardId = activeCards[currentCardIndex + 1].id;
  }
  showingAnswer = false;
  renderCard();
}

/**
 * Navigate to previous card
 */
function goToPrevious() {
  const activeCards = getActiveCards();
  const currentCardIndex = activeCards.findIndex((c) => c.id === currentCardId);
  if (currentCardIndex > 0) {
    currentCardId = activeCards[currentCardIndex - 1].id;
  }
  showingAnswer = false;
  renderCard();
}

/**
 * Shuffle and reset to first card
 */
function shuffleAndReset() {
  shuffleFlashcards();
  sessionState.reviewedCardIds.clear();
  sessionState.attempts = 0;
  sessionState.correct = 0;
  currentCardId = pickNextCardId(getActiveCards());
  showingAnswer = false;
  renderCard();
}

function toggleDueOnlyMode() {
  dueOnlyMode = !dueOnlyMode;
  localStorage.setItem(`${DUE_ONLY_STORAGE_KEY}${noteSetId}`, String(dueOnlyMode));
  currentCardId = pickNextCardId(getActiveCards());
  showingAnswer = false;
  renderCard();
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab || activeTab.getAttribute('data-tab') !== 'flashcards') return;

    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if ((e.key === ' ' || e.key === 'Enter') && !showingAnswer) {
      e.preventDefault();
      revealAnswer();
      return;
    }

    if (e.key === '1' && showingAnswer) {
      e.preventDefault();
      recordGrade('again');
      return;
    }

    if (e.key === '2' && showingAnswer) {
      e.preventDefault();
      recordGrade('good');
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrevious();
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
    }
  });
}

/**
 * Render section notes summaries in the Notes tab
 */
function renderNotes() {
  const container = document.getElementById('notes-container');
  if (!container) return;

  if (!sections || sections.length === 0) {
    container.innerHTML = '<p class="notes-empty">No section notes found.</p>';
    return;
  }

  const html = sections
    .map((sec) => {
      // Convert bullet lines to <li> and other lines to <p>
      const bodyHtml = sec.summary
        .split('\n')
        .filter((l) => l.trim() !== '')
        .map((line) => {
          const t = line.trim();
          if (t.startsWith('- ') || t.startsWith('• ')) {
            return `<li>${t.replace(/^[-•]\s+/, '')}</li>`;
          }
          return `<p>${t}</p>`;
        })
        .join('')
        // Wrap consecutive <li> elements in <ul>
        .replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);

      return `
        <div class="notes-section">
          <h3 class="notes-section-title">${sec.title}</h3>
          <div class="notes-section-body">${bodyHtml}</div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = html;
}

/**
 * Display an error message
 */
function displayError(message) {
  const mainContent = document.getElementById('flashcard-container');
  mainContent.innerHTML = `<div class="error">${message}</div>`;
}

function activateTab(tabName) {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach((b) => b.classList.remove('active'));
  tabContents.forEach((tc) => tc.classList.remove('active'));

  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  const activeContent = document.getElementById(`tab-content-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activeContent) activeContent.classList.add('active');
}

/**
 * Setup tab switching
 */
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      activateTab(tabName);
    });
  });

  // Setup home button
  document.getElementById('breadcrumb-home').addEventListener('click', () => {
    window.location.href = '/';
  });
}

function getAskAiStorageKey() {
  return `${ASK_AI_STORAGE_KEY}${noteSetId || 'unknown'}`;
}

function loadAskAiSession() {
  try {
    const raw = sessionStorage.getItem(getAskAiStorageKey());
    if (!raw) {
      askAiMessages = [];
      return;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      askAiMessages = parsed.filter(
        (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string'
      );
    } else {
      askAiMessages = [];
    }
  } catch (error) {
    console.error('Failed to load Ask AI session:', error);
    askAiMessages = [];
  }
}

function saveAskAiSession() {
  try {
    sessionStorage.setItem(getAskAiStorageKey(), JSON.stringify(askAiMessages));
  } catch (error) {
    console.error('Failed to save Ask AI session:', error);
  }
}

function renderAskAiMessages() {
  const container = document.getElementById('ask-ai-messages');
  if (!container) return;

  container.innerHTML = '';

  if (askAiMessages.length === 0 && !askAiLoading) {
    const empty = document.createElement('div');
    empty.className = 'ask-ai-empty';
    empty.textContent = 'Ask a question to begin.';
    container.appendChild(empty);
    return;
  }

  askAiMessages.forEach((msg) => {
    const bubble = document.createElement('div');
    bubble.className = `ask-ai-message ${msg.role === 'user' ? 'ask-ai-user' : 'ask-ai-assistant'}`;

    const role = document.createElement('div');
    role.className = 'ask-ai-role';
    role.textContent = msg.role === 'user' ? 'You' : 'Tutor';

    const text = document.createElement('div');
    text.className = 'ask-ai-text';
    text.textContent = msg.text;

    bubble.appendChild(role);
    bubble.appendChild(text);
    container.appendChild(bubble);
  });

  if (askAiLoading) {
    const loading = document.createElement('div');
    loading.className = 'ask-ai-message ask-ai-assistant ask-ai-loading';
    loading.textContent = 'Thinking...';
    container.appendChild(loading);
  }

  container.scrollTop = container.scrollHeight;
}

async function askAiQuestion(question) {
  const response = await fetch(`/api/ask-ai/${noteSetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get AI response');
  }

  return data.answer;
}

async function submitAskAiQuestion(question) {
  const input = document.getElementById('ask-ai-input');
  const sendBtn = document.getElementById('ask-ai-send');

  if (!question || askAiLoading || !sendBtn) return;

  askAiMessages.push({ role: 'user', text: question });
  saveAskAiSession();

  if (input) {
    input.value = '';
  }

  askAiLoading = true;
  sendBtn.disabled = true;
  renderAskAiMessages();

  try {
    const answer = await askAiQuestion(question);
    askAiMessages.push({ role: 'assistant', text: answer });
  } catch (error) {
    askAiMessages.push({
      role: 'assistant',
      text: error instanceof Error ? error.message : 'Something went wrong while contacting AI.',
    });
  } finally {
    askAiLoading = false;
    sendBtn.disabled = false;
    saveAskAiSession();
    renderAskAiMessages();
    if (input) {
      input.focus();
    }
  }
}

async function askAiFromCurrentCard() {
  const activeCards = getActiveCards();
  const card = activeCards.find((c) => c.id === currentCardId);
  if (!card) return;

  activateTab('ask-ai');
  await submitAskAiQuestion(card.question);
}

function setupAskAi() {
  const form = document.getElementById('ask-ai-form');
  const input = document.getElementById('ask-ai-input');
  const sendBtn = document.getElementById('ask-ai-send');

  if (!form || !input || !sendBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const question = input.value.trim();
    await submitAskAiQuestion(question);
  });
}

/**
 * Initialize the page on load
 */
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupAskAi();
  setupKeyboardShortcuts();
  loadFlashcards();
});
