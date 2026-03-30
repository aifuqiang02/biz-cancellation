#!/usr/bin/env python3
"""
自动化工具集 - 主窗口（Tab 版本）
包含微信自动回复和政务采集同步两个功能
"""

from PyQt5.QtWidgets import (
    QMainWindow, QTabWidget, QWidget, QVBoxLayout,
    QApplication
)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QIcon
from pathlib import Path

from app.logger import Logger
from app.wechat_tab import WeChatTab
from app.snamr_tab import SnamrTab
from app.auto_friend_tab import AutoFriendTab


class MainTabWindow(QMainWindow):
    """主 Tab 窗口"""

    def __init__(self, logger: Logger):
        super().__init__()
        self.logger = logger
        self.setWindowTitle("自动化工具集")
        self.setMinimumSize(1400, 900)
        
        # 创建中央 Tab 部件
        self.tab_widget = QTabWidget()
        self.setCentralWidget(self.tab_widget)
        
        # 创建三个标签页
        self.wechat_tab = WeChatTab(logger)
        self.snamr_tab = SnamrTab(logger)
        self.auto_friend_tab = AutoFriendTab(logger)
        
        # 添加到 Tab 控件
        self.tab_widget.addTab(self.wechat_tab, "微信自动回复")
        self.tab_widget.addTab(self.snamr_tab, "政务采集同步")
        self.tab_widget.addTab(self.auto_friend_tab, "自动加好友")
        
        # 默认选中微信标签页
        self.tab_widget.setCurrentIndex(0)
        
        # 连接 Tab 切换信号（用于日志显示）
        self.tab_widget.currentChanged.connect(self.on_tab_changed)
        
        self.logger.info("主 Tab 窗口初始化完成")
    
    def on_tab_changed(self, index):
        """Tab 切换时的处理"""
        tab_name = self.tab_widget.tabText(index)
        self.logger.info(f"切换到标签页: {tab_name}")
    
    def closeEvent(self, event):
        """窗口关闭事件"""
        self.logger.info("正在关闭自动化工具集...")
        
        # 停止所有自动化
        if hasattr(self.wechat_tab, 'stop_automation'):
            self.wechat_tab.stop_automation()
        if hasattr(self.snamr_tab, 'stop_automation'):
            self.snamr_tab.stop_automation()
        if hasattr(self.auto_friend_tab, 'stop_automation'):
            self.auto_friend_tab.stop_automation()
        
        self.logger.info("自动化工具集已关闭")
        event.accept()