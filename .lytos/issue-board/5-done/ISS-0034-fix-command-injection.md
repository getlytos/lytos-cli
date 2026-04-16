---
id: ISS-0034
title: Fix command injection in git operations — sanitize branch names
type: fix
priority: P0-critical
effort: S
complexity: standard
skill: code-structure
skills_aux: [security, testing]
status: 5-done
branch: fix/ISS-0034-command-injection
depends: []
created: 2026-04-16
updated: 2026-04-16
---
# ISS-0034 — Fix command injection in git operations — sanitize branch names

## Context

Security audit identified a command injection vulnerability. Branch names from issue frontmatter are interpolated directly into `execSync()` shell commands. A malicious issue file could execute arbitrary commands via a crafted `branch` field.

Example: `branch: "feat/ISS-0001-test; rm -rf /"` would be passed to `execSync("git checkout -b feat/ISS-0001-test; rm -rf /")`.

## What to do

1. Replace `execSync` with `execFileSync` (no shell interpretation) in all git operations
2. Add strict validation of branch names before any git operation (alphanumeric, hyphens, slashes, dots only)
3. Reject any branch name containing shell metacharacters

## Definition of done

- [ ] All `execSync("git ...")` in issue-ops.ts replaced with `execFileSync("git", [...args])`
- [ ] Branch name validation: reject characters outside `[a-zA-Z0-9/_.-]`
- [ ] Tests: malicious branch name is rejected, valid branch name passes
- [ ] `npm run lint` + `npm run typecheck` + `npm test` all pass
