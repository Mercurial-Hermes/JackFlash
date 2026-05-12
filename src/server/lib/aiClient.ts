import OpenAI from 'openai';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_NOTE_CONTEXT_CHARS = 12000;

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigError';
  }
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiConfigError('OPENAI_API_KEY is not configured');
  }

  return new OpenAI({ apiKey });
}

function buildGroundedPrompt(noteTitle: string, noteContent: string, question: string): string {
  const trimmedContent = noteContent.slice(0, MAX_NOTE_CONTEXT_CHARS);

  return [
    `NOTE SET TITLE: ${noteTitle}`,
    '',
    'NOTE CONTENT START',
    trimmedContent,
    'NOTE CONTENT END',
    '',
    `QUESTION: ${question}`,
  ].join('\n');
}

export async function askGroundedQuestion(
  noteTitle: string,
  noteContent: string,
  question: string
): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful Year 7 study tutor. Answer ONLY using the provided note content. If the answer is not present in the notes, respond exactly with: "I could not find that in this note set." Keep answers concise and student-friendly.',
      },
      {
        role: 'user',
        content: buildGroundedPrompt(noteTitle, noteContent, question),
      },
    ],
  });

  const answer = response.choices?.[0]?.message?.content?.trim();
  return answer || 'I could not find that in this note set.';
}
