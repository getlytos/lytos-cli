---
id: ISS-0178
title: lyt milestone crashes on a directory and follows symbolic links
type: fix
priority: P2-normal
effort: XS
complexity: light
skill: ""
skills_aux: []
status: 5-done
branch: fix/ISS-0178-lyt-milestone-robustness
depends: []
related: [ISS-0164]
created: 2026-11-20
schema_version: 2
risk: low
updated: 2026-11-20
completed_at: 2026-11-20
commits: [0852bfd, 72b00eb, 8b4bd2d, d38175e, 073a849, 323050d, 5ff5be1, ab448e7, e27e974, f3cae8f, 4629f73, 1c6e272, 889b647, 0aaa03d, ba6e11a, 27d1fd2, b5e8493, 3fd4185, a54e2a5, 957f8b6]
---
# ISS-0178 — lyt milestone crashes on a directory and follows symbolic links

## Context

Finding F11 of the independent review of 1.7. A `.lytos/milestones/v1.md/` directory made `lyt milestone v1` print a Node `EISDIR` stack trace (exit 1, an uncaught error). A link such as `hosts.md -> /etc/hosts` was read and its content shown. The new `exchanges` reader already refuses links and non-regular files.

## Proposed solution

Give the milestone reader the same guard as `exchanges-scan.ts`: a symbolic link on the path (the milestones folder included) or an entry that is not a regular file is refused with one line, and the command exits 1. The list leaves such entries out and says so on stderr. Solution study: one line. Reuse `symlinkOnPath` and `lstat`, the guard `exchanges` already trusts, rather than a new check.

## Ready

- **Scope** — `readMilestone`, the list of ids, and the `lyt milestone` command.
- **Out of scope** — `lyt lint`'s existence check of a milestone, and the reviewer-independence findings.
- **Solution** — `symlinkOnPath` plus `lstat`, one line of message.
- `risk: low`.

## Definition of done

- [x] A milestone path that is a directory, a symbolic link (to a file, to a directory, dangling, or to another milestone), or inside a linked milestones folder is refused with one line and exit 1, never a stack trace, and what a link points at is never read — verify: auto
- [x] `lyt milestone` without an id lists the regular files, leaves the others out with a line each on stderr, and keeps `--json` a clean array on stdout — verify: auto
- [x] A regular milestone in the same folder is still shown, and the whole suite stays green — verify: auto

## Evidence

On the 1.7.0 build: `lyt milestone v1` with `.lytos/milestones/v1.md/` a directory printed `node:fs:440 … binding.readFileUtf8` and exited 1; `lyt milestone hosts` with `hosts.md` a link to a file outside the project printed the file as a milestone and exited 0. On this branch both print one line (`… is a directory, not a regular file: it is not read`, `… is a symbolic link: it is not read`) and exit 1; the link target is never read.
