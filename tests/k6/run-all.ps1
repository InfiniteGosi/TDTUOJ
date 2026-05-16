#!/usr/bin/env pwsh
# Run all rate-limit k6 tests sequentially.
# Waits 65s between tests so Redis buckets reset between each scenario.
#
# Usage:
#   .\tests\k6\run-all.ps1
#   .\tests\k6\run-all.ps1 -Email user@example.com -Password secret  # includes authed tests

param(
    [string]$Email = "",
    [string]$Password = "",
    [string]$BaseUrl = "http://localhost:8090/api"
)

$k6 = if (Get-Command k6 -ErrorAction SilentlyContinue) { "k6" } else { "C:\Program Files\k6\k6.exe" }
$dir = "$PSScriptRoot"
$delay = 65  # seconds — enough for 60s bucket window to reset

function Run-Test {
    param([string]$Script, [hashtable]$Env = @{})
    $envArgs = @()
    foreach ($kv in $Env.GetEnumerator()) {
        $envArgs += "-e"
        $envArgs += "$($kv.Key)=$($kv.Value)"
    }
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Running: $Script" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    & $k6 run @envArgs $Script
}

$baseEnv = @{ BASE_URL = $BaseUrl }
$authEnv  = $baseEnv + @{ EMAIL = $Email; PASSWORD = $Password }

Run-Test "$dir\04-headers-check.js" $baseEnv

Write-Host "`nWaiting ${delay}s for buckets to reset..." -ForegroundColor Yellow
Start-Sleep -Seconds $delay

Run-Test "$dir\01-auth-throttle.js" $baseEnv

Write-Host "`nWaiting ${delay}s for buckets to reset..." -ForegroundColor Yellow
Start-Sleep -Seconds $delay

Run-Test "$dir\02-ai-deny-anon.js" $baseEnv

Write-Host "`nWaiting ${delay}s for buckets to reset..." -ForegroundColor Yellow
Start-Sleep -Seconds $delay

$sub03Env = if ($Email -and $Password) { $authEnv } else { $baseEnv }
Run-Test "$dir\03-submission-throttle.js" $sub03Env

if ($Email -and $Password) {
    Write-Host "`nWaiting ${delay}s for buckets to reset..." -ForegroundColor Yellow
    Start-Sleep -Seconds $delay
    Run-Test "$dir\05-ai-authed-quota.js" $authEnv
} else {
    Write-Host "`nSkipping authenticated tests (pass -Email and -Password to enable)." -ForegroundColor DarkGray
}

Write-Host "`nAll tests done." -ForegroundColor Green
