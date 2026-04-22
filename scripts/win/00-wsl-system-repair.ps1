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
$log = @()
$script:logPath = $null

function Write-Step {
    param([string]$Tag, [string]$Message, [string]$Color = 'Cyan')
    $line = ("[{0:HH:mm:ss}] [{1,-8}] {2}" -f (Get-Date), $Tag, $Message)
    Write-Host $line -ForegroundColor $Color
    $script:log += $line
}

function Save-RepairLog {
    if (-not $script:logPath) {
        $script:logPath = Join-Path $PSScriptRoot ("_wsl-repair-{0:yyyyMMdd-HHmmss}.log" -f $startedAt)
    }
    Set-Content -LiteralPath $script:logPath -Value $script:log -Encoding UTF8
    return $script:logPath
}

function Complete-Repair {
    param(
        [string]$Title,
        [int]$ExitCode = 0,
        [string[]]$Checklist = @(),
        [string]$TitleColor = 'Magenta'
    )

    $logPath = Save-RepairLog

    Write-Host ''
    Write-Host '======================================================================' -ForegroundColor $TitleColor
    Write-Host (" {0,-68}" -f $Title) -ForegroundColor $TitleColor
    Write-Host '======================================================================' -ForegroundColor $TitleColor
    Write-Host ''

    if ($Checklist.Count -gt 0) {
        Write-Host '  Next steps:' -ForegroundColor White
        foreach ($line in $Checklist) {
            Write-Host ("    {0}" -f $line)
        }
        Write-Host ''
    }

    Write-Host "  Log: $logPath" -ForegroundColor DarkGray
    Write-Host ''
    exit $ExitCode
}

function Write-CommandOutput {
    param([object]$Output)

    if ($null -eq $Output) {
        return
    }

    $text = ($Output | Out-String)
    foreach ($line in ($text -split "`r?`n")) {
        if ($line -and $line.Trim()) {
            Write-Host "    $line" -ForegroundColor DarkGray
        }
    }
}

function Invoke-Safe {
    param(
        [string]$Description,
        [scriptblock]$Action,
        [switch]$ContinueOnError
    )

    Write-Step 'RUN' $Description 'Gray'
    try {
        & $Action
        Write-Step 'OK' $Description 'Green'
    } catch {
        if ($ContinueOnError) {
            Write-Step 'WARN' ("Failed (continuing): $Description -> " + $_.Exception.Message) 'Yellow'
        } else {
            Write-Step 'ERROR' ("Failed: $Description -> " + $_.Exception.Message) 'Red'
            throw
        }
    }
}

function Invoke-Native {
    param(
        [string]$Description,
        [string]$FilePath,
        [string[]]$Arguments = @(),
        [int[]]$SuccessExitCodes = @(0),
        [switch]$ContinueOnError
    )

    Write-Step 'RUN' $Description 'Gray'
    try {
        $output = & $FilePath @Arguments 2>&1
        $exitCode = $LASTEXITCODE
        if ($null -eq $exitCode) { $exitCode = 0 }

        Write-CommandOutput -Output $output

        if ($SuccessExitCodes -contains $exitCode) {
            Write-Step 'OK' ("$Description (exit=$exitCode)") 'Green'
            return [pscustomobject]@{
                ExitCode = $exitCode
                Output   = $output
            }
        }

        $message = "$Description exited with code $exitCode"
        if ($ContinueOnError) {
            Write-Step 'WARN' $message 'Yellow'
            return [pscustomobject]@{
                ExitCode = $exitCode
                Output   = $output
            }
        }

        throw $message
    } catch {
        if ($ContinueOnError) {
            Write-Step 'WARN' ("Failed (continuing): $Description -> " + $_.Exception.Message) 'Yellow'
            return [pscustomobject]@{
                ExitCode = -1
                Output   = $_.Exception.Message
            }
        }

        Write-Step 'ERROR' ("Failed: $Description -> " + $_.Exception.Message) 'Red'
        throw
    }
}

