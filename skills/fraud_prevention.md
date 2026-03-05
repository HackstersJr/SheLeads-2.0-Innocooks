# Fraud Prevention Rules

## Household Limit
- Maximum 2 accounts per `device_id`.

## Emergency Loan Protections
- `active_emergency_loans` must equal `0`.
- `lifetime_emergency_loans` must be `<= 2`.

## UPI Capital Flow Protection
- `aadhaar_name` must match the registered UPI name.

## Monitoring
- Suspicious activity must be logged.
