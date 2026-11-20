# Rubric: architecture and maintainability

1. **Layers** — the domain is pure: no query, no database, no hidden clock. Adapters live behind a
   boundary. Routes and controllers are thin. A dependency from the domain toward a route or a view
   is a finding.
2. **One truth per gesture** — a gesture has ONE path. A second path (screen and engine, customer
   side and team side) that redoes the same write is a finding.
3. **Decisions in force** — the project's ADRs and the stack contract (`quality/stack.md`). A new
   dependency needs a decision record, not a silent add.
4. **Design for growth** — values that are computed are stored and recomputed on an event, never at
   load; queries are bounded; migrations are additive. Ask what each path does at a hundred times
   today's volume.
5. **SOLID, only when it explains a concrete defect** — a module that changes for two reasons, an
   abstraction with a single caller. No dogma: a principle that names no defect is not a finding.
6. **Readability** — cohesive modules, names that say the domain, a docblock that says why;
   copy-pasted duplication.

Out of scope: style preferences that the formatter or a test already settles.
