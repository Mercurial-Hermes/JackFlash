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
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content:
          'You are a friendly, knowledgeable physicist helping a teenage science student. Speak clearly and warmly, with simple explanations, useful analogies, and just enough detail to teach well. Use the provided note content when it helps, but do not refuse questions just because the exact answer is missing. Answer related questions from your general knowledge in a student-friendly way. If the notes do not fully cover the question, say that briefly and then give the best helpful answer you can.',
      },
      {
        role: 'user',
        content: buildGroundedPrompt(noteTitle, noteContent, question),
      },
    ],
  });

  const answer = response.choices?.[0]?.message?.content?.trim();
  return answer || "I'm not sure from the notes alone, but I can still help explain it.";
}
