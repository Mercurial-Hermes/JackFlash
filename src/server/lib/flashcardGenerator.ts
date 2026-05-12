import { NoteMetadata } from './noteParser.js';

export interface Flashcard {
  id: string;
  noteId: string;
  question: string;
  answer: string;
  section: string;
  sourcePath: string;
}

export interface FlashcardSet {
  id: string;
  noteId: string;
  title: string;
  sourcePath: string;
  flashcards: Flashcard[];
  count: number;
  lastGenerated: string;
}

/**
 * Parse flashcards from markdown content
 * Looks for lines starting with "Q:" and "A:"
 * Handles multiline answers (until next Q: or ## section)
 */
export function parseFlashcardsFromMarkdown(
  content: string,
  noteMetadata: NoteMetadata
): Flashcard[] {
  const flashcards: Flashcard[] = [];
  const lines = content.split('\n');

  let currentSection = 'Uncategorized';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Update current section when we hit a ## heading
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace(/^##\s+/, '').trim();
      i++;
      continue;
    }

    // Look for lines starting with Q:
    if (trimmed.startsWith('Q:')) {
      const questionText = trimmed.replace(/^Q:\s*/, '').trim();

      // Look ahead for the corresponding A: line
      let answerText = '';
      let j = i + 1;

      // Skip empty lines
      while (j < lines.length && lines[j].trim() === '') {
        j++;
      }

      // Check if next non-empty line starts with A:
      if (j < lines.length && lines[j].trim().startsWith('A:')) {
        answerText = lines[j].trim().replace(/^A:\s*/, '').trim();
        j++;

        // Collect multiline answer (bullet points or continuation lines)
        while (j < lines.length) {
          const nextLine = lines[j].trim();

          // Stop at next Q: or section heading
          if (nextLine.startsWith('Q:') || nextLine.startsWith('##')) {
            break;
          }

          // Collect bullet points, indented lines, or continuation text
          if (nextLine.startsWith('-') || nextLine.startsWith('•')) {
            answerText += '\n' + nextLine;
          } else if (nextLine && !nextLine.startsWith('A:')) {
            // Continuation line
            if (answerText) {
              answerText += '\n' + nextLine;
            }
          } else if (!nextLine) {
            // Empty line might be part of multiline answer
            // But stop if we hit another empty line after content
            j++;
            continue;
          }

          j++;
        }

        // Create flashcard if we have both Q and A
        if (questionText && answerText) {
          const cardId = `${noteMetadata.id}_fc_${flashcards.length + 1}`;
          flashcards.push({
            id: cardId,
            noteId: noteMetadata.id,
            question: questionText,
            answer: answerText.trim(),
            section: currentSection,
            sourcePath: noteMetadata.path,
          });
        }

        i = j;
        continue;
      }
    }

    i++;
  }

  return flashcards;
}

/**
 * Generate a complete flashcard set from note metadata and content
 */
export function generateFlashcardSet(
  noteMetadata: NoteMetadata,
  content: string
): FlashcardSet {
  const flashcards = parseFlashcardsFromMarkdown(content, noteMetadata);

  return {
    id: noteMetadata.id,
    noteId: noteMetadata.id,
    title: noteMetadata.title,
    sourcePath: noteMetadata.path,
    flashcards,
    count: flashcards.length,
    lastGenerated: new Date().toISOString(),
  };
}
