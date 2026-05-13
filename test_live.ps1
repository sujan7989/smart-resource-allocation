$BASE = "https://smart-resource-allocation-pvyg.onrender.com"

Write-Host "=== LIVE API TEST ===" -ForegroundColor Cyan
Write-Host ""

# Login
try {
    $loginResp = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST -Body '{"email":"admin@smartalloc.org","password":"Admin@123"}' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    $token = ($loginResp.Content | ConvertFrom-Json).access_token
    Write-Host "PASS  [1]  Admin Login (200)" -ForegroundColor Green
} catch {
    Write-Host "FAIL  [1]  Admin Login ($($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
    exit
}

$h = @{"Authorization"="Bearer $token"}

$tests = @(
    @{n="[2]  Health (no auth)";          u="$BASE/health";                              a=$false},
    @{n="[3]  Public Stats (no auth)";    u="$BASE/api/dashboard/public-stats";          a=$false},
    @{n="[4]  Dashboard Stats";           u="$BASE/api/dashboard/stats";                 a=$true},
    @{n="[5]  Needs by Category";         u="$BASE/api/dashboard/needs-by-category";     a=$true},
    @{n="[6]  Needs by Urgency";          u="$BASE/api/dashboard/needs-by-urgency";      a=$true},
    @{n="[7]  Needs by City";             u="$BASE/api/dashboard/needs-by-city";         a=$true},
    @{n="[8]  Top Urgent Needs";          u="$BASE/api/dashboard/top-urgent-needs";      a=$true},
    @{n="[9]  Impact Report";             u="$BASE/api/dashboard/impact";                a=$true},
    @{n="[10] List Needs";                u="$BASE/api/needs/";                          a=$true},
    @{n="[11] List Tasks";                u="$BASE/api/tasks/";                          a=$true},
    @{n="[12] List Volunteers";           u="$BASE/api/volunteers/";                     a=$true},
    @{n="[13] List Users";                u="$BASE/api/users/";                          a=$true},
    @{n="[14] List Field Reports";        u="$BASE/api/field-reports/";                  a=$true},
    @{n="[15] List Assignments";          u="$BASE/api/assignments/";                    a=$true},
    @{n="[16] Pending Count";             u="$BASE/api/assignments/pending-count";       a=$true},
    @{n="[17] My Profile";                u="$BASE/api/users/me";                        a=$true}
)

$pass = 1; $fail = 0

foreach ($t in $tests) {
    try {
        if ($t.a) { $r = Invoke-WebRequest -Uri $t.u -Headers $h -UseBasicParsing -ErrorAction Stop }
        else      { $r = Invoke-WebRequest -Uri $t.u -UseBasicParsing -ErrorAction Stop }
        Write-Host "PASS  $($t.n) ($($r.StatusCode))" -ForegroundColor Green
        $pass++
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "FAIL  $($t.n) ($code)" -ForegroundColor Red
        $fail++
    }
}

# Security: admin self-registration must be blocked
try {
    Invoke-WebRequest -Uri "$BASE/api/auth/register" -Method POST -Body '{"email":"hacker@evil.com","full_name":"H","password":"Hack@123","role":"admin"}' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop | Out-Null
    Write-Host "FAIL  [18] Admin self-reg block (should be 422)" -ForegroundColor Red
    $fail++
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 422) {
        Write-Host "PASS  [18] Admin self-reg blocked (422)" -ForegroundColor Green
        $pass++
    } else {
        Write-Host "FAIL  [18] Admin self-reg block (got $code)" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "PASSED: $pass / $($pass + $fail)" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Yellow"})
if ($fail -gt 0) { Write-Host "FAILED: $fail" -ForegroundColor Red }
Write-Host "================================" -ForegroundColor Cyan
