/**
 * Parse YAML frontmatter and extract note metadata
 */

export interface NoteMetadata {
  id: string;
  title: string;
  path: string;
  subject?: string;
  year?: string | number;
  term?: number;
  topic?: string;
}

/**
 * Parse YAML frontmatter from markdown content
 * Expects format:
 * ---
 * key: value
 * key2: value2
 * ---
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const lines = content.split('\n');

  if (!lines[0].trim().startsWith('---')) {
    return {};
  }

  const frontmatterLines: string[] = [];
  let endIdx = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('---')) {
      endIdx = i;
      break;
    }
    frontmatterLines.push(lines[i]);
  }

  if (endIdx === -1) {
    return {}; // No closing ---
  }

  const data: Record<string, unknown> = {};

  for (const line of frontmatterLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [key, ...valueParts] = trimmed.split(':');
    const value = valueParts.join(':').trim();

    // Parse value based on type
    if (value === 'true' || value === 'false') {
      data[key.trim()] = value === 'true';
    } else if (!isNaN(Number(value))) {
      data[key.trim()] = Number(value);
    } else {
      data[key.trim()] = value;
    }
  }

  return data;
}

/**
 * Extract the first # heading (title) from markdown content
 */
function extractTitle(content: string): string | null {
  // Skip frontmatter if present
  let startIdx = 0;
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('\n---');
    if (endIdx !== -1) {
      startIdx = endIdx + 4;
    }
  }

  const lines = content.substring(startIdx).split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.replace(/^#\s+/, '').trim();
    }
  }

  return null;
}

/**
 * Parse a markdown note file and extract metadata
 */
export function parseNote(content: string, filePath: string): NoteMetadata {
  const frontmatter = parseFrontmatter(content);
  const title = extractTitle(content) || 'Untitled';

  const id =
    (typeof frontmatter.id === 'string' && frontmatter.id) ||
    generateIdFromPath(filePath);

  return {
    id,
    title,
    path: filePath,
    subject:
      typeof frontmatter.subject === 'string' ? frontmatter.subject : undefined,
    year:
      typeof frontmatter.year === 'number' ? frontmatter.year : undefined,
    term:
      typeof frontmatter.term === 'number' ? frontmatter.term : undefined,
    topic:
      typeof frontmatter.topic === 'string' ? frontmatter.topic : undefined,
  };
}

/**
 * Generate a deterministic ID from file path
 * Example: notes/Year7/Science/Forces.md -> year7_science_forces
 */
function generateIdFromPath(filePath: string): string {
  return filePath
    .replace(/^notes\//i, '')
    .replace(/\.md$/i, '')
    .replace(/[/\\]/g, '_')
    .toLowerCase();
}

/**
 * Parse multiple markdown files and return their metadata
 */
export function parseNotes(files: string[], contents: Map<string, string>): NoteMetadata[] {
  return files
    .map((filePath) => {
      const content = contents.get(filePath);
      if (!content) return null;
      return parseNote(content, filePath);
    })
    .filter((note): note is NoteMetadata => note !== null);
}
