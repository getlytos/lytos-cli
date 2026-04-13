# Le Socle — CLI

[![CI](https://github.com/le-socle/socle-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/le-socle/socle-cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/le-socle)](https://www.npmjs.com/package/le-socle)

> The command-line tool for [Le Socle](https://github.com/le-socle/socle) — a human-first method for working with AI agents.

---

## Install

```bash
npm install -g le-socle
```

Then use:

```bash
socle init          # Install Le Socle in your project
socle board         # Regenerate BOARD.md from issue frontmatter
```

Or use without installing:

```bash
npx le-socle init
```

---

## What it does

One command to install the method, one command to validate your setup, one command to see your sprint.

| Command | What it does |
|---------|-------------|
| `socle init` | Scaffold `.socle/` in your project (interactive, detects your stack) |
| `socle board` | Regenerate BOARD.md from issue YAML frontmatter |
| `socle lint` | Validate `.socle/` structure and content *(coming soon)* |
| `socle doctor` | Full diagnostic — missing files, broken links, stale memory *(coming soon)* |
| `socle status` | Display sprint DAG in terminal *(coming soon)* |

---

## Built with Le Socle

This project uses Le Socle to develop itself. The `.socle/` directory contains the real manifest, sprint, issues, and memory for this project — not templates.

If you want to contribute, open this repo in Claude Code and say: **"Help me understand this project."**

---

## Author

Created by **Frederic Galliné** — [ubeez.com](https://ubeez.com)

- GitHub: [@FredericGalline](https://github.com/FredericGalline)
- X: [@fred](https://x.com/fred)

Part of the [Le Socle](https://github.com/le-socle/socle) project.

---

## License

MIT — see [LICENSE](./LICENSE)
