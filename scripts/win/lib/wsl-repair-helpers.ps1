function Write-Step {
    param([string]$Tag, [string]$Message, [string]$Color = 'Cyan')
    $line = ("[{0:HH:mm:ss}] [{1,-8}] {2}" -f (Get-Date), $Tag, $Message)
    Write-Host $line -ForegroundColor $Color
    $script:log += $line
}

function Save-RepairLog {
    if (-not $script:logPath) {
        $logRoot = if ($script:repairRoot) { $script:repairRoot } else { $PSScriptRoot }
        $script:logPath = Join-Path $logRoot ("_wsl-repair-{0:yyyyMMdd-HHmmss}.log" -f $startedAt)
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
