Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$script:ScriptPath = $PSCommandPath
if (-not $script:ScriptPath) { $script:ScriptPath = $MyInvocation.MyCommand.Path }
if (-not $script:ScriptPath) { throw 'This script must be saved to a .ps1 file before execution.' }

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
    $hostExe = if ($PSVersionTable.PSEdition -eq 'Core' -and (Get-Command pwsh.exe -ErrorAction SilentlyContinue)) { 'pwsh.exe' } else { 'powershell.exe' }
    $argumentList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $script:ScriptPath)
    if ($args.Count -gt 0) { $argumentList += $args }
    Start-Process -FilePath $hostExe -ArgumentList $argumentList -Verb RunAs | Out-Null
    exit
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logRoot = Join-Path $env:ProgramData 'DockerWslHardPurge'
New-Item -Path $logRoot -ItemType Directory -Force | Out-Null
$logPath = Join-Path $logRoot "hard-purge-$stamp.log"
$transcriptPath = Join-Path $logRoot "hard-purge-$stamp.transcript.log"
Start-Transcript -Path $transcriptPath -Force | Out-Null

$script:FOUND = [System.Collections.Generic.List[string]]::new()
$script:REMOVED = [System.Collections.Generic.List[string]]::new()
$script:FAILED = [System.Collections.Generic.List[string]]::new()
$script:SCHEDULED_FOR_REBOOT = [System.Collections.Generic.List[string]]::new()
$script:STILL_PRESENT = [System.Collections.Generic.List[string]]::new()
$script:RestartRequired = $false

$script:DirectServiceNames = @(
    'com.docker.service',
    'docker',
    'WSLService',
    'WslInstaller',
    'LxssManager'
)

$script:DirectServiceRegistryKeys = @(
    'HKLM:\SYSTEM\CurrentControlSet\Services\com.docker.service',
    'HKLM:\SYSTEM\CurrentControlSet\Services\docker',
    'HKLM:\SYSTEM\CurrentControlSet\Services\WSLService',
    'HKLM:\SYSTEM\CurrentControlSet\Services\WslInstaller',
    'HKLM:\SYSTEM\CurrentControlSet\Services\LxssManager'
)

$script:AssistServiceNames = @(
    'vmcompute',
    'hns'
)

$script:DirectProcessPatterns = @(
    '^Docker Desktop$',
    '^docker$',
    '^dockerd$',
    '^docker-compose$',
    '^com\.docker\..+$',
    '^vpnkit$',
    '^wsl$',
    '^wslhost$',
    '^wslservice$',
    '^vmmem$',
    '^vmmemWSL$'
)

$script:KnownAppxPatterns = @(
    'MicrosoftCorporationII.WindowsSubsystemForLinux*',
    'Microsoft.WSL*',
    'CanonicalGroupLimited.Ubuntu*',
    'TheDebianProject.DebianGNULinux*',
    'SUSE.*',
    'openSUSE*',
    'WhitewaterFoundry*',
    'AlpineWSL*',
    'Pengwin*',
    'KaliLinux*',
    'kali-linux*'
)

$script:DirectAppPathNames = @(
    'wsl.exe',
    'wslconfig.exe',
    'docker.exe',
    'docker-compose.exe',
    'docker desktop.exe',
    'com.docker.cli.exe'
)

$script:DirectShortcutNameRegex = '(?i)^(Docker Desktop|WSL|WSL Settings)(\.lnk)?$'
$script:DirectPathRegex = '(?i)(\\|/)(Docker|DockerDesktop|docker-desktop|docker-desktop-data|WSL|lxss)(\\|/|$)|(^|\\|/)\.docker($|\\|/)|(^|\\|/)\.wslconfig$|MicrosoftCorporationII\.WindowsSubsystemForLinux_|CanonicalGroupLimited\.Ubuntu[0-9A-Za-z\._-]*|TheDebianProject\.DebianGNULinux[0-9A-Za-z\._-]*|KaliLinux[0-9A-Za-z\._-]*|kali-linux[0-9A-Za-z\._-]*|WhitewaterFoundry(\.Pengwin)?[0-9A-Za-z\._-]*|Pengwin[0-9A-Za-z\._-]*|AlpineWSL[0-9A-Za-z\._-]*|SUSE[0-9A-Za-z\._-]*|openSUSE[0-9A-Za-z\._-]*'
$script:DirectTextRegex = '(?i)\b(Docker Desktop|Docker Inc\.|com\.docker|dockerd|docker-desktop|docker-desktop-data|Windows Subsystem for Linux|Microsoft\.WSL|Lxss|WSLService|WslInstaller|LxssManager)\b'
$script:DistroFamilyRegex = '(?i)\b(CanonicalGroupLimited\.Ubuntu[0-9A-Za-z\._-]*|TheDebianProject\.DebianGNULinux[0-9A-Za-z\._-]*|KaliLinux[0-9A-Za-z\._-]*|kali-linux[0-9A-Za-z\._-]*|WhitewaterFoundry(\.Pengwin)?[0-9A-Za-z\._-]*|Pengwin[0-9A-Za-z\._-]*|AlpineWSL[0-9A-Za-z\._-]*|SUSE[0-9A-Za-z\._-]*|openSUSE[0-9A-Za-z\._-]*)\b'

function Add-UniqueItem {
    param(
        [System.Collections.Generic.List[string]]$Bucket,
        [string]$Item
    )
    if ([string]::IsNullOrWhiteSpace($Item)) { return }
    if (-not $Bucket.Contains($Item)) { $Bucket.Add($Item) }
}

function Add-Found { param([string]$Item) Add-UniqueItem -Bucket $script:FOUND -Item $Item }
function Add-Removed { param([string]$Item) Add-UniqueItem -Bucket $script:REMOVED -Item $Item }
function Add-Failed { param([string]$Item) Add-UniqueItem -Bucket $script:FAILED -Item $Item }
function Add-Scheduled { param([string]$Item) Add-UniqueItem -Bucket $script:SCHEDULED_FOR_REBOOT -Item $Item }
function Add-StillPresent { param([string]$Item) Add-UniqueItem -Bucket $script:STILL_PRESENT -Item $Item }

function Write-Log {
    param(
        [string]$Level,
        [string]$Message
    )
    $line = '[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level.ToUpperInvariant(), $Message
    Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
    Write-Host $line
}

function Get-StringOrEmpty {
    param([AllowNull()][object]$Value)
    if ($null -eq $Value) { return '' }
    return ([string]$Value) -replace "`0", ''
}

function Get-ObjectPropertyValue {
    param(
        [AllowNull()][object]$InputObject,
        [string]$Name,
        [AllowNull()][object]$Default = $null
    )
    if ($null -eq $InputObject) { return $Default }
    if ([string]::IsNullOrWhiteSpace($Name)) { return $Default }
    $prop = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $prop) { return $Default }
    return $prop.Value
}

function Get-ObjectPropertyString {
    param(
        [AllowNull()][object]$InputObject,
        [string]$Name
    )
    return (Get-StringOrEmpty (Get-ObjectPropertyValue -InputObject $InputObject -Name $Name))
}

function Get-FirstNonEmpty {
    param(
        [AllowNull()][object]$Primary,
        [AllowNull()][object]$Fallback
    )
    if (-not [string]::IsNullOrWhiteSpace((Get-StringOrEmpty $Primary))) { return [string]$Primary }
    return (Get-StringOrEmpty $Fallback)
}

function Invoke-Step {
    param(
        [string]$Label,
        [scriptblock]$Action
    )
    Write-Log INFO $Label
    try {
        & $Action
    } catch {
        Add-Failed ("STEP: $Label -> $($_.Exception.Message)")
        Write-Log ERROR ("{0} -> {1}" -f $Label, $_.Exception.Message)
    }
}

function Test-DirectText {
    param(
        [AllowNull()][string]$Text,
        [switch]$AllowDistroFamilies
    )
    if ([string]::IsNullOrWhiteSpace($Text)) { return $false }
    if ($Text -match $script:DirectTextRegex) { return $true }
    if ($AllowDistroFamilies -and $Text -match $script:DistroFamilyRegex) { return $true }
    return $false
}

