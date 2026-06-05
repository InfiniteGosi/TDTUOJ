<#
.SYNOPSIS
  Run a TDTUOJ stress scenario with k6 while watching Grafana (localhost:3000).

.EXAMPLE
  .\run-stress.ps1 -Scenario browse
  .\run-stress.ps1 -Scenario submit -Email khangho150@gmail.com -Password 123456 -ProblemId 3
  .\run-stress.ps1 -Scenario ratelimit

.NOTES
  k6 binary expected at "C:\Program Files\k6\k6.exe" (same as run-all.ps1).
  For the 'submit' scenario, run the backend with rate limiting OFF to see a real
  queue build-up:  $env:RATELIMIT_ENABLED='false'; ./mvnw spring-boot:run
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('browse', 'submit', 'ratelimit')]
  [string]$Scenario,

  [string]$Email,
  [string]$Password,
  [int]$ProblemId = 3,
  [int]$Peak = 100,
  [int]$Rate = 20,
  [int]$Vus = 50
)

$k6 = "C:\Program Files\k6\k6.exe"
if (-not (Test-Path $k6)) { throw "k6 not found at $k6" }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path

switch ($Scenario) {
  'browse' {
    & $k6 run -e PEAK=$Peak (Join-Path $here 'browse.js')
  }
  'submit' {
    if (-not $Email -or -not $Password) { throw "submit needs -Email and -Password" }
    & $k6 run -e EMAIL=$Email -e PASSWORD=$Password -e PROBLEM_ID=$ProblemId -e RATE=$Rate (Join-Path $here 'submit.js')
  }
  'ratelimit' {
    & $k6 run -e VUS=$Vus (Join-Path $here 'ratelimit-burst.js')
  }
}
