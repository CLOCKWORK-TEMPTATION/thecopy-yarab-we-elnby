# =============================================================================
#  02-docker-wsl-install.ps1
#  Fresh install of WSL 2 + Docker Desktop, using Docker Desktop defaults on C:.
#  Run as Administrator AFTER a reboot following 01-docker-wsl-uninstall.ps1.
#  If Windows reports a pending reboot, this script stops and must be re-run
#  after Windows restarts. WSL installation is not reliable before that reboot.
# =============================================================================
#  Stages:
#   1. Verify administrator + free space.
#   2. Enable Windows features (WSL + VirtualMachinePlatform).
#   3. Stop if Windows still needs a reboot.
#   4. Install / verify WSL and set WSL 2 as default.
#   5. Download Docker Desktop installer and run it with the documented flags.
#   6. Pre-seed Docker Desktop settings without custom data relocation.
#   7. Launch Docker Desktop and verify the Linux engine.
# =============================================================================

#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [string]$DataRoot = '',
    [string]$WslDistro = '',
    [switch]$SkipDockerLaunch
)

$ErrorActionPreference = 'Stop'
$startedAt = Get-Date
$log = @()
$script:logPath = $null

# Import shared functions
$functionsPath = Join-Path $PSScriptRoot '_docker-wsl-functions.ps1'
if (-not (Test-Path $functionsPath)) {
    throw "Required functions file not found: $functionsPath"
}
. $functionsPath

