import { NoteMetadata } from './noteParser.js';

export interface Topic {
  id: string;
  name: string;
  noteId: string;
}

export interface Subject {
  name: string;
  topics: Topic[];
}

export interface Term {
  name: string;
  subjects: Subject[];
}

export interface Year {
  name: string;
  terms: Term[];
}

export interface Hierarchy {
  years: Year[];
}

/**
 * Build hierarchical structure from flat note metadata
 * Hierarchy: Year → Term → Subject → Topic
 */
export function buildHierarchy(noteSets: NoteMetadata[]): Hierarchy {
  const yearMap = new Map<string, Map<string, Map<string, Topic[]>>>();

  // Group by year, then term, then subject
  for (const noteSet of noteSets) {
    const yearKey = noteSet.year ? `Year ${noteSet.year}` : 'General';
    const termKey = noteSet.term ? `Term ${noteSet.term}` : 'General';
    const subjectKey = noteSet.subject || 'General';
    const topicName = noteSet.topic || 'Untitled';

    if (!yearMap.has(yearKey)) {
      yearMap.set(yearKey, new Map());
    }

    const termMap = yearMap.get(yearKey)!;
    if (!termMap.has(termKey)) {
      termMap.set(termKey, new Map());
    }

    const subjectMap = termMap.get(termKey)!;
    if (!subjectMap.has(subjectKey)) {
      subjectMap.set(subjectKey, []);
    }

    subjectMap.get(subjectKey)!.push({
      id: noteSet.id,
      name: topicName,
      noteId: noteSet.id,
    });
  }

  // Convert maps to hierarchical structure
  const years: Year[] = [];

  for (const [yearName, termMap] of yearMap.entries()) {
    const terms: Term[] = [];

    for (const [termName, subjectMap] of termMap.entries()) {
      const subjects: Subject[] = [];

      for (const [subjectName, topics] of subjectMap.entries()) {
        // Sort topics alphabetically
        const sortedTopics = topics.sort((a, b) => a.name.localeCompare(b.name));
        subjects.push({
          name: subjectName,
          topics: sortedTopics,
        });
      }

      // Sort subjects alphabetically
      subjects.sort((a, b) => a.name.localeCompare(b.name));
      terms.push({
        name: termName,
        subjects,
      });
    }

    // Sort terms naturally (Term 1, Term 2, etc.)
    terms.sort((a, b) => {
      const aNum = parseInt(a.name.replace(/\D/g, '') || '0');
      const bNum = parseInt(b.name.replace(/\D/g, '') || '0');
      return aNum - bNum;
    });

    years.push({
      name: yearName,
      terms,
    });
  }

  // Sort years naturally (Year 7, Year 8, etc.)
  years.sort((a, b) => {
    const aNum = parseInt(a.name.replace(/\D/g, '') || '0');
    const bNum = parseInt(b.name.replace(/\D/g, '') || '0');
    return aNum - bNum;
  });

  return { years };
}
