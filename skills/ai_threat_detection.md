# AI Threat Detection Pipeline

## Processing Steps
1. Keyword pre-filter
2. LLM analysis

## Keywords
- kill
- harm
- send money now
- come to your house
- beat you

## Required LLM Output (Strict JSON)
```json
{
  "is_threat_detected": true,
  "bns_section": "string",
  "draft_fir_text": "string"
}
```

## Parsing Fallback
- If parsing fails, return:
  - `is_threat_detected = false`
