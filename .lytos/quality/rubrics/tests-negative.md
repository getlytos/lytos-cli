# Rubric: tests of the forbidden cases

*For a project that binds `tests-negative` as a `reviewer` line: no tool can tell that a refusal
is tested, so a model reads the diff against this rubric.*

For every refusal rule of the delivery (permission, validation, invariant, expiry) there is a test
of the forbidden case. An invariant (a single owner, never remove the last one) is tested at the
storage level AND at the domain level. A test that only checks the happy path of a refusal rule is
a finding.
