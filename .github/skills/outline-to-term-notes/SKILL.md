---
name: outline-to-term-notes
description: "Create or replace a full term note set from a curriculum outline. Use when user asks to convert syllabus/outline text into JackFlash .md files with correct frontmatter, sections, Q:/A: flashcard pairs, and validation checks."
---

# Outline To Term Notes

## Purpose

Turn a curriculum outline into ready-to-use JackFlash note files under the correct `notes/YearX/TermY/Subject/` path.

## Use This Skill When

- The user provides syllabus or outline text and wants starter notes.
- The user wants to add a new term or replace an old term.
- The user wants notes that are guaranteed to parse into flashcards.

## Inputs To Collect

- Year (for example: `7`)
- Term (for example: `2`)
- Subject (for example: `Science`)
- Outline text (dot points or paragraph)
- Scope instruction:
  - create alongside existing files, or
  - replace an existing term

## Required Output Contract

For each topic file generated:

1. File path must follow:
- `notes/Year{year}/Term{term}/{subject}/{TopicName}.md`

2. YAML frontmatter must include exactly:
- `id`
- `subject`
- `year`
- `term`
- `topic`

3. Body structure must include:
- Single `#` title
- `## About This Topic`
- At least 2 to 4 `## Section ...` blocks
- Multiple `Q:` and `A:` pairs with line-start formatting

4. Flashcard compatibility rules:
- `Q:` must start at beginning of line
- `A:` must start at beginning of line
- Keep one topic per file

## Workflow

1. Parse the outline into distinct topic files.
2. Create/update files in the correct Year/Term/Subject path.
3. If user requested replacement, remove old term folder content for that scope.
4. Ensure topic IDs are unique and deterministic.
5. Run validation checks.
6. Summarize created/removed files and any assumptions.

## Validation Checklist

Run these checks after generation:

1. Build compiles:

```bash
npm run build
```

2. Questions detected in new term files:

```bash
rg -n "^Q:" notes/Year{year}/Term{term}/{subject}/*.md
```

3. IDs are present and unique in target files:

```bash
rg -n "^id:" notes/Year{year}/Term{term}/{subject}/*.md
```

## Quality Bar

- Keep language student-friendly (Year 7 level unless user requests otherwise).
- Keep answers concise and direct.
- Prefer explicit examples in science notes.
- Avoid changing unrelated folders or app code.

## Report Format Back To User

- Files created
- Files removed (if replacement requested)
- Total Q/A count in generated files
- Any assumptions made
