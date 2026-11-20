# Security policy

## Supported versions

Only the latest published minor version of `lytos-cli` receives security fixes.

## Reporting a vulnerability

Please do **not** open a public issue. Report it privately through GitHub: <https://github.com/getlytos/lytos-cli/security/advisories/new>.

Useful details: the version (`lyt --version`), your operating system and Node version, and the smallest steps that reproduce the problem.

## What to expect

An acknowledgement within a few days and a fix or a clear answer as soon as it can be investigated. Credit is given in the advisory unless you prefer otherwise.

## Scope

`lyt` reads and writes files inside a project's `.lytos/` folder and runs `git`. Reports about writing outside the project, following symbolic links, executing unintended commands, or leaking private data in published files are in scope. Findings that need a hostile local environment you already control are usually out of scope.