function Test-DirectPath {
    param([AllowNull()][string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
    $expanded = [Environment]::ExpandEnvironmentVariables($Path)
    return ($expanded -match $script:DirectPathRegex)
}

function Get-NativeRegistryPath {
    param([string]$Path)
    if ($Path -like 'HKLM:*') { return 'HKEY_LOCAL_MACHINE' + $Path.Substring(4) }
    if ($Path -like 'HKCU:*') { return 'HKEY_CURRENT_USER' + $Path.Substring(4) }
    if ($Path -like 'HKCR:*') { return 'HKEY_CLASSES_ROOT' + $Path.Substring(4) }
    if ($Path -like 'HKU:*') { return 'HKEY_USERS' + $Path.Substring(3) }
    if ($Path -like 'Registry::HKEY_LOCAL_MACHINE*') { return $Path.Substring(10) }
    if ($Path -like 'Registry::HKEY_CURRENT_USER*') { return $Path.Substring(10) }
    if ($Path -like 'Registry::HKEY_CLASSES_ROOT*') { return $Path.Substring(10) }
    if ($Path -like 'Registry::HKEY_USERS*') { return $Path.Substring(10) }
    return $Path
}

function Split-CommandLine {
    param([string]$CommandLine)
    $expanded = [Environment]::ExpandEnvironmentVariables((Get-StringOrEmpty $CommandLine).Trim())
    if ([string]::IsNullOrWhiteSpace($expanded)) {
        return [pscustomobject]@{ FilePath = $null; Arguments = '' }
    }
    if ($expanded -match '^\s*"([^"]+)"\s*(.*)$') {
        return [pscustomobject]@{ FilePath = $matches[1]; Arguments = $matches[2] }
    }
    $index = $expanded.IndexOf(' ')
    if ($index -lt 0) {
        return [pscustomobject]@{ FilePath = $expanded; Arguments = '' }
    }
    return [pscustomobject]@{
        FilePath  = $expanded.Substring(0, $index)
        Arguments = $expanded.Substring($index + 1)
    }
}

function Invoke-External {
    param(
        [string]$FilePath,
        [string]$ArgumentString = '',
        [int]$TimeoutSeconds = 90,
        [int[]]$SuccessExitCodes = @(0),
        [string]$Description = $null
    )

    if (-not $Description) { $Description = "$FilePath $ArgumentString".Trim() }
    $resolved = $null
    $command = Get-Command $FilePath -ErrorAction SilentlyContinue
    if ($command) {
        $resolved = $command.Source
    } elseif (Test-Path -LiteralPath $FilePath) {
        $resolved = $FilePath
    }

    if (-not $resolved) {
        return [pscustomobject]@{
            Description = $Description
            FilePath    = $FilePath
            Arguments   = $ArgumentString
            ExitCode    = -1
            StdOut      = ''
            StdErr      = "File not found: $FilePath"
            TimedOut    = $false
            Success     = $false
        }
    }

    $stdoutFile = Join-Path $env:TEMP ("dwsp-{0}.out" -f [guid]::NewGuid().Guid)
    $stderrFile = Join-Path $env:TEMP ("dwsp-{0}.err" -f [guid]::NewGuid().Guid)
    $process = $null
    $timedOut = $false

    try {
        $process = Start-Process -FilePath $resolved -ArgumentList $ArgumentString -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            $timedOut = $true
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {
        return [pscustomobject]@{
            Description = $Description
            FilePath    = $resolved
            Arguments   = $ArgumentString
            ExitCode    = -1
            StdOut      = ''
            StdErr      = $_.Exception.Message
            TimedOut    = $false
            Success     = $false
        }
    }

    $stdout = if (Test-Path -LiteralPath $stdoutFile) { Get-Content -LiteralPath $stdoutFile -Raw -ErrorAction SilentlyContinue } else { '' }
    $stderr = if (Test-Path -LiteralPath $stderrFile) { Get-Content -LiteralPath $stderrFile -Raw -ErrorAction SilentlyContinue } else { '' }
    Remove-Item -LiteralPath $stdoutFile, $stderrFile -Force -ErrorAction SilentlyContinue

    $exitCode = if ($timedOut) { -9 } else { $process.ExitCode }
    $success = (-not $timedOut) -and ($SuccessExitCodes -contains $exitCode)

    return [pscustomobject]@{
        Description = $Description
        FilePath    = $resolved
        Arguments   = $ArgumentString
        ExitCode    = $exitCode
        StdOut      = $stdout
        StdErr      = $stderr
        TimedOut    = $timedOut
        Success     = $success
    }
}

function Invoke-CommandLine {
    param(
        [string]$CommandLine,
        [int]$TimeoutSeconds = 90,
        [int[]]$SuccessExitCodes = @(0),
        [string]$Description = $null
    )
    $parts = Split-CommandLine -CommandLine $CommandLine
    $effectiveDescription = Get-FirstNonEmpty -Primary $Description -Fallback $CommandLine
    if (-not $parts.FilePath) {
        return [pscustomobject]@{
            Description = $effectiveDescription
            FilePath    = ''
            Arguments   = ''
            ExitCode    = -1
            StdOut      = ''
            StdErr      = "Invalid command line: $CommandLine"
            TimedOut    = $false
            Success     = $false
        }
    }
    return Invoke-External -FilePath $parts.FilePath -ArgumentString $parts.Arguments -TimeoutSeconds $TimeoutSeconds -SuccessExitCodes $SuccessExitCodes -Description $effectiveDescription
}

function Normalize-UninstallCommandLine {
    param([string]$CommandLine)
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $null }
    $expanded = [Environment]::ExpandEnvironmentVariables($CommandLine.Trim())
    if ($expanded -match '(?i)msiexec(\.exe)?') {
        $productCode = [regex]::Match($expanded, '\{[0-9A-Fa-f\-]{36}\}').Value
        if ($productCode) { return "msiexec.exe /x $productCode /qn /norestart" }
        $expanded = $expanded -replace '(?i)\s/I', ' /X'
        if ($expanded -notmatch '(?i)\s/q') { $expanded += ' /qn' }
        if ($expanded -notmatch '(?i)norestart') { $expanded += ' /norestart' }
    }
    return $expanded
}

function Add-PendingDelete {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    $sessionManager = 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager'
    $existing = @((Get-ItemProperty -Path $sessionManager -Name PendingFileRenameOperations -ErrorAction SilentlyContinue).PendingFileRenameOperations)
    $entry = if ($Path.StartsWith('\??\')) { $Path } else { '\??\' + $Path }
    $updated = @()
    if ($existing) { $updated += $existing }
    $updated += $entry
    $updated += ''
    New-ItemProperty -Path $sessionManager -Name PendingFileRenameOperations -PropertyType MultiString -Value $updated -Force | Out-Null
    Add-Scheduled $Path
    $script:RestartRequired = $true
}

function Stop-ProcessesMatchingPath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    $escaped = [regex]::Escape($Path)
    $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        ($_.ExecutablePath -and $_.ExecutablePath -match "^$escaped") -or
        ($_.CommandLine -and $_.CommandLine -match $escaped)
    }
    foreach ($proc in $procs) {
        Add-Found ("ProcessByPath: {0} [{1}] {2}" -f $proc.Name, $proc.ProcessId, (Get-FirstNonEmpty -Primary $proc.ExecutablePath -Fallback $proc.CommandLine))
        try {
            Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
            Add-Removed ("ProcessByPath: {0} [{1}]" -f $proc.Name, $proc.ProcessId)
        } catch {
            Add-Failed ("ProcessByPath: {0} [{1}] -> {2}" -f $proc.Name, $proc.ProcessId, $_.Exception.Message)
        }
    }
}

function Unlock-Path {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Invoke-External -FilePath 'attrib.exe' -ArgumentString "/S /D -R -S -H `"$Path`"" -TimeoutSeconds 60 -SuccessExitCodes @(0,1) | Out-Null
    Invoke-External -FilePath 'takeown.exe' -ArgumentString "/F `"$Path`" /A /R /D Y" -TimeoutSeconds 180 -SuccessExitCodes @(0,1) | Out-Null
    Invoke-External -FilePath 'icacls.exe' -ArgumentString "`"$Path`" /inheritance:e /grant *S-1-5-32-544:(OI)(CI)F /T /C /Q" -TimeoutSeconds 240 -SuccessExitCodes @(0,1) | Out-Null
}

function Remove-PathHard {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Add-Found ("Path: $Path")
    Stop-ProcessesMatchingPath -Path $Path

    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
        } catch {}
        if (-not (Test-Path -LiteralPath $Path)) {
            Add-Removed ("Path: $Path")
            return
        }
        Unlock-Path -Path $Path
        try {
            Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
        } catch {}
        if (-not (Test-Path -LiteralPath $Path)) {
            Add-Removed ("Path: $Path")
            return
        }
    }

    Add-PendingDelete -Path $Path
    if (Test-Path -LiteralPath $Path) {
        Add-Failed ("Path: $Path -> immediate removal failed")
        Add-StillPresent ("Path: $Path")
    }
}

function Remove-RegistryTreeHard {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Add-Found ("RegistryKey: $Path")
    try {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    } catch {
        $native = Get-NativeRegistryPath -Path $Path
        Invoke-External -FilePath 'reg.exe' -ArgumentString ("delete `"{0}`" /f" -f $native) -TimeoutSeconds 60 -SuccessExitCodes @(0,1) | Out-Null
    }
    if (Test-Path -LiteralPath $Path) {
        Add-Failed ("RegistryKey: $Path -> removal failed")
        Add-StillPresent ("RegistryKey: $Path")
    } else {
        Add-Removed ("RegistryKey: $Path")
    }
}

function Remove-RegistryValueHard {
    param(
        [string]$Path,
        [string]$Name
    )
    $item = Get-ItemProperty -LiteralPath $Path -Name $Name -ErrorAction SilentlyContinue
    if ($null -eq $item) { return }
    Add-Found ("RegistryValue: $Path -> $Name = $($item.$Name)")
    try {
        Remove-ItemProperty -LiteralPath $Path -Name $Name -Force -ErrorAction Stop
    } catch {
        $native = Get-NativeRegistryPath -Path $Path
        Invoke-External -FilePath 'reg.exe' -ArgumentString ("delete `"{0}`" /v `"{1}`" /f" -f $native, $Name) -TimeoutSeconds 60 -SuccessExitCodes @(0,1) | Out-Null
    }
    $verify = Get-ItemProperty -LiteralPath $Path -Name $Name -ErrorAction SilentlyContinue
    if ($null -eq $verify) {
        Add-Removed ("RegistryValue: $Path -> $Name")
    } else {
        Add-Failed ("RegistryValue: $Path -> $Name -> removal failed")
        Add-StillPresent ("RegistryValue: $Path -> $Name")
    }
}

function Get-WslExecutableCandidates {
    $candidates = [System.Collections.Generic.List[string]]::new()
    foreach ($path in @(
        "$env:WINDIR\System32\wsl.exe",
        "$env:ProgramFiles\WSL\wsl.exe",
        "$env:LOCALAPPDATA\Microsoft\WindowsApps\wsl.exe"
    )) {
        if ($path -and (Test-Path -LiteralPath $path)) { Add-UniqueItem -Bucket $candidates -Item $path }
    }

    try {
        Get-AppxPackage *WindowsSubsystemForLinux* -ErrorAction SilentlyContinue | ForEach-Object {
            $installLocation = Get-ObjectPropertyString -InputObject $_ -Name 'InstallLocation'
            if (-not [string]::IsNullOrWhiteSpace($installLocation)) {
                $candidate = Join-Path $installLocation 'wsl.exe'
                if (Test-Path -LiteralPath $candidate) { Add-UniqueItem -Bucket $candidates -Item $candidate }
            }
        }
    } catch {}

    try {
        $appPath = Get-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\wsl.exe' -ErrorAction SilentlyContinue
        $defaultPath = Get-ObjectPropertyString -InputObject $appPath -Name '(default)'
        if ($defaultPath -and (Test-Path -LiteralPath $defaultPath)) {
            Add-UniqueItem -Bucket $candidates -Item $defaultPath
        }
    } catch {}

    return $candidates
}

function Invoke-WslCommand {
    param(
        [string]$Arguments,
        [int]$TimeoutSeconds = 60
    )
    $last = $null
    foreach ($candidate in (Get-WslExecutableCandidates)) {
        $result = Invoke-External -FilePath $candidate -ArgumentString $Arguments -TimeoutSeconds $TimeoutSeconds -SuccessExitCodes @(0) -Description "$candidate $Arguments"
        $last = $result
        if ($result.Success) { return $result }
    }
    if ($null -eq $last) {
        return [pscustomobject]@{
            Description = "wsl.exe $Arguments"
            FilePath    = ''
            Arguments   = $Arguments
            ExitCode    = -1
            StdOut      = ''
            StdErr      = 'No wsl.exe candidate found'
            TimedOut    = $false
            Success     = $false
        }
    }
    return $last
}

function Test-WslListResultIsUseful {
    param([psobject]$Result)
    if ($Result.Success) { return $true }
    $combined = ((Get-StringOrEmpty $Result.StdOut) + "`n" + (Get-StringOrEmpty $Result.StdErr))
    return ($combined -match '(?i)no installed distributions' -or (Test-WslNotInstalledMessage -Result $Result))
}

function Test-WslNotInstalledMessage {
    param([psobject]$Result)
    $combined = ((Get-StringOrEmpty $Result.StdOut) + "`n" + (Get-StringOrEmpty $Result.StdErr))
    return (
        $combined -match '(?i)windows subsystem for linux is not installed' -or
        $combined -match '(?i)\bwsl\b.*is not installed' -or
        $combined -match '(?i)wsl_e_wsl_not_installed'
    )
}

function Test-WslUnregisterSemanticSuccess {
    param([psobject]$Result)
    if ($Result.Success) { return $true }
    if (Test-WslNotInstalledMessage -Result $Result) { return $true }
    $combined = ((Get-StringOrEmpty $Result.StdOut) + "`n" + (Get-StringOrEmpty $Result.StdErr))
    return ($combined -match '(?i)there is no distribution with the supplied name' -or $combined -match '(?i)distribution .* was not found')
}

function Test-WslUninstallSemanticSuccess {
    param([psobject]$Result)
    if ($Result.Success) { return $true }
    if (Test-WslNotInstalledMessage -Result $Result) { return $true }
    $combined = ((Get-StringOrEmpty $Result.StdOut) + "`n" + (Get-StringOrEmpty $Result.StdErr))
    return ($combined -match '(?i)no such package')
}

function Get-RegisteredWslDistros {
    $distros = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $lxssRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss'
    if (Test-Path $lxssRoot) {
        Add-Found ("RegistryKey: $lxssRoot")
        foreach ($sub in (Get-ChildItem -LiteralPath $lxssRoot -ErrorAction SilentlyContinue)) {
            $props = Get-ItemProperty -LiteralPath $sub.PSPath -ErrorAction SilentlyContinue
            $distributionName = Get-ObjectPropertyString -InputObject $props -Name 'DistributionName'
            if ($distributionName) { [void]$distros.Add($distributionName) }
        }
    }
    return $distros
}

function Get-WslPurgeTargets {
    param([switch]$IncludeDockerFallbacks)
    $targets = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($name in (Get-RegisteredWslDistros)) {
        if ($name) { [void]$targets.Add($name) }
    }
    if ($IncludeDockerFallbacks) {
        [void]$targets.Add('docker-desktop')
        [void]$targets.Add('docker-desktop-data')
    }
    return $targets
}

function Get-PreferredWslCommandPath {
    $preferred = "$env:ProgramFiles\WSL\wsl.exe"
    if (Test-Path -LiteralPath $preferred) { return $preferred }
    foreach ($candidate in (Get-WslExecutableCandidates)) {
        if ($candidate) { return $candidate }
    }
    return $null
}

function Get-RelatedArpEntries {
    $entries = [System.Collections.Generic.List[object]]::new()
    $roots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
    )

    foreach ($root in $roots) {
        if (-not (Test-Path $root)) { continue }
        foreach ($key in (Get-ChildItem -LiteralPath $root -ErrorAction SilentlyContinue)) {
            $props = Get-ItemProperty -LiteralPath $key.PSPath -ErrorAction SilentlyContinue
            if ($null -eq $props) { continue }
            $displayName = Get-ObjectPropertyString -InputObject $props -Name 'DisplayName'
            $publisher = Get-ObjectPropertyString -InputObject $props -Name 'Publisher'
            $installLocation = Get-ObjectPropertyString -InputObject $props -Name 'InstallLocation'
            $uninstallString = Get-ObjectPropertyString -InputObject $props -Name 'UninstallString'
            $quietUninstallString = Get-ObjectPropertyString -InputObject $props -Name 'QuietUninstallString'
            $isDirect = (Test-DirectText $displayName -AllowDistroFamilies) -or
                (Test-DirectText $publisher -AllowDistroFamilies) -or
                (Test-DirectPath $installLocation) -or
                (Test-DirectText $uninstallString -AllowDistroFamilies) -or
                (Test-DirectText $quietUninstallString -AllowDistroFamilies)
            if (-not $isDirect) { continue }
            $entries.Add([pscustomobject]@{
                RegistryPath         = $key.PSPath
                KeyName              = $key.PSChildName
                DisplayName          = $displayName
                Publisher            = $publisher
                InstallLocation      = $installLocation
                UninstallString      = $uninstallString
                QuietUninstallString = $quietUninstallString
                ProductCode          = if ($key.PSChildName -match '^\{[0-9A-Fa-f\-]{36}\}$') { $key.PSChildName } else { [regex]::Match("$uninstallString $quietUninstallString", '\{[0-9A-Fa-f\-]{36}\}').Value }
            })
        }
    }

    return $entries | Sort-Object RegistryPath -Unique
}

function Get-RelatedMsiProducts {
    $products = [System.Collections.Generic.List[object]]::new()
    try {
        $installer = New-Object -ComObject WindowsInstaller.Installer
        foreach ($productCode in @($installer.Products)) {
            $name = $null
            $publisher = $null
            $installLocation = $null
            $localPackage = $null
            $upgradeCode = $null
            try { $name = $installer.ProductInfo($productCode, 'ProductName') } catch {}
            try { $publisher = $installer.ProductInfo($productCode, 'Publisher') } catch {}
            try { $installLocation = $installer.ProductInfo($productCode, 'InstallLocation') } catch {}
            try { $localPackage = $installer.ProductInfo($productCode, 'LocalPackage') } catch {}
            try { $upgradeCode = $installer.ProductInfo($productCode, 'UpgradeCode') } catch {}

            $isDirect = (Test-DirectText $name -AllowDistroFamilies) -or
                (Test-DirectText $publisher -AllowDistroFamilies) -or
                (Test-DirectPath $installLocation) -or
                (Test-DirectPath $localPackage)
            if (-not $isDirect) { continue }

            $products.Add([pscustomobject]@{
                ProductCode     = $productCode
                ProductName     = $name
                Publisher       = $publisher
                InstallLocation = $installLocation
                LocalPackage    = $localPackage
                UpgradeCode     = $upgradeCode
            })
        }
    } catch {}
    return $products | Sort-Object ProductCode -Unique
}

function Remove-UninstallEntry {
    param([psobject]$Entry)
    if ($null -eq $Entry) { return }

    $label = if ($Entry.DisplayName) { $Entry.DisplayName } else { $Entry.KeyName }
    Add-Found ("ARP: $label [$($Entry.RegistryPath)]")

    if ($Entry.ProductCode) {
        $msiResult = Invoke-External -FilePath 'msiexec.exe' -ArgumentString "/x $($Entry.ProductCode) /qn /norestart" -TimeoutSeconds 300 -SuccessExitCodes @(0,1605,1614,3010,1641) -Description "msiexec /x $($Entry.ProductCode)"
        if ($msiResult.ExitCode -in 3010,1641) { $script:RestartRequired = $true }
    }

    foreach ($commandLine in @($Entry.QuietUninstallString, $Entry.UninstallString)) {
        if ([string]::IsNullOrWhiteSpace($commandLine)) { continue }
        $normalized = Normalize-UninstallCommandLine -CommandLine $commandLine
        if ([string]::IsNullOrWhiteSpace($normalized)) { continue }
        $result = Invoke-CommandLine -CommandLine $normalized -TimeoutSeconds 300 -SuccessExitCodes @(0,1605,1614,3010,1641) -Description "UninstallCommand: $normalized"
        if ($result.ExitCode -in 3010,1641) { $script:RestartRequired = $true }
    }

    if ($Entry.InstallLocation -and (Test-Path -LiteralPath $Entry.InstallLocation)) {
        foreach ($exe in (Get-ChildItem -LiteralPath $Entry.InstallLocation -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
            $_.Extension -eq '.exe' -and $_.Name -match '(?i)(uninstall|setup|installer|docker)'
        } | Select-Object -First 12)) {
            Invoke-External -FilePath $exe.FullName -ArgumentString '--quiet' -TimeoutSeconds 300 -SuccessExitCodes @(0,3010,1641) -Description "LocalUninstaller: $($exe.FullName)" | Out-Null
        }
    }

    if ($Entry.RegistryPath -and (Test-Path -LiteralPath $Entry.RegistryPath)) {
        Remove-RegistryTreeHard -Path $Entry.RegistryPath
    }
}

