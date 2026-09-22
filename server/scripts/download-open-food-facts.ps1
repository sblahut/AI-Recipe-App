# Download the Open Food Facts JSONL export into server/data/imports/.
# Run from server/:  .\scripts\download-open-food-facts.ps1
# Expect several GB; ensure free disk space before starting.

$ErrorActionPreference = "Stop"
$serverRoot = Split-Path -Parent $PSScriptRoot
$destDir = Join-Path $serverRoot "data\imports"
$destFile = Join-Path $destDir "openfoodfacts-products.jsonl.gz"
$url = "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

if (Test-Path $destFile) {
    Write-Host "Already exists: $destFile"
    Write-Host "Delete it first if you want a fresh download."
    exit 0
}

Write-Host "Downloading Open Food Facts export (large file)..."
Write-Host $url
Write-Host "Saving to $destFile"

Invoke-WebRequest -Uri $url -OutFile $destFile -UseBasicParsing

Write-Host "Done. Import with:"
Write-Host "  .\import-products.ps1 -ImportPath data\imports\openfoodfacts-products.jsonl.gz"
Write-Host ""
Write-Host "After a successful import you can delete the .gz file to reclaim disk space."
Write-Host "The catalog stays in server\data\app.db; no need to revert app code."
