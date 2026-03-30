#!/usr/bin/env python3
"""
陕西省市场监管局网站自动化程序 - 主入口
使用 PyQt5 + QtWebEngine 实现内嵌浏览器自动化
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 详细的依赖检查和调试信息
print("=== Shaanxi Market Regulation Website Automation Program ===")
print(f"Python executable: {sys.executable}")
print(f"Python path: {sys.prefix}")
print(f"Python version: {sys.version}")
print()

print("Checking PyQt5 dependencies...")
try:
    import PyQt5
    print(f"[OK] PyQt5 imported from: {PyQt5.__file__}")
except ImportError as e:
    print(f"[ERROR] Failed to import PyQt5: {e}")
    print("Please install PyQt5:")
    print("  pip install PyQt5")
    print("Or if in virtual environment:")
    print("  activate_venv.bat")
    print("  pip install PyQt5")
    sys.exit(1)

try:
    from PyQt5.QtWidgets import QApplication
    print("[OK] QApplication imported")
except ImportError as e:
    print(f"[ERROR] Failed to import QApplication: {e}")
    sys.exit(1)

try:
    from PyQt5.QtCore import Qt, QTranslator, QLocale
    print("[OK] QtCore modules imported")
except ImportError as e:
    print(f"[ERROR] Failed to import QtCore: {e}")
    sys.exit(1)

try:
    from PyQt5.QtGui import QIcon
    print("[OK] QtGui imported")
except ImportError as e:
    print(f"[ERROR] Failed to import QtGui: {e}")
    sys.exit(1)

try:
    from PyQt5.QtWebEngineWidgets import QWebEngineView
    print("[OK] PyQt5-WebEngine imported")
except ImportError as e:
    print(f"[ERROR] Failed to import PyQt5-WebEngine: {e}")
    print("Please install PyQt5-WebEngine:")
    print("  pip install PyQtWebEngine")
    print("Or try:")
    print("  pip install PyQtWebEngine --only-binary=all")
    sys.exit(1)

print("[OK] All PyQt5 dependencies verified!")
print()

from app.ui_mainwindow import MainWindow
from app.logger import Logger


def setup_application():
    """设置应用程序"""
    # 设置高DPI支持 (PyQt5语法)
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)

    # 创建应用实例
    app = QApplication(sys.argv)

    # 设置应用信息
    app.setApplicationName("陕西省市场监管局网站自动化")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("Business Deregistration")
    app.setOrganizationDomain("business-deregistration.com")

    # 设置窗口图标 (如果有的话)
    icon_path = project_root / "resources" / "icon.png"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    return app


def main():
    """主函数"""
    try:
        # 初始化日志
        logger = Logger()

        # 设置应用程序
        app = setup_application()

        # 创建主窗口
        main_window = MainWindow(logger)
        main_window.show()

        # 记录启动日志
        logger.info("应用程序启动")

        # 运行应用程序
        exit_code = app.exec()

        # 记录退出日志
        logger.info("应用程序退出")

        return exit_code

    except Exception as e:
        print(f"应用程序启动失败: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
