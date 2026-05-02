# infra.ps1 - Manage local infrastructure services for The Copy using Podman.
# Services: PostgreSQL 16 | Redis 7 | Weaviate 1.28.4 | Qdrant

param(
    [Parameter(Position = 0)]
    [ValidateSet('up', 'down', 'status', 'logs', 'reset', 'help')]
    [string]$Command = 'help',

    [Parameter(Position = 1)]
    [string]$ServiceName = '',

    [ValidateSet('podman')]
    [string]$Engine = 'podman'
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectRoot 'podman-compose.infra.yml'
$InfraEnvDir = Join-Path $env:LOCALAPPDATA 'TheCopy'
$InfraEnvFile = Join-Path $InfraEnvDir 'podman-infra.env'
$Services = @('postgres', 'redis', 'weaviate', 'qdrant')
$DirectPodmanNetworkName = 'thecopy_thecopy-net'
$ServiceContainers = @{
    postgres = 'thecopy-postgres-1'
    redis = 'thecopy-redis-1'
    weaviate = 'thecopy-weaviate-1'
    qdrant = 'thecopy-qdrant-1'
}
$HealthFmt = '{{.State.Health.Status}}'
$script:PodmanExe = ''
$script:ComposeAvailable = $false

function Write-Msg([string]$Tag, [string]$Msg, [string]$Color = 'White') {
    Write-Host "[$Tag] $Msg" -ForegroundColor $Color
}

function Set-InfraPostgresPassword([string]$Password) {
    New-Item -ItemType Directory -Force -Path $InfraEnvDir | Out-Null
    Set-Content -LiteralPath $InfraEnvFile -Value "POSTGRES_PASSWORD=$Password" -Encoding UTF8
    $env:POSTGRES_PASSWORD = $Password
}

function Get-ContainerEnvValue([string]$Name, [string]$Key) {
    if ([string]::IsNullOrWhiteSpace($script:PodmanExe)) {
        return ''
    }
    if (-not (Test-ContainerExists $Name)) {
        return ''
    }

    $result = Invoke-NativeCapture $script:PodmanExe @('inspect', '--format', '{{range .Config.Env}}{{println .}}{{end}}', $Name)
    if ($result.ExitCode -ne 0) {
        return ''
    }

    foreach ($line in ($result.Output -split "`r?`n")) {
        if ($line.StartsWith("${Key}=")) {
            return $line.Substring($Key.Length + 1)
        }
    }

    return ''
}

function Ensure-InfraEnvironment {
    if (-not [string]::IsNullOrWhiteSpace($env:POSTGRES_PASSWORD)) {
        return
    }

    $existingContainerPassword = Get-ContainerEnvValue 'thecopy-postgres-1' 'POSTGRES_PASSWORD'
    if (-not [string]::IsNullOrWhiteSpace($existingContainerPassword)) {
        Set-InfraPostgresPassword $existingContainerPassword
        return
    }

    if (Test-Path -LiteralPath $InfraEnvFile) {
        $line = Get-Content -LiteralPath $InfraEnvFile |
            Where-Object { $_ -match '^POSTGRES_PASSWORD=' } |
            Select-Object -First 1
        if ($line) {
            $env:POSTGRES_PASSWORD = $line.Substring('POSTGRES_PASSWORD='.Length)
            return
        }
    }

    $passwordBytes = New-Object byte[] 24
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($passwordBytes)
    } finally {
        $rng.Dispose()
    }
    $rawPassword = [Convert]::ToBase64String($passwordBytes)
    $generatedPassword = $rawPassword.Replace('+', '-').Replace('/', '_').TrimEnd('=')
    Set-InfraPostgresPassword $generatedPassword
}

function Resolve-Podman {
    $cmd = Get-Command podman -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        'C:\Program Files\RedHat\Podman\podman.exe',
        'C:\Program Files (x86)\RedHat\Podman\podman.exe'
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return ''
}

