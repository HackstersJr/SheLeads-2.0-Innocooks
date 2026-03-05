# Fintech Trust Scoring

## Trust Defaults
- Users start with `trust_score = 20`.

## Trust Events
- Chit payments increase `trust_score` by `+20`.
- Loan market unlock condition: `trust_score >= 80`.
- Emergency loan default penalty: `trust_score = -500`.

## Enforcement Rules
- All trust score updates must go through the Trust Engine.
- Trust score must never be modified directly inside API routes.
- Every trust score change must create a `TrustEvents` record.
