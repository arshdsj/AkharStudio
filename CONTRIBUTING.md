# Contributing to AkharStudio (ਅੱਖਰStudio)

Thank you for your interest in contributing to AkharStudio! This project is a dedicated, desktop-first, local-first Punjabi screenplay editor designed to give writers a clean, distraction-free, and culturally nuanced storytelling environment.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful and constructive in all discussions, issues, and code reviews.

---

## Architectural Principles

When writing code for AkharStudio, please respect our core architectural commitments:

1. **100% Offline & Local-First**: No features should depend on remote servers or network connectivity for core writing, persistence, transliteration, or export.
2. **Canonical Unicode (NFC)**: Screenplay content is always stored as normalized Unicode (NFC). Roman phonetics or font-dependent glyph encodings are never persisted into draft models.
3. **Screenplay Formatting Integrity**: ProseMirror node schemas enforce screenplay semantics (Scene Heading, Action, Character, Dialogue, Parenthetical, Transition, Shot). Elements must conform to industry standards.
4. **Performance Target**: The editor must maintain sub-50ms transaction latency even for feature-length screenplays (120+ pages / 3,000+ blocks).
5. **Data Safety**: Never perform destructive overwrites. Draft changes are versioned and autosaved through SQLite transactions.

---

## Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or higher
- [npm](https://www.npmjs.com/) v10 or higher
- C/C++ build tools (for `better-sqlite3` native compilation):
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Visual Studio C++ Build Tools or `windows-build-tools`
  - **Linux**: `build-essential`, `python3`

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/arshdsj/AkharStudio.git
   cd AkharStudio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   *(This will run `scripts/ensure-sqlite-bindings.js` via the `postinstall` hook).*

3. **Start the development environment**:
   ```bash
   npm run dev:electron
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

---

## Branching & Pull Requests

1. Fork or branch off `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Write clean, self-documenting code with TypeScript types.
3. Ensure all tests pass:
   ```bash
   npx tsc --noEmit
   npm test
   ```
4. Commit your changes using descriptive commit messages:
   ```bash
   git commit -m "feat(transliteration): add custom candidate ranking for regional dialects"
   ```
5. Push to your branch and open a Pull Request against `main`.

---

## Reporting Issues

If you encounter bugs, text shaping errors, or transliteration discrepancies:
- Check existing issues before opening a new one.
- Provide your OS version, reproduction steps, and expected vs actual behavior.
- If reporting a transliteration issue, specify the Roman input string and the expected Gurmukhi output.

Thank you for helping empower Punjabi screenwriters around the world!
