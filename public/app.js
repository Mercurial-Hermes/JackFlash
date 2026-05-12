/**
 * Client-side app for JackFlash with hierarchical drill-down navigation
 */

let hierarchy = null;
let currentPath = []; // [year, term, subject] or subset

/**
 * Fetch the hierarchical structure from the API
 */
async function loadHierarchy() {
  try {
    const response = await fetch('/api/hierarchy');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    hierarchy = await response.json();
    renderCurrentLevel();
  } catch (error) {
    console.error('Error loading hierarchy:', error);
    displayError('Failed to load content. Please refresh the page.');
  }
}

/**
 * Get the current level items based on the path
 */
function getCurrentLevelItems() {
  if (!hierarchy) return null;

  // Level 0: Years
  if (currentPath.length === 0) {
    return hierarchy.years.map((year) => ({
      type: 'year',
      name: year.name,
      key: year.name,
      count: year.terms.reduce((sum, t) => sum + t.subjects.reduce((s2, subj) => s2 + subj.topics.length, 0), 0),
    }));
  }

  // Level 1: Terms (given a year)
  const year = hierarchy.years.find((y) => y.name === currentPath[0]);
  if (!year) return null;

  if (currentPath.length === 1) {
    return year.terms.map((term) => ({
      type: 'term',
      name: term.name,
      key: term.name,
      count: term.subjects.reduce((sum, subj) => sum + subj.topics.length, 0),
    }));
  }

  // Level 2: Subjects (given year and term)
  const term = year.terms.find((t) => t.name === currentPath[1]);
  if (!term) return null;

  if (currentPath.length === 2) {
    return term.subjects.map((subject) => ({
      type: 'subject',
      name: subject.name,
      key: subject.name,
      count: subject.topics.length,
    }));
  }

  // Level 3: Topics (given year, term, subject)
  const subject = term.subjects.find((s) => s.name === currentPath[2]);
  if (!subject) return null;

  if (currentPath.length === 3) {
    return subject.topics.map((topic) => ({
      type: 'topic',
      name: topic.name,
      key: topic.noteId,
      noteId: topic.noteId,
    }));
  }

  return null;
}

/**
 * Render the current level (drill down or list of items)
 */
function renderCurrentLevel() {
  const mainContent = document.getElementById('main-content');
  const breadcrumbs = document.getElementById('breadcrumbs');
  const breadcrumbPath = document.getElementById('breadcrumb-path');

  const items = getCurrentLevelItems();

  if (!items || items.length === 0) {
    mainContent.innerHTML = '<div class="empty-state">No items found.</div>';
    breadcrumbs.style.display = 'none';
    return;
  }

  // Update breadcrumbs
  if (currentPath.length > 0) {
    breadcrumbs.style.display = 'flex';
    breadcrumbPath.innerHTML = currentPath
      .map((part, i) => `<span class="breadcrumb-separator">/</span> <span class="breadcrumb-text">${part}</span>`)
      .join(' ');
  } else {
    breadcrumbs.style.display = 'none';
  }

  // Render grid of drill-down tiles
  if (currentPath.length < 3 && items[0].type !== 'topic') {
    // Drill-down view (Year, Term, Subject)
    const grid = document.createElement('div');
    grid.className = 'note-sets-grid';

    for (const item of items) {
      const tile = document.createElement('button');
      tile.className = 'note-set-tile drill-down-tile';
      tile.style.border = 'none';
      tile.style.cursor = 'pointer';
      tile.style.background = 'white';
      tile.style.textAlign = 'left';

      const textEl = document.createElement('div');
      textEl.className = 'drill-down-tile-text';
      textEl.textContent = item.name;

      const countEl = document.createElement('div');
      countEl.className = 'drill-down-tile-count';
      countEl.textContent = item.count > 0 ? `${item.count} item${item.count !== 1 ? 's' : ''}` : 'Empty';

      tile.appendChild(textEl);
      tile.appendChild(countEl);

      tile.addEventListener('click', () => {
        currentPath.push(item.key);
        renderCurrentLevel();
      });

      grid.appendChild(tile);
    }

    mainContent.innerHTML = '';
    mainContent.appendChild(grid);
  } else {
    // Topic view (final level - show as cards that link to note sets)
    const grid = document.createElement('div');
    grid.className = 'note-sets-grid';

    for (const item of items) {
      const tile = document.createElement('a');
      tile.className = 'note-set-tile';
      tile.href = `/note-set.html?id=${encodeURIComponent(item.noteId)}`;

      const yearEl = document.createElement('div');
      yearEl.className = 'note-set-tile-year';
      yearEl.textContent = currentPath[0] || 'General';

      const subjectEl = document.createElement('div');
      subjectEl.className = 'note-set-tile-subject';
      subjectEl.textContent = currentPath[2] || 'No subject';

      const topicEl = document.createElement('div');
      topicEl.className = 'note-set-tile-topic';
      topicEl.textContent = item.name;

      const termEl = document.createElement('div');
      termEl.className = 'note-set-tile-term';
      termEl.textContent = currentPath[1] || '';

      tile.appendChild(yearEl);
      tile.appendChild(subjectEl);
      tile.appendChild(topicEl);
      if (currentPath[1]) {
        tile.appendChild(termEl);
      }

      grid.appendChild(tile);
    }

    mainContent.innerHTML = '';
    mainContent.appendChild(grid);
  }
}

/**
 * Display an error message
 */
function displayError(message) {
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.innerHTML = `<div class="error">${message}</div>`;
  }
}

/**
 * Initialize the app on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  // Setup breadcrumb home button
  document.getElementById('breadcrumb-root').addEventListener('click', () => {
    currentPath = [];
    renderCurrentLevel();
  });

  loadHierarchy();
});

