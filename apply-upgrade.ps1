Set-Location "C:\Users\MoRa\OneDrive\Desktop\jeebo-store"
$ErrorActionPreference="Stop"
Write-Host "=== Jeebo Full Upgrade v3 ===" -ForegroundColor Cyan
$here=Split-Path -Parent $MyInvocation.MyCommand.Path
$project=Split-Path -Parent $here
$backup=".\backup-v3-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Force $backup|Out-Null
@("src","functions","wrangler.jsonc")|%{if(Test-Path $_){Copy-Item $_ $backup -Recurse -Force}}
Write-Host "Updating database..." -ForegroundColor Yellow
$sqls=@(
"ALTER TABLE products ADD COLUMN category TEXT DEFAULT '';",
"ALTER TABLE products ADD COLUMN images TEXT DEFAULT '[]';",
"ALTER TABLE orders ADD COLUMN shipping_cost REAL DEFAULT 0;",
"ALTER TABLE orders ADD COLUMN subtotal REAL DEFAULT 0;",
"ALTER TABLE settings ADD COLUMN shipping_mode TEXT DEFAULT 'flat';",
"ALTER TABLE settings ADD COLUMN flat_shipping REAL DEFAULT 60;",
"ALTER TABLE settings ADD COLUMN governorate_rates TEXT DEFAULT '{}';",
"ALTER TABLE settings ADD COLUMN enabled_governorates TEXT DEFAULT '[]';",
"ALTER TABLE settings ADD COLUMN google_analytics TEXT DEFAULT '';"
)
foreach($s in $sqls){npx wrangler d1 execute jeebo-db --remote --command="$s";if($LASTEXITCODE-ne 0){Write-Host "Column may already exist - continuing" -ForegroundColor DarkYellow}}
npx wrangler d1 execute jeebo-db --remote --command="CREATE INDEX IF NOT EXISTS idx_products_category ON products(category); CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);"
Write-Host "Copying files..." -ForegroundColor Yellow
Copy-Item "$here\files\*" $project -Recurse -Force
Write-Host "Building..." -ForegroundColor Yellow
npm run build
if($LASTEXITCODE-ne 0){throw "Build failed"}
Write-Host "Committing..." -ForegroundColor Yellow
git add .
git commit -m "Complete orders products shipping dashboard settings"
git push origin main
Write-Host "Deploying..." -ForegroundColor Yellow
npx wrangler pages deploy dist --project-name jeebo-store --branch main
Write-Host "DONE: https://jeebo-store.pages.dev/admin" -ForegroundColor Green

