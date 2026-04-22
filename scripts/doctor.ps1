#Requires -Version 5.1
<#
.SYNOPSIS
    doctor.ps1 - Preflight check for The Copy platform (PowerShell equivalent of doctor.sh)

.DESCRIPTION
    Verifies all required services and configuration before startup.
    Checks environment variables, service connectivity, port availability,
    static assets, and Sentry configuration.

.EXAMPLE
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/doctor.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'SilentlyContinue'

$Script:PASS = 0
$Script:FAIL = 0
$Script:WARN = 0

function Write-Pass([string]$Name) {
    Write-Host "  [OK] $Name" -ForegroundColor Green
    $Script:PASS++
}

function Write-Fail([string]$Name) {
    Write-Host "  [FAIL] $Name" -ForegroundColor Red
    $Script:FAIL++
}

function Write-Warn([string]$Name) {
    Write-Host "  [WARN] $Name (optional)" -ForegroundColor Yellow
    $Script:WARN++
}

function Write-Skip([string]$Name) {
    Write-Host "  [SKIP] $Name" -ForegroundColor DarkGray
}

function Invoke-Check([string]$Name, [scriptblock]$Test) {
    try {
        $result = & $Test
        if ($result) {
            Write-Pass $Name
        } else {
            Write-Fail $Name
        }
    } catch {
        Write-Fail $Name
    }
}

function Invoke-WarnCheck([string]$Name, [scriptblock]$Test) {
    try {
        $result = & $Test
        if ($result) {
            Write-Pass $Name
        } else {
            Write-Warn $Name
        }
    } catch {
        Write-Warn $Name
    }
}

# ── Banner ────────────────────────────────────────────────────────────────────
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  The Copy - Doctor / Preflight Check" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Load .env ─────────────────────────────────────────────────────────────────
$EnvFile = Join-Path (Join-Path $PSScriptRoot "..") ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key   = $Matches[1].Trim()
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            if (-not [System.Environment]::GetEnvironmentVariable($key)) {
                [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
            }
        }
    }
}

# Helper to read env vars safely
function Get-Env([string]$Name) {
    $val = [System.Environment]::GetEnvironmentVariable($Name)
    if ($null -eq $val) { return '' }
    return $val
}

# ── Environment ───────────────────────────────────────────────────────────────
Write-Host "▸ Environment" -ForegroundColor White

Invoke-Check "NODE_ENV is set"                         { (Get-Env 'NODE_ENV') -ne '' }
Invoke-Check "DATABASE_URL is set"                     { (Get-Env 'DATABASE_URL') -ne '' }
Invoke-Check "JWT_SECRET is set"                       { (Get-Env 'JWT_SECRET') -ne '' }
Invoke-Check "GEMINI_API_KEY or GOOGLE_GENAI_API_KEY"  {
    (Get-Env 'GEMINI_API_KEY') -ne '' -or (Get-Env 'GOOGLE_GENAI_API_KEY') -ne ''
}

Write-Host ""

# ── Services ──────────────────────────────────────────────────────────────────
Write-Host "▸ Services" -ForegroundColor White

# PostgreSQL
$dbUrl    = Get-Env 'DATABASE_URL'
$dbHost   = if ($dbUrl -match '@([^:]+):') { $Matches[1] } else { 'localhost' }
$dbPort   = if ($dbUrl -match ':(\d+)/') { $Matches[1] } else { '5433' }

Invoke-Check "PostgreSQL (${dbHost}:${dbPort})" {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $tcp.Connect($dbHost, [int]$dbPort)
        $tcp.Connected
    } finally {
        $tcp.Dispose()
    }
}

# Redis
$redisFlag = Get-Env 'REDIS_ENABLED'
if ($redisFlag -ne 'false') {
    $redisHost = if ((Get-Env 'REDIS_HOST') -ne '') { Get-Env 'REDIS_HOST' } else { 'localhost' }
    $redisPort = if ((Get-Env 'REDIS_PORT') -ne '') { Get-Env 'REDIS_PORT' } else { '6379' }

    Invoke-Check "Redis (${redisHost}:${redisPort})" {
        $tcp = New-Object System.Net.Sockets.TcpClient
        try {
            $tcp.Connect($redisHost, [int]$redisPort)
            $tcp.Connected
        } finally {
            $tcp.Dispose()
        }
    }
} else {
    Write-Skip "Redis (disabled via REDIS_ENABLED=false)"
}

# Weaviate
$weaviateUrl = if ((Get-Env 'WEAVIATE_URL') -ne '') { Get-Env 'WEAVIATE_URL' } else { 'http://localhost:8080' }
$weaviateReq = (Get-Env 'WEAVIATE_REQUIRED') -eq 'true'

$weaviateCheck = {
    try {
        $resp = Invoke-WebRequest -Uri "${weaviateUrl}/v1/.well-known/ready" -UseBasicParsing -TimeoutSec 5
        $resp.StatusCode -eq 200
    } catch {
        $false
    }
}

if ($weaviateReq) {
    Invoke-Check "Weaviate ($weaviateUrl)" $weaviateCheck
} else {
    Invoke-WarnCheck "Weaviate ($weaviateUrl)" $weaviateCheck
}

Write-Host ""

# ── Ports ─────────────────────────────────────────────────────────────────────
Write-Host "▸ Ports" -ForegroundColor White

Invoke-Check "Port 3001 (backend) is free" {
    -not (Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue)
}
Invoke-Check "Port 5000 (frontend) is free" {
    -not (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue)
}

Write-Host ""

# ── Static Assets ─────────────────────────────────────────────────────────────
Write-Host "▸ Static Assets" -ForegroundColor White

$repoRoot = Join-Path $PSScriptRoot ".."
$assetBase = Join-Path (Join-Path (Join-Path (Join-Path (Join-Path $repoRoot "apps") "web") "public") "assets") "v-shape"

@(
    'v-shape-card-1.png'
    'v-shape-card-2.png'
    'v-shape-card-3.png'
    'v-shape-card-4.png'
    'v-shape-card-5.png'
    'v-shape-card-6.png'
    'v-shape-card-7.jpg'
) | ForEach-Object {
    $asset = $_
    Invoke-Check $asset { Test-Path (Join-Path $assetBase $asset) }
}

Write-Host ""

# ── Sentry ────────────────────────────────────────────────────────────────────
Write-Host "▸ Sentry" -ForegroundColor White

$nodeEnv = Get-Env 'NODE_ENV'
if ($nodeEnv -eq 'production') {
    Invoke-Check "SENTRY_DSN (required in production)"             { (Get-Env 'SENTRY_DSN') -ne '' }
    Invoke-Check "NEXT_PUBLIC_SENTRY_DSN (required in production)" { (Get-Env 'NEXT_PUBLIC_SENTRY_DSN') -ne '' }
} else {
    Write-Skip "Sentry DSN (not required in development)"
}

Write-Host ""

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Results: $($Script:PASS) passed, $($Script:FAIL) failed, $($Script:WARN) warnings" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan

if ($Script:FAIL -gt 0) {
    Write-Host ""
    Write-Host "  [FAIL] Preflight FAILED — fix the issues above before starting." -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "  [OK] All checks passed — ready to start." -ForegroundColor Green
    exit 0
}
