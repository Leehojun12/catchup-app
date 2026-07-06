# CatchUp dev server — 백엔드 + Expo Metro를 백그라운드에서 실행
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-PortInUse($Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return [bool]$conn
}

function Start-NpmBackground($WorkingDir, $ScriptName, $StdoutLog, $StderrLog) {
  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmCmd) {
    Start-Process -FilePath $npmCmd.Source -ArgumentList "run", $ScriptName `
      -WorkingDirectory $WorkingDir -WindowStyle Hidden `
      -RedirectStandardOutput $StdoutLog -RedirectStandardError $StderrLog
    return
  }

  Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run $ScriptName" `
    -WorkingDirectory $WorkingDir -WindowStyle Hidden `
    -RedirectStandardOutput $StdoutLog -RedirectStandardError $StderrLog
}

if (-not (Test-Path "$Root\backend\node_modules")) {
  Write-Host "[dev] backend dependencies installing..." -ForegroundColor Yellow
  npm --prefix backend install
}

if (-not (Test-Path "$Root\frontend\node_modules")) {
  Write-Host "[dev] frontend dependencies installing..." -ForegroundColor Yellow
  npm --prefix frontend install
}

if (-not (Test-Path "$Root\backend\.env")) {
  if (Test-Path "$Root\backend\.env.example") {
    Copy-Item "$Root\backend\.env.example" "$Root\backend\.env"
    Write-Host "[dev] backend/.env created from .env.example" -ForegroundColor Yellow
  }
}

$logsDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$backendRunning = Test-PortInUse 3000
$expoRunning = Test-PortInUse 8081

if ($backendRunning -and $expoRunning) {
  Write-Host "[dev] Already running (ports 3000, 8081)" -ForegroundColor Green
  Write-Host "      Expo Go에서 최근 프로젝트를 열거나 exp:// LAN 주소로 접속하세요."
  exit 0
}

if (-not $backendRunning) {
  Write-Host "[dev] Starting backend on :3000 ..." -ForegroundColor Cyan
  Start-NpmBackground "$Root\backend" "dev" "$logsDir\backend.log" "$logsDir\backend.err.log"
  Start-Sleep -Seconds 2
}

if (-not $expoRunning) {
  Write-Host "[dev] Starting Expo Metro on :8081 ..." -ForegroundColor Cyan
  Start-NpmBackground "$Root\frontend" "start:daemon" "$logsDir\expo.log" "$logsDir\expo.err.log"
  Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "CatchUp dev server started." -ForegroundColor Green
Write-Host "  Backend  → http://localhost:3000/api/health"
Write-Host "  Expo     → http://localhost:8081"
Write-Host "  Logs     → $logsDir"
Write-Host ""
Write-Host "Expo Go 앱에서 '최근 항목'으로 catchup-app을 열거나 QR을 스캔하세요."
Write-Host "종료: npm run dev:stop"
