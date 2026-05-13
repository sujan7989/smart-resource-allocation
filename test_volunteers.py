"""Test the volunteers endpoint live and get exact error."""
import urllib.request
import json

BASE = "https://smart-resource-allocation-pvyg.onrender.com"

# Login
req = urllib.request.Request(
    f"{BASE}/api/auth/login",
    data=json.dumps({"email": "admin@smartalloc.org", "password": "Admin@123"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read())["access_token"]
print(f"Token: {token[:30]}...")

# Test volunteers
req2 = urllib.request.Request(
    f"{BASE}/api/volunteers/",
    headers={"Authorization": f"Bearer {token}"},
    method="GET"
)
try:
    with urllib.request.urlopen(req2) as resp:
        data = json.loads(resp.read())
        print(f"Volunteers OK: {len(data)} volunteers")
        print(json.dumps(data[:1], indent=2))
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Volunteers FAILED {e.code}: {body}")
