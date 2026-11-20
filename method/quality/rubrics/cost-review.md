# Rubric: the cheapest option among the robust ones

A standing role of the loop: on EVERY card, someone looks for the cheapest way to do the thing,
without ever buying that price with fragility. A project that is expensive to keep alive is not a
project worth building.

**The rule of choice.** Robustness is a FLOOR, cost is the GOAL. Among the options that pass the
floor, keep the cheapest. A cheaper option that fails the floor is discarded, not weighed.

**The robustness floor.** The option:

- fails visibly, never silently (a failure breaks nothing and is seen);
- is idempotent: a gesture replayed does not produce two effects;
- resumes after a failure in the middle;
- can be undone (rollback);
- isolates failures: one site, customer or supplier failing does not block the others.

## Two moments

1. **Before the code: the solution study.** It is written in the card, under "Proposed solution",
   before a coding agent starts.
   - **Risk low:** one line is enough ("kept X: the simplest option that passes the floor").
   - **Risk medium or high:** a table of two or three options. For each: the cost to build; the
     cost to run and maintain at 10, 100 and 500 units (sites, customers, tenants); the result
     against the robustness floor. Then the decision and the reason for it.
2. **At review: conformance.** Does the delivered code match the chosen solution? Did a cost class
   appear on the way (cost proportional to the number of units, a manual step per unit, a new
   dependency)? Is the measured cost (continuous-integration minutes, queries) close to the
   estimate? If not, the gap feeds the next estimates.

The same lens applies to the loop itself: a mechanical subtask does not need the largest model (see
the manifest's table of AI models by complexity), and a review is not launched on a change that
does not justify one.

## What to estimate

For the delivery, estimate the cost at **10, 100 and 500 units** and say which class it belongs to:
constant, proportional to the number of units (O(N)), or worse.

1. **Continuous-integration minutes** — an update that starts one workflow PER UNIT is a finding. A
   fleet-wide update should cost ONE central build plus N deployments, in batches, staggered, with a
   first trial batch; never N workflows. Compare with the monthly minutes quota of the account.
2. **Platform** — requests, database reads and writes, emails sent, calls to suppliers billed by
   usage, at the volume of 500 units.
3. **Human time** — any manual step repeated per unit (a click, a check, a reminder) is a cost that
   grows with the fleet.
4. **Moving parts** — every dependency, service or tool added is a surface to maintain (see the
   stack contract: as few dependencies as possible). At equal quality, the option with fewer parts
   wins.
5. **Cost of going back** — can a fleet-wide update be undone for less than it cost to do?
6. **Cheaper alternative** — for every finding, propose at least one alternative with its estimated
   cost, and say what it gives up.

**Output:** a table "cost at 10 / 100 / 500", the class, the best alternative, the recommendation.
Findings follow `FORMAT.md`.

Out of scope: micro-optimizations with no effect at 500 units.
