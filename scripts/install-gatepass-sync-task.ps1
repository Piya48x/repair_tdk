$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectDirectory ".env.gatepass-sync"
$syncScriptPath = Join-Path $PSScriptRoot "sync-gatepass-report.mjs"

if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Missing $configPath. Copy .env.gatepass-sync.example and set the sync account first."
}

$nodeCommand = Get-Command node.exe -ErrorAction Stop
$taskName = "TDK Gatepass Report Auto Sync"
$arguments = '"{0}"' -f $syncScriptPath
$action = New-ScheduledTaskAction -Execute $nodeCommand.Source -Argument $arguments -WorkingDirectory $projectDirectory
$trigger = New-ScheduledTaskTrigger -Daily -At "07:45"
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Imports the local Gatepass Excel report into Supabase when the workbook changes." -Force | Out-Null
Write-Output "Installed scheduled task: $taskName"
Write-Output "Runs once every day at 07:45 while this Windows user is logged in; unchanged files are skipped."