function Remove-AppxPackageVerified {
    param(
        [psobject]$Package,
        [switch]$AllUsers
    )
    if ($null -eq $Package) { return }
    $label = if ($AllUsers) { "AppxAllUsers: $($Package.PackageFullName)" } else { "AppxCurrentUser: $($Package.PackageFullName)" }
    Add-Found $label

    try {
        if ($AllUsers) {
            Remove-AppxPackage -AllUsers -Package $Package.PackageFullName -ErrorAction Stop
        } else {
            Remove-AppxPackage -Package $Package.PackageFullName -ErrorAction Stop
        }
    } catch {
        Add-Failed ("$label -> $($_.Exception.Message)")
    }

    $stillThere = $false
    try {
        if ($AllUsers) {
            $stillThere = @(
                Get-AppxPackage -AllUsers $Package.Name -ErrorAction SilentlyContinue |
                Where-Object { $_.PackageFullName -eq $Package.PackageFullName }
            ).Count -gt 0
        } else {
            $stillThere = @(
                Get-AppxPackage $Package.Name -ErrorAction SilentlyContinue |
                Where-Object { $_.PackageFullName -eq $Package.PackageFullName }
            ).Count -gt 0
        }
    } catch {
        $stillThere = $true
    }

    if ($stillThere) {
        Add-Failed ("$label -> verification failed")
        Add-StillPresent $label
    } else {
        Add-Removed $label
    }
}

