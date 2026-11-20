# Format of a review (every rubric)

A review is **read-only**: it writes no fix. Inputs: the card (its Definition of Done), the diff
of the delivery, and the rubric.

For every finding:

- **severity** — high, medium or low;
- **confidence** — from 0 to 1. Below 0.7, do not report it;
- **evidence** — file and line;
- **scenario** — the input, then the effect;
- **fix** — one sentence.

Then a section titled "What I could not verify". A review that finds nothing says so, and still
fills that section.

Rules:

1. No finding without evidence.
2. A high-severity finding blocks the delivery until it is handled, or until the owner accepts a
   justified deviation in writing.
3. A finding already covered by an automated test is not repeated.
4. A finding that comes back twice becomes an automated test.
5. The review never ticks a `verify: human` item: that call is the owner's.
