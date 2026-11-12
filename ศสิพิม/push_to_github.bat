@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================================
echo   Uploading Portfolio to GitHub (thanatat720-byte)...
echo ========================================================
echo.
"D:\laragon\bin\git\cmd\git.exe" add .
"D:\laragon\bin\git\cmd\git.exe" commit -m "Update portfolio website"
"D:\laragon\bin\git\cmd\git.exe" push -u origin main
echo.
echo ========================================================
echo   Finished! กดปุ่มใดก็ได้เพื่อปิดหน้าต่างนี้
echo ========================================================
pause
