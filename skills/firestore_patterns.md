# Firestore Patterns

## Data Modeling Rules
- Use collections for main entities.
- Store references using IDs.
- Avoid deeply nested documents.
- Validate document existence before updates.
- Use atomic increments for counters.

## Audit Safety
- Financial actions must always be logged in audit collections.
