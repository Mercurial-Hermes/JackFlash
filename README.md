# JackFlash

JackFlash is a lightweight local study app for retrieval practice.
It reads Markdown notes, auto-generates flashcards, schedules review with spaced repetition, and supports grounded Ask AI questions per note set.

## What JackFlash Does

- Organizes content by Year, Term, Subject, and Topic
- Generates flashcards from Q: and A: lines in Markdown
- Tracks progress per card in local JSON files
- Prioritizes overdue and weak cards first
- Lets students ask AI questions grounded in the selected note set

## macOS Software Install Guide

These instructions are for a MacBook.

### 1. Install Xcode Command Line Tools

Open Terminal and run:

```bash
xcode-select --install
```

### 2. Install Homebrew

If Homebrew is not already installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then verify:

```bash
brew --version
```

### 3. Install Node.js (LTS)

Install Node 20:

```bash
brew install node@20
```

Verify:

```bash
node -v
npm -v
```

### 4. Install Git

If Git is missing:

```bash
brew install git
git --version
```

### 5. Install Visual Studio Code (Recommended)

Download and install from:

https://code.visualstudio.com

Optional Terminal launcher setup inside VS Code:

- Open Command Palette
- Run: Shell Command: Install 'code' command in PATH

## Project Setup

From Terminal:

```bash
cd /path/to/JackFlash
npm install
cp .env.example .env
```

Open .env and set your key:

```bash
OPENAI_API_KEY=your_real_key_here
```

Optional model override:

```bash
OPENAI_MODEL=gpt-4o-mini
```

## Run Locally

Build:

```bash
npm run build
```

Start server:

```bash
npm start
```

Open:

http://localhost:3000

Stop server with Ctrl+C.

## Common Local Issues

### Port 3000 already in use

```bash
lsof -ti:3000 | xargs kill -9
npm start
```

### Rebuild after code changes

```bash
npm run build
npm start
```

## How to Use JackFlash

### 1. Navigate to a Topic

- Home page shows Year
- Click into Term
- Click Subject
- Open a Topic note set

### 2. Study Flashcards

- Show Answer reveals the back of card
- Grade recall with: Again, Hard, Good, Easy
- Use Due Only toggle to focus on due and overdue cards
- Shuffle resets the current session order

### 3. Ask AI

- Open Ask AI tab in a note set
- Ask a question about that topic
- Responses are grounded in the current note set only
- Flashcard view includes Ask AI About This Card action to send the current question directly into Ask AI

### 4. Keyboard Shortcuts (Flashcards)

- Space or Enter: reveal answer
- 1: Again
- 2: Good
- Left Arrow: previous card
- Right Arrow: next card

## Data Storage and Backup

- Source notes live in the notes folder
- Progress is saved in data/progress
- Generated index data is saved in generated

Recommended backup:

- Commit notes to GitHub regularly
- Keep progress local unless you intentionally choose to track it

## Notes Authoring Rules

To ensure flashcards parse correctly, follow these rules exactly.

### Folder structure

Use this pattern:

```text
notes/
	Year7/
		Term2/
			Science/
				Forces.md
				Gravity.md
				Friction.md
				KeepingAfloat.md
				MagneticFields.md
				ElectricFields.md
```

### One topic per file

- Keep each file focused on one curriculum topic
- Keep filenames simple and consistent

### Required frontmatter

Each file must begin with YAML frontmatter:

```markdown
---
id: year7_science_82_forces
subject: Science
year: 7
term: 2
topic: Forces
---
```

Guidance:

- id must be unique
- Use lowercase and underscores in id
- Keep year and term numeric

### Flashcard format

Questions and answers must start at the beginning of a line:

```markdown
Q: What is a force?
A: A push or pull that can change motion.
```

For multiline answers:

```markdown
Q: Name two non-contact forces.
A:
- Gravity
- Magnetic force
```

### Sections

Use section headings with double hash:

```markdown
## Section 2: Contact and Non-Contact Forces
```

Flashcards are tagged to the most recent section heading.

## Adding New Content (Build Out Process)

### Add a new topic

1. Create a new Markdown file in the correct Year, Term, Subject folder
2. Add frontmatter with a unique id
3. Add teaching content and Q/A pairs
4. Save file
5. Rebuild and restart:

```bash
npm run build
npm start
```

### Quality check for flashcards

Count all questions:

```bash
rg -n "^Q:" notes/**/*.md
```

If cards are missing, check:

- Q: and A: are at line start
- Frontmatter is valid and closed with ---
- File is in the correct notes path

## Available NPM Scripts

- npm run build: compile TypeScript
- npm start: run compiled server
- npm run dev: run server via ts-node
- npm run watch: TypeScript watch mode

## Safety and Privacy

- App is designed for local use on a single machine
- AI answers are sent to OpenAI only when Ask AI is used
- Keep your API key private and never commit .env

## Suggested Maintenance Routine

Weekly:

1. Add or refine notes
2. Run build and test one topic
3. Commit note changes to Git
4. Verify spaced-repetition flow still behaves as expected

Monthly:

1. Review weakest topics from usage
2. Add more targeted Q/A cards in those areas
3. Prune or improve ambiguous questions
