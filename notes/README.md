# How to Write Study Notes for JackFlash

## Overview

Notes are written in Markdown with a special structure that lets JackFlash automatically generate flashcards and organize your study material.

## File Location and Naming

Place your notes in the `notes/` folder using this structure:

```
notes/
├── Year7/
│   ├── Science/
│   │   ├── Forces.md
│   │   └── Electricity.md
│   └── Maths/
│       └── Algebra.md
└── [YearN]/
    └── [Subject]/
        └── [Topic].md
```

- Use folders for **Year** and **Subject**
- Use filenames for **Topic**
- Keep filenames simple and lowercase (e.g., `forces.md`, not `Forces and Motion.md`)

## Note Format

Each note file must start with **YAML frontmatter** followed by Markdown content.

### Example Structure

```markdown
---
id: year7_science_forces
subject: Science
year: 7
term: 1
topic: Forces
---

# Year 7 Science: Forces

## About This Topic

Learn the fundamentals of forces and Newton's laws.

## Section 1: What is a Force?

Content explaining the topic goes here. Use **bold**, *italic*, bullet points, etc.

Q: What is a force?
A: A push or pull that can change motion or shape of an object.

Q: Name two examples of forces.
A:
- Gravity
- Friction

## Section 2: Newton's Laws

More content and more Q&A pairs...

Q: State Newton's First Law.
A: An object at rest stays at rest unless acted on by a force.
```

## Frontmatter (YAML)

The frontmatter at the top (between `---` markers) provides metadata:

- **id**: Unique identifier (use lowercase, underscores, e.g., `year7_science_forces`)
- **subject**: Subject name (e.g., Science, Maths, English)
- **year**: Year group (e.g., 7, 8, 9)
- **term**: Term number (optional, 1, 2, or 3)
- **topic**: Topic name (e.g., Forces, Algebra)

## Content Guidelines

### 1. Use Markdown Properly

- Use `#` for the main title (only once, at the top)
- Use `##` for sections (e.g., "Section 1: Topic Name")
- Use `### ` only if you need subsections (rare)
- Use bold (`**text**`), italics (`*text*`), and bullet points as needed

### 2. Write Explanatory Content

Before each set of flashcards, explain the concept clearly:

```
## Section 1: What is a Force?

Forces are interactions that change motion or shape.

**Key definitions:**
- **Force:** A push or pull (measured in Newtons)
- **Newton (N):** SI unit of force

Q: What is a force?
A: A push or pull that can change motion or shape.
```

### 3. Add Q&A Pairs

Each flashcard is a Q/A pair. Format:

```
Q: Your question here?
A: Your answer here.
```

Or for multi-line answers:

```
Q: Name two examples of forces.
A:
- Gravity
- Friction
```

**Rules:**
- Put `Q:` at the **start of a line** (not indented)
- Put `A:` at the **start of the following line** (usually)
- Answers can be single-line or multi-line
- For lists, use `-` or `•` bullet points
- Each Q/A pair becomes one flashcard

### 4. Section Tracking

Questions are automatically tagged with the most recent `##` section. This helps organize flashcards by topic within a note.

Example:
```
## Section 2: Newton's Laws

Q: State Newton's First Law.
A: An object at rest stays at rest unless acted on by a force.
```

This flashcard will be tagged with section "Newton's Laws".

## Tips for Good Notes

✅ **Do:**
- Write clear, concise explanations
- Ask questions that test key concepts
- Include definitions and examples
- Use proper Markdown formatting
- Keep topics focused (one file = one major topic)

❌ **Don't:**
- Use `### Q:` or `### A:` as headings (use regular Q: and A:)
- Include overly long answers (keep them digestible)
- Mix multiple unrelated topics in one file
- Forget the YAML frontmatter

## Editing Notes

You can edit notes in:
- **VS Code** (recommended, has Markdown preview)
- **Any text editor** (Notepad, Word, etc.)
- **GitHub web editor** (if you commit to GitHub)

After editing, just save the file. The app will pick up changes automatically on refresh.

## Example: Complete Note

```markdown
---
id: year7_science_electricity
subject: Science
year: 7
term: 2
topic: Electricity
---

# Year 7 Science: Electricity

## Section 1: What is Electric Current?

Electric current is the flow of charge through a circuit.

Q: What is electric current?
A: The flow of electric charge through a circuit (measured in Amperes).

Q: Name a good conductor.
A: Copper or any metal.

## Section 2: Circuits

A circuit is a closed loop for current to flow.

Q: What is an electric circuit?
A: A closed path through which electric current flows.
```

## Questions?

If a note won't parse correctly, check:
- YAML frontmatter is present and correctly formatted
- Q and A are on separate lines starting at the beginning of a line
- The file is saved as `.md` in the correct folder

---

Good luck with your studies! 📚