function Remove-ProvisionedPackageVerified {
    param([psobject]$Package)
    if ($null -eq $Package) { return }
    $label = "ProvisionedAppx: $($Package.PackageName)"
    Add-Found $label
    try {
        Remove-AppxProvisionedPackage -Online -PackageName $Package.PackageName -ErrorAction Stop | Out-Null
    } catch {
        Add-Failed ("$label -> $($_.Exception.Message)")
    }
    $stillThere = @(
        Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue |
        Where-Object { $_.PackageName -eq $Package.PackageName }
    ).Count -gt 0
    if ($stillThere) {
        Add-Failed ("$label -> verification failed")
        Add-StillPresent $label
    } else {
        Add-Removed $label
    }
}

function Remove-DirectProcesses {
    $wmi = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
    foreach ($proc in (Get-Process -ErrorAction SilentlyContinue)) {
        $match = $false
        foreach ($pattern in $script:DirectProcessPatterns) {
            if ($proc.ProcessName -match $pattern) { $match = $true; break }
        }
        $processInfo = $wmi | Where-Object { $_.ProcessId -eq $proc.Id } | Select-Object -First 1
        $path = $null
        try { $path = $proc.Path } catch {}
        $cmdLine = $processInfo.CommandLine

        if (-not $match) {
            if ((Test-DirectPath $path) -or (Test-DirectText $cmdLine -AllowDistroFamilies)) { $match = $true }
        }

        if (-not $match) { continue }

        Add-Found ("Process: $($proc.ProcessName) [$($proc.Id)]")
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Start-Sleep -Milliseconds 250
            if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) {
                Add-Failed ("Process: $($proc.ProcessName) [$($proc.Id)] -> still running")
                Add-StillPresent ("Process: $($proc.ProcessName) [$($proc.Id)]")
            } else {
                Add-Removed ("Process: $($proc.ProcessName) [$($proc.Id)]")
            }
        } catch {
            Add-Failed ("Process: $($proc.ProcessName) [$($proc.Id)] -> $($_.Exception.Message)")
            if ($proc.ProcessName -match '^(?i)vmmem(WSL)?$') {
                Add-Scheduled ("Process: $($proc.ProcessName) [$($proc.Id)]")
                $script:RestartRequired = $true
            }
        }
    }
}

