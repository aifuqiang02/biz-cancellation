@echo off
REM 使用 Anaconda 环境启动程序

echo ========================================
echo WeChat Auto-Reply Program Launcher (Anaconda)
echo ========================================
echo.

REM 查找 Anaconda Python
set "ANACONDA_PYTHON=C:\ProgramData\anaconda3\python.exe"

if not exist "%ANACONDA_PYTHON%" (
    echo [ERROR] Anaconda Python not found at %ANACONDA_PYTHON%
    echo Please check your Anaconda installation path
    pause
    exit /b 1
)

echo [OK] Found Anaconda Python: %ANACONDA_PYTHON%
echo.

REM 检查依赖
echo Checking dependencies...
"%ANACONDA_PYTHON%" -c "import PyQt5; print('[OK] PyQt5 installed')" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PyQt5 not found, installing...
    "%ANACONDA_PYTHON%" -m pip install PyQt5>=5.15.0
)

"%ANACONDA_PYTHON%" -c "import PyQt5.QtWebEngineWidgets; print('[OK] PyQt5-WebEngine installed')" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PyQt5-WebEngine not found, installing...
    "%ANACONDA_PYTHON%" -m pip install PyQtWebEngine>=5.15.0
)

"%ANACONDA_PYTHON%" -c "import requests; print('[OK] requests installed')" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] requests not found, installing...
    "%ANACONDA_PYTHON%" -m pip install requests>=2.28.0
)

"%ANACONDA_PYTHON%" -c "from wxautox4 import WeChat; print('[OK] wxautox4 installed')" 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] wxautox4 not found, installing...
    "%ANACONDA_PYTHON%" -m pip install wxautox4>=40.0.0
    echo.
    echo [IMPORTANT] Please activate wxautox4 with:
    echo   wxautox4 -a ddYLEeDbz432owZLyaO502zjEz8lb7ReLDi4LiRcP2K
    echo.
)

echo.
echo [OK] All dependencies ready!
echo.

REM 启动程序
echo Starting WeChat Auto-Reply Program...
echo Press Ctrl+C to stop the program
echo.

"%ANACONDA_PYTHON%" app\main.py

pause