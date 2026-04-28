# =============================================================================
#  00-wsl-system-repair.ps1
#  Repairs a broken C:\Windows\System32\wsl.exe so Docker Desktop can start.
#  Run as Administrator.
# =============================================================================
#  Stages:
#   1. Baseline diagnosis.
#   2. Stop Docker Desktop + WSL processes.
#   3. Repair Windows component store with DISM.
#   4. Repair protected system files with SFC.
#   5. Repair WSL MSI / AppX registration.
#   6. Verify C:\Windows\System32\wsl.exe and set WSL 2 as default.
#   7. Clean Docker settings and verify the Linux engine.
# =============================================================================

#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [string]$DataRoot = '',
    [switch]$SkipDockerVerification
)

$ErrorActionPreference = 'Stop'
$startedAt = Get-Date
$script:log = @()
$script:logPath = $null
$script:repairRoot = $PSScriptRoot

$helpersPath = Join-Path $PSScriptRoot 'lib\wsl-repair-helpers.ps1'
if (-not (Test-Path -LiteralPath $helpersPath)) {
    throw "Missing helper file: $helpersPath"
}
. $helpersPath

try {
    Write-Host ''
    Write-Host '======================================================================' -ForegroundColor Magenta
    Write-Host ' WSL System Repair for Docker Desktop                                 ' -ForegroundColor Magenta
    Write-Host '======================================================================' -ForegroundColor Magenta
    Write-Host ''
    $dataRootDisplay = if ($DataRoot) { $DataRoot } else { '(Docker Desktop default on C:)' }
    Write-Host ("  DataRoot: {0}" -f $dataRootDisplay)
    Write-Host ''

    $systemWsl = Join-Path $env:WINDIR 'System32\wsl.exe'
    $programFilesWsl = Join-Path $env:ProgramFiles 'WSL\wsl.exe'
    $dockerExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    $dockerSettingsDir = Join-Path $env:APPDATA 'Docker'
    $dockerSettingsFile = Join-Path $dockerSettingsDir 'settings-store.json'
    $dockerBackendLog = Join-Path $env:LOCALAPPDATA 'Docker\log\host\com.docker.backend.exe.log'

    # ------------------------------------------------------------- 1. DIAGNOSIS ---
    Write-Step 'STAGE' '1/7  Baseline diagnosis' 'Cyan'

    $systemProbe = Test-WslBinary -Path $systemWsl
    $programFilesProbe = Test-WslBinary -Path $programFilesWsl

    if ($systemProbe.Healthy) {
        Write-Step 'INFO' 'C:\Windows\System32\wsl.exe is already healthy' 'Gray'
    } else {
        Write-Step 'WARN' ("System32 WSL is failing (exit={0})" -f $systemProbe.ExitCode) 'Yellow'
    }

    if ($programFilesProbe.Healthy) {
        Write-Step 'INFO' 'C:\Program Files\WSL\wsl.exe is healthy' 'Gray'
    } elseif ($programFilesProbe.Exists) {
        Write-Step 'WARN' ("Program Files WSL is present but failing (exit={0})" -f $programFilesProbe.ExitCode) 'Yellow'
    } else {
        Write-Step 'WARN' 'C:\Program Files\WSL\wsl.exe was not found' 'Yellow'
    }

    # --------------------------------------------------------- 2. STOP PROCESSES ---
    Write-Step 'STAGE' '2/7  Stopping Docker Desktop and WSL processes' 'Cyan'

    Invoke-Safe 'Stop Docker Desktop processes' {
        Get-Process 'Docker Desktop', 'com.docker.backend', 'com.docker.build', 'vpnkit', 'dockerd' -ErrorAction SilentlyContinue |
            Stop-Process -Force -ErrorAction SilentlyContinue
    }

    $workingWsl = if ($programFilesProbe.Healthy) { $programFilesWsl } else { $systemWsl }
    if (Test-Path $workingWsl) {
        Invoke-ExecutableWithTimeout `
            -FilePath $workingWsl `
            -Arguments @('--shutdown') `
            -Description "$workingWsl --shutdown" `
            -TimeoutSeconds 60 `
            -ContinueOnError | Out-Null
    }

    Invoke-Safe 'Stop leftover WSL processes' {
        Get-Process 'wsl', 'wslhost', 'wslservice', 'vmmem', 'vmmemWSL' -ErrorAction SilentlyContinue |
            Stop-Process -Force -ErrorAction SilentlyContinue
    }

    # ----------------------------------------------------------- 3. DISM REPAIR ---
    Write-Step 'STAGE' '3/7  Repairing Windows component store (DISM)' 'Cyan'

    Invoke-Native `
        -Description 'DISM /Online /Cleanup-Image /RestoreHealth' `
        -FilePath 'DISM.exe' `
        -Arguments @('/Online', '/Cleanup-Image', '/RestoreHealth') `
        -SuccessExitCodes @(0, 3010)

    # ------------------------------------------------------------- 4. SFC REPAIR ---
    Write-Step 'STAGE' '4/7  Repairing protected system files (SFC)' 'Cyan'

    Invoke-Native `
        -Description 'sfc /scannow' `
        -FilePath 'sfc.exe' `
        -Arguments @('/scannow') `
        -SuccessExitCodes @(0, 1)

    # ------------------------------------------------------------- 5. WSL REPAIR ---
    Write-Step 'STAGE' '5/7  Repairing WSL package registration' 'Cyan'

    $wslProductCode = Get-WslMsiProductCode
    if ($wslProductCode) {
        Invoke-Native `
            -Description "Repair WSL MSI package ($wslProductCode)" `
            -FilePath 'msiexec.exe' `
            -Arguments @('/fvomus', $wslProductCode, '/qn', '/norestart') `
            -SuccessExitCodes @(0, 3010, 1641)
    } else {
        Write-Step 'WARN' 'WSL MSI product code not found. Skipping direct MSI repair.' 'Yellow'
    }

    if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
        Invoke-Native `
            -Description 'winget repair Microsoft.WSL' `
            -FilePath 'winget.exe' `
            -Arguments @(
                'repair',
                '--id', 'Microsoft.WSL',
                '--exact',
                '--silent',
                '--accept-package-agreements',
                '--accept-source-agreements',
                '--disable-interactivity'
            ) `
            -ContinueOnError | Out-Null
    }

    $wslPackage = Get-AppxPackage *WindowsSubsystemForLinux* -ErrorAction SilentlyContinue |
        Sort-Object InstallDate -Descending |
        Select-Object -First 1

    if ($wslPackage -and (Get-Command Reset-AppxPackage -ErrorAction SilentlyContinue)) {
        Invoke-Safe 'Reset WSL AppX package' {
            Reset-AppxPackage -Package $wslPackage.PackageFullName
        } -ContinueOnError
    }

    if ($wslPackage -and $wslPackage.InstallLocation) {
        $manifestPath = Join-Path $wslPackage.InstallLocation 'AppxManifest.xml'
        if (Test-Path $manifestPath) {
            Invoke-Safe "Re-register WSL AppX package ($manifestPath)" {
                Add-AppxPackage -DisableDevelopmentMode -Register $manifestPath
            } -ContinueOnError
        }
    }

    if (Test-RebootPending) {
        Write-Step 'WARN' 'Windows now requires a reboot before WSL can be verified safely.' 'Yellow'
        Complete-Repair `
            -Title 'Reboot required to finish WSL repair' `
            -TitleColor 'Yellow' `
            -ExitCode 3010 `
            -Checklist @(
                '1. Restart Windows now.',
                '2. Re-run this repair script as Administrator after sign-in.',
                '3. After the repair script succeeds, re-run 02-docker-wsl-install.ps1.'
            )
    }

    # ------------------------------------------------------------- 6. VERIFY WSL ---
    Write-Step 'STAGE' '6/7  Verifying C:\Windows\System32\wsl.exe' 'Cyan'

    $systemProbe = Test-WslBinary -Path $systemWsl
    if (-not $systemProbe.Healthy) {
        Complete-Repair `
            -Title 'System32 WSL is still broken after repair' `
            -TitleColor 'Red' `
            -ExitCode 1603 `
            -Checklist @(
                '1. Do not replace C:\Windows\System32\wsl.exe manually.',
                '2. Run an in-place Windows repair install for the current Windows build.',
                '3. After Windows repair completes, run this script again.',
                '4. Re-run 02-docker-wsl-install.ps1 only after this script reports success.'
            )
    }

    Invoke-ExecutableWithTimeout `
        -FilePath $systemWsl `
        -Arguments @('--status') `
        -Description "$systemWsl --status" `
        -TimeoutSeconds 60 | Out-Null

    Invoke-ExecutableWithTimeout `
        -FilePath $systemWsl `
        -Arguments @('--set-default-version', '2') `
        -Description "$systemWsl --set-default-version 2" `
        -TimeoutSeconds 60 | Out-Null

    # ----------------------------------------------------------- 7. VERIFY DOCKER ---
    Write-Step 'STAGE' '7/7  Verifying Docker Desktop Linux engine' 'Cyan'

    if ($SkipDockerVerification) {
        Write-Step 'SKIP' 'Docker verification skipped (-SkipDockerVerification)' 'DarkGray'
    } elseif (-not (Test-Path $dockerExe)) {
        Write-Step 'SKIP' "Docker Desktop.exe not found at $dockerExe" 'DarkGray'
    } else {
        Invoke-Safe 'Create Docker settings folder' {
            if (-not (Test-Path $dockerSettingsDir)) {
                New-Item -Path $dockerSettingsDir -ItemType Directory -Force | Out-Null
            }
        }

        Repair-DockerSettings -SettingsFile $dockerSettingsFile -DataRoot $DataRoot

        Invoke-Safe 'Start Docker Desktop' {
            Start-Process -FilePath $dockerExe
        }

        Start-Sleep -Seconds 10

        $dockerCli = Get-DockerCliPath
        if (-not $dockerCli) {
            throw 'docker.exe not found after Docker Desktop start'
        }

        Write-Step 'INFO' ("Using Docker CLI: $dockerCli") 'Gray'

        $maxAttempts = 72
        $engineReady = $false
        for ($i = 1; $i -le $maxAttempts; $i++) {
            $raw = & $dockerCli info --format '{{.OSType}}' 2>$null
            $exitCode = $LASTEXITCODE
            $os = if ($raw) { ($raw | Out-String).Trim() } else { '' }

            if ($exitCode -eq 0 -and $os -eq 'linux') {
                Write-Step 'OK' ("Docker engine is Linux (attempt $i)") 'Green'
                $engineReady = $true
                break
            }

            Write-Host ("    .. attempt {0,2}/{1}  exit={2}  engine='{3}'" -f $i, $maxAttempts, $exitCode, $os) -ForegroundColor DarkGray
            Start-Sleep -Seconds 5
        }

        if (-not $engineReady) {
            if (Test-Path $dockerBackendLog) {
                Write-Step 'INFO' ("Tail of Docker backend log: $dockerBackendLog") 'Gray'
                Write-CommandOutput -Output (Get-Content -Path $dockerBackendLog -Tail 40)
            }
            throw 'Docker engine did not become Linux within the allotted wait window'
        }
    }

    Complete-Repair `
        -Title 'WSL repair completed' `
        -Checklist @(
            '1. Re-run scripts\win\02-docker-wsl-install.ps1 if Docker Desktop still needs to be installed.',
            '2. docker info --format "{{.OSType}}" should print linux.',
            '3. C:\Windows\System32\wsl.exe --version should now work without upgrade errors.'
        )
} catch {
    Write-Step 'ERROR' $_.Exception.Message 'Red'
    Complete-Repair `
        -Title 'WSL repair failed' `
        -TitleColor 'Red' `
        -ExitCode 1
}
