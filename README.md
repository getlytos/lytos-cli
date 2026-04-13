# socle-cli

[![CI](https://github.com/le-socle/socle-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/le-socle/socle-cli/actions/workflows/ci.yml)

> The command-line tool for [Le Socle](https://github.com/le-socle/socle) — a human-first method for working with AI agents.

**Status: In development (Sprint #01)**

---

## What it does

`socle-cli` brings Le Socle to your terminal. One command to install the method, one command to validate your setup, one command to see your sprint.

```bash
npx socle init          # Install Le Socle in your project
npx socle board         # Regenerate BOARD.md from issue frontmatter
npx socle lint          # Validate .socle/ structure and content
npx socle doctor        # Full diagnostic (missing files, broken links, stale memory)
npx socle status        # Display sprint DAG in terminal
```

---

## Install

```bash
npm install -g socle-cli
```

Or use without installing:

```bash
npx socle init
```

---

## Built with Le Socle

This project uses Le Socle to develop itself. The `.socle/` directory contains the real manifest, sprint, issues, and memory for this project — not templates.

If you want to contribute, open this repo in Claude Code and say: **"Help me understand this project."** The AI will read the manifest and memory and get you up to speed.

---

## Author

Created by **Frederic Galliné** — [ubeez.com](https://ubeez.com)

- GitHub: [@FredericGalline](https://github.com/FredericGalline)
- X: [@fred](https://x.com/fred)

Part of the [Le Socle](https://github.com/le-socle/socle) project.

---

## License

MIT — see [LICENSE](./LICENSE)
