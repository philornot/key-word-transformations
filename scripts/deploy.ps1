# deploy.ps1 — one-click deploy wrapper for PyCharm on Windows.
#
# Accepts the same flags as deploy.sh:
#   .\deploy.ps1          → full deploy (build + sync + restart)
#   .\deploy.ps1 --sync   → skip build, rsync + restart only
#   .\deploy.ps1 --check  → dry run, nothing changed on remote

param(
    [string]$Mode = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Locate Git Bash ───────────────────────────────────────────────────────────

$bashCandidates = @(
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files (x86)\Git\bin\bash.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
)

$bash = $bashCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $bash) {
    Write-Host ""
    Write-Host "ERROR: Git Bash not found." -ForegroundColor Red
    Write-Host "Install Git for Windows from https://git-scm.com" -ForegroundColor Yellow
    exit 1
}

# ── Patch PATH so bash can find bun / node / yq ──────────────────────────────

$extraPaths = @(
    "$env:USERPROFILE\.bun\bin",
    "$env:APPDATA\npm",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages",
    "C:\Program Files\nodejs"
)

foreach ($p in $extraPaths) {
    if (Test-Path $p) {
        $env:PATH = "$p;$env:PATH"
    }
}

# ── Build flag string ─────────────────────────────────────────────────────────

$flag = switch ($Mode) {
    "--sync"  { "--sync" }
    "--check" { "--check" }
    default   { "" }
}

# ── Run ──────────────────────────────────────────────────────────────────────

$projectRoot = (Get-Location).Path -replace '\\', '/' -replace '^([A-Za-z]):', { "/$(($_.Groups[1].Value).ToLower())" }
$bashCmd = "cd '$projectRoot' && bash deploy.sh $flag".Trim()

Write-Host ""
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  angmatura — deploying..." -ForegroundColor Cyan
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

& $bash -c $bashCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Deploy failed (exit $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}