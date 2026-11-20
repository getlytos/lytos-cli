# Rubric: fidelity to the mock-up

Compare the render (screenshots of the local preview: desktop, mobile at 390 px, light and dark) to
the board of the mock-up: text, order, components, states.

Sort every gap into one of four classes:

- **Fidelity gap** — the board says X, the render does Y. To fix.
- **Gap justified by what exists** — the board is inconsistent with the product's data or rules. Do
  not fix it silently: write a ready-to-paste prompt for the design tool, and note the gap in the
  card.
- **Missing from the board** — a state or a screen the board does not show. Same treatment: a
  prompt for the design tool.
- **Common-sense addition** — a sensible function the board suggests without drawing it. Build it,
  and note it.

Also check: the exact texts; the design system's tokens (no raw value); the library's components
reused rather than redrawn; the design system's own rules (for example how statuses are shown).
