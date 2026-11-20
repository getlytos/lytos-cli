# Rubric: security

Report only what is exploitable (confidence at least 0.8).

1. **Account isolation** — one account never reads or writes another account's resource. A foreign
   resource answers "not found", never "forbidden" (its existence is not revealed). Look for an
   identifier taken from the URL or the body without an ownership check.
2. **Authorization** — every route and every gesture goes through the project's single
   authorization point. No role check written inline at the call site. A request from a role that
   may only observe is refused on the server.
3. **Injection** — parameterized queries, no string-built SQL, no shell or command interpolation,
   no header injection from user input (email headers, HTTP headers).
4. **Output encoding** — templates escape by default. Any raw HTML is justified and comes from a
   trusted source.
5. **Tokens and links** — limited lifetime; single use when the gesture is single (invitation,
   payment, authorization); the old token is invalidated when a new one is issued.
6. **Payment data** — never a full card number displayed or logged; no write to the payment
   provider outside the intended path.
7. **Logging** — no personal data that is not needed; any gesture an administrator makes on behalf
   of a customer is logged.
8. **Irreversible gestures** — a confirmation, and a refusal to replay (double send, double
   payment).
9. **Secrets** — none in code, cards or demo data.

Out of scope: theoretical hardening, rate limiting, resource exhaustion.
