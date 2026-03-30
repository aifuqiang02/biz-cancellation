#!/usr/bin/env python3
"""
政务采集同步 - Tab 页面
陕西省市场监管局网站数据采集
"""

from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout,
    QTextEdit, QPushButton, QLabel, QProgressBar,
    QGroupBox, QCheckBox, QSpinBox, QLineEdit
)
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage, QWebEngineProfile
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QUrl, QSize
from PyQt5.QtGui import QFont, QPalette, QColor
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.browser_controller import BrowserController
from app.snamr import AutomationEngine
from app.logger import Logger


class SnamrTab(QWidget):
    """政务采集同步标签页"""

    # 信号定义
    automation_started = pyqtSignal()
    automation_stopped = pyqtSignal()

    def __init__(self, parent_logger=None):
        super().__init__()
        
        # 创建独立的日志记录器
        log_dir = Path(__file__).parent.parent / "logs" / "snamr"
        log_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = str(log_dir / f"snamr_{timestamp}.log")
        self.logger = Logger(log_file=log_file)
        
        self.browser_controller = None
        self.automation_engine = None
        self.is_automation_running = False

        # 配置信息
        self.config = {
            'round_interval_min': 1200,  # 每轮间隔最小时间（秒）- 20分钟
            'round_interval_max': 1800,  # 每轮间隔最大时间（秒）- 30分钟
            'page_wait_min': 3,          # 翻页等待最小时间（秒）
            'page_wait_max': 8,          # 翻页等待最大时间（秒）
            'max_pages': 50,             # 最大采集页数
            'confirm_actions': True      # 是否需要确认操作
        }

        self.init_ui()
        self.init_connections()
        self.logger.info("政务采集同步标签页初始化完成")

    def init_ui(self):
        """初始化UI"""
        # 主布局
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(5)
        main_layout.setContentsMargins(5, 5, 5, 5)

        # 浏览器区域
        browser_group = QGroupBox("陕西省市场监管局网站")
        browser_group.setMaximumHeight(700)
        browser_layout = QVBoxLayout(browser_group)
        browser_layout.setContentsMargins(5, 5, 5, 5)

        # 创建浏览器视图
        self.web_view = QWebEngineView()
        self.web_view.setMinimumHeight(500)

        # 配置浏览器页面
        profile = QWebEngineProfile("snamr_profile", self.web_view)
        profile.setPersistentCookiesPolicy(QWebEngineProfile.PersistentCookiesPolicy.AllowPersistentCookies)
        profile.setHttpCacheType(QWebEngineProfile.HttpCacheType.DiskHttpCache)
        page = QWebEnginePage(profile, self.web_view)
        self.web_view.setPage(page)

        browser_layout.addWidget(self.web_view)

        # 浏览器控制按钮
        browser_controls = QWidget()
        browser_controls.setMaximumHeight(50)
        browser_controls_layout = QHBoxLayout(browser_controls)
        browser_controls_layout.setContentsMargins(0, 0, 0, 0)

        self.btn_load_page = QPushButton("加载登录页面")
        self.btn_load_page.setMaximumWidth(120)
        browser_controls_layout.addWidget(self.btn_load_page)

        self.btn_refresh = QPushButton("刷新页面")
        self.btn_refresh.setMaximumWidth(100)
        browser_controls_layout.addWidget(self.btn_refresh)

        browser_controls_layout.addStretch()
        browser_layout.addWidget(browser_controls)

        main_layout.addWidget(browser_group, 4)

        # 控制面板和日志
        bottom_widget = QWidget()
        bottom_widget.setMaximumHeight(300)
        bottom_layout = QHBoxLayout(bottom_widget)
        bottom_layout.setSpacing(5)

        # 左侧：控制面板
        control_group = QGroupBox("控制面板")
        control_layout = QVBoxLayout(control_group)
        control_layout.setSpacing(5)

        # 状态显示
        status_widget = QWidget()
        status_layout = QHBoxLayout(status_widget)
        status_layout.setContentsMargins(0, 0, 0, 0)

        self.lbl_status = QLabel("状态：未启动")
        self.lbl_status.setStyleSheet("font-weight: bold; color: orange;")
        status_layout.addWidget(self.lbl_status)

        self.lbl_js_status = QLabel("JS: 未加载")
        self.lbl_js_status.setStyleSheet("color: red;")
        status_layout.addWidget(self.lbl_js_status)

        status_layout.addStretch()

        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(150)
        status_layout.addWidget(self.progress_bar)

        control_layout.addWidget(status_widget)

        # 控制按钮
        buttons_widget = QWidget()
        buttons_layout = QHBoxLayout(buttons_widget)
        buttons_layout.setContentsMargins(0, 0, 0, 0)
        buttons_layout.setSpacing(5)

        self.btn_start = QPushButton("开始自动化")
        self.btn_start.setStyleSheet("QPushButton { background-color: #4CAF50; color: white; padding: 6px 12px; font-weight: bold; }")
        self.btn_start.setMaximumHeight(30)
        buttons_layout.addWidget(self.btn_start)

        self.btn_stop = QPushButton("停止自动化")
        self.btn_stop.setStyleSheet("QPushButton { background-color: #f44336; color: white; padding: 6px 12px; font-weight: bold; }")
        self.btn_stop.setMaximumHeight(30)
        self.btn_stop.setEnabled(False)
        buttons_layout.addWidget(self.btn_stop)

        self.btn_manual_check = QPushButton("手动采集")
        self.btn_manual_check.setMaximumHeight(30)
        self.btn_manual_check.setEnabled(False)
        buttons_layout.addWidget(self.btn_manual_check)

        self.btn_debug = QPushButton("调试页面")
        self.btn_debug.setMaximumHeight(30)
        buttons_layout.addWidget(self.btn_debug)

        buttons_layout.addStretch()
        control_layout.addWidget(buttons_widget)

        # 配置选项
        config_group = QGroupBox("配置选项")
        config_layout = QVBoxLayout(config_group)
        config_layout.setSpacing(3)

        # 第一行：轮次间隔
        config_row1 = QWidget()
        config_row1_layout = QHBoxLayout(config_row1)
        config_row1_layout.setContentsMargins(0, 0, 0, 0)
        config_row1_layout.setSpacing(5)

        config_row1_layout.addWidget(QLabel("轮次间隔:"))

        self.spin_round_min = QSpinBox()
        self.spin_round_min.setRange(600, 3600)
        self.spin_round_min.setValue(self.config['round_interval_min'])
        self.spin_round_min.setMaximumWidth(70)
        self.spin_round_min.setSuffix("s")
        config_row1_layout.addWidget(self.spin_round_min)

        config_row1_layout.addWidget(QLabel("-"))

        self.spin_round_max = QSpinBox()
        self.spin_round_max.setRange(600, 3600)
        self.spin_round_max.setValue(self.config['round_interval_max'])
        self.spin_round_max.setMaximumWidth(70)
        self.spin_round_max.setSuffix("s")
        config_row1_layout.addWidget(self.spin_round_max)

        config_row1_layout.addStretch()
        config_layout.addWidget(config_row1)

        # 第二行：翻页等待和最大页数
        config_row2 = QWidget()
        config_row2_layout = QHBoxLayout(config_row2)
        config_row2_layout.setContentsMargins(0, 0, 0, 0)
        config_row2_layout.setSpacing(5)

        config_row2_layout.addWidget(QLabel("翻页等待:"))

        self.spin_page_wait_min = QSpinBox()
        self.spin_page_wait_min.setRange(1, 60)
        self.spin_page_wait_min.setValue(self.config['page_wait_min'])
        self.spin_page_wait_min.setMaximumWidth(50)
        self.spin_page_wait_min.setSuffix("s")
        config_row2_layout.addWidget(self.spin_page_wait_min)

        config_row2_layout.addWidget(QLabel("-"))

        self.spin_page_wait_max = QSpinBox()
        self.spin_page_wait_max.setRange(1, 60)
        self.spin_page_wait_max.setValue(self.config['page_wait_max'])
        self.spin_page_wait_max.setMaximumWidth(50)
        self.spin_page_wait_max.setSuffix("s")
        config_row2_layout.addWidget(self.spin_page_wait_max)

        config_row2_layout.addWidget(QLabel("  最大页数:"))

        self.spin_max_pages = QSpinBox()
        self.spin_max_pages.setRange(1, 200)
        self.spin_max_pages.setValue(self.config['max_pages'])
        self.spin_max_pages.setMaximumWidth(60)
        config_row2_layout.addWidget(self.spin_max_pages)

        config_row2_layout.addStretch()

        self.chk_confirm_actions = QCheckBox("操作确认")
        self.chk_confirm_actions.setChecked(self.config['confirm_actions'])
        config_row2_layout.addWidget(self.chk_confirm_actions)

        config_layout.addWidget(config_row2)

        control_layout.addWidget(config_group)
        control_layout.addStretch()

        bottom_layout.addWidget(control_group, 1)

        # 右侧：日志区域
        log_group = QGroupBox("操作日志")
        log_layout = QVBoxLayout(log_group)
        log_layout.setContentsMargins(5, 5, 5, 5)

        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setFont(QFont("Consolas", 8))

        # 设置日志文本的样式
        palette = self.log_text.palette()
        palette.setColor(QPalette.ColorRole.Base, QColor("#f8f8f8"))
        self.log_text.setPalette(palette)

        log_layout.addWidget(self.log_text)

        # 日志控制按钮
        log_controls = QWidget()
        log_controls.setMaximumHeight(35)
        log_controls_layout = QHBoxLayout(log_controls)
        log_controls_layout.setContentsMargins(0, 0, 0, 0)

        self.btn_clear_log = QPushButton("清空")
        self.btn_clear_log.setMaximumWidth(60)
        log_controls_layout.addWidget(self.btn_clear_log)

        self.btn_save_log = QPushButton("保存")
        self.btn_save_log.setMaximumWidth(60)
        log_controls_layout.addWidget(self.btn_save_log)

        log_controls_layout.addStretch()
        log_layout.addWidget(log_controls)

        bottom_layout.addWidget(log_group, 1)

        main_layout.addWidget(bottom_widget, 1)

        # 连接日志信号
        self.logger.log_signal.connect(self.on_log_message)

    def init_connections(self):
        """初始化信号连接"""
        # 浏览器控制
        self.btn_load_page.clicked.connect(self.load_login_page)
        self.btn_refresh.clicked.connect(self.refresh_page)

        # 自动化控制
        self.btn_start.clicked.connect(self.start_automation)
        self.btn_stop.clicked.connect(self.stop_automation)
        self.btn_manual_check.clicked.connect(self.manual_check)
        self.btn_debug.clicked.connect(self.debug_page)

        # 日志控制
        self.btn_clear_log.clicked.connect(self.clear_log)
        self.btn_save_log.clicked.connect(self.save_log)

        # 配置变更
        self.spin_round_min.valueChanged.connect(self.update_config)
        self.spin_round_max.valueChanged.connect(self.update_config)
        self.spin_page_wait_min.valueChanged.connect(self.update_config)
        self.spin_page_wait_max.valueChanged.connect(self.update_config)
        self.spin_max_pages.valueChanged.connect(self.update_config)
        self.chk_confirm_actions.stateChanged.connect(self.update_config)

        # 初始化浏览器控制器
        self.init_browser_controller()

    def init_browser_controller(self):
        """初始化浏览器控制器"""
        try:
            self.browser_controller = BrowserController(self.web_view, self.logger)
            self.logger.info("浏览器控制器初始化完成")
            
            # JS 助手会自动加载，更新状态
            self.lbl_js_status.setText("JS: 已加载")
            self.lbl_js_status.setStyleSheet("color: green;")

        except Exception as e:
            self.logger.error(f"初始化浏览器控制器失败: {e}")

    def on_log_message(self, level: str, message: str, timestamp: str):
        """处理日志消息"""
        # 根据日志级别设置颜色
        color_map = {
            'DEBUG': '#666666',
            'INFO': '#000000',
            'WARNING': '#FF8C00',
            'ERROR': '#FF0000',
            'CRITICAL': '#8B0000'
        }
        color = color_map.get(level, '#000000')

        # 格式化日志消息
        log_entry = f'[{timestamp}] [{level}] {message}'

        # 添加到日志显示
        self.log_text.append(f'<span style="color: {color};">{log_entry}</span>')

        # 滚动到底部
        scrollbar = self.log_text.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

    def load_login_page(self):
        """加载登录页面"""
        url = "https://snamr.shaanxi.gov.cn:7107/login.do?method=outLogin"
        self.logger.info(f"正在加载登录页面: {url}")
        self.web_view.load(QUrl(url))

    def refresh_page(self):
        """刷新页面"""
        self.logger.info("刷新页面")
        self.web_view.reload()

    def start_automation(self):
        """启动自动化"""
        if self.is_automation_running:
            self.logger.warning("自动化已经在运行中")
            return

        self.logger.info("启动自动化任务...")
        self.update_config()

        # 初始化自动化引擎
        if not self.automation_engine:
            self.automation_engine = AutomationEngine(self.browser_controller, self.logger)
            self.automation_engine.automation_step_completed.connect(self.on_automation_step)
            self.automation_engine.message_processed.connect(self.on_message_processed)

        # 准备配置
        config = {
            'round_interval_min': self.config['round_interval_min'],
            'round_interval_max': self.config['round_interval_max'],
            'page_wait_min': self.config['page_wait_min'],
            'page_wait_max': self.config['page_wait_max'],
            'max_pages': self.config['max_pages'],
            'confirm_actions': self.config['confirm_actions']
        }

        if self.automation_engine.start(config):
            self.is_automation_running = True
            self.btn_manual_check.setEnabled(True)
            self.lbl_status.setText("状态：自动化运行中")
            self.lbl_status.setStyleSheet("font-weight: bold; color: green;")
            self.automation_started.emit()
            self.logger.info("政务采集自动化已启动")
        else:
            self.logger.error("启动自动化引擎失败")

    def stop_automation(self):
        """停止自动化"""
        if not self.is_automation_running:
            return

        self.logger.info("停止自动化任务")

        # 更新UI状态
        self.btn_start.setEnabled(True)
        self.btn_stop.setEnabled(False)
        self.lbl_status.setText("状态：已停止")
        self.lbl_status.setStyleSheet("font-weight: bold; color: orange;")

        # 停止自动化引擎
        if self.automation_engine:
            self.automation_engine.stop()

        self.btn_manual_check.setEnabled(False)
        self.is_automation_running = False
        self.automation_stopped.emit()

    def manual_check(self):
        """手动触发采集"""
        if not self.is_automation_running or not self.automation_engine:
            self.logger.warning("自动化未运行，无法执行手动采集")
            return

        self.logger.info("执行手动采集")
        self.automation_engine.manual_check()

    def debug_page(self):
        """调试页面元素"""
        self.logger.info("开始调试页面元素...")
        if self.browser_controller:
            self.browser_controller.debug_page_elements()
        else:
            self.logger.warning("浏览器控制器未初始化")

    def update_config(self):
        """更新配置"""
        self.config.update({
            'round_interval_min': self.spin_round_min.value(),
            'round_interval_max': self.spin_round_max.value(),
            'page_wait_min': self.spin_page_wait_min.value(),
            'page_wait_max': self.spin_page_wait_max.value(),
            'max_pages': self.spin_max_pages.value(),
            'confirm_actions': self.chk_confirm_actions.isChecked()
        })

    def clear_log(self):
        """清空日志"""
        self.log_text.clear()
        self.logger.info("日志已清空")

    def save_log(self):
        """保存日志"""
        from PyQt5.QtWidgets import QFileDialog
        
        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "保存日志",
            f"snamr_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            "Text Files (*.txt);;All Files (*.*)"
        )

        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(self.log_text.toPlainText())
                self.logger.info(f"日志已保存到: {file_path}")
            except Exception as e:
                self.logger.error(f"保存日志失败: {e}")

    def on_automation_step(self, step_name: str, success: bool, message: str):
        """处理自动化步骤完成信号"""
        status_icon = "✓" if success else "✗"
        log_level = "INFO" if success else "ERROR"
        self.logger.log_signal.emit(log_level, f"[{status_icon}] {step_name}: {message}", "")

        # 更新状态显示
        if step_name == "启动" and success:
            self.btn_start.setEnabled(False)
            self.btn_stop.setEnabled(True)
            self.lbl_status.setText("状态：自动化运行中")
        elif step_name == "停止" and success:
            self.btn_start.setEnabled(True)
            self.btn_stop.setEnabled(False)
            self.lbl_status.setText("状态：已停止")

    def on_message_processed(self, message_info: dict, success: bool):
        """处理消息处理信号"""
        action = message_info.get('action', 'unknown')
        
        if success:
            self.logger.info(f"数据采集成功 - 操作: {action}")
        else:
            self.logger.error(f"数据采集失败 - 操作: {action}")