# Import UPC catalog into products table. Run from server/:
#   .\import-products.ps1
#   .\import-products.ps1 -ImportPath data\imports\openfoodfacts-products.jsonl.gz -Country en:united-states
param(
    [string]$ImportPath = "data/imports/sample.openfoodfacts.jsonl",
    [string]$Country = "en:united-states",
    [int]$Limit = 0,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -q

$argsList = @("scripts/import_open_food_facts.py", "--input", $ImportPath)
if ($Country) { $argsList += @("--country", $Country) }
if ($Limit -gt 0) { $argsList += @("--limit", $Limit) }
if ($DryRun) { $argsList += "--dry-run" }

python @argsList