function Resolve-PodmanComposeProvider {
    $cmd = Get-Command podman-compose -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        'C:\Program Files\RedHat\Podman\podman-compose.exe',
        'C:\Program Files (x86)\RedHat\Podman\podman-compose.exe'
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return ''
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

function Invoke-NativeCapture([string]$Executable, [string[]]$Arguments) {
    $previousNativePreference = $null
    $hasNativePreference = Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue
    if ($hasNativePreference) {
        $previousNativePreference = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }

    try {
        $output = (& $Executable @Arguments 2>&1 | Out-String).Trim()
        return @{
            ExitCode = $LASTEXITCODE
            Output = $output
        }
    } catch {
        return @{
            ExitCode = 1
            Output = $_.Exception.Message
        }
    } finally {
        if ($hasNativePreference) {
            $PSNativeCommandUseErrorActionPreference = $previousNativePreference
        }
    }
}

function Ensure-PodmanMachine([string]$PodmanExecutable) {
    if (Test-ExternalCommand $PodmanExecutable @('info')) {
        return $true
    }

    Write-Msg 'WARN' 'Podman is not ready. Trying podman machine start...' 'Yellow'
    & $PodmanExecutable machine start 2>&1 | Out-Host
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
        Write-Msg 'INFO' 'Creating default Podman machine...' 'Cyan'
        & $PodmanExecutable machine init
        if ($LASTEXITCODE -ne 0) { return $false }
        & $PodmanExecutable machine start
        return (Test-ExternalCommand $PodmanExecutable @('info'))
    }

    return $false
}

function Test-PodmanComposeProvider([string]$PodmanExecutable, [string]$ComposeProvider) {
    if ([string]::IsNullOrWhiteSpace($ComposeProvider)) {
        return $false
    }

    $env:PODMAN_COMPOSE_PROVIDER = $ComposeProvider
    try {
        $result = Invoke-NativeCapture $PodmanExecutable @('compose', 'version')
        if ($result.ExitCode -ne 0) {
            return $false
        }
        $providerOutput = $result.Output.ToLowerInvariant()
        $blockedProviders = @('docker-compose', ('docker' + ' compose'), ('docker' + ' desktop'))
        foreach ($blockedProvider in $blockedProviders) {
            if ($providerOutput -match [regex]::Escape($blockedProvider)) {
                return $false
            }
        }
        return $true
    } catch {
        return $false
    }
}

function Test-Podman {
    $script:PodmanExe = Resolve-Podman
    if ([string]::IsNullOrEmpty($script:PodmanExe)) {
        Write-Msg 'ERROR' 'Podman is not installed.' 'Red'
        exit 1
    }

    if (-not (Ensure-PodmanMachine $script:PodmanExe)) {
        Write-Msg 'ERROR' 'Podman is not running or the machine could not start.' 'Red'
        exit 1
    }

    if (-not (Test-Path $ComposeFile)) {
        Write-Msg 'ERROR' "Missing compose file: $ComposeFile" 'Red'
        exit 1
    }

    $composeProvider = Resolve-PodmanComposeProvider
    $script:ComposeAvailable = Test-PodmanComposeProvider $script:PodmanExe $composeProvider
    if (-not $script:ComposeAvailable) {
        Remove-Item Env:PODMAN_COMPOSE_PROVIDER -ErrorAction SilentlyContinue
        Write-Msg 'WARN' 'podman-compose provider is not available; using direct Podman container commands.' 'Yellow'
    }
}

function Invoke-Compose([string[]]$ComposeArgs) {
    if (-not $script:ComposeAvailable) {
        Invoke-DirectPodman $ComposeArgs
        return
    }

    & $script:PodmanExe compose -f $ComposeFile @ComposeArgs
    if ($LASTEXITCODE -ne 0) {
        $joined = $ComposeArgs -join ' '
        Write-Msg 'ERROR' "Command failed: podman compose $joined" 'Red'
        exit $LASTEXITCODE
    }
}

function Test-ContainerExists([string]$Name) {
    $null = & $script:PodmanExe container exists $Name 2>$null
    return $LASTEXITCODE -eq 0
}

function Test-TcpReady([string]$HostName, [int]$Port) {
    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $task = $client.ConnectAsync($HostName, $Port)
        $ready = $task.Wait(1000)
        $client.Dispose()
        return $ready
    } catch {
        return $false
    }
}

function Test-HttpReady([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 300
    } catch {
        return $false
    }
}

