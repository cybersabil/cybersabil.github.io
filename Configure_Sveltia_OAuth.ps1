param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern('^https://[A-Za-z0-9.-]+\.workers\.dev/?$')]
  [string]$WorkerUrl
)
$ErrorActionPreference = 'Stop'
$ConfigPath = Join-Path $PSScriptRoot 'admin\config.yml'
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Missing: $ConfigPath" }
$WorkerUrl = $WorkerUrl.TrimEnd('/')
$Text = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8
$Pattern = '(?m)^(\s*base_url:\s*).*$'
if ($Text -notmatch $Pattern) { throw 'backend.base_url was not found in admin/config.yml' }
$Updated = [regex]::Replace($Text, $Pattern, ('$1' + $WorkerUrl), 1)
Set-Content -LiteralPath $ConfigPath -Value $Updated -Encoding UTF8
Write-Host "Sveltia OAuth URL updated: $WorkerUrl" -ForegroundColor Green
Write-Host 'Next: Commit admin/config.yml and push to GitHub.' -ForegroundColor Cyan
