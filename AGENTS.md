# AGENTS.md

## Purpose

This file guides coding agents working in JackFlash.
The app is a local-first Year 7 study tool with:
- Markdown-driven notes
- Auto-generated flashcards
- Spaced repetition progress tracking
- Ask AI grounded to the active note set

## Core Principles

- Keep the app lightweight and local-first.
- Prefer simple, explicit code over abstractions.
- Do not introduce a database unless explicitly requested.
- Preserve existing note format compatibility (Q:/A: parsing).
- Do not break the Year -> Term -> Subject -> Topic navigation model.

## Tech Stack

- Node.js + Express
- TypeScript backend
- Vanilla HTML/CSS/JavaScript frontend
- File-based storage:
  - notes/ for source content
  - data/progress/ for spaced repetition progress
  - generated/ for generated index artifacts

## Important Paths

- src/server/index.ts: API routes and server bootstrap
- src/server/lib/noteParser.ts: frontmatter/title extraction
- src/server/lib/flashcardGenerator.ts: Q/A parsing logic
- src/server/lib/progressTracker.ts: spaced repetition and prioritization
- src/server/lib/aiClient.ts: OpenAI grounded answer generation
- public/note-set.js: flashcard and Ask AI page behavior
- public/note-set.html: flashcard and Ask AI UI
- notes/: curriculum content

## Run and Validate

- Install dependencies: npm install
- Build: npm run build
- Start: npm start
- Dev run: npm run dev

Before finishing changes:
1. Run npm run build
2. Check that no new TypeScript errors are introduced
3. If UI changed, verify flashcards and Ask AI tab still function

## Local Environment

Expected .env values:
- PORT=3000
- NODE_ENV=development
- OPENAI_API_KEY=<required for Ask AI>
- OPENAI_MODEL=<optional, defaults in code>

If port 3000 is busy:
- lsof -ti:3000 | xargs kill -9

## Notes Authoring Contract

Every note file should include YAML frontmatter with:
- id (unique)
- subject
- year
- term
- topic

Flashcards are parsed from exact line starts:
- Q: question text
- A: answer text

Section tracking depends on markdown headings using:
- ## Section ...

Do not change parser behavior in ways that break existing note files without migration.

## Spaced Repetition Expectations

- Prioritize overdue and due cards first.
- Keep progression understandable for students.
- Confidence grading currently supports Again/Hard/Good/Easy mapping.
- Preserve local JSON compatibility in data/progress/*.json.

## Ask AI Expectations

- Answers must be grounded in the selected note set.
- If answer is not found in provided notes, return explicit fallback.
- Handle missing OPENAI_API_KEY gracefully.
- Keep responses concise and student-friendly.

## Editing Rules

- Make minimal, targeted changes.
- Avoid unrelated refactors.
- Keep file and API names stable unless required.
- If changing API contracts, update corresponding frontend usage in same change.
- Keep README.md and notes/README.md aligned with behavior changes.

## Non-Goals Unless Requested

- No authentication layer
- No remote database
- No framework migration (React/Vue/etc.)
- No heavy build tooling changes

## Handoff Checklist

- Build passes
- Critical user flow passes:
  - Navigate to note set
  - Review cards
  - Record grade
  - Ask AI question
- Document behavior changes in README.md when user-facing
