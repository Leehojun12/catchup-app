# CatchUp dev server 중지 (포트 3000, 8081)
$ErrorActionPreference = "SilentlyContinue"

function Stop-Port($Port, $Label) {
  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "[dev] $Label (port $Port) — not running"
    return
  }

  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Host "[dev] Stopped $Label (PID $pid, port $Port)" -ForegroundColor Yellow
  }
}

Stop-Port 8081 "Expo Metro"
Stop-Port 3000 "Backend API"

# PM2로 실행 중이면 함께 정리
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
  pm2 delete catchup-backend catchup-expo 2>$null
}

Write-Host "[dev] Dev server stopped." -ForegroundColor Green