function Invoke-ExecutableWithTimeout {
    param(
        [string]$FilePath,
        [string[]]$Arguments = @(),
        [int]$TimeoutSeconds = 120,
        [string]$Description,
        [int[]]$SuccessExitCodes = @(0),
        [switch]$ContinueOnError
    )

    if (-not $Description) {
        $Description = "$FilePath " + ($Arguments -join ' ')
    }

    Write-Step 'RUN' $Description 'Gray'

    $job = $null
    $targetName = [System.IO.Path]::GetFileName($FilePath)
    $isWsl = $targetName -ieq 'wsl.exe'
    $preWslPids = @()
    if ($isWsl) {
        $preWslPids = @(Get-Process -Name 'wsl', 'wslhost', 'wslservice' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
    }

    try {
        $job = Start-Job -ScriptBlock {
            param($CommandPath, $CommandArgs)

            try {
                $raw = & $CommandPath @CommandArgs 2>&1
                [pscustomobject]@{
                    ExitCode = $LASTEXITCODE
                    Output   = ($raw | Out-String)
                }
            } catch {
                [pscustomobject]@{
                    ExitCode = -1
                    Output   = ("EXCEPTION: " + $_.Exception.Message)
                }
            }
        } -ArgumentList $FilePath, $Arguments

        $completed = Wait-Job -Job $job -Timeout $TimeoutSeconds
        if (-not $completed) {
            Stop-Job -Job $job -ErrorAction SilentlyContinue

            if ($isWsl) {
                Get-Process -Name 'wsl', 'wslhost', 'wslservice' -ErrorAction SilentlyContinue |
                    Where-Object { $preWslPids -notcontains $_.Id } |
                    Stop-Process -Force -ErrorAction SilentlyContinue
            }

            $message = "$Description timed out after $TimeoutSeconds seconds"
            if ($ContinueOnError) {
                Write-Step 'WARN' $message 'Yellow'
                return [pscustomobject]@{
                    ExitCode = -1
                    Output   = $message
                }
            }

            Write-Step 'ERROR' $message 'Red'
            throw $message
        }

        $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
        if ($result -and $result.Output) {
            Write-CommandOutput -Output $result.Output
        }

        $exitCode = if ($result) { $result.ExitCode } else { -1 }
        if ($null -eq $exitCode) { $exitCode = 0 }

        if ($SuccessExitCodes -contains $exitCode) {
            Write-Step 'OK' ("$Description (exit=$exitCode)") 'Green'
            return $result
        }

        $message = "$Description exited with code $exitCode"
        if ($ContinueOnError) {
            Write-Step 'WARN' $message 'Yellow'
            return $result
        }

        Write-Step 'ERROR' $message 'Red'
        throw $message
    } finally {
        if ($job) {
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        }
    }
}

function Test-RebootPending {
    $pendingKeys = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'
    )

    foreach ($key in $pendingKeys) {
        if (Test-Path $key) {
            return $true
        }
    }

    $sessionManager = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -ErrorAction SilentlyContinue
    if ($sessionManager -and $sessionManager.PendingFileRenameOperations) {
        return $true
    }

    return $false
}

function Test-WslBinary {
    param(
        [string]$Path,
        [int]$TimeoutSeconds = 90,
        [switch]$Quiet
    )

    if (-not (Test-Path $Path)) {
        return [pscustomobject]@{
            Path     = $Path
            Exists   = $false
            Healthy  = $false
            ExitCode = -1
            Output   = 'File not found'
        }
    }

    $result = Invoke-ExecutableWithTimeout `
        -FilePath $Path `
        -Arguments @('--version') `
        -Description "$Path --version" `
        -TimeoutSeconds $TimeoutSeconds `
        -ContinueOnError

    return [pscustomobject]@{
        Path     = $Path
        Exists   = $true
        Healthy  = ($result.ExitCode -eq 0)
        ExitCode = $result.ExitCode
        Output   = (($result.Output | Out-String).Trim())
    }
}

function Get-WslMsiProductCode {
    $roots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
    )

    foreach ($root in $roots) {
        if (-not (Test-Path $root)) {
            continue
        }

        $entry = Get-ChildItem -Path $root -ErrorAction SilentlyContinue |
            Get-ItemProperty -ErrorAction SilentlyContinue |
            Where-Object {
                $_.DisplayName -eq 'Windows Subsystem for Linux' -or
                $_.DisplayName -like 'Windows Subsystem for Linux *'
            } |
            Select-Object -First 1

        if ($entry -and $entry.PSChildName -match '^\{[0-9A-F\-]+\}$') {
            return $entry.PSChildName
        }
    }

    return $null
}

function Get-DockerCliPath {
    $candidates = @(
        'C:\Program Files\Docker\Docker\resources\bin\docker.exe',
        (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe')
    )

    $cmd = Get-Command docker.exe -ErrorAction SilentlyContinue
    if ($cmd) {
        if ($cmd.Path) {
            $candidates += $cmd.Path
        } elseif ($cmd.Source) {
            $candidates += $cmd.Source
        }
    }

    return $candidates |
        Where-Object { $_ -and (Test-Path $_) } |
        Select-Object -Unique |
        Select-Object -First 1
}

function Repair-DockerSettings {
    param(
        [string]$SettingsFile,
        [string]$DataRoot
    )

    $settings = [ordered]@{}
    if (Test-Path $SettingsFile) {
        try {
            $loaded = Get-Content -LiteralPath $SettingsFile -Raw | ConvertFrom-Json -AsHashtable
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
    Set-Content -LiteralPath $SettingsFile -Value $json -Encoding UTF8
    Write-Step 'OK' ("Normalized Docker settings at $SettingsFile") 'Green'
}

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
