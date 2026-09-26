# Import UPC catalog into products table. Run from server/:
#   .\import-products.ps1
#   .\import-products.ps1 -ImportPath data\imports\openfoodfacts-products.jsonl.gz -Country en:united-states
#   .\import-products.ps1 -SkipPip ...   # if Windows blocks pip.exe but .venv is already set up
param(
    [string]$ImportPath = "data/imports/sample.openfoodfacts.jsonl",
    [string]$Country = "en:united-states",
    [int]$Limit = 0,
    [switch]$DryRun,
    [switch]$SkipPip
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
.\.venv\Scripts\Activate.ps1
if (-not $SkipPip) {
    python -m pip install -r requirements.txt -q
    if ($LASTEXITCODE -ne 0) {
        throw "pip install failed (exit $LASTEXITCODE). If Application Control blocks pip, use -SkipPip when .venv already has requirements."
    }
}

$argsList = @("scripts/import_open_food_facts.py", "--input", $ImportPath)
if ($Country) { $argsList += @("--country", $Country) }
if ($Limit -gt 0) { $argsList += @("--limit", $Limit) }
if ($DryRun) { $argsList += "--dry-run" }

python @argsList
