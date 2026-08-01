$ErrorActionPreference = "Stop"
Write-Host "=== Jeebo Upgrade v2 ===" -ForegroundColor Cyan

$backup = ".\backup-before-v2-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
foreach ($item in @("src","functions","public","wrangler.jsonc")) {
  if (Test-Path $item) { Copy-Item $item $backup -Recurse -Force }
}

Write-Host "Creating R2 bucket..." -ForegroundColor Yellow
try { npx wrangler r2 bucket create jeebo-media } catch { Write-Host "Bucket may already exist." }

Write-Host "Updating Wrangler config..." -ForegroundColor Yellow
$config = Get-Content .\wrangler.jsonc -Raw | ConvertFrom-Json
$config | Add-Member -NotePropertyName r2_buckets -NotePropertyValue @() -Force
$config.r2_buckets = @([pscustomobject]@{ binding="MEDIA"; bucket_name="jeebo-media" })
$config | ConvertTo-Json -Depth 20 | Set-Content .\wrangler.jsonc -Encoding utf8

@"
ADMIN_USER=ammar
ADMIN_PASSWORD=2233
"@ | Set-Content .\.dev.vars -Encoding utf8
if (-not (Test-Path .\.gitignore)) { New-Item .\.gitignore -ItemType File | Out-Null }
if ((Get-Content .\.gitignore -Raw) -notmatch "(?m)^\.dev\.vars$") { Add-Content .\.gitignore "`n.dev.vars" }

Write-Host "Upgrading database..." -ForegroundColor Yellow
try { npx wrangler d1 execute jeebo-db --remote --command="ALTER TABLE orders ADD COLUMN product_id INTEGER;" } catch {}
try { npx wrangler d1 execute jeebo-db --remote --command="ALTER TABLE products ADD COLUMN images TEXT DEFAULT '[]';" } catch {}
npx wrangler d1 execute jeebo-db --remote --command="CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id); CREATE INDEX IF NOT EXISTS idx_products_slug_status ON products(slug,status);"

Write-Host "Copying upgraded files..." -ForegroundColor Yellow
Copy-Item ".\jeebo-upgrade-v2\payload\*" "." -Recurse -Force

Write-Host "Building..." -ForegroundColor Yellow
npm run build

Write-Host "Saving to Git..." -ForegroundColor Yellow
git add .
try { git commit -m "Upgrade admin security R2 orders products dashboard" } catch {}
try { git push origin main } catch {}

Write-Host "Deploying..." -ForegroundColor Yellow
npx wrangler pages deploy dist --project-name jeebo-store --branch main

Write-Host ""
Write-Host "Upgrade complete." -ForegroundColor Green
Write-Host "Store: https://jeebo-store.pages.dev" -ForegroundColor Cyan
Write-Host "Admin: https://jeebo-store.pages.dev/admin" -ForegroundColor Cyan
Write-Host "Username: ammar" -ForegroundColor Yellow
Write-Host "Password: 2233" -ForegroundColor Yellow
Write-Host "Change this weak password after testing." -ForegroundColor Red
