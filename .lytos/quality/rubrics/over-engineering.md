# Rubric: over-engineering

Look for:

- an abstraction with a single caller;
- an indirection that adds nothing;
- an option that is never used;
- a diff unrelated to the `effort` declared in the card;
- a generality the card does not ask for;
- a new dependency the stack contract does not allow;
- dead code left "just in case".

A finding names what can be removed and what that simplifies.