try {
    Write-Host ''
    Write-Host '======================================================================' -ForegroundColor Magenta
    Write-Host ' Docker Desktop + WSL - Fresh Install                                  ' -ForegroundColor Magenta
    Write-Host '======================================================================' -ForegroundColor Magenta
    Write-Host ''
    $dataRootDisplay = if ($DataRoot) { $DataRoot } else { '(Docker Desktop default on C:)' }
    Write-Host ("  DataRoot  : {0}" -f $dataRootDisplay)
    Write-Host ("  WSL distro: {0}" -f ($WslDistro | ForEach-Object { if ($_) { $_ } else { '(none - Docker Desktop provides its own)' } }))
    Write-Host ''

    # ------------------------------------------------------------- 1. PRE-FLIGHT ---
    Write-Step 'STAGE' '1/7  Pre-flight checks' 'Cyan'

    $systemDrive = Get-PSDrive -Name $env:SystemDrive.TrimEnd(':') -PSProvider FileSystem -ErrorAction SilentlyContinue
    if (-not $systemDrive) { throw "System drive not found: $env:SystemDrive" }

    $freeGB = [math]::Round($systemDrive.Free / 1GB, 2)
    Write-Step 'INFO' ("System drive $($systemDrive.Name): has ${freeGB}GB free") 'Gray'
    if ($freeGB -lt 20) { throw "Need at least 20 GB free on $($systemDrive.Name):" }

    if ($DataRoot) {
        $rootParent = Split-Path -Parent $DataRoot
        if (-not $rootParent) { throw "Invalid DataRoot: $DataRoot" }

        $drive = Get-PSDrive -Name ($rootParent.Substring(0, 1)) -PSProvider FileSystem -ErrorAction SilentlyContinue
        if (-not $drive) { throw "Drive for $DataRoot not found" }

        $customFreeGB = [math]::Round($drive.Free / 1GB, 2)
        Write-Step 'INFO' ("Custom data drive $($drive.Name): has ${customFreeGB}GB free") 'Gray'
        if ($customFreeGB -lt 20) { throw "Need at least 20 GB free on $($drive.Name):" }

        Invoke-Safe ("Create: $DataRoot") {
            if (-not (Test-Path $DataRoot)) {
                New-Item -Path $DataRoot -ItemType Directory -Force | Out-Null
            }

            foreach ($sub in 'vm', 'wsl', 'containers', 'images', 'volumes', 'tmp', 'settings') {
                $path = Join-Path $DataRoot $sub
                if (-not (Test-Path $path)) {
                    New-Item -Path $path -ItemType Directory -Force | Out-Null
                }
            }
        }
    } else {
        Write-Step 'INFO' 'Using Docker Desktop default data location on the system drive' 'Gray'
    }

    # ---------------------------------------------------- 2. WINDOWS FEATURES ---
    Write-Step 'STAGE' '2/7  Enabling Windows features' 'Cyan'

    $featuresChanged = $false
    foreach ($feat in 'Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform') {
        Invoke-Safe ("Enable feature: $feat") {
            $state = (Get-WindowsOptionalFeature -Online -FeatureName $feat).State
            if ($state -eq 'Enabled') {
                Write-Step 'SKIP' "$feat already enabled" 'DarkGray'
            } else {
                Enable-WindowsOptionalFeature -Online -FeatureName $feat -All -NoRestart | Out-Null
                $script:featuresChanged = $true
            }
        }
    }

    # ---------------------------------------------------- 3. REBOOT GATE ---
    Write-Step 'STAGE' '3/7  Checking for pending reboot' 'Cyan'

    if (Test-RebootPending) {
        if ($featuresChanged) {
            Write-Step 'WARN' 'Windows features were enabled during this run. A reboot is required before WSL can be installed safely.' 'Yellow'
        } else {
            Write-Step 'WARN' 'Windows already has a pending reboot. WSL must not be repaired or installed before that reboot.' 'Yellow'
        }

        Complete-Install `
            -Title 'Reboot required before continuing' `
            -TitleColor 'Yellow' `
            -ExitCode 3010 `
            -Checklist @(
                '1. Restart Windows now.',
                '2. Re-run this same script as Administrator after sign-in.',
                '3. Do not run wsl.exe or Docker Desktop before the reboot completes.'
            )
    } else {
        Write-Step 'OK' 'No pending reboot detected' 'Green'
    }

    # ---------------------------------------------------- 4. WSL INSTALL ---
    Write-Step 'STAGE' '4/7  Installing and verifying WSL 2' 'Cyan'

    $systemWsl = Join-Path $env:WINDIR 'System32\wsl.exe'
    $programFilesWsl = Join-Path $env:ProgramFiles 'WSL\wsl.exe'

    $wslPackage = Get-AppxPackage *WindowsSubsystemForLinux* -ErrorAction SilentlyContinue |
        Sort-Object InstallDate -Descending |
        Select-Object -First 1

    if ($wslPackage) {
        Write-Step 'INFO' ("Existing WSL package: {0}" -f $wslPackage.PackageFullName) 'Gray'
    } else {
        Invoke-WslWithTimeout -Description 'wsl --install --no-distribution' -Arguments @('--install', '--no-distribution') -TimeoutSeconds 900
    }

    $systemWslProbe = Invoke-WslWithTimeout `
        -Description "$systemWsl --version" `
        -FilePath $systemWsl `
        -Arguments @('--version') `
        -TimeoutSeconds 120 `
        -ContinueOnError

    if ($systemWslProbe.ExitCode -ne 0) {
        $programFilesProbe = $null
        if (Test-Path $programFilesWsl) {
            $programFilesProbe = Invoke-WslWithTimeout `
                -Description "$programFilesWsl --version" `
                -FilePath $programFilesWsl `
                -Arguments @('--version') `
                -TimeoutSeconds 120 `
                -ContinueOnError
        }

        if ($programFilesProbe -and $programFilesProbe.ExitCode -eq 0) {
            Write-Step 'ERROR' 'C:\Windows\System32\wsl.exe is corrupted while C:\Program Files\WSL\wsl.exe is healthy. Docker Desktop will still fail because it explicitly calls the System32 copy.' 'Red'
            Complete-Install `
                -Title 'System32 WSL is corrupted' `
                -TitleColor 'Red' `
                -ExitCode 1603 `
                -Checklist @(
                    '1. Run scripts\win\00-wsl-system-repair.ps1 as Administrator.',
                    '2. Restart Windows if that repair script asks for a reboot.',
                    '3. Re-run this install script only after C:\Windows\System32\wsl.exe --version works.'
                )
        }
    }

    Invoke-WslWithTimeout -Description 'wsl --update' -Arguments @('--update') -TimeoutSeconds 900
    Invoke-WslWithTimeout -Description 'wsl --set-default-version 2' -Arguments @('--set-default-version', '2') -TimeoutSeconds 120
    Invoke-WslWithTimeout -Description 'wsl --version' -Arguments @('--version') -TimeoutSeconds 120

    if ($WslDistro) {
        Invoke-WslWithTimeout -Description ("wsl --install --distribution $WslDistro") -Arguments @('--install', '--distribution', $WslDistro) -TimeoutSeconds 900
    }

    # ---------------------------------------------------- 5. DOCKER DESKTOP ---
    Write-Step 'STAGE' '5/7  Downloading and installing Docker Desktop' 'Cyan'

    $downloadDir = Join-Path $env:TEMP ("DockerDesktopInstaller-{0:yyyyMMdd-HHmmss}" -f $startedAt)
    Invoke-Safe ("Create: $downloadDir") {
        if (-not (Test-Path $downloadDir)) {
            New-Item -Path $downloadDir -ItemType Directory -Force | Out-Null
        }
    }

    Invoke-Native `
        -Description 'winget download Docker.DockerDesktop' `
        -FilePath 'winget.exe' `
        -Arguments @(
            'download',
            '--id', 'Docker.DockerDesktop',
            '--exact',
            '--accept-package-agreements',
            '--accept-source-agreements',
            '--disable-interactivity',
            '--download-directory', $downloadDir
        )

    $installerPath = Get-DockerInstallerPath -DownloadDirectory $downloadDir
    Write-Step 'INFO' ("Installer: $installerPath") 'Gray'

    $installerArgs = @(
        'install',
        '--quiet',
        '--accept-license',
        '--backend=wsl-2'
    )
    if ($DataRoot) {
        $wslDataRoot = Join-Path $DataRoot 'wsl'
        $installerArgs += "--wsl-default-data-root=$wslDataRoot"
    }

    Invoke-Native `
        -Description 'Docker Desktop installer' `
        -FilePath $installerPath `
        -Arguments $installerArgs

    # ---------------------------------------- 6. PRE-SEED DOCKER SETTINGS JSON ---
    Write-Step 'STAGE' '6/7  Pre-seeding Docker Desktop settings' 'Cyan'

    $settingsDir = Join-Path $env:APPDATA 'Docker'
    $settingsFile = Join-Path $settingsDir 'settings-store.json'
    Invoke-Safe 'Create Docker settings folder' {
        if (-not (Test-Path $settingsDir)) {
            New-Item -Path $settingsDir -ItemType Directory -Force | Out-Null
        }
    }

    Invoke-Safe "Write $settingsFile" {
        $settings = [ordered]@{}
        if (Test-Path $settingsFile) {
            try {
                $loaded = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json -AsHashtable
                foreach ($key in $loaded.Keys) {
                    $settings[$key] = $loaded[$key]
                }
            } catch {
                Write-Step 'WARN' ("Could not parse existing Docker settings. Replacing file: " + $_.Exception.Message) 'Yellow'
                $settings = [ordered]@{}
            }
        }

        $null = $settings.Remove('wslEngineCustomImagePath')
        $null = $settings.Remove('WslEngineCustomImagePath')
        $null = $settings.Remove('dataFolder')
        $null = $settings.Remove('DataFolder')
        $null = $settings.Remove('CustomWslDistroDir')
        $null = $settings.Remove('customWslDistroDir')
        $null = $settings.Remove('wslDefaultDataRoot')
        $null = $settings.Remove('WslDefaultDataRoot')

        $settings['wslEngineEnabled'] = $true
        $settings['useWindowsContainers'] = $false
        $settings['disableUpdate'] = $false
        $settings['autoStart'] = $false
        $settings['analyticsEnabled'] = $false
        if ($DataRoot) {
            $settings['dataFolder'] = $DataRoot
        }

        $json = ($settings | ConvertTo-Json -Depth 10)
        Set-Content -LiteralPath $settingsFile -Value $json -Encoding UTF8
        Write-Host '    Seeded:' -ForegroundColor DarkGray
        $json -split "`n" | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
    }

    # ---------------------------------------------------- 7. FIRST LAUNCH + VERIFY ---
    Write-Step 'STAGE' '7/7  Launching Docker Desktop and verifying Linux engine' 'Cyan'

    $dockerExe = Wait-DockerDesktopExePath -TimeoutSeconds 180
    if (-not $dockerExe) {
        throw 'Docker Desktop.exe not found after waiting for installer finalization'
    }

    Write-Step 'INFO' ("Docker Desktop executable: $dockerExe") 'Gray'

    if ($SkipDockerLaunch) {
        Write-Step 'SKIP' 'Launch skipped (-SkipDockerLaunch)' 'DarkGray'
    } else {
        Invoke-Safe 'Start Docker Desktop' {
            Start-Process -FilePath $dockerExe
        }

        Write-Host '    Docker Desktop is starting. Accept the EULA prompt if it appears.' -ForegroundColor Yellow
        Start-Sleep -Seconds 10

        $dockerCli = Get-DockerCliPath
        if (-not $dockerCli) {
            throw 'docker.exe not found after installation'
        }

        Write-Step 'INFO' ("Using Docker CLI: $dockerCli") 'Gray'

        $maxAttempts = 72
        $ok = $false
        for ($i = 1; $i -le $maxAttempts; $i++) {
            $raw = & $dockerCli info --format '{{.OSType}}' 2>$null
            $exitCode = $LASTEXITCODE
            $os = if ($raw) { ($raw | Out-String).Trim() } else { '' }

            if ($exitCode -eq 0 -and $os -eq 'linux') {
                Write-Step 'OK' ("Engine is Linux (attempt $i)") 'Green'
                $ok = $true
                break
            }

            Write-Host ("    .. attempt {0,2}/{1}  exit={2}  engine='{3}'" -f $i, $maxAttempts, $exitCode, $os) -ForegroundColor DarkGray
            Start-Sleep -Seconds 5
        }

        if (-not $ok) {
            throw 'Docker engine did not become Linux within the allotted wait window'
        }
    }

    Complete-Install `
        -Title 'Install completed' `
        -Checklist @(
            '1. docker --version',
            '2. docker info --format "{{.OSType}}"   -> should print: linux',
            '3. wsl --version',
            '4. cd "e:\yarab we elnby\the copy" ; pnpm infra:up'
        )
} catch {
    $message = $_.Exception.Message
    Write-Step 'ERROR' $message 'Red'

    $logPath = Save-InstallLog

    Write-Host ''
    Write-Host '======================================================================' -ForegroundColor Red
    Write-Host ' Install failed                                                        ' -ForegroundColor Red
    Write-Host '======================================================================' -ForegroundColor Red
    Write-Host ''
    Write-Host "  Error: $message" -ForegroundColor Red
    Write-Host "  Log  : $logPath" -ForegroundColor DarkGray
    Write-Host ''
    exit 1
}
