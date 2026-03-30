#!/usr/bin/env python3
"""
陕西省市场监管局网站自动化程序 - 主窗口UI
包含嵌入浏览器、控制面板和日志区域
"""

from PyQt5.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QSplitter,
    QTextEdit, QPushButton, QLabel, QFrame, QProgressBar,
    QGroupBox, QCheckBox, QSpinBox, QLineEdit, QFormLayout
)
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage, QWebEngineProfile
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QUrl, QSize
from PyQt5.QtGui import QFont, QPalette, QColor, QIcon

from app.browser_controller import BrowserController
from app.automation import AutomationEngine
from app.logger import Logger


class MainWindow(QMainWindow):
    """主窗口类"""

    # 信号定义
    automation_started = pyqtSignal()
    automation_stopped = pyqtSignal()

    def __init__(self, logger: Logger):
        super().__init__()
        self.logger = logger
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
        self.logger.info("主窗口初始化完成")

    def init_ui(self):
        """初始化UI - 紧凑布局，浏览器区域更大"""
        self.setWindowTitle("陕西省市场监管局网站自动化程序")
        self.setMinimumSize(1400, 900)

        # 创建中央部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # 主布局 - 垂直布局，更紧凑
        main_layout = QVBoxLayout(central_widget)
        main_layout.setSpacing(5)  # 减少间距

        # 浏览器区域 - 占据主要空间
        browser_group = QGroupBox("陕西省市场监管局网站")
        browser_group.setMaximumHeight(700)  # 限制最大高度
        browser_layout = QVBoxLayout(browser_group)
        browser_layout.setContentsMargins(5, 5, 5, 5)  # 减少边距

        # 创建浏览器视图
        self.web_view = QWebEngineView()
        self.web_view.setMinimumHeight(500)  # 设置最小高度

        # 配置浏览器页面
        profile = QWebEngineProfile("wechat_profile", self.web_view)
        profile.setPersistentCookiesPolicy(QWebEngineProfile.PersistentCookiesPolicy.AllowPersistentCookies)
        profile.setHttpCacheType(QWebEngineProfile.HttpCacheType.DiskHttpCache)
        page = QWebEnginePage(profile, self.web_view)
        self.web_view.setPage(page)

        browser_layout.addWidget(self.web_view)

        # 浏览器控制按钮 - 放在浏览器下面，水平排列
        browser_controls = QWidget()
        browser_controls.setMaximumHeight(50)  # 限制高度
        browser_controls_layout = QHBoxLayout(browser_controls)
        browser_controls_layout.setContentsMargins(0, 0, 0, 0)

        self.btn_load_wechat = QPushButton("加载登录页面")
        self.btn_load_wechat.setMaximumWidth(120)
        browser_controls_layout.addWidget(self.btn_load_wechat)

        self.btn_refresh = QPushButton("刷新页面")
        self.btn_refresh.setMaximumWidth(100)
        browser_controls_layout.addWidget(self.btn_refresh)

        self.btn_private_msg = QPushButton("私信")
        self.btn_private_msg.setMaximumWidth(80)
        browser_controls_layout.addWidget(self.btn_private_msg)

        browser_controls_layout.addStretch()
        browser_layout.addWidget(browser_controls)

        main_layout.addWidget(browser_group, 4)  # 占主要空间

        # 控制面板和日志 - 水平排列
        bottom_widget = QWidget()
        bottom_widget.setMaximumHeight(300)  # 限制底部区域高度
        bottom_layout = QHBoxLayout(bottom_widget)
        bottom_layout.setSpacing(5)

        # 左侧：控制面板
        control_group = QGroupBox("控制面板")
        control_group.setMaximumWidth(350)  # 限制宽度
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

        # 控制按钮 - 水平排列
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

        self.btn_manual_check = QPushButton("手动检查")
        self.btn_manual_check.setMaximumHeight(30)
        self.btn_manual_check.setEnabled(False)
        buttons_layout.addWidget(self.btn_manual_check)

        self.btn_debug = QPushButton("调试页面")
        self.btn_debug.setMaximumHeight(30)
        buttons_layout.addWidget(self.btn_debug)

        buttons_layout.addStretch()
        control_layout.addWidget(buttons_widget)

        # 配置选项 - 更紧凑的布局
        config_group = QGroupBox("配置选项")
        config_layout = QVBoxLayout(config_group)
        config_layout.setSpacing(3)

        # 第一行：轮次间隔配置
        config_row1 = QWidget()
        config_row1_layout = QHBoxLayout(config_row1)
        config_row1_layout.setContentsMargins(0, 0, 0, 0)
        config_row1_layout.setSpacing(5)

        config_row1_layout.addWidget(QLabel("轮次间隔:"))

        self.spin_round_min = QSpinBox()
        self.spin_round_min.setRange(600, 3600)  # 10分钟到1小时
        self.spin_round_min.setValue(self.config['round_interval_min'])
        self.spin_round_min.setMaximumWidth(80)
        self.spin_round_min.setSuffix("s")
        config_row1_layout.addWidget(self.spin_round_min)

        config_row1_layout.addWidget(QLabel("-"))

        self.spin_round_max = QSpinBox()
        self.spin_round_max.setRange(600, 3600)  # 10分钟到1小时
        self.spin_round_max.setValue(self.config['round_interval_max'])
        self.spin_round_max.setMaximumWidth(80)
        self.spin_round_max.setSuffix("s")
        config_row1_layout.addWidget(self.spin_round_max)

        config_row1_layout.addWidget(QLabel("(分)"))
        config_layout.addWidget(config_row1)

        # 第二行：翻页等待和其他选项
        config_row2 = QWidget()
        config_row2_layout = QHBoxLayout(config_row2)
        config_row2_layout.setContentsMargins(0, 0, 0, 0)
        config_row2_layout.setSpacing(5)

        config_row2_layout.addWidget(QLabel("翻页等待:"))

        self.spin_page_wait_min = QSpinBox()
        self.spin_page_wait_min.setRange(1, 30)  # 1-30秒
        self.spin_page_wait_min.setValue(self.config['page_wait_min'])
        self.spin_page_wait_min.setMaximumWidth(60)
        self.spin_page_wait_min.setSuffix("s")
        config_row2_layout.addWidget(self.spin_page_wait_min)

        config_row2_layout.addWidget(QLabel("-"))

        self.spin_page_wait_max = QSpinBox()
        self.spin_page_wait_max.setRange(1, 60)  # 1-60秒
        self.spin_page_wait_max.setValue(self.config['page_wait_max'])
        self.spin_page_wait_max.setMaximumWidth(60)
        self.spin_page_wait_max.setSuffix("s")
        config_row2_layout.addWidget(self.spin_page_wait_max)

        config_row2_layout.addWidget(QLabel("最大页数:"))

        self.spin_max_pages = QSpinBox()
        self.spin_max_pages.setRange(1, 200)  # 1-200页
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

        bottom_layout.addWidget(control_group, 1)  # 占1份空间

        # 右侧：日志区域
        log_group = QGroupBox("操作日志")
        log_layout = QVBoxLayout(log_group)
        log_layout.setContentsMargins(5, 5, 5, 5)

        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setFont(QFont("Consolas", 8))  # 稍微小一点的字体

        # 设置日志文本的样式
        palette = self.log_text.palette()
        palette.setColor(QPalette.ColorRole.Base, QColor("#f8f8f8"))
        self.log_text.setPalette(palette)

        log_layout.addWidget(self.log_text)

        # 日志控制按钮 - 更紧凑
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

        bottom_layout.addWidget(log_group, 2)  # 占2份空间

        main_layout.addWidget(bottom_widget, 1)  # 底部区域占较小空间

        # 连接日志信号
        self.logger.log_signal.connect(self.on_log_message)

    def init_connections(self):
        """初始化信号连接"""
        # 浏览器控制
        self.btn_load_wechat.clicked.connect(self.load_wechat)
        self.btn_refresh.clicked.connect(self.refresh_page)
        self.btn_private_msg.clicked.connect(self.open_private_messages)
        self.btn_debug.clicked.connect(self.debug_page)

        # 自动化控制
        self.btn_start.clicked.connect(self.start_automation)
        self.btn_stop.clicked.connect(self.stop_automation)
        self.btn_manual_check.clicked.connect(self.manual_check)

        # 日志控制
        self.btn_clear_log.clicked.connect(self.clear_log)
        self.btn_save_log.clicked.connect(self.save_log)

        # 配置变更
        self.chk_confirm_actions.stateChanged.connect(self.update_config)
        self.spin_round_min.valueChanged.connect(self.update_config)
        self.spin_round_max.valueChanged.connect(self.update_config)
        self.spin_page_wait_min.valueChanged.connect(self.update_config)
        self.spin_page_wait_max.valueChanged.connect(self.update_config)
        self.spin_max_pages.valueChanged.connect(self.update_config)

        # 浏览器加载状态
        self.web_view.loadProgress.connect(self.on_load_progress)
        self.web_view.loadFinished.connect(self.on_load_finished)

    def load_wechat(self):
        """加载登录页面"""
        login_url = "https://snamr.shaanxi.gov.cn:7107/login.do?method=outLogin"
        self.logger.info(f"正在加载登录页面: {login_url}")
        self.web_view.load(QUrl(login_url))
        self.lbl_status.setText("状态：正在加载登录页面...")
        # 确保 browser_controller 已初始化，便于注入 JS 助手并接收 page_loaded 信号
        if not self.browser_controller:
            try:
                self.browser_controller = BrowserController(self.web_view, self.logger)

                # 当页面加载并注入完成后，page_loaded 会被触发；在 handler 中检查 js_helpers_loaded 状态并调用 on_js_helpers_loaded
                def _page_loaded_handler(success):
                    try:
                        if success and getattr(self.browser_controller, 'js_helpers_loaded', False):
                            self.on_js_helpers_loaded()
                    except Exception as e:
                        self.logger.debug(f"page_loaded handler error: {e}")

                self.browser_controller.page_loaded.connect(_page_loaded_handler)
            except Exception as e:
                self.logger.debug(f"初始化 browser_controller 失败: {e}")

    def refresh_page(self):
        """刷新页面"""
        self.logger.info("手动刷新页面")
        self.web_view.reload()

    def get_token_from_url(self):
        """从当前URL中获取token参数"""
        current_url = self.web_view.url().toString()
        self.logger.info(f"当前URL: {current_url}")

        # 解析URL参数 - 使用简单的方法
        if 'token=' in current_url:
            try:
                # 找到token参数
                token_start = current_url.find('token=') + 6
                token_end = current_url.find('&', token_start)
                if token_end == -1:
                    token_end = len(current_url)

                token = current_url[token_start:token_end]
                self.stored_token = token
                self.logger.info(f"获取到token: {token}")
                return token
            except Exception as e:
                self.logger.error(f"解析token失败: {e}")
                return None
        else:
            self.logger.warning("URL中未找到token参数")
            return None

    def open_private_messages(self):
        """打开私信页面"""
        self.logger.info("正在打开私信页面...")

        # 首先获取token
        token = self.get_token_from_url()
        if not token:
            self.logger.error("无法获取token，请先登录微信公众平台")
            return

        # 构造私信页面URL
        private_msg_url = f"https://mp.weixin.qq.com/cgi-bin/message?t=message/list&count=20&day=7&token={token}&lang=zh_CN"

        self.logger.info(f"访问私信页面: {private_msg_url}")
        self.web_view.load(QUrl(private_msg_url))

    def start_automation(self):
        """开始自动化"""
        if self.is_automation_running:
            return

        # 检查是否已经加载了页面
        has_bc_attr = hasattr(self, 'browser_controller')
        bc_obj = getattr(self, 'browser_controller', None)
        bc_truthy = bool(bc_obj)
        js_helpers_loaded = False
        try:
            js_helpers_loaded = bool(getattr(bc_obj, 'js_helpers_loaded', False))
        except Exception as e:
            # 读取属性时可能抛错，记录调试信息
            self.logger.debug(f"检查 browser_controller.js_helpers_loaded 时出错: {e}")

        # 记录调试信息，便于判断哪个条件不满足
        self.logger.debug(
            "start_automation pre-checks: "
            f"has_browser_controller_attr={has_bc_attr}, "
            f"browser_controller_truthy={bc_truthy}, "
            f"js_helpers_loaded={js_helpers_loaded}, "
            f"browser_controller_type={type(bc_obj)}"
        )

        if not has_bc_attr or not bc_truthy or not js_helpers_loaded:
            # 详细说明哪个子条件为 False，帮助排查
            failed_conditions = []
            if not has_bc_attr:
                failed_conditions.append("no_attribute_browser_controller")
            if has_bc_attr and not bc_truthy:
                failed_conditions.append("browser_controller_is_none_or_false")
            if has_bc_attr and bc_truthy and not js_helpers_loaded:
                failed_conditions.append("js_helpers_not_loaded")

            self.logger.warning(f"无法开始自动化，未满足条件: {', '.join(failed_conditions)}")

            from PyQt5.QtWidgets import QMessageBox
            QMessageBox.warning(
                self,
                "操作提示",
                "请先点击\"加载登录页面\"按钮加载陕西省市场监管局网站，然后再开始自动化。"
            )
            return

        self.logger.info("开始自动化任务")

        # 更新UI状态
        self.btn_start.setEnabled(False)
        self.btn_stop.setEnabled(True)
        self.lbl_status.setText("状态：自动化运行中")
        self.lbl_status.setStyleSheet("font-weight: bold; color: green;")

        # 初始化浏览器控制器和自动化引擎
        if not self.browser_controller:
            self.browser_controller = BrowserController(self.web_view, self.logger)
        if not self.automation_engine:
            self.automation_engine = AutomationEngine(self.browser_controller, self.logger)

            # 连接自动化引擎信号
            self.automation_engine.automation_step_completed.connect(self.on_automation_step)
            self.automation_engine.message_processed.connect(self.on_message_processed)

        # 连接浏览器控制器信号（使用 page_loaded 信号作为代理）
        if self.browser_controller:
            try:
                # 当 page_loaded 为 True 且 js_helpers_loaded 标志为 True 时，调用 on_js_helpers_loaded
                self.browser_controller.page_loaded.connect(
                    lambda success: self.on_js_helpers_loaded() if success and getattr(self.browser_controller, 'js_helpers_loaded', False) else None
                )
            except Exception as e:
                self.logger.debug(f"连接 page_loaded 信号失败: {e}")

        # 更新配置
        self.update_config()

        # 启动自动化引擎（数据采集模式）
        config = {
            'round_interval_min': self.config['round_interval_min'],  # 每轮间隔最小时间
            'round_interval_max': self.config['round_interval_max'],  # 每轮间隔最大时间
            'page_wait_min': self.config['page_wait_min'],            # 翻页等待最小时间
            'page_wait_max': self.config['page_wait_max'],            # 翻页等待最大时间
            'max_pages': self.config['max_pages'],                    # 最大采集页数
            'confirm_actions': False  # 数据采集模式不需要确认
        }

        if self.automation_engine.start(config):
            self.is_automation_running = True
            self.btn_manual_check.setEnabled(True)
            self.lbl_status.setText("状态：数据采集运行中")
            self.automation_started.emit()
            round_min = self.config['round_interval_min']
            round_max = self.config['round_interval_max']
            if round_min == round_max:
                interval_text = f"每{round_min//60}分钟"
            else:
                interval_text = f"每{round_min//60}-{round_max//60}分钟"
            self.logger.info(f"数据采集已启动，先执行第一轮，然后{interval_text}执行后续轮次")
        else:
            self.logger.error("启动自动化引擎失败")
            self.stop_automation()

    def manual_check(self):
        """手动触发检查"""
        if not self.is_automation_running or not self.automation_engine:
            self.logger.warning("自动化未运行，无法执行手动检查")
            return

        self.logger.info("执行手动检查")
        self.automation_engine.manual_check()

    def debug_page(self):
        """调试页面元素"""
        self.logger.info("开始调试页面元素...")
        if self.browser_controller:
            self.browser_controller.debug_page_elements()
        else:
            self.logger.warning("浏览器控制器未初始化")

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
        from PyQt6.QtWidgets import QFileDialog
        from datetime import datetime

        filename, _ = QFileDialog.getSaveFileName(
            self, "保存日志", f"snamr_automation_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            "文本文件 (*.txt);;所有文件 (*)"
        )

        if filename:
            try:
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(self.log_text.toPlainText())
                self.logger.info(f"日志已保存到: {filename}")
            except Exception as e:
                self.logger.error(f"保存日志失败: {e}")

    def on_load_progress(self, progress):
        """页面加载进度"""
        if progress < 100:
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(progress)
            self.lbl_status.setText(f"状态：加载中... {progress}%")
        else:
            self.progress_bar.setVisible(False)

    def on_load_finished(self, success):
        """页面加载完成"""
        if success:
            self.lbl_status.setText("状态：页面加载完成")
            self.logger.info("登录页面加载完成")
        else:
            self.lbl_status.setText("状态：页面加载失败")
            self.logger.error("登录页面加载失败")

    def on_log_message(self, level, message, timestamp):
        """处理日志消息"""
        # 格式化日志消息
        level_colors = {
            'INFO': 'black',
            'WARNING': 'orange',
            'ERROR': 'red',
            'DEBUG': 'gray'
        }

        color = level_colors.get(level, 'black')
        formatted_message = f'[{timestamp}] [{level}] {message}'

        # 添加到日志文本框
        current_text = self.log_text.toPlainText()
        if current_text:
            current_text += '\n'
        current_text += formatted_message

        self.log_text.setPlainText(current_text)

        # 滚动到底部
        scrollbar = self.log_text.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

    def on_automation_step(self, step_name: str, success: bool, message: str):
        """处理自动化步骤完成信号"""
        status_icon = "✓" if success else "✗"
        log_level = "INFO" if success else "ERROR"
        self.logger.log_signal.emit(log_level, f"[{status_icon}] {step_name}: {message}", "")

        # 更新状态显示
        if step_name == "启动" and success:
            self.lbl_status.setText("状态：自动化运行中")
        elif step_name == "停止" and success:
            self.lbl_status.setText("状态：已停止")

    def on_message_processed(self, message_info: dict, success: bool):
        """处理消息处理信号"""
        action = message_info.get('action', 'unknown')
        session_name = message_info.get('session_name', '未知')

        if success:
            self.logger.info(f"消息处理成功 - 会话: {session_name}, 操作: {action}")
        else:
            self.logger.error(f"消息处理失败 - 会话: {session_name}, 操作: {action}")

    def on_js_helpers_loaded(self):
        """处理JavaScript助手脚本加载完成信号"""
        self.lbl_js_status.setText("JS: 已加载")
        self.lbl_js_status.setStyleSheet("color: green;")
        self.logger.info("JavaScript助手脚本加载完成，可以开始自动化了")

    def closeEvent(self, event):
        """窗口关闭事件"""
        if self.is_automation_running:
            self.stop_automation()
        self.logger.info("应用程序窗口关闭")
        event.accept()
