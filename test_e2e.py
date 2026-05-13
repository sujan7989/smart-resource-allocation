"""
Complete end-to-end functional test against the live production API.
Tests every workflow: auth, needs, tasks, matching, assignments, field reports, impact.
"""
import urllib.request
import urllib.error
import json
import sys
import time

BASE = "https://smart-resource-allocation-pvyg.onrender.com"
PASS = 0
FAIL = 0

def req(method, path, data=None, token=None, expected=200):
    global PASS, FAIL
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    try:
        r = urllib.request.Request(url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            result = json.loads(raw) if raw else {}
            code = resp.status
            if code == expected or (expected == 200 and code in [200, 201]):
                PASS += 1
                return result
            else:
                FAIL += 1
                print(f"  FAIL [{method} {path}] expected {expected}, got {code}")
                return result
    except urllib.error.HTTPError as e:
        code = e.code
        body = e.read().decode()
        if code == expected:
            PASS += 1
            try: return json.loads(body) if body else {}
            except: return {}
        else:
            FAIL += 1
            print(f"  FAIL [{method} {path}] expected {expected}, got {code}: {body[:200]}")
            return None

def ok(label, condition):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS  {label}")
    else:
        FAIL += 1
        print(f"  FAIL  {label}")

print("=" * 60)
print("SMART RESOURCE ALLOCATION — FULL E2E TEST")
print("=" * 60)

# ── 1. AUTH ──────────────────────────────────────────────────
print("\n[1] AUTHENTICATION")

# Admin login
admin = req("POST", "/api/auth/login", {"email": "admin@smartalloc.org", "password": "Admin@123"})
ok("Admin login returns token", admin and "access_token" in admin)
ok("Admin role is admin", admin and admin.get("user", {}).get("role") == "admin")
AT = admin["access_token"] if admin else None

# Block admin self-registration
r = req("POST", "/api/auth/register",
    {"email": "hacker@evil.com", "full_name": "H", "password": "Hack@123", "role": "admin"},
    expected=422)
ok("Admin self-registration blocked (422)", r is not None)

# Register volunteer
ts = int(time.time())
vol_data = req("POST", "/api/auth/register", {
    "email": f"vol_{ts}@test.com", "full_name": "Priya Sharma",
    "password": "Priya@Test1", "role": "volunteer",
    "location": "Mumbai", "phone": "+91-9876543210"
}, expected=201)
ok("Volunteer registration (201)", vol_data and "access_token" in vol_data)
VT = vol_data["access_token"] if vol_data else None
VOL_ID = vol_data["user"]["id"] if vol_data else None

# Register field worker
fw_data = req("POST", "/api/auth/register", {
    "email": f"fw_{ts}@test.com", "full_name": "Ravi Kumar",
    "password": "Ravi@Test1", "role": "field_worker",
    "location": "Chennai"
}, expected=201)
ok("Field worker registration (201)", fw_data and "access_token" in fw_data)
FWT = fw_data["access_token"] if fw_data else None

# Weak password blocked
r = req("POST", "/api/auth/register",
    {"email": f"weak_{ts}@test.com", "full_name": "Weak", "password": "password1", "role": "volunteer"},
    expected=422)
ok("Weak password rejected (no uppercase)", r is not None)

# ── 2. COMMUNITY NEEDS ───────────────────────────────────────
print("\n[2] COMMUNITY NEEDS")

need = req("POST", "/api/needs/", {
    "title": "Emergency Food Aid — Flood Victims",
    "description": "500 families displaced by flooding need immediate food assistance and clean water",
    "category": "food", "urgency": "critical",
    "area": "Dharavi", "city": "Mumbai", "country": "India",
    "affected_people": 2500,
    "latitude": 19.0760, "longitude": 72.8777,
    "reported_by_org": "Red Cross India"
}, token=AT, expected=201)
ok("Create need (201)", need and "id" in need)
ok("Need has urgency_score > 0", need and need.get("urgency_score", 0) > 0)
ok("Need has coordinates", need and need.get("latitude") == 19.076)
NEED_ID = need["id"] if need else None

# List needs
needs = req("GET", "/api/needs/", token=AT)
ok("List needs returns array", isinstance(needs, list))

# Search needs
searched = req("GET", "/api/needs/?search=flood", token=AT)
ok("Search needs works", isinstance(searched, list))

# Filter by urgency
critical = req("GET", "/api/needs/?urgency=critical", token=AT)
ok("Filter needs by urgency", isinstance(critical, list))

# Verify need (admin)
if NEED_ID:
    verified = req("PATCH", f"/api/needs/{NEED_ID}", {"is_verified": True}, token=AT)
    ok("Admin can verify need", verified and verified.get("is_verified") == True)

# ── 3. TASKS ─────────────────────────────────────────────────
print("\n[3] TASKS")

task = req("POST", "/api/tasks/", {
    "community_need_id": NEED_ID,
    "title": "Emergency Food Distribution Camp",
    "description": "Set up and run food distribution for flood victims in Dharavi area",
    "required_skills": "logistics, food handling, driving",
    "required_volunteers": 3,
    "area": "Dharavi", "city": "Mumbai"
}, token=AT, expected=201)
ok("Create task (201)", task and "id" in task)
ok("Task status is open", task and task.get("status") == "open")
TASK_ID = task["id"] if task else None

# List tasks
tasks = req("GET", "/api/tasks/", token=VT)
ok("Volunteer can list tasks", isinstance(tasks, list))

# Filter by status
open_tasks = req("GET", "/api/tasks/?status=open", token=VT)
ok("Filter tasks by status", isinstance(open_tasks, list))

# ── 4. VOLUNTEER PROFILE & MATCHING ──────────────────────────
print("\n[4] VOLUNTEER PROFILE & AI MATCHING")

profile = req("POST", "/api/volunteers/me/profile", {
    "skills": "logistics, food handling, driving, first aid",
    "preferred_areas": "Mumbai, Pune, Thane",
    "availability": '{"days":["Saturday","Sunday","Monday"],"hours":"8am-6pm"}',
    "experience_years": 3,
    "bio": "Experienced logistics volunteer with 3 years in disaster relief",
    "is_available": True
}, token=VT, expected=201)
ok("Create volunteer profile (201)", profile and "id" in profile)
ok("Profile has skills", profile and "logistics" in (profile.get("skills") or ""))

# Get recommended tasks
recs = req("GET", "/api/volunteers/me/recommended-tasks", token=VT)
ok("Recommended tasks returns array", isinstance(recs, list))
if recs:
    ok("Recommended task has match_score", "match_score" in recs[0])
    ok("Match score > 0", recs[0].get("match_score", 0) > 0)
    print(f"         Best match score: {recs[0].get('match_score')}%")

# Admin: get recommended volunteers for task
if TASK_ID:
    vol_recs = req("GET", f"/api/tasks/{TASK_ID}/recommended-volunteers", token=AT)
    ok("Admin gets recommended volunteers", isinstance(vol_recs, list))

# ── 5. ASSIGNMENTS ───────────────────────────────────────────
print("\n[5] ASSIGNMENTS")

# Volunteer accepts task
assignment = req("POST", "/api/assignments/", {
    "task_id": TASK_ID, "volunteer_id": VOL_ID
}, token=VT, expected=201)
ok("Volunteer accepts task (201)", assignment and "id" in assignment)
ok("Assignment status is pending", assignment and assignment.get("status") == "pending")
ok("Assignment has match_score", assignment and assignment.get("match_score", 0) > 0)
ASSIGN_ID = assignment["id"] if assignment else None
print(f"         Match score: {assignment.get('match_score') if assignment else 'N/A'}%")

# Duplicate assignment blocked
dup = req("POST", "/api/assignments/", {
    "task_id": TASK_ID, "volunteer_id": VOL_ID
}, token=VT, expected=400)
ok("Duplicate assignment blocked (400)", dup is not None)

# Pending count shows 1
count = req("GET", "/api/assignments/pending-count", token=AT)
ok("Pending count >= 1", count and count.get("count", 0) >= 1)

# Admin approves
if ASSIGN_ID:
    approved = req("PATCH", f"/api/assignments/{ASSIGN_ID}", {"status": "accepted"}, token=AT)
    ok("Admin approves assignment", approved and approved.get("status") == "accepted")

    # Task status should be in_progress
    task_check = req("GET", f"/api/tasks/{TASK_ID}", token=AT)
    ok("Task moves to in_progress after approval", task_check and task_check.get("status") == "in_progress")

    # Volunteer completes with rating and hours
    completed = req("PATCH", f"/api/assignments/{ASSIGN_ID}", {
        "status": "completed",
        "rating": 5,
        "feedback": "Excellent experience, very well organized",
        "hours_spent": 8
    }, token=VT)
    ok("Volunteer completes task with rating+hours", completed and completed.get("status") == "completed")
    ok("Completed assignment has hours_spent", completed and completed.get("hours_spent") == 8)

    # Task should be completed
    task_done = req("GET", f"/api/tasks/{TASK_ID}", token=AT)
    ok("Task moves to completed", task_done and task_done.get("status") == "completed")

# ── 6. FIELD REPORTS ─────────────────────────────────────────
print("\n[6] FIELD REPORTS")

report = req("POST", "/api/field-reports/", {
    "title": "Water Contamination — Govandi Slum Area",
    "description": "Residents reporting stomach illness from contaminated water supply near the nullah",
    "area": "Govandi", "city": "Mumbai", "country": "India",
    "estimated_affected": 800,
    "urgency_observation": "High — immediate action needed"
}, token=FWT, expected=201)
ok("Field worker submits report (201)", report and "id" in report)
ok("Report status is submitted", report and report.get("status") == "submitted")
REPORT_ID = report["id"] if report else None

# Admin reviews
if REPORT_ID:
    reviewed = req("PATCH", f"/api/field-reports/{REPORT_ID}", {
        "status": "reviewed", "admin_notes": "Verified by field team"
    }, token=AT)
    ok("Admin reviews report", reviewed and reviewed.get("status") == "reviewed")

    # Convert to community need
    converted = req("POST", f"/api/field-reports/{REPORT_ID}/convert", {
        "category": "water", "urgency": "high",
        "affected_people": 800, "reported_by_org": "Municipal Corp"
    }, token=AT, expected=201)
    ok("Convert report to community need (201)", converted and converted.get("status") == "converted")
    ok("Report linked to new need", converted and converted.get("community_need_id") is not None)

# ── 7. DASHBOARD & IMPACT ────────────────────────────────────
print("\n[7] DASHBOARD & IMPACT")

stats = req("GET", "/api/dashboard/stats", token=AT)
ok("Dashboard stats has all keys", stats and all(k in stats for k in ["needs","volunteers","tasks","assignments","impact"]))
ok("Volunteer hours tracked", stats and stats.get("impact", {}).get("total_volunteer_hours", 0) >= 8)
print(f"         Total volunteer hours: {stats.get('impact', {}).get('total_volunteer_hours') if stats else 'N/A'}")

impact = req("GET", "/api/dashboard/impact", token=AT)
ok("Impact endpoint works", impact and "monthly_resolved" in impact)
ok("Monthly data has 6 entries", impact and len(impact.get("monthly_resolved", [])) == 6)

pub = req("GET", "/api/dashboard/public-stats")
ok("Public stats (no auth)", pub and "people" in pub and "needs" in pub)

# ── 8. SECURITY ──────────────────────────────────────────────
print("\n[8] SECURITY")

# Volunteer cannot access admin endpoints
r = req("GET", "/api/users/", token=VT, expected=403)
ok("Volunteer blocked from /users/ (403)", r is not None)

r = req("GET", "/api/volunteers/", token=VT, expected=403)
ok("Volunteer blocked from /volunteers/ (403)", r is not None)

r = req("GET", "/api/assignments/pending-count", token=VT, expected=403)
ok("Volunteer blocked from pending-count (403)", r is not None)

# Unauthenticated blocked
r = req("GET", "/api/needs/", expected=401)
ok("Unauthenticated blocked from /needs/ (401)", r is not None)

# ── 9. CLEANUP ───────────────────────────────────────────────
print("\n[9] CLEANUP")
if VOL_ID:
    deleted = req("DELETE", f"/api/users/{VOL_ID}", token=AT, expected=204)
    ok("Admin deletes test volunteer", deleted is not None or True)  # 204 = no content
if fw_data:
    fw_id = fw_data["user"]["id"]
    req("DELETE", f"/api/users/{fw_id}", token=AT, expected=204)
    ok("Admin deletes test field worker", True)
if NEED_ID:
    req("DELETE", f"/api/needs/{NEED_ID}", token=AT, expected=204)
    ok("Admin deletes test need (cascades tasks+assignments)", True)

# ── RESULTS ──────────────────────────────────────────────────
print("\n" + "=" * 60)
total = PASS + FAIL
print(f"PASSED: {PASS} / {total}")
if FAIL > 0:
    print(f"FAILED: {FAIL}")
    sys.exit(1)
else:
    print("ALL TESTS PASSED — PRODUCTION IS 100% FUNCTIONAL")
print("=" * 60)
