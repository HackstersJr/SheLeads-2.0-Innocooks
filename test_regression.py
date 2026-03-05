import urllib.request, json

def test(label, text):
    body = json.dumps({"text": text}).encode()
    req = urllib.request.Request(
        "http://localhost:8001/ai/analyze-text",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read())["data"]
    print(f"{label}: threat={d['threat_detected']} | type={d['threat_type']} | severity={d['severity']}")

test("[1] RAPE     ", "i have been raped by the vendor")
test("[2] SAFE     ", "Thank you for helping me apply for the loan")
test("[3] PHYSICAL ", "the loan agent beat me yesterday")
test("[4] EXTORTION", "if you dont repay the money I will harm your family")
