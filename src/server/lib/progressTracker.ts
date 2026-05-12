import { readJsonFile, writeJsonFile, getAbsPath, ensureDir } from './fileUtils.js';

export interface FlashcardProgress {
  attempts: number;
  correct: number;
  incorrect: number;
  lastReviewed?: string;
  performanceScore: number; // 0-1: correct/attempts

  // Spaced repetition fields (SM-2 simplified)
  dueDate?: string; // ISO 8601, when to show next
  interval?: number; // days until next review
  easyFactor?: number; // difficulty multiplier (1.3-2.5+)
  correctInARow?: number; // consecutive correct answers
}

export interface ProgressData {
  [flashcardId: string]: FlashcardProgress;
}

export interface NoteSetProgress {
  [noteSetId: string]: ProgressData;
}

export interface CardWithPriority {
  cardId: string;
  progress: FlashcardProgress;
  priority: number; // 0-100: higher = show sooner
  daysUntilDue: number; // negative = overdue
}

/**
 * Load progress for a specific note set
 */
export function loadNoteSetProgress(noteSetId: string): ProgressData {
  const progressDir = getAbsPath('data/progress');
  ensureDir(progressDir);

  const filePath = `${progressDir}/${noteSetId}.json`;
  const data = readJsonFile<ProgressData>(filePath);

  return data || {};
}

/**
 * Save progress for a specific note set
 */
export function saveNoteSetProgress(
  noteSetId: string,
  progress: ProgressData
): void {
  const progressDir = getAbsPath('data/progress');
  ensureDir(progressDir);

  const filePath = `${progressDir}/${noteSetId}.json`;
  writeJsonFile(filePath, progress);
}

/**
 * Get today's date at midnight (for comparisons)
 */
function getTodayDate(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

/**
 * Calculate days between two ISO dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

/**
 * Calculate next due date using SM-2 simplified algorithm
 */
function calculateNextReview(
  correct: boolean,
  easyFactor: number = 2.5,
  interval: number = 1,
  correctInARow: number = 0,
  confidence: number = 3
): { dueDate: string; interval: number; easyFactor: number; correctInARow: number } {
  let newEasyFactor = easyFactor;
  let newInterval = interval;
  let newCorrectInARow = correctInARow;

  if (correct) {
    // Confidence maps to four grades:
    // 2 = Hard, 3 = Good, 4 = Easy
    const efDelta = confidence === 2 ? -0.05 : confidence === 4 ? 0.15 : 0.1;
    newEasyFactor = Math.max(1.3, newEasyFactor + efDelta);
    newCorrectInARow = (correctInARow || 0) + 1;

    // Increase interval based on consecutive correct answers
    if (newCorrectInARow === 1) {
      newInterval = confidence === 4 ? 2 : 1;
    } else if (newCorrectInARow === 2) {
      newInterval = confidence === 2 ? 2 : confidence === 4 ? 4 : 3;
    } else {
      const multiplier = confidence === 2 ? 1.2 : confidence === 4 ? 1.4 : 1.0;
      newInterval = Math.max(1, Math.round(interval * newEasyFactor * multiplier));
    }
  } else {
    // Reset on incorrect answer
    newEasyFactor = Math.max(1.3, newEasyFactor - 0.2);
    newInterval = 1;
    newCorrectInARow = 0;
  }

  // Calculate due date
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + newInterval);
  dueDate.setHours(0, 0, 0, 0);

  return {
    dueDate: dueDate.toISOString(),
    interval: newInterval,
    easyFactor: newEasyFactor,
    correctInARow: newCorrectInARow,
  };
}

/**
 * Record a single attempt on a flashcard
 */
