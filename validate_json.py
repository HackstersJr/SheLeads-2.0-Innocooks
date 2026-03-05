import json
data = json.load(open('app/data/legal_sections.json', encoding='utf-8'))
print(f"JSON valid — {len(data)} sections loaded")
for d in data:
    print(f"  - {d['section']}: {d['title']}")