function Ensure-Network {
    $null = & $script:PodmanExe network exists $DirectPodmanNetworkName 2>$null
    if ($LASTEXITCODE -ne 0) {
        & $script:PodmanExe network create $DirectPodmanNetworkName | Out-Null
    }
}

function Ensure-Volume([string]$Name) {
    $null = & $script:PodmanExe volume exists $Name 2>$null
    if ($LASTEXITCODE -ne 0) {
        & $script:PodmanExe volume create $Name | Out-Null
    }
}

function Start-Or-Run([string]$Name, [string[]]$RunArgs) {
    if (Test-ContainerExists $Name) {
        & $script:PodmanExe start $Name | Out-Null
        return
    }

    & $script:PodmanExe run -d --name $Name @RunArgs | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Msg 'ERROR' "Failed to start container: $Name" 'Red'
        exit $LASTEXITCODE
    }
}

function Invoke-DirectUp {
    Ensure-InfraEnvironment
    Ensure-Network
    Ensure-Volume 'thecopy_pgdata'
    Ensure-Volume 'thecopy_redisdata'
    Ensure-Volume 'thecopy_weaviatedata'
    Ensure-Volume 'thecopy_qdrantdata'

    Start-Or-Run 'thecopy-postgres-1' @(
        '--network', $DirectPodmanNetworkName,
        '-p', '5433:5432',
        '-e', 'POSTGRES_USER=thecopy',
        '-e', "POSTGRES_PASSWORD=$env:POSTGRES_PASSWORD",
        '-e', 'POSTGRES_DB=thecopy_dev',
        '-v', 'thecopy_pgdata:/var/lib/postgresql/data',
        'docker.io/library/postgres:16-alpine'
    )

    Start-Or-Run 'thecopy-redis-1' @(
        '--network', $DirectPodmanNetworkName,
        '-p', '6379:6379',
        '-v', 'thecopy_redisdata:/data',
        'docker.io/library/redis:7-alpine',
        'redis-server',
        '--appendonly',
        'yes'
    )

    Start-Or-Run 'thecopy-weaviate-1' @(
        '--network', $DirectPodmanNetworkName,
        '-p', '8080:8080',
        '-e', 'QUERY_DEFAULTS_LIMIT=25',
        '-e', 'AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true',
        '-e', 'PERSISTENCE_DATA_PATH=/var/lib/weaviate',
        '-e', 'DEFAULT_VECTORIZER_MODULE=none',
        '-e', 'CLUSTER_HOSTNAME=node1',
        '-v', 'thecopy_weaviatedata:/var/lib/weaviate',
        'cr.weaviate.io/semitechnologies/weaviate:1.28.4'
    )

    Start-Or-Run 'thecopy-qdrant-1' @(
        '--network', $DirectPodmanNetworkName,
        '-p', '6333:6333',
        '-p', '6334:6334',
        '-v', 'thecopy_qdrantdata:/qdrant/storage',
        'docker.io/qdrant/qdrant:v1.13.4'
    )
}

function Invoke-DirectStatus {
    foreach ($svc in $Services) {
        $name = $ServiceContainers[$svc]
        if (Test-ContainerExists $name) {
            & $script:PodmanExe ps --filter "name=$name" --format "{{.Names}} {{.Status}} {{.Ports}}"
        } else {
            Write-Host "$name stopped"
        }
    }
}

function Invoke-DirectDown {
    foreach ($name in $ServiceContainers.Values) {
        if (Test-ContainerExists $name) {
            & $script:PodmanExe stop $name 2>$null | Out-Null
        }
    }
}

function Invoke-DirectLogs([string]$Name) {
    if (-not [string]::IsNullOrEmpty($Name)) {
        $container = $ServiceContainers[$Name]
        if ([string]::IsNullOrEmpty($container)) {
            $container = $Name
        }
        & $script:PodmanExe logs --tail=100 -f $container
        return
    }

    foreach ($container in $ServiceContainers.Values) {
        Write-Host "===== $container ====="
        & $script:PodmanExe logs --tail=50 $container
    }
}

function Invoke-DirectReset {
    foreach ($name in $ServiceContainers.Values) {
        if (Test-ContainerExists $name) {
            & $script:PodmanExe rm -f $name 2>$null | Out-Null
        }
    }
    foreach ($volume in @('thecopy_pgdata', 'thecopy_redisdata', 'thecopy_weaviatedata', 'thecopy_qdrantdata')) {
        $null = & $script:PodmanExe volume exists $volume 2>$null
        if ($LASTEXITCODE -eq 0) {
            & $script:PodmanExe volume rm $volume | Out-Null
        }
    }
}

