# Creates a Desktop shortcut that starts the home stack like a program.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "home-stack.ps1")

$root = Get-HomeStackRepoRoot
$startScript = Join-Path $PSScriptRoot "start-home-stack.ps1"
$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "AI Recipe.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnkPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoExit -ExecutionPolicy Bypass -File `"$startScript`""
$shortcut.WorkingDirectory = $root
$shortcut.WindowStyle = 1
$shortcut.Description = "Start AI Recipe API and Expo on this PC"
$shortcut.Save()

Write-Host "Shortcut created: $lnkPath"
Write-Host "Double-click it to start the API, Expo Go, and the status page with the dedicated URL QR."