function Remove-DirectServices {
    foreach ($name in $script:DirectServiceNames) {
        $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
        if (-not $svc) { continue }
        Add-Found ("Service: $name")
        try { Stop-Service -Name $name -Force -ErrorAction SilentlyContinue } catch {}
        try { Set-Service -Name $name -StartupType Disabled -ErrorAction SilentlyContinue } catch {}

        $result = Invoke-External -FilePath 'sc.exe' -ArgumentString ("delete `"{0}`"" -f $name) -TimeoutSeconds 60 -SuccessExitCodes @(0,1060,1072) -Description "sc delete $name"
        $scheduledDelete = ($result.StdOut -match '(?i)marked for deletion' -or $result.StdErr -match '(?i)marked for deletion' -or $result.ExitCode -eq 1072)
        if ($scheduledDelete) {
            Add-Scheduled ("Service: $name")
            $script:RestartRequired = $true
        }

        $stillThere = $false
        try { $stillThere = $null -ne (Get-Service -Name $name -ErrorAction SilentlyContinue) } catch {}
        if ($stillThere) {
            if ($scheduledDelete) {
                Add-Scheduled ("Service: $name")
            } else {
                Add-Failed ("Service: $name -> still registered")
                Add-StillPresent ("Service: $name")
            }
        } else {
            Add-Removed ("Service: $name")
        }
    }

    foreach ($name in $script:AssistServiceNames) {
        $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
        if (-not $svc) { continue }
        Add-Found ("AssistService: $name")
        try { Stop-Service -Name $name -Force -ErrorAction SilentlyContinue } catch {}
        try { Set-Service -Name $name -StartupType Disabled -ErrorAction SilentlyContinue } catch {}

        $serviceInfo = Get-CimInstance Win32_Service -Filter ("Name='{0}'" -f $name) -ErrorAction SilentlyContinue
        if ($serviceInfo -and $serviceInfo.State -eq 'Stopped' -and $serviceInfo.StartMode -eq 'Disabled') {
            Add-Removed ("AssistServiceState: $name")
        } else {
            Add-Failed ("AssistService: $name -> state not fully disabled")
            Add-StillPresent ("AssistService: $name")
        }
    }
}

function Remove-WslDistros {
    $registeredBefore = Get-RegisteredWslDistros
    $wslPath = Get-PreferredWslCommandPath
    $wslUnavailable = $false

    if ($wslPath) {
        Write-Log INFO ("Using WSL command path: {0}" -f $wslPath)
        $shutdownResult = Invoke-External -FilePath $wslPath -ArgumentString '--shutdown' -TimeoutSeconds 8 -SuccessExitCodes @(0) -Description "$wslPath --shutdown"
        if ($shutdownResult.Success) {
            Add-Removed 'WSLShutdown'
        } elseif (Test-WslNotInstalledMessage -Result $shutdownResult) {
            Add-Removed 'WSLNotInstalled'
            $wslUnavailable = $true
        } else {
            Add-Failed ("WSLShutdown -> exit $($shutdownResult.ExitCode) $($shutdownResult.StdErr)")
        }
    } else {
        Add-Removed 'WSLCommandPathNotPresent'
        $wslUnavailable = $true
    }

    if ($wslUnavailable -and $registeredBefore.Count -eq 0) {
        return
    }

    $targets = Get-WslPurgeTargets -IncludeDockerFallbacks:(!$wslUnavailable)
    foreach ($name in $targets) {
        $isRegisteredTarget = $registeredBefore.Contains($name)
        if ($isRegisteredTarget) {
            Add-Found ("WSLDistro: $name")
        } else {
            Write-Log INFO ("Attempting WSL fallback unregister: {0}" -f $name)
        }
        if ($wslPath) {
            Write-Log INFO ("Attempting WSL unregister: {0}" -f $name)
            $result = Invoke-External -FilePath $wslPath -ArgumentString "--unregister $name" -TimeoutSeconds 10 -SuccessExitCodes @(0) -Description "$wslPath --unregister $name"
            if (-not (Test-WslUnregisterSemanticSuccess -Result $result)) {
                Add-Failed ("WSLDistro: $name -> exit $($result.ExitCode) $($result.StdErr)")
            } elseif ($isRegisteredTarget) {
                Add-Removed ("WSLDistro: $name")
            } else {
                Add-Removed ("WSLDistroFallback: $name")
            }
        } else {
            Add-Failed ("WSLDistro: $name -> no WSL command path available")
        }
    }

    $verify = Get-RegisteredWslDistros
    foreach ($name in $registeredBefore) {
        if ($verify.Contains($name)) {
            Add-Failed ("WSLDistro: $name -> still registered")
            Add-StillPresent ("WSLDistro: $name")
        } else {
            Add-Removed ("WSLDistro: $name")
        }
    }

    if ($wslPath) {
        Write-Log INFO 'Attempting WSL uninstall'
        $result = Invoke-External -FilePath $wslPath -ArgumentString '--uninstall' -TimeoutSeconds 10 -SuccessExitCodes @(0) -Description "$wslPath --uninstall"
        if (Test-WslUninstallSemanticSuccess -Result $result) {
            Add-Removed 'WSLUninstallCommand'
        } else {
            Add-Failed ("WSLUninstallCommand -> exit $($result.ExitCode) $($result.StdErr)")
        }
    }
}

function Remove-DirectAppx {
    foreach ($pattern in $script:KnownAppxPatterns) {
        try {
            Get-AppxPackage -AllUsers $pattern -ErrorAction SilentlyContinue | ForEach-Object {
                Remove-AppxPackageVerified -Package $_ -AllUsers
            }
        } catch {}
        try {
            Get-AppxPackage $pattern -ErrorAction SilentlyContinue | ForEach-Object {
                Remove-AppxPackageVerified -Package $_
            }
        } catch {}
        try {
            Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object {
                $_.DisplayName -like $pattern -or $_.PackageName -like $pattern
            } | ForEach-Object {
                Remove-ProvisionedPackageVerified -Package $_
            }
        } catch {}
    }
}

function Remove-DirectAppPaths {
    $roots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths'
    )
    foreach ($root in $roots) {
        if (-not (Test-Path $root)) { continue }
        foreach ($sub in (Get-ChildItem -LiteralPath $root -ErrorAction SilentlyContinue)) {
            $leaf = $sub.PSChildName
            $props = Get-ItemProperty -LiteralPath $sub.PSPath -ErrorAction SilentlyContinue
            $defaultValue = Get-ObjectPropertyString -InputObject $props -Name '(default)'
            $pathValue = Get-ObjectPropertyString -InputObject $props -Name 'Path'
            $direct = ($script:DirectAppPathNames -contains $leaf.ToLowerInvariant()) -or
                (Test-DirectPath $defaultValue) -or
                (Test-DirectPath $pathValue) -or
                (Test-DirectText $defaultValue -AllowDistroFamilies) -or
                (Test-DirectText $pathValue -AllowDistroFamilies)
            if ($direct) {
                Remove-RegistryTreeHard -Path $sub.PSPath
            }
        }
    }
}

function Remove-DirectEnvironmentEntries {
    foreach ($scope in @('Machine','User')) {
        $current = [Environment]::GetEnvironmentVariable('Path', $scope)
        if ($current) {
            $parts = $current -split ';' | Where-Object { $_.Trim() }
            $kept = [System.Collections.Generic.List[string]]::new()
            $removedEntries = [System.Collections.Generic.List[string]]::new()
            foreach ($part in $parts) {
                $trimmed = $part.Trim()
                if (Test-DirectPath $trimmed) {
                    Add-Found ("PATH[$scope]: $trimmed")
                    Add-UniqueItem -Bucket $removedEntries -Item $trimmed
                } else {
                    Add-UniqueItem -Bucket $kept -Item $trimmed
                }
            }
            [Environment]::SetEnvironmentVariable('Path', ($kept -join ';'), $scope)
            $verifyPath = [Environment]::GetEnvironmentVariable('Path', $scope)
            foreach ($removedEntry in $removedEntries) {
                if ($verifyPath -split ';' | Where-Object { $_.Trim() -eq $removedEntry }) {
                    Add-Failed ("PATH[$scope]: $removedEntry -> still present")
                    Add-StillPresent ("PATH[$scope]: $removedEntry")
                } else {
                    Add-Removed ("PATH[$scope]: $removedEntry")
                }
            }
        }

        $regPath = if ($scope -eq 'Machine') { 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' } else { 'HKCU:\Environment' }
        if (-not (Test-Path $regPath)) { continue }
        $props = Get-ItemProperty -LiteralPath $regPath -ErrorAction SilentlyContinue
        foreach ($p in $props.PSObject.Properties) {
            if ($p.Name -like 'PS*') { continue }
            if ($p.Name -ieq 'Path') { continue }
            $name = $p.Name
            $value = [string]$p.Value
            if (($name -match '^(?i)(DOCKER|WSL|COMPOSE|MOBY)') -or (Test-DirectPath $value) -or (Test-DirectText $value -AllowDistroFamilies)) {
                Remove-RegistryValueHard -Path $regPath -Name $name
            }
        }
    }
}

function Remove-DirectRunEntries {
    $runPaths = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\RunOnce'
    )
    foreach ($path in $runPaths) {
        if (-not (Test-Path $path)) { continue }
        $props = Get-ItemProperty -LiteralPath $path -ErrorAction SilentlyContinue
        foreach ($p in $props.PSObject.Properties) {
            if ($p.Name -like 'PS*') { continue }
            if ((Test-DirectText $p.Name -AllowDistroFamilies) -or (Test-DirectText ([string]$p.Value) -AllowDistroFamilies) -or (Test-DirectPath ([string]$p.Value))) {
                Remove-RegistryValueHard -Path $path -Name $p.Name
            }
        }
    }
}

function Remove-DirectProfiles {
    $profiles = @(
        $PROFILE.CurrentUserAllHosts,
        $PROFILE.CurrentUserCurrentHost,
        $PROFILE.AllUsersAllHosts,
        $PROFILE.AllUsersCurrentHost
    ) | Sort-Object -Unique

    foreach ($path in $profiles) {
        if (-not $path) { continue }
        if (-not (Test-Path -LiteralPath $path)) { continue }
        Add-Found ("ProfileFile: $path")
        try {
            $content = Get-Content -LiteralPath $path -ErrorAction Stop
            $filtered = $content | Where-Object { -not (Test-DirectText $_) -and -not (Test-DirectPath $_) }
            if ($filtered.Count -ne $content.Count) {
                Set-Content -LiteralPath $path -Value $filtered -Encoding UTF8 -Force
                Add-Removed ("ProfileLines: $path")
            }
        } catch {
            Add-Failed ("ProfileLines: $path -> $($_.Exception.Message)")
        }
    }
}

function Remove-DirectShortcuts {
    $roots = @(
        "$env:ProgramData\Microsoft\Windows\Start Menu",
        "$env:APPDATA\Microsoft\Windows\Start Menu",
        "$env:USERPROFILE\Desktop",
        "$env:PUBLIC\Desktop",
        "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Startup"
    ) | Where-Object { $_ -and (Test-Path $_) }

    foreach ($root in $roots) {
        foreach ($item in (Get-ChildItem -LiteralPath $root -Recurse -Force -File -ErrorAction SilentlyContinue)) {
            if (($item.Name -match $script:DirectShortcutNameRegex) -or (Test-DirectPath $item.FullName)) {
                Remove-PathHard -Path $item.FullName
            }
        }
    }
}

function Remove-DirectScheduledTasks {
    if (-not (Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue)) { return }
    foreach ($task in (Get-ScheduledTask -ErrorAction SilentlyContinue)) {
        $actionSummaries = [System.Collections.Generic.List[string]]::new()
        foreach ($action in @($task.Actions)) {
            if ($null -eq $action) { continue }
            $execute = ''
            $arguments = ''
            $className = ''
            $classId = ''

            if ($action.PSObject.Properties.Match('Execute').Count -gt 0) { $execute = [string]$action.Execute }
            if ($action.PSObject.Properties.Match('Arguments').Count -gt 0) { $arguments = [string]$action.Arguments }
            if ($action.PSObject.Properties.Match('ClassId').Count -gt 0) { $classId = [string]$action.ClassId }
            if ($action.PSObject.Properties.Match('CimClass').Count -gt 0 -and $action.CimClass) { $className = [string]$action.CimClass.CimClassName }

            $summary = ("$execute $arguments").Trim()
            if ([string]::IsNullOrWhiteSpace($summary) -and -not [string]::IsNullOrWhiteSpace($classId)) { $summary = $classId }
            if ([string]::IsNullOrWhiteSpace($summary) -and -not [string]::IsNullOrWhiteSpace($className)) { $summary = $className }
            if ([string]::IsNullOrWhiteSpace($summary)) { $summary = ($action | Out-String).Trim() }
            if (-not [string]::IsNullOrWhiteSpace($summary)) { Add-UniqueItem -Bucket $actionSummaries -Item $summary }
        }
        $actions = $actionSummaries -join ' | '
        if ((Test-DirectText $task.TaskName -AllowDistroFamilies) -or (Test-DirectText $task.TaskPath -AllowDistroFamilies) -or (Test-DirectPath $actions) -or (Test-DirectText $actions -AllowDistroFamilies)) {
            Add-Found ("ScheduledTask: $($task.TaskPath)$($task.TaskName)")
            try {
                Disable-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath -ErrorAction SilentlyContinue | Out-Null
            } catch {}
            try {
                Unregister-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath -Confirm:$false -ErrorAction Stop
            } catch {}

            $verify = Get-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath -ErrorAction SilentlyContinue
            if ($verify) {
                Add-Failed ("ScheduledTask: $($task.TaskPath)$($task.TaskName) -> still present")
                Add-StillPresent ("ScheduledTask: $($task.TaskPath)$($task.TaskName)")
            } else {
                Add-Removed ("ScheduledTask: $($task.TaskPath)$($task.TaskName)")
            }
        }
    }
}

function Remove-DirectFeatures {
    $features = @(
        'Microsoft-Windows-Subsystem-Linux',
        'VirtualMachinePlatform',
        'Microsoft-Hyper-V-All',
        'HypervisorPlatform',
        'Containers'
    )
    foreach ($feature in $features) {
        $info = Get-WindowsOptionalFeature -Online -FeatureName $feature -ErrorAction SilentlyContinue
        if ($null -eq $info) { continue }
        if ($info.State -ne 'Enabled') { continue }
        Add-Found ("Feature: $feature")
        try {
            Disable-WindowsOptionalFeature -Online -FeatureName $feature -NoRestart -ErrorAction Stop | Out-Null
        } catch {
            $dism = Invoke-External -FilePath 'dism.exe' -ArgumentString "/Online /Disable-Feature /FeatureName:$feature /NoRestart" -TimeoutSeconds 600 -SuccessExitCodes @(0,3010)
            if ($dism.ExitCode -eq 3010) { $script:RestartRequired = $true }
        }

        $verify = Get-WindowsOptionalFeature -Online -FeatureName $feature -ErrorAction SilentlyContinue
        if ($verify.State -eq 'Disabled') {
            Add-Removed ("Feature: $feature")
        } elseif ($verify.State -eq 'Disable Pending') {
            Add-Scheduled ("Feature: $feature")
            $script:RestartRequired = $true
        } else {
            Add-Failed ("Feature: $feature -> state $($verify.State)")
            Add-StillPresent ("Feature: $feature -> state $($verify.State)")
        }
    }
}

function Remove-DirectNetworks {
    $switchNames = [System.Collections.Generic.List[string]]::new()

    if (Get-Command Get-HnsEndpoint -ErrorAction SilentlyContinue) {
        try {
            foreach ($endpoint in (Get-HnsEndpoint -ErrorAction SilentlyContinue | Where-Object {
                (Test-DirectText $_.Name -AllowDistroFamilies) -or (Test-DirectText $_.VirtualNetworkName -AllowDistroFamilies)
            })) {
                Add-Found ("HNSEndpoint: $($endpoint.Name)")
                try { Remove-HnsEndpoint -Id $endpoint.Id -ErrorAction Stop | Out-Null } catch {}
                $verify = Get-HnsEndpoint -ErrorAction SilentlyContinue | Where-Object { $_.Id -eq $endpoint.Id }
                if ($verify) {
                    Add-Failed ("HNSEndpoint: $($endpoint.Name) -> still present")
                    Add-StillPresent ("HNSEndpoint: $($endpoint.Name)")
                } else {
                    Add-Removed ("HNSEndpoint: $($endpoint.Name)")
                }
            }
        } catch {
            Add-Failed ("HNSEndpointEnumeration -> $($_.Exception.Message)")
        }
    }

    if (Get-Command Get-HnsNetwork -ErrorAction SilentlyContinue) {
        try {
            foreach ($network in (Get-HnsNetwork -ErrorAction SilentlyContinue | Where-Object {
                (Test-DirectText $_.Name -AllowDistroFamilies) -or (Test-DirectText $_.Type -AllowDistroFamilies) -or (Test-DirectText ($_.Policies | Out-String) -AllowDistroFamilies)
            })) {
                Add-Found ("HNSNetwork: $($network.Name)")
                try { Remove-HnsNetwork -Id $network.Id -ErrorAction Stop | Out-Null } catch {}
                $verify = Get-HnsNetwork -ErrorAction SilentlyContinue | Where-Object { $_.Id -eq $network.Id }
                if ($verify) {
                    Add-Failed ("HNSNetwork: $($network.Name) -> still present")
                    Add-StillPresent ("HNSNetwork: $($network.Name)")
                } else {
                    Add-Removed ("HNSNetwork: $($network.Name)")
                }
            }
        } catch {
            Add-Failed ("HNSNetworkEnumeration -> $($_.Exception.Message)")
        }
    }

    try {
        foreach ($nat in (Get-NetNat -ErrorAction SilentlyContinue | Where-Object {
            (Test-DirectText $_.Name -AllowDistroFamilies)
        })) {
            Add-Found ("NetNat: $($nat.Name)")
            try { Remove-NetNat -Name $nat.Name -Confirm:$false -ErrorAction Stop } catch {}
            $verify = Get-NetNat -Name $nat.Name -ErrorAction SilentlyContinue
            if ($verify) {
                Add-Failed ("NetNat: $($nat.Name) -> still present")
                Add-StillPresent ("NetNat: $($nat.Name)")
            } else {
                Add-Removed ("NetNat: $($nat.Name)")
            }
        }
    } catch {
        Add-Failed ("NetNatEnumeration -> $($_.Exception.Message)")
    }

    try {
        foreach ($adapter in (Get-NetAdapter -IncludeHidden -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -match '(?i)^vEthernet \((WSL|Docker)' -or
            $_.Name -match '(?i)Docker' -or
            $_.InterfaceDescription -match '(?i)(docker|wsl)'
        })) {
            Add-Found ("NetAdapter: $($adapter.Name)")
            $switchName = $adapter.Name -replace '^(?i)vEthernet \(', '' -replace '\)$', ''
            if ($switchName) { Add-UniqueItem -Bucket $switchNames -Item $switchName }
            try { Disable-NetAdapter -Name $adapter.Name -Confirm:$false -ErrorAction SilentlyContinue | Out-Null } catch {}
        }
    } catch {
        Add-Failed ("NetAdapterEnumeration -> $($_.Exception.Message)")
    }

    if (Get-Command Get-VMSwitch -ErrorAction SilentlyContinue) {
        try {
            foreach ($switch in (Get-VMSwitch -ErrorAction SilentlyContinue | Where-Object {
                (Test-DirectText $_.Name -AllowDistroFamilies)
            })) {
                Add-UniqueItem -Bucket $switchNames -Item $switch.Name
            }

            foreach ($switchName in $switchNames) {
                Add-Found ("VMSwitch: $switchName")
                try { Remove-VMSwitch -Name $switchName -Force -ErrorAction Stop } catch {}
                $verify = Get-VMSwitch -Name $switchName -ErrorAction SilentlyContinue
                if ($verify) {
                    Add-Failed ("VMSwitch: $switchName -> still present")
                    Add-StillPresent ("VMSwitch: $switchName")
                } else {
                    Add-Removed ("VMSwitch: $switchName")
                }
            }
        } catch {
            Add-Failed ("VMSwitchEnumeration -> $($_.Exception.Message)")
        }
    }

    $directAdapterIps = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    try {
        foreach ($config in (Get-NetIPAddress -ErrorAction SilentlyContinue | Where-Object {
            $_.InterfaceAlias -match '(?i)^vEthernet \((WSL|Docker)' -or $_.InterfaceAlias -match '(?i)Docker'
        })) {
            if ($config.IPAddress) { [void]$directAdapterIps.Add($config.IPAddress) }
        }
    } catch {
        Add-Failed ("NetIPAddressEnumeration -> $($_.Exception.Message)")
    }

    $portProxyRoot = 'HKLM:\SYSTEM\CurrentControlSet\Services\PortProxy\v4tov4\tcp'
    if (Test-Path $portProxyRoot) {
        $props = Get-ItemProperty -LiteralPath $portProxyRoot -ErrorAction SilentlyContinue
        foreach ($p in $props.PSObject.Properties) {
            if ($p.Name -like 'PS*') { continue }
            $value = [string]$p.Value
            $isDirect = $false
            foreach ($ip in $directAdapterIps) {
                if ($value -match [regex]::Escape($ip) -or $p.Name -match [regex]::Escape($ip)) {
                    $isDirect = $true
                    break
                }
            }
            if (-not $isDirect) { continue }
            Add-Found ("PortProxy: $($p.Name) = $value")
            $listenPort = ($p.Name -split '/')[0]
            $connectAddress = ($value -split ':')[0]
            $connectPort = if ($value -match ':(\d+)$') { $matches[1] } else { $null }
            if ($listenPort) {
                Invoke-External -FilePath 'netsh.exe' -ArgumentString ("interface portproxy delete v4tov4 listenport={0} listenaddress=0.0.0.0" -f $listenPort) -TimeoutSeconds 60 -SuccessExitCodes @(0,1) | Out-Null
            }
            if ($listenPort -and $connectAddress -and $connectPort) {
                Invoke-External -FilePath 'netsh.exe' -ArgumentString ("interface portproxy delete v4tov4 listenport={0} listenaddress=127.0.0.1 connectport={1} connectaddress={2}" -f $listenPort, $connectPort, $connectAddress) -TimeoutSeconds 60 -SuccessExitCodes @(0,1) | Out-Null
            }
            Remove-RegistryValueHard -Path $portProxyRoot -Name $p.Name
        }
    }

    foreach ($rule in (Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object {
        (Test-DirectText $_.DisplayName -AllowDistroFamilies) -or
        (Test-DirectText $_.Description -AllowDistroFamilies) -or
        (Test-DirectText $_.Group -AllowDistroFamilies)
    })) {
        Add-Found ("FirewallRule: $($rule.DisplayName)")
        try { Remove-NetFirewallRule -Name $rule.Name -ErrorAction Stop } catch {}
        $verify = Get-NetFirewallRule -Name $rule.Name -ErrorAction SilentlyContinue
        if ($verify) {
            Add-Failed ("FirewallRule: $($rule.DisplayName) -> still present")
            Add-StillPresent ("FirewallRule: $($rule.DisplayName)")
        } else {
            Add-Removed ("FirewallRule: $($rule.DisplayName)")
        }
    }

    $networkProfileRoot = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\NetworkList\Profiles'
    if (Test-Path $networkProfileRoot) {
        foreach ($profile in (Get-ChildItem -LiteralPath $networkProfileRoot -ErrorAction SilentlyContinue)) {
            $props = Get-ItemProperty -LiteralPath $profile.PSPath -ErrorAction SilentlyContinue
            $profileName = Get-StringOrEmpty $props.ProfileName
            $description = Get-StringOrEmpty $props.Description
            $isDirectProfile = (Test-DirectText $profileName -AllowDistroFamilies) -or (Test-DirectText $description -AllowDistroFamilies)
            if (-not $isDirectProfile) {
                foreach ($switchName in $switchNames) {
                    if (($profileName -match [regex]::Escape($switchName)) -or ($description -match [regex]::Escape($switchName))) {
                        $isDirectProfile = $true
                        break
                    }
                }
            }
            if ($isDirectProfile) {
                Remove-RegistryTreeHard -Path $profile.PSPath
            }
        }
    }
}

function Add-PathOrParent {
    param(
        [System.Collections.Generic.List[string]]$Bucket,
        [AllowNull()][string]$Path
    )
    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    $expanded = [Environment]::ExpandEnvironmentVariables($Path)
    if ([string]::IsNullOrWhiteSpace($expanded)) { return }
    if (Test-Path -LiteralPath $expanded -PathType Container) {
        Add-UniqueItem -Bucket $Bucket -Item $expanded
        return
    }
    if (Test-Path -LiteralPath $expanded -PathType Leaf) {
        $parent = Split-Path -LiteralPath $expanded -Parent
        if ($parent) { Add-UniqueItem -Bucket $Bucket -Item $parent }
        return
    }
}

function Get-DirectSearchRoots {
    $roots = [System.Collections.Generic.List[string]]::new()

    foreach ($path in @(
        "$env:LOCALAPPDATA\lxss",
        "$env:LOCALAPPDATA\Packages",
        "$env:LOCALAPPDATA\Docker",
        "$env:APPDATA\Docker",
        "$env:APPDATA\Docker Desktop",
        "$env:ProgramData\Docker",
        "$env:ProgramData\DockerDesktop",
        "$env:ProgramFiles\Docker",
        "${env:ProgramFiles(x86)}\Docker",
        "${env:ProgramFiles(x86)}\Docker Desktop",
        "$env:ProgramFiles\WSL"
    )) {
        Add-PathOrParent -Bucket $roots -Path $path
    }

    $dockerSettingsPath = Join-Path $env:APPDATA 'Docker\settings-store.json'
    if (Test-Path -LiteralPath $dockerSettingsPath) {
        try {
            $settings = Get-Content -LiteralPath $dockerSettingsPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
            Add-PathOrParent -Bucket $roots -Path (Get-ObjectPropertyString -InputObject $settings -Name 'dataFolder')
            Add-PathOrParent -Bucket $roots -Path (Get-ObjectPropertyString -InputObject $settings -Name 'wslEngineCustomImagePath')
        } catch {}
    }

    foreach ($dataRoot in (Get-DirectDockerDataRoots)) {
        Add-PathOrParent -Bucket $roots -Path $dataRoot
    }

    $lxssRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss'
    if (Test-Path $lxssRoot) {
        foreach ($sub in (Get-ChildItem -LiteralPath $lxssRoot -ErrorAction SilentlyContinue)) {
            $props = Get-ItemProperty -LiteralPath $sub.PSPath -ErrorAction SilentlyContinue
            foreach ($candidate in @(
                (Get-ObjectPropertyValue -InputObject $props -Name 'BasePath'),
                (Get-ObjectPropertyValue -InputObject $props -Name 'VhdFileName'),
                (Get-ObjectPropertyValue -InputObject $props -Name 'VirtualDiskPath')
            )) {
                if ($candidate -is [string] -and $candidate) { Add-PathOrParent -Bucket $roots -Path $candidate }
            }
        }
    }

    foreach ($entry in (Get-RelatedArpEntries)) {
        Add-PathOrParent -Bucket $roots -Path $entry.InstallLocation
    }

    foreach ($product in (Get-RelatedMsiProducts)) {
        Add-PathOrParent -Bucket $roots -Path $product.InstallLocation
        Add-PathOrParent -Bucket $roots -Path $product.LocalPackage
    }

    return $roots | Sort-Object -Unique
}

function Get-DirectDockerDataRoots {
    $roots = [System.Collections.Generic.List[string]]::new()

    foreach ($drive in (Get-CimInstance Win32_LogicalDisk -Filter 'DriveType = 3' -ErrorAction SilentlyContinue | Where-Object { $_.DeviceID } | Select-Object -ExpandProperty DeviceID)) {
        $candidate = Join-Path ($drive + '\') 'DockerData'
        if (Test-Path -LiteralPath $candidate -PathType Container) {
            Add-UniqueItem -Bucket $roots -Item $candidate
        }
    }

    $dockerSettingsPath = Join-Path $env:APPDATA 'Docker\settings-store.json'
    if (Test-Path -LiteralPath $dockerSettingsPath) {
        try {
            $settings = Get-Content -LiteralPath $dockerSettingsPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
            foreach ($candidate in @(
                (Get-ObjectPropertyString -InputObject $settings -Name 'dataFolder'),
                (Get-ObjectPropertyString -InputObject $settings -Name 'wslEngineCustomImagePath')
            )) {
                if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-DirectPath $candidate)) {
                    Add-PathOrParent -Bucket $roots -Path $candidate
                }
            }
        } catch {}
    }

    return $roots | Sort-Object -Unique
}

function Get-DirectVhdArtifacts {
    $items = [System.Collections.Generic.List[string]]::new()
    $distroNames = Get-RegisteredWslDistros
    $distroPattern = ($distroNames | Where-Object { $_ } | ForEach-Object { [regex]::Escape($_) }) -join '|'
    $roots = Get-DirectSearchRoots
    foreach ($root in $roots) {
        Write-Log INFO ("Scanning VHD root: {0}" -f $root)
        foreach ($filter in @('*.vhdx','*.vhd')) {
            foreach ($file in (Get-ChildItem -LiteralPath $root -Recurse -Force -File -Filter $filter -ErrorAction SilentlyContinue)) {
                $path = $file.FullName
                $direct = $false
                if (Test-DirectPath $path) { $direct = $true }
                elseif ($distroPattern -and $path -match "(?i)$distroPattern") { $direct = $true }
                elseif ($file.Name -match '(?i)^(ext4|swap)\.vhdx$' -and $path -match '(?i)(wsl|lxss|docker|CanonicalGroupLimited|TheDebianProject|KaliLinux|WhitewaterFoundry|Pengwin|AlpineWSL|SUSE|openSUSE)') {
                    $direct = $true
                }
                if ($direct) { Add-UniqueItem -Bucket $items -Item $path }
            }
        }
    }
    return $items
}

function Get-DirectPathSeeds {
    $paths = [System.Collections.Generic.List[string]]::new()
    foreach ($path in @(
        "$env:ProgramFiles\Docker",
        "${env:ProgramFiles(x86)}\Docker",
        "${env:ProgramFiles(x86)}\Docker Desktop",
        "$env:ProgramFiles\WSL",
        "$env:ProgramData\Docker",
        "$env:ProgramData\DockerDesktop",
        "$env:LOCALAPPDATA\Docker",
        "$env:APPDATA\Docker",
        "$env:APPDATA\Docker Desktop",
        "$env:USERPROFILE\.docker",
        "$env:USERPROFILE\.wslconfig",
        "$env:LOCALAPPDATA\lxss",
        "$env:LOCALAPPDATA\Packages\MicrosoftCorporationII.WindowsSubsystemForLinux_8wekyb3d8bbwe",
        "$env:LOCALAPPDATA\Microsoft\WindowsApps\wsl.exe",
        "$env:LOCALAPPDATA\Microsoft\WindowsApps\wslconfig.exe",
        "$env:LOCALAPPDATA\Microsoft\WindowsApps\docker.exe",
        "$env:LOCALAPPDATA\Microsoft\WindowsApps\docker-compose.exe",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Docker Desktop.lnk",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\WSL.lnk",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\WSL Settings.lnk",
        "$env:PUBLIC\Desktop\Docker Desktop.lnk",
        "$env:USERPROFILE\Desktop\Docker Desktop.lnk"
    )) {
        if ($path) { Add-UniqueItem -Bucket $paths -Item $path }
    }

    foreach ($entry in (Get-RelatedArpEntries)) {
        if ($entry.InstallLocation) { Add-UniqueItem -Bucket $paths -Item $entry.InstallLocation }
    }

    foreach ($product in (Get-RelatedMsiProducts)) {
        if ($product.InstallLocation) { Add-UniqueItem -Bucket $paths -Item $product.InstallLocation }
        if ($product.LocalPackage) { Add-UniqueItem -Bucket $paths -Item $product.LocalPackage }
    }

    $lxssRoot = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss'
    if (Test-Path $lxssRoot) {
        foreach ($sub in (Get-ChildItem -LiteralPath $lxssRoot -ErrorAction SilentlyContinue)) {
            $props = Get-ItemProperty -LiteralPath $sub.PSPath -ErrorAction SilentlyContinue
            foreach ($candidate in @(
                (Get-ObjectPropertyValue -InputObject $props -Name 'BasePath'),
                (Get-ObjectPropertyValue -InputObject $props -Name 'VhdFileName'),
                (Get-ObjectPropertyValue -InputObject $props -Name 'VirtualDiskPath')
            )) {
                if ($candidate -is [string] -and $candidate) { Add-UniqueItem -Bucket $paths -Item $candidate }
            }
        }
    }

    foreach ($artifact in (Get-DirectVhdArtifacts)) {
        Add-UniqueItem -Bucket $paths -Item $artifact
    }

    foreach ($dataRoot in (Get-DirectDockerDataRoots)) {
        Add-UniqueItem -Bucket $paths -Item $dataRoot
    }

    return $paths | Sort-Object -Unique
}

function Get-RegistrySnapshotLines {
    param([string]$Path)
    $lines = [System.Collections.Generic.List[string]]::new()
    if (-not (Test-Path -LiteralPath $Path)) { return $lines }
    try {
        $props = Get-ItemProperty -LiteralPath $Path -ErrorAction SilentlyContinue
        foreach ($p in $props.PSObject.Properties) {
            if ($p.Name -notlike 'PS*') {
                $lines.Add(('{0}={1}' -f $p.Name, [string]$p.Value))
            }
        }
    } catch {}
    return $lines
}

function Test-RegistryKeyDirect {
    param([string]$Path)
    if ((Test-DirectText $Path -AllowDistroFamilies) -or (Test-DirectPath $Path)) { return $true }
    foreach ($line in (Get-RegistrySnapshotLines -Path $Path)) {
        if ((Test-DirectText $line -AllowDistroFamilies) -or (Test-DirectPath $line)) { return $true }
    }
    return $false
}

function Remove-DirectRegistryKeys {
    $explicitRoots = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss',
        'HKLM:\SOFTWARE\Docker Inc.',
        'HKCU:\SOFTWARE\Docker Inc.',
        'HKLM:\SOFTWARE\WOW6432Node\Docker Inc.',
        'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Classes\Drive\shell\WSL',
        'Registry::HKEY_CLASSES_ROOT\Drive\shell\WSL'
    )
    foreach ($path in $explicitRoots) {
        Remove-RegistryTreeHard -Path $path
    }

    foreach ($path in $script:DirectServiceRegistryKeys) {
        Remove-RegistryTreeHard -Path $path
    }

    $roots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\Classes\Installer\Products',
        'HKLM:\SOFTWARE\Classes\Installer\Features',
        'HKLM:\SOFTWARE\Classes\Installer\UpgradeCodes',
        'Registry::HKEY_CLASSES_ROOT\Installer\Products',
        'Registry::HKEY_CLASSES_ROOT\Installer\Features',
        'Registry::HKEY_CLASSES_ROOT\Installer\UpgradeCodes',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths',
        'HKLM:\SOFTWARE\Classes\Directory\shell',
        'HKLM:\SOFTWARE\Classes\Directory\Background\shell',
        'HKLM:\SOFTWARE\Classes\Drive\shell',
        'Registry::HKEY_CLASSES_ROOT\Directory\shell',
        'Registry::HKEY_CLASSES_ROOT\Directory\Background\shell',
        'Registry::HKEY_CLASSES_ROOT\Drive\shell'
    )

    foreach ($root in $roots) {
        if (-not (Test-Path $root)) { continue }
        foreach ($sub in (Get-ChildItem -LiteralPath $root -Recurse -ErrorAction SilentlyContinue)) {
            if (Test-RegistryKeyDirect $sub.PSPath) {
                Remove-RegistryTreeHard -Path $sub.PSPath
            }
        }
    }
}

function Verify-Residuals {
    foreach ($entry in (Get-RelatedArpEntries)) {
        Add-StillPresent ("ARP: {0} [{1}]" -f (Get-FirstNonEmpty -Primary $entry.DisplayName -Fallback $entry.KeyName), $entry.RegistryPath)
    }

    foreach ($product in (Get-RelatedMsiProducts)) {
        Add-StillPresent ("MSI: {0} [{1}]" -f (Get-FirstNonEmpty -Primary $product.ProductName -Fallback $product.ProductCode), $product.ProductCode)
    }

    foreach ($svcName in $script:DirectServiceNames) {
        if (Get-Service -Name $svcName -ErrorAction SilentlyContinue) {
            Add-StillPresent ("Service: $svcName")
        }
    }

    foreach ($svcName in $script:AssistServiceNames) {
        $serviceInfo = Get-CimInstance Win32_Service -Filter ("Name='{0}'" -f $svcName) -ErrorAction SilentlyContinue
        if ($serviceInfo -and ($serviceInfo.State -ne 'Stopped' -or $serviceInfo.StartMode -ne 'Disabled')) {
            Add-StillPresent ("AssistService: $svcName")
        }
    }

    foreach ($path in (Get-DirectPathSeeds)) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            Add-StillPresent ("Path: $path")
        }
    }

    foreach ($feature in @(
        'Microsoft-Windows-Subsystem-Linux',
        'VirtualMachinePlatform',
        'Microsoft-Hyper-V-All',
        'HypervisorPlatform',
        'Containers'
    )) {
        $info = Get-WindowsOptionalFeature -Online -FeatureName $feature -ErrorAction SilentlyContinue
        if ($info -and $info.State -ne 'Disabled') {
            Add-StillPresent ("Feature: $feature -> state $($info.State)")
        }
    }

    try {
        Get-AppxPackage -AllUsers * -ErrorAction SilentlyContinue | Where-Object {
            (Test-DirectText $_.PackageFullName -AllowDistroFamilies) -or (Test-DirectPath (Get-ObjectPropertyString -InputObject $_ -Name 'InstallLocation'))
        } | ForEach-Object {
            Add-StillPresent ("Appx: " + $_.PackageFullName)
        }
    } catch {}

    if (Get-Command Get-VMSwitch -ErrorAction SilentlyContinue) {
        foreach ($switch in (Get-VMSwitch -ErrorAction SilentlyContinue | Where-Object { (Test-DirectText $_.Name -AllowDistroFamilies) })) {
            Add-StillPresent ("VMSwitch: $($switch.Name)")
        }
    }

    if (Get-Command Get-NetNat -ErrorAction SilentlyContinue) {
        foreach ($nat in (Get-NetNat -ErrorAction SilentlyContinue | Where-Object { (Test-DirectText $_.Name -AllowDistroFamilies) })) {
            Add-StillPresent ("NetNat: $($nat.Name)")
        }
    }

    if (Get-Command Get-NetFirewallRule -ErrorAction SilentlyContinue) {
        foreach ($rule in (Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object {
            (Test-DirectText $_.DisplayName -AllowDistroFamilies) -or (Test-DirectText $_.Description -AllowDistroFamilies) -or (Test-DirectText $_.Group -AllowDistroFamilies)
        })) {
            Add-StillPresent ("FirewallRule: $($rule.DisplayName)")
        }
    }

    $currentMachinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    foreach ($part in ((Get-StringOrEmpty $currentMachinePath) -split ';')) {
        if (Test-DirectPath $part) { Add-StillPresent ("PATH[Machine]: " + $part.Trim()) }
    }

    $currentUserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    foreach ($part in ((Get-StringOrEmpty $currentUserPath) -split ';')) {
        if (Test-DirectPath $part) { Add-StillPresent ("PATH[User]: " + $part.Trim()) }
    }
}

try {
    Write-Log INFO "Log: $logPath"
    Write-Log INFO "Transcript: $transcriptPath"

    Invoke-Step -Label 'Stopping direct processes' -Action { Remove-DirectProcesses }
    Invoke-Step -Label 'Stopping and deleting direct services' -Action { Remove-DirectServices }
    Invoke-Step -Label 'Removing direct scheduled tasks' -Action { Remove-DirectScheduledTasks }
    Invoke-Step -Label 'Shutting down WSL and unregistering distros' -Action { Remove-WslDistros }
    Invoke-Step -Label 'Running ARP uninstall paths' -Action {
        foreach ($entry in (Get-RelatedArpEntries)) {
            Remove-UninstallEntry -Entry $entry
        }
    }
    Invoke-Step -Label 'Running MSI uninstall paths' -Action {
        foreach ($product in (Get-RelatedMsiProducts)) {
            Add-Found ("MSIProduct: $($product.ProductName) [$($product.ProductCode)]")
            $result = Invoke-External -FilePath 'msiexec.exe' -ArgumentString "/x $($product.ProductCode) /qn /norestart" -TimeoutSeconds 300 -SuccessExitCodes @(0,1605,1614,3010,1641) -Description "msiexec /x $($product.ProductCode)"
            if ($result.ExitCode -in 3010,1641) { $script:RestartRequired = $true }
        }
    }
    Invoke-Step -Label 'Running direct winget registrations as secondary path' -Action {
        Invoke-External -FilePath 'winget.exe' -ArgumentString 'uninstall --id Docker.DockerDesktop --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity' -TimeoutSeconds 300 -SuccessExitCodes @(0,1) | Out-Null
        Invoke-External -FilePath 'winget.exe' -ArgumentString 'uninstall --id Microsoft.WSL --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity' -TimeoutSeconds 300 -SuccessExitCodes @(0,1) | Out-Null
    }
    Invoke-Step -Label 'Removing direct Appx and provisioned packages with verification' -Action { Remove-DirectAppx }
    Invoke-Step -Label 'Removing direct App Paths' -Action { Remove-DirectAppPaths }
    Invoke-Step -Label 'Removing direct PATH and environment entries' -Action { Remove-DirectEnvironmentEntries }
    Invoke-Step -Label 'Removing direct Run and profile injections' -Action {
        Remove-DirectRunEntries
        Remove-DirectProfiles
    }
    Invoke-Step -Label 'Removing direct shell shortcuts' -Action { Remove-DirectShortcuts }
    Invoke-Step -Label 'Disabling direct Windows features' -Action { Remove-DirectFeatures }
    Invoke-Step -Label 'Removing direct network artifacts' -Action { Remove-DirectNetworks }
    Invoke-Step -Label 'Removing direct registry artifacts' -Action { Remove-DirectRegistryKeys }
    Invoke-Step -Label 'Removing direct file artifacts and VHD/VHDX remnants' -Action {
        foreach ($path in (Get-DirectPathSeeds)) {
            Remove-PathHard -Path $path
        }
    }
    Invoke-Step -Label 'Verifying residual presence' -Action { Verify-Residuals }
}
finally {
    Write-Host 'FOUND'
    if ($script:FOUND.Count -eq 0) { Write-Host '-' } else { $script:FOUND | Sort-Object -Unique | ForEach-Object { Write-Host $_ } }

    Write-Host 'REMOVED'
    if ($script:REMOVED.Count -eq 0) { Write-Host '-' } else { $script:REMOVED | Sort-Object -Unique | ForEach-Object { Write-Host $_ } }

    Write-Host 'FAILED'
    if ($script:FAILED.Count -eq 0) { Write-Host '-' } else { $script:FAILED | Sort-Object -Unique | ForEach-Object { Write-Host $_ } }

    Write-Host 'SCHEDULED_FOR_REBOOT'
    if ($script:SCHEDULED_FOR_REBOOT.Count -eq 0) { Write-Host '-' } else { $script:SCHEDULED_FOR_REBOOT | Sort-Object -Unique | ForEach-Object { Write-Host $_ } }

    Write-Host 'STILL_PRESENT'
    if ($script:STILL_PRESENT.Count -eq 0) { Write-Host '-' } else { $script:STILL_PRESENT | Sort-Object -Unique | ForEach-Object { Write-Host $_ } }

    try { Stop-Transcript | Out-Null } catch {}

    if ($script:RestartRequired -or $script:SCHEDULED_FOR_REBOOT.Count -gt 0) {
        Start-Sleep -Seconds 5
        Restart-Computer -Force
    }
}