export function recordAttempt(
  noteSetId: string,
  flashcardId: string,
  correct: boolean,
  confidence: number = correct ? 3 : 1
): FlashcardProgress {
  const progress = loadNoteSetProgress(noteSetId);

  // Initialize if not present
  if (!progress[flashcardId]) {
    progress[flashcardId] = {
      attempts: 0,
      correct: 0,
      incorrect: 0,
      performanceScore: 0,
      interval: 1,
      easyFactor: 2.5,
      correctInARow: 0,
      dueDate: getTodayDate(),
    };
  }

  const card = progress[flashcardId];
  card.attempts += 1;

  if (correct) {
    card.correct += 1;
  } else {
    card.incorrect += 1;
  }

  card.lastReviewed = new Date().toISOString();
  card.performanceScore = card.attempts > 0 ? card.correct / card.attempts : 0;

  // Calculate next review timing (SM-2)
  const nextReview = calculateNextReview(
    correct,
    card.easyFactor || 2.5,
    card.interval || 1,
    card.correctInARow || 0,
    confidence
  );

  card.dueDate = nextReview.dueDate;
  card.interval = nextReview.interval;
  card.easyFactor = nextReview.easyFactor;
  card.correctInARow = nextReview.correctInARow;

  progress[flashcardId] = card;
  saveNoteSetProgress(noteSetId, progress);

  return card;
}

/**
 * Get cards sorted by review priority (due soonest, weakest first)
 */
export function getPrioritizedCards(
  noteSetId: string,
  cardIds: string[]
): CardWithPriority[] {
  const progress = loadNoteSetProgress(noteSetId);
  const today = getTodayDate();

  const prioritized: CardWithPriority[] = cardIds.map((cardId) => {
    const card = progress[cardId] || {
      attempts: 0,
      correct: 0,
      incorrect: 0,
      performanceScore: 0,
      interval: 1,
      easyFactor: 2.5,
      correctInARow: 0,
      dueDate: today,
    };

    const dueDate = card.dueDate || today;
    const daysUntilDue = daysBetween(today, dueDate);

    // Priority scoring:
    // - Overdue cards: 100 - (days overdue) → very high priority
    // - Due today: 90
    // - Due soon: 80 - days away
    // - Future: 10 + performanceScore * 30 (show weaker cards when due)
    let priority = 0;

    if (daysUntilDue < 0) {
      // Overdue: highest priority
      priority = 100 + Math.abs(daysUntilDue);
    } else if (daysUntilDue === 0) {
      // Due today
      priority = 90;
    } else if (daysUntilDue <= 7) {
      // Due soon
      priority = 80 - daysUntilDue;
    } else {
      // Future: weighted by weakness
      priority = 10 + (1 - card.performanceScore) * 30;
    }

    return {
      cardId,
      progress: card,
      priority,
      daysUntilDue,
    };
  });

  // Sort by priority (highest first), then by performance score (weakest first)
  prioritized.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.progress.performanceScore - b.progress.performanceScore;
  });

  return prioritized;
}

/**
 * Get performance summary for a note set
 */
export function getProgressSummary(noteSetId: string): {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  avgScore: number;
  dueToday: number;
  overdue: number;
} {
  const progress = loadNoteSetProgress(noteSetId);
  const cards = Object.values(progress);
  const today = getTodayDate();

  if (cards.length === 0) {
    return {
      total: 0,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      avgScore: 0,
      dueToday: 0,
      overdue: 0,
    };
  }

  const attempted = cards.filter((c) => c.attempts > 0).length;
  const correct = cards.reduce((sum, c) => sum + c.correct, 0);
  const incorrect = cards.reduce((sum, c) => sum + c.incorrect, 0);
  const avgScore =
    cards.length > 0
      ? cards.reduce((sum, c) => sum + c.performanceScore, 0) / cards.length
      : 0;

  const dueToday = cards.filter((c) => {
    const daysUntilDue = daysBetween(today, c.dueDate || today);
    return daysUntilDue <= 0;
  }).length;

  const overdue = cards.filter((c) => {
    const daysUntilDue = daysBetween(today, c.dueDate || today);
    return daysUntilDue < 0;
  }).length;

  return {
    total: cards.length,
    attempted,
    correct,
    incorrect,
    avgScore,
    dueToday,
    overdue,
  };
}
