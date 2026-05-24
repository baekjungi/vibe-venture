# 학교급식앱 서버 자동시작
$appDir = "c:\dev\vibe-venture\workshop\week-02\app"
Set-Location $appDir

# .env 로드
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([A-Z_][A-Z0-9_]*)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim('"'), "Process")
        }
    }
}

# Node 서버 시작 (재시작 감시 포함)
while ($true) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 서버 시작..."
    $p = Start-Process node -ArgumentList "server.js" -WorkingDirectory $appDir -PassThru -NoNewWindow
    $p.WaitForExit()
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 서버 종료됨. 3초 후 재시작..."
    Start-Sleep 3
}
