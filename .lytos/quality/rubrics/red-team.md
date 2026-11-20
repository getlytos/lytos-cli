# Rubric: red team (abuse scenarios)

Try to break the delivery. For each scenario tried: the input, the effect, the evidence.

1. One account reads or modifies another account (identifiers guessed in the URL or the body).
2. A role performs a gesture that is not its own, with a hand-written request.
3. A link that was already used, has expired or was reissued is replayed.
4. A gesture is sent twice (double click, replay): double payment, double email.
5. Limit values: an amount of zero, negative or huge; an empty or a very long string; hostile
   characters.
6. Inconsistent states: remove or demote the last owner, delete what is still in use.
7. Concurrency: two simultaneous gestures on the same row.
8. An email triggered by user input carries no header injection.

A probe that proves a defect is archived as a `.txt` file under `.lytos/review/<date>/`. It never
enters the test suite while the defect exists: a red test would block every delivery that follows.
