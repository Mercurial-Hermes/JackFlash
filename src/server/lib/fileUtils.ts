import fs from 'fs';
import path from 'path';

/**
 * Recursively scan a directory for all .md files
 * Returns an array of file paths relative to the root
 */
export function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function scanDir(currentPath: string) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      console.error(`Error scanning directory ${currentPath}:`, err);
    }
  }

  scanDir(dir);
  return files;
}

/**
 * Extract the folder hierarchy from a file path
 * Example: notes/Year7/Science/Forces.md
 * Returns: { year: 'Year7', subject: 'Science', topic: 'Forces' }
 */
export function extractFolderHierarchy(
  filePath: string,
  notesRoot: string
): { year?: string; subject?: string; topic?: string } {
  const relative = path.relative(notesRoot, filePath);
  const parts = relative.split(path.sep).slice(0, -1); // Remove filename
  const filename = path.basename(filePath, '.md');

  return {
    year: parts[0] || undefined,
    subject: parts[1] || undefined,
    topic: filename || undefined,
  };
}

/**
 * Read file contents as string
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write JSON file with pretty printing
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Read JSON file, or return null if not found
 */
export function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    return null;
  }
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get absolute path from project root
 */
export function getAbsPath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}
