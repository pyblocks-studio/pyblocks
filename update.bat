@echo off
title PyBlocks File Sync v0.2.3 (PyBlocks Developers)
color 0A
cls
echo ========================================================================
echo                     PyBlocks File Sync Runner (v0.2.3)
echo                     Publisher: PyBlocks Developers
echo ========================================================================
echo.
if not exist "update\FILES_TO_UPDATE.txt" (
    color 0C
    echo [ERROR] Could not find "update\FILES_TO_UPDATE.txt"!
    pause
    exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$txtPath = 'update/FILES_TO_UPDATE.txt'; Write-Host '[READING] Parsing ' -NoNewline; Write-Host $txtPath -ForegroundColor Cyan; $content = Get-Content -Raw -LiteralPath $txtPath -Encoding UTF8; if ([string]::IsNullOrWhiteSpace($content)) { Write-Host '[WARN] FILES_TO_UPDATE.txt is empty! Nothing to update.' -ForegroundColor Yellow; exit; } $sections = $content -split '(?m)^===\s*$\r?\n?'; $count = 0; foreach ($sec in $sections) { $trimmedSec = $sec.Trim(); if ([string]::IsNullOrWhiteSpace($trimmedSec)) { continue; } $lines = $trimmedSec -split '\r?\n'; if ($lines.Length -ge 1) { $relPath = $lines[0].Trim(); if ($relPath -eq 'pyblocks.html') { $relPath = 'index.html'; } $fileContent = ($lines[1..($lines.Length-1)] -join [System.Environment]::NewLine).Trim(); if ($relPath) { $targetDir = Split-Path -Path $relPath -Parent; if ($targetDir -and !(Test-Path -LiteralPath $targetDir)) { Write-Host '[NAV] Creating directory: ' -NoNewline; Write-Host $targetDir -ForegroundColor Gray; New-Item -ItemType Directory -Force -Path $targetDir | Out-Null; } [System.IO.File]::WriteAllText($relPath, $fileContent, [System.Text.Encoding]::UTF8); Write-Host '  [+] [WRITTEN] ' -NoNewline -ForegroundColor Green; Write-Host $relPath -ForegroundColor White; $count++; } } }; Write-Host ''; Write-Host '[SUCCESS] Updated ' -NoNewline -ForegroundColor Green; Write-Host $count -NoNewline -ForegroundColor Yellow; Write-Host ' file(s) successfully!';"
echo.
echo Done!
pause