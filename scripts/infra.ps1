# infra.ps1 - Manage infrastructure services for The Copy
# Services: PostgreSQL 16 | Redis 7 | Weaviate 1.28.4

param(
    [Parameter(Position = 0)]
    [ValidateSet('up', 'down', 'status', 'logs', 'reset', 'help')]
    [string]$Command = 'help',

    [Parameter(Position = 1)]
    [string]$ServiceName = ''
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectRoot 'docker-compose.infra.yml'
$HealthFmt = '{{.State.Health.Status}}'

function Write-Msg([string]$Tag, [string]$Msg, [string]$Color = 'White') {
    Write-Host "[$Tag] $Msg" -ForegroundColor $Color
}

function Test-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Msg 'ERROR' 'Docker is not installed.' 'Red'
        exit 1
    }
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Msg 'ERROR' 'Docker daemon is not running.' 'Red'
        exit 1
    }
}

function Invoke-Compose([string[]]$ComposeArgs) {
    & docker compose -f $ComposeFile @ComposeArgs
    if ($LASTEXITCODE -ne 0) {
        $joined = $ComposeArgs -join ' '
        Write-Msg 'ERROR' "Command failed: docker compose $joined" 'Red'
        exit $LASTEXITCODE
    }
}

function Get-ServiceHealth([string]$Svc) {
    $cid = docker compose -f $ComposeFile ps -q $Svc 2>$null
    if ([string]::IsNullOrEmpty($cid)) { return 'missing' }
    $h = docker inspect --format $HealthFmt $cid 2>$null
    if ([string]::IsNullOrEmpty($h)) { return 'unknown' }
    return $h.Trim()
}

function Wait-ForHealthy {
    $svcs = @('postgres', 'redis', 'weaviate')
    $maxWait = 120
    $interval = 5

    Write-Msg 'INFO' "Waiting for services to be healthy (max ${maxWait}s)..." 'Cyan'

    foreach ($svc in $svcs) {
        $waited = 0
        Write-Host "  $svc " -NoNewline

        while ($true) {
            $h = Get-ServiceHealth $svc

            if ($h -eq 'missing') {
                Write-Host 'NOT FOUND' -ForegroundColor Red
                break
            }
            if ($h -eq 'healthy') {
                Write-Host 'OK' -ForegroundColor Green
                break
            }
            if ($h -eq 'unhealthy') {
                Write-Host 'UNHEALTHY' -ForegroundColor Red
                exit 1
            }
            if ($waited -ge $maxWait) {
                Write-Host 'TIMEOUT' -ForegroundColor Yellow
                break
            }

            Write-Host '.' -NoNewline
            Start-Sleep -Seconds $interval
            $waited += $interval
        }
    }
}

function Invoke-Up {
    Test-Docker
    Write-Msg 'INFO' 'Starting infrastructure services...' 'Cyan'
    Invoke-Compose @('up', '-d')
    Write-Host ''
    Wait-ForHealthy
    Write-Host ''
    Write-Msg 'OK' 'All services are running!' 'Green'
    Write-Host '  PostgreSQL  -> localhost:5433' -ForegroundColor Blue
    Write-Host '  Redis       -> localhost:6379' -ForegroundColor Blue
    Write-Host '  Weaviate    -> http://localhost:8080' -ForegroundColor Blue
    Write-Host ''
}

function Invoke-Down {
    Test-Docker
    Write-Msg 'INFO' 'Stopping services...' 'Cyan'
    Invoke-Compose @('down')
    Write-Msg 'OK' 'All services stopped.' 'Green'
}

function Invoke-Status {
    Test-Docker
    Write-Msg 'INFO' 'Service status:' 'Cyan'
    Write-Host ''
    Invoke-Compose @('ps')
    Write-Host ''

    foreach ($svc in @('postgres', 'redis', 'weaviate')) {
        $h = Get-ServiceHealth $svc
        Write-Host "  ${svc}: " -NoNewline
        switch ($h) {
            'healthy'   { Write-Host 'healthy'   -ForegroundColor Green }
            'unhealthy' { Write-Host 'unhealthy' -ForegroundColor Red }
            'starting'  { Write-Host 'starting'  -ForegroundColor Yellow }
            'missing'   { Write-Host 'stopped'   -ForegroundColor Red }
            default     { Write-Host $h          -ForegroundColor Yellow }
        }
    }
    Write-Host ''
}

function Invoke-Logs {
    Test-Docker
    if (-not [string]::IsNullOrEmpty($ServiceName)) {
        Write-Msg 'INFO' "Logs for: $ServiceName" 'Cyan'
        & docker compose -f $ComposeFile logs -f --tail=100 $ServiceName
    } else {
        Write-Msg 'INFO' 'All logs (last 50 lines):' 'Cyan'
        Invoke-Compose @('logs', '--tail=50')
    }
}

function Invoke-Reset {
    Test-Docker
    Write-Msg 'WARN' 'This will DELETE all PostgreSQL, Redis, and Weaviate data!' 'Yellow'
    $confirm = Read-Host 'Type yes to continue'
    if ($confirm -ne 'yes' -and $confirm -ne 'y') {
        Write-Msg 'INFO' 'Cancelled.' 'Cyan'
        return
    }
    Write-Msg 'INFO' 'Stopping services and removing volumes...' 'Cyan'
    Invoke-Compose @('down', '-v')
    Write-Msg 'INFO' 'Restarting services...' 'Cyan'
    Invoke-Up
}

function Show-Help {
    Write-Host ''
    Write-Host 'Usage: .\scripts\infra.ps1 <command>' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  up       Start all infrastructure services'
    Write-Host '  down     Stop all services'
    Write-Host '  status   Show service health status'
    Write-Host '  logs     Show logs (e.g. .\scripts\infra.ps1 logs redis)'
    Write-Host '  reset    Full reset - deletes all data'
    Write-Host '  help     Show this help'
    Write-Host ''
}

switch ($Command) {
    'up'      { Invoke-Up }
    'down'    { Invoke-Down }
    'status'  { Invoke-Status }
    'logs'    { Invoke-Logs }
    'reset'   { Invoke-Reset }
    'help'    { Show-Help }
    default   { Show-Help }
}
