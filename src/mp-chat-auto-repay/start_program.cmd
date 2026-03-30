@echo off
REM 启动程序的完整解决方案

echo ========================================
echo WeChat Auto-Reply Program Launcher
echo ========================================
echo.

REM 检查虚拟环境是否存在
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found!
    echo Please run: python -m venv venv
    echo Or run: install_deps.bat
    pause
    exit /b 1
)

REM 激活虚拟环境
echo Activating virtual environment...
call venv\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)

echo [OK] Virtual environment activated
echo Python path: %VIRTUAL_ENV%\Scripts\python.exe
echo.

REM 检查依赖
echo Checking dependencies...
python -c "import PyQt5; print('[OK] PyQt5 installed')" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PyQt5 not found, installing...
    pip install PyQt5>=5.15.0
)

python -c "import PyQt5.QtWebEngineWidgets; print('[OK] PyQt5-WebEngine installed')" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PyQt5-WebEngine not found, installing...
    pip install PyQtWebEngine>=5.15.0
)

python -c "import requests; print('[OK] requests installed')" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] requests not found, installing...
    pip install requests>=2.28.0
)

python -c "from wxautox4 import WeChat; print('[OK] wxautox4 installed')" 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] wxautox4 not found, installing...
    pip install wxautox4>=40.0.0
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

REM 强制使用虚拟环境Python
"%VIRTUAL_ENV%\Scripts\python.exe" app\main.py

pause
