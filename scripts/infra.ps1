# infra.ps1 - Manage infrastructure services for The Copy
# Services: PostgreSQL 16 | Redis 7 | Weaviate 1.28.4 | Qdrant

param(
    [Parameter(Position = 0)]
    [ValidateSet('up', 'down', 'status', 'logs', 'reset', 'help')]
    [string]$Command = 'help',

    [Parameter(Position = 1)]
    [string]$ServiceName = '',

    [ValidateSet('auto', 'docker', 'podman')]
    [string]$Engine = 'auto'
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectRoot 'docker-compose.infra.yml'
$HealthFmt = '{{.State.Health.Status}}'
$Services = @('postgres', 'redis', 'weaviate', 'qdrant')
$HostReadyUrls = @{
    qdrant = 'http://127.0.0.1:6333/readyz'
}
$script:Runtime = $null
$script:RuntimeExecutable = $null
$script:ComposeExecutable = $null
$script:ComposePrefix = @()

function Write-Msg([string]$Tag, [string]$Msg, [string]$Color = 'White') {
    Write-Host "[$Tag] $Msg" -ForegroundColor $Color
}

function Resolve-Executable([string]$Name, [string[]]$KnownPaths = @()) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    foreach ($candidate in $KnownPaths) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

function Test-CommandAvailable([string]$Name, [string[]]$KnownPaths = @()) {
    return -not [string]::IsNullOrEmpty((Resolve-Executable $Name $KnownPaths))
}

function Test-ExternalCommand([string]$Executable, [string[]]$Arguments) {
    $previousNativePreference = $null
    $hasNativePreference = Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue
    if ($hasNativePreference) {
        $previousNativePreference = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }

    try {
        & $Executable @Arguments 1>$null 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    } finally {
        if ($hasNativePreference) {
            $PSNativeCommandUseErrorActionPreference = $previousNativePreference
        }
    }
}

function Test-PodmanCompose([string]$PodmanExecutable) {
    if (Test-ExternalCommand $PodmanExecutable @('compose', 'version')) {
        $script:ComposeExecutable = $PodmanExecutable
        $script:ComposePrefix = @('compose')
        return $true
    }

    if (Test-CommandAvailable 'podman-compose') {
        $script:ComposeExecutable = 'podman-compose'
        $script:ComposePrefix = @()
        return $true
    }

    return $false
}

function Ensure-PodmanMachine([string]$PodmanExecutable) {
    if (Test-ExternalCommand $PodmanExecutable @('info')) {
        return $true
    }

    $machinesJson = ''
    try {
        $machinesJson = (& $PodmanExecutable machine list --format json 2>$null | Out-String).Trim()
    } catch {
        return $false
    }

    if ([string]::IsNullOrWhiteSpace($machinesJson)) {
        return $false
    }

    $machines = @()
    try {
        $parsed = $machinesJson | ConvertFrom-Json
        if ($null -ne $parsed) {
            if ($parsed -is [array]) { $machines = $parsed } else { $machines = @($parsed) }
        }
    } catch {
        return $false
    }

    if ($machines.Count -eq 0) {
        Write-Msg 'INFO' 'Creating default Podman machine...' 'Cyan'
        & $PodmanExecutable machine init
        if ($LASTEXITCODE -ne 0) { return $false }
        $machinesJson = (& $PodmanExecutable machine list --format json 2>$null | Out-String).Trim()
        $parsed = $machinesJson | ConvertFrom-Json
        if ($parsed -is [array]) { $machines = $parsed } else { $machines = @($parsed) }
    }

    $running = $machines | Where-Object { $_.Running -eq $true } | Select-Object -First 1
    if ($null -eq $running) {
        $machine = $machines | Select-Object -First 1
        if ($null -eq $machine) { return $false }
        Write-Msg 'INFO' "Starting Podman machine: $($machine.Name)" 'Cyan'
        & $PodmanExecutable machine start $machine.Name
        if ($LASTEXITCODE -ne 0) { return $false }
    }

    return (Test-ExternalCommand $PodmanExecutable @('info'))
}

function Try-UsePodman {
    $podmanExecutable = Resolve-Executable 'podman' @('C:\Program Files\RedHat\Podman\podman.exe')
    if ([string]::IsNullOrEmpty($podmanExecutable)) {
        return $false
    }
    if (-not (Ensure-PodmanMachine $podmanExecutable)) {
        return $false
    }

    $script:Runtime = 'podman'
    $script:RuntimeExecutable = $podmanExecutable
    $script:ComposeExecutable = $podmanExecutable
    $script:ComposePrefix = @('compose')
    return $true
}

function Try-UseDocker {
    $dockerExecutable = Resolve-Executable 'docker'
    if ([string]::IsNullOrEmpty($dockerExecutable)) {
        return $false
    }
    if (-not (Test-ExternalCommand $dockerExecutable @('compose', 'version'))) {
        return $false
    }
    if (-not (Test-ExternalCommand $dockerExecutable @('info'))) {
        return $false
    }

    $script:Runtime = 'docker'
    $script:RuntimeExecutable = $dockerExecutable
    $script:ComposeExecutable = $dockerExecutable
    $script:ComposePrefix = @('compose')
    return $true
}

function Resolve-ContainerRuntime {
    if ($null -ne $script:Runtime) {
        return
    }

    $candidates = if ($Engine -eq 'auto') { @('podman', 'docker') } else { @($Engine) }

    foreach ($candidate in $candidates) {
        if ($candidate -eq 'podman' -and (Try-UsePodman)) {
            Write-Msg 'INFO' 'Using container engine: podman' 'Cyan'
            return
        }
        if ($candidate -eq 'docker' -and (Try-UseDocker)) {
            Write-Msg 'INFO' 'Using container engine: docker' 'Cyan'
            return
        }
    }

    if ($Engine -eq 'podman') {
        Write-Msg 'ERROR' 'Podman is not installed or its machine/compose support is not available.' 'Red'
    } elseif ($Engine -eq 'docker') {
        Write-Msg 'ERROR' 'Docker is not installed or its daemon/compose support is not available.' 'Red'
    } else {
        Write-Msg 'ERROR' 'No usable container engine found. Install Podman or fix Docker.' 'Red'
    }
    exit 1
}

function Invoke-Compose([string[]]$ComposeArgs) {
    Resolve-ContainerRuntime
    $allArgs = @($script:ComposePrefix + @('-f', $ComposeFile) + $ComposeArgs)
    & $script:ComposeExecutable @allArgs
    if ($LASTEXITCODE -ne 0) {
        $joined = $ComposeArgs -join ' '
        Write-Msg 'ERROR' "Command failed: $script:ComposeExecutable $($script:ComposePrefix -join ' ') $joined" 'Red'
        exit $LASTEXITCODE
    }
}

function Get-ServiceHealth([string]$Svc) {
    Resolve-ContainerRuntime
    $cid = & $script:RuntimeExecutable ps -a `
        --filter "label=com.docker.compose.project=thecopy" `
        --filter "label=com.docker.compose.service=$Svc" `
        --format "{{.ID}}" 2>$null | Select-Object -First 1
    if ([string]::IsNullOrEmpty($cid)) { return 'missing' }
    if ($HostReadyUrls.ContainsKey($Svc)) {
        if (Test-HttpReady $HostReadyUrls[$Svc]) { return 'healthy' }
        return 'starting'
    }

    $h = & $script:RuntimeExecutable inspect --format $HealthFmt $cid 2>$null
    if ([string]::IsNullOrEmpty($h) -or $h.Trim() -eq '<no value>') {
        return 'unknown'
    }
    return $h.Trim()
}

function Test-HttpReady([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 300
    } catch {
        return $false
    }
}

function Wait-ForHealthy {
    $maxWait = 120
    $interval = 5

    Write-Msg 'INFO' "Waiting for services to be healthy (max ${maxWait}s)..." 'Cyan'

    foreach ($svc in $Services) {
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
    Resolve-ContainerRuntime
    Write-Msg 'INFO' 'Starting infrastructure services...' 'Cyan'
    Invoke-Compose @('up', '-d')
    Write-Host ''
    Wait-ForHealthy
    Write-Host ''
    Write-Msg 'OK' 'All services are running!' 'Green'
    Write-Host '  PostgreSQL  -> localhost:5433' -ForegroundColor Blue
    Write-Host '  Redis       -> localhost:6379' -ForegroundColor Blue
    Write-Host '  Weaviate    -> http://localhost:8080' -ForegroundColor Blue
    Write-Host '  Qdrant      -> http://localhost:6333' -ForegroundColor Blue
    Write-Host ''
}

function Invoke-Down {
    Resolve-ContainerRuntime
    Write-Msg 'INFO' 'Stopping services...' 'Cyan'
    Invoke-Compose @('down')
    Write-Msg 'OK' 'All services stopped.' 'Green'
}

function Invoke-Status {
    Resolve-ContainerRuntime
    Write-Msg 'INFO' 'Service status:' 'Cyan'
    Write-Host ''
    Invoke-Compose @('ps')
    Write-Host ''

    foreach ($svc in $Services) {
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
    Resolve-ContainerRuntime
    if (-not [string]::IsNullOrEmpty($ServiceName)) {
        Write-Msg 'INFO' "Logs for: $ServiceName" 'Cyan'
        Invoke-Compose @('logs', '-f', '--tail=100', $ServiceName)
    } else {
        Write-Msg 'INFO' 'All logs (last 50 lines):' 'Cyan'
        Invoke-Compose @('logs', '--tail=50')
    }
}

function Invoke-Reset {
    Resolve-ContainerRuntime
    Write-Msg 'WARN' 'This will DELETE all PostgreSQL, Redis, Weaviate, and Qdrant data!' 'Yellow'
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
    Write-Host '  -Engine  auto, podman, or docker'
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