function Invoke-DirectPodman([string[]]$ComposeArgs) {
    $command = $ComposeArgs[0]
    switch ($command) {
        'up'     { Invoke-DirectUp }
        'down'   {
            if ($ComposeArgs -contains '-v') { Invoke-DirectReset } else { Invoke-DirectDown }
        }
        'ps'     { Invoke-DirectStatus }
        'logs'   { Invoke-DirectLogs $ServiceName }
        default  {
            Write-Msg 'ERROR' "Unsupported direct Podman operation: $command" 'Red'
            exit 1
        }
    }
}

function Get-ServiceHealth([string]$Svc) {
    switch ($Svc) {
        'postgres' { if (Test-TcpReady '127.0.0.1' 5433) { return 'healthy' } }
        'redis'    { if (Test-TcpReady '127.0.0.1' 6379) { return 'healthy' } }
        'weaviate' { if (Test-HttpReady 'http://127.0.0.1:8080/v1/.well-known/ready') { return 'healthy' } }
        'qdrant'   { if (Test-HttpReady 'http://127.0.0.1:6333/readyz') { return 'healthy' } }
    }

    $cid = ''
    if ($script:ComposeAvailable) {
        $cid = & $script:PodmanExe compose -f $ComposeFile ps -q $Svc 2>$null
    } else {
        $cid = $ServiceContainers[$Svc]
    }
    if ([string]::IsNullOrEmpty($cid)) { return 'missing' }
    if (-not (Test-ContainerExists $cid)) { return 'missing' }

    $inspect = Invoke-NativeCapture $script:PodmanExe @('inspect', '--format', $HealthFmt, $cid)
    if ($inspect.ExitCode -ne 0) {
        return 'starting'
    }

    $h = $inspect.Output
    if ([string]::IsNullOrEmpty($h) -or $h.Trim() -eq '<no value>') {
        return 'starting'
    }

    return $h.Trim()
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
    Test-Podman
    Ensure-InfraEnvironment
    Write-Msg 'INFO' 'Starting infrastructure services using Podman...' 'Cyan'
    Invoke-Compose @('up', '-d')
    Write-Host ''
    Wait-ForHealthy
    Write-Host ''
    Write-Msg 'OK' 'Infrastructure command finished.' 'Green'
    Write-Host '  PostgreSQL  -> localhost:5433' -ForegroundColor Blue
    Write-Host '  Redis       -> localhost:6379' -ForegroundColor Blue
    Write-Host '  Weaviate    -> http://localhost:8080' -ForegroundColor Blue
    Write-Host '  Qdrant      -> http://localhost:6333' -ForegroundColor Blue
    Write-Host ''
}

function Invoke-Down {
    Test-Podman
    Write-Msg 'INFO' 'Stopping services using Podman...' 'Cyan'
    Invoke-Compose @('down')
    Write-Msg 'OK' 'All services stopped.' 'Green'
}

function Invoke-Status {
    Test-Podman
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
    Test-Podman
    if (-not [string]::IsNullOrEmpty($ServiceName)) {
        Write-Msg 'INFO' "Logs for: $ServiceName" 'Cyan'
        if ($script:ComposeAvailable) {
            & $script:PodmanExe compose -f $ComposeFile logs -f --tail=100 $ServiceName
        } else {
            Invoke-DirectLogs $ServiceName
        }
    } else {
        Write-Msg 'INFO' 'All logs (last 50 lines):' 'Cyan'
        Invoke-Compose @('logs', '--tail=50')
    }
}

function Invoke-Reset {
    Test-Podman
    Write-Msg 'WARN' 'This will DELETE all PostgreSQL, Redis, Weaviate, and Qdrant data.' 'Yellow'
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
    Write-Host '  up       Start all infrastructure services using Podman'
    Write-Host '  down     Stop all services'
    Write-Host '  status   Show service health status'
    Write-Host '  logs     Show logs'
    Write-Host '  reset    Full reset - deletes all infra data'
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
