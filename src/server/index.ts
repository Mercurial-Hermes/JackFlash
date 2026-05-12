import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAndSaveIndex, NotesIndex } from './lib/noteIndexer.js';
import { buildHierarchy } from './lib/hierarchyBuilder.js';
import { readFile } from './lib/fileUtils.js';
import { generateFlashcardSet } from './lib/flashcardGenerator.js';
import { askGroundedQuestion, AiConfigError } from './lib/aiClient.js';
import {
  loadNoteSetProgress,
  recordAttempt,
  getProgressSummary,
  getPrioritizedCards,
} from './lib/progressTracker.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());

// Build notes index on startup
console.log('📚 Building notes index...');
const notesIndex = generateAndSaveIndex();
console.log(`✓ Found ${notesIndex.noteSets.length} note sets`);

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

/**
 * Get all note sets (for landing page)
 */
app.get('/api/note-sets', (req, res) => {
  res.json({
    data: notesIndex.noteSets,
    count: notesIndex.noteSets.length,
    lastIndexed: notesIndex.lastIndexed,
  });
});

/**
 * Get hierarchical view of notes (Year → Term → Subject → Topic)
 */
app.get('/api/hierarchy', (req, res) => {
  const hierarchy = buildHierarchy(notesIndex.noteSets);
  res.json(hierarchy);
});

/**
 * Get flashcards for a specific note set
 * Returns cards ordered by spaced repetition priority
 */
app.get('/api/flashcards/:noteSetId', (req, res) => {
  try {
    const { noteSetId } = req.params;

    // Find the note metadata
    const noteMetadata = notesIndex.noteSets.find((n) => n.id === noteSetId);
    if (!noteMetadata) {
      return res.status(404).json({ error: 'Note set not found' });
    }

    // Read the note file
    const content = readFile(noteMetadata.path);

    // Generate flashcard set
    const flashcardSet = generateFlashcardSet(noteMetadata, content);

    // Get prioritized card order based on spaced repetition
    const cardIds = flashcardSet.flashcards.map((fc) => fc.id);
    const prioritized = getPrioritizedCards(noteSetId, cardIds);

    // Reorder flashcards by priority
    const flashcardsById = new Map(flashcardSet.flashcards.map((fc) => [fc.id, fc]));
    const orderedFlashcards = prioritized.map((p) => {
      const flashcard = flashcardsById.get(p.cardId);
      return {
        ...flashcard,
        daysUntilDue: p.daysUntilDue,
        priority: p.priority,
        interval: p.progress.interval,
        easyFactor: p.progress.easyFactor,
        dueDate: p.progress.dueDate,
      };
    });

    res.json({
      ...flashcardSet,
      flashcards: orderedFlashcards,
      cardsByPriority: prioritized.map((p) => ({
        cardId: p.cardId,
        priority: p.priority,
        daysUntilDue: p.daysUntilDue,
      })),
    });
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    res.status(500).json({ error: 'Failed to fetch flashcards' });
  }
});

/**
 * Get progress for a note set
 */
app.get('/api/progress/:noteSetId', (req, res) => {
  try {
    const { noteSetId } = req.params;

    const progress = loadNoteSetProgress(noteSetId);
    const summary = getProgressSummary(noteSetId);

    res.json({
      progress,
      summary,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

/**
 * Record an attempt on a flashcard
 */
app.post('/api/progress/:noteSetId/:cardId', (req, res) => {
  try {
    const { noteSetId, cardId } = req.params;
    const { correct, confidence } = req.body;

    if (typeof correct !== 'boolean') {
      return res.status(400).json({ error: 'correct must be a boolean' });
    }

    if (
      confidence !== undefined &&
      (typeof confidence !== 'number' || confidence < 1 || confidence > 4)
    ) {
      return res.status(400).json({ error: 'confidence must be a number between 1 and 4' });
    }

    const cardProgress = recordAttempt(noteSetId, cardId, correct, confidence);
    const summary = getProgressSummary(noteSetId);

    res.json({
      cardProgress,
      summary,
    });
  } catch (error) {
    console.error('Error recording attempt:', error);
    res.status(500).json({ error: 'Failed to record attempt' });
  }
});

/**
 * Ask AI a question grounded in a specific note set
 */
app.post('/api/ask-ai/:noteSetId', async (req, res) => {
  try {
    const { noteSetId } = req.params;
    const { question } = req.body;

    if (typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'question must be a non-empty string' });
    }

    if (question.length > 1000) {
      return res.status(400).json({ error: 'question is too long (max 1000 characters)' });
    }

    const noteMetadata = notesIndex.noteSets.find((n) => n.id === noteSetId);
    if (!noteMetadata) {
      return res.status(404).json({ error: 'Note set not found' });
    }

    const noteContent = readFile(noteMetadata.path);
    const answer = await askGroundedQuestion(noteMetadata.title, noteContent, question.trim());

    return res.json({
      answer,
      noteSetId,
      grounded: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AiConfigError) {
      return res.status(503).json({
        error: 'AI is not configured. Set OPENAI_API_KEY in your .env file.',
      });
    }

    console.error('Error in Ask AI endpoint:', error);
    return res.status(500).json({ error: 'Failed to process AI request' });
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Catch-all: serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(
    `🚀 JackFlash server running on http://localhost:${PORT}`
  );
  console.log('   Press Ctrl+C to stop');
});
