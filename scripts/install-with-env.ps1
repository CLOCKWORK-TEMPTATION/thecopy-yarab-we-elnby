param(
    [switch]$FrozenLockfile
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$EnvFile = Join-Path $Root ".env"

# Load .env into current process
if (Test-Path $EnvFile) {
    $lines = Get-Content $EnvFile
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ($trimmed -and (-not $trimmed.StartsWith('#'))) {
            $idx = $trimmed.IndexOf('=')
            if ($idx -gt 0) {
                $key = $trimmed.Substring(0, $idx).Trim()
                $val = $trimmed.Substring($idx + 1).Trim()
                [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
            }
        }
    }
    Write-Host "[install-with-env] Loaded .env into current process" -ForegroundColor Green
}
else {
    Write-Host "[install-with-env] WARNING: No .env file found at $EnvFile" -ForegroundColor Yellow
}

# Verify TIPTAP_PRO_TOKEN
$token = $env:TIPTAP_PRO_TOKEN
if ($token) {
    $len = $token.Length
    if ($len -gt 8) {
        $masked = $token.Substring(0, 8) + "..."
    }
    else {
        $masked = "***"
    }
    Write-Host "[install-with-env] TIPTAP_PRO_TOKEN is set ($masked)" -ForegroundColor Green
}
else {
    Write-Host "[install-with-env] WARNING: TIPTAP_PRO_TOKEN is not set" -ForegroundColor Yellow
}

# Run pnpm install
Set-Location $Root
if ($FrozenLockfile) {
    Write-Host "[install-with-env] Running: pnpm install --frozen-lockfile" -ForegroundColor Cyan
    pnpm install --frozen-lockfile
}
else {
    Write-Host "[install-with-env] Running: pnpm install" -ForegroundColor Cyan
    pnpm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[install-with-env] pnpm install failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[install-with-env] Done - all packages installed successfully" -ForegroundColor Green
