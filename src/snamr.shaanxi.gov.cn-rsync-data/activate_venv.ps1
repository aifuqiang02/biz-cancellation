# 激活虚拟环境的PowerShell脚本

Write-Host "Activating virtual environment..." -ForegroundColor Yellow

# 检查虚拟环境是否存在
if (!(Test-Path "venv\Scripts\activate.ps1")) {
    Write-Host "[ERROR] Virtual environment not found. Please run: python -m venv venv" -ForegroundColor Red
    exit 1
}

# 如果在conda环境中，先退出
if ($env:CONDA_DEFAULT_ENV) {
    Write-Host "Detected conda environment ($env:CONDA_DEFAULT_ENV), deactivating..." -ForegroundColor Yellow
    conda deactivate 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Note: You may need to restart PowerShell to fully exit conda environment" -ForegroundColor Yellow
    }
}

# 激活Python虚拟环境
& "venv\Scripts\activate.ps1"

# 验证激活是否成功
$pythonPath = & python -c "import sys; print(sys.executable)" 2>$null
if ($pythonPath -and $pythonPath.Contains("venv")) {
    Write-Host "[OK] Virtual environment activated successfully!" -ForegroundColor Green
    Write-Host "Python path: $pythonPath" -ForegroundColor Cyan
    Write-Host "Now you can run: python run.py" -ForegroundColor Cyan
} else {
    Write-Host "[WARNING] Virtual environment may not be fully activated" -ForegroundColor Yellow
    Write-Host "Current Python: $pythonPath" -ForegroundColor Yellow
    Write-Host "Try restarting PowerShell or use CMD instead" -ForegroundColor Yellow
}
