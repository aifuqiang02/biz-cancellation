@echo off
REM 激活虚拟环境的批处理脚本 (Windows)

echo Activating virtual environment...

REM 检查虚拟环境是否存在
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found!
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

if %errorlevel% equ 0 (
    echo [OK] Virtual environment activated
    echo Python path: %VIRTUAL_ENV%\Scripts\python.exe
    echo Now you can run: python run.py
    echo.
    echo Note: If you see (base) in PowerShell, try:
    echo   1. Exit PowerShell and reopen CMD
    echo   2. Or use: deactivate ^& activate_venv.bat
) else (
    echo [ERROR] Failed to activate virtual environment
)

pause
