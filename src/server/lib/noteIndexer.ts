import { findMarkdownFiles, readFile, writeJsonFile, getAbsPath } from './fileUtils.js';
import { parseNote, NoteMetadata } from './noteParser.js';

export interface NotesIndex {
  noteSets: NoteMetadata[];
  lastIndexed: string;
}

/**
 * Build the complete index of all notes
 */
export function buildNotesIndex(notesDir: string = 'notes'): NotesIndex {
  const notesPath = getAbsPath(notesDir);
  const markdownFiles = findMarkdownFiles(notesPath);

  // Filter out README files
  const noteFiles = markdownFiles.filter(
    (file) => !file.toLowerCase().endsWith('readme.md')
  );

  const noteSets: NoteMetadata[] = [];
  const contentCache = new Map<string, string>();

  // Read all files
  for (const filePath of noteFiles) {
    const content = readFile(filePath);
    contentCache.set(filePath, content);
  }

  // Parse all files
  for (const filePath of noteFiles) {
    const content = contentCache.get(filePath);
    if (!content) continue;

    const metadata = parseNote(content, filePath);
    noteSets.push(metadata);
  }

  // Sort by subject, then year, then topic
  noteSets.sort((a, b) => {
    if ((a.subject || '') !== (b.subject || '')) {
      return (a.subject || '').localeCompare(b.subject || '');
    }
    const yearA = typeof a.year === 'number' ? a.year : 0;
    const yearB = typeof b.year === 'number' ? b.year : 0;
    if (yearA !== yearB) {
      return yearA - yearB;
    }
    return (a.topic || '').localeCompare(b.topic || '');
  });

  return {
    noteSets,
    lastIndexed: new Date().toISOString(),
  };
}

/**
 * Generate and save the index to /generated/index.json
 */
export function generateAndSaveIndex(
  notesDir: string = 'notes',
  outputPath: string = 'generated/index.json'
): NotesIndex {
  const index = buildNotesIndex(notesDir);
  const outputFullPath = getAbsPath(outputPath);

  writeJsonFile(outputFullPath, index);
  console.log(`✓ Generated note index: ${outputPath}`);

  return index;
}

/**
 * Get metadata for a specific note by ID
 */
export function getNoteMetadataById(
  index: NotesIndex,
  noteId: string
): NoteMetadata | null {
  return index.noteSets.find((note) => note.id === noteId) || null;
}
