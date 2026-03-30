#!/usr/bin/env python3
"""
自动加微信好友 - Tab 页面
使用 wxautox 库自动添加微信好友
"""

import sys
import os
import json
import random
import time
import requests
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any

from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QTextEdit, QPushButton, QLabel, QProgressBar,
    QGroupBox, QLineEdit, QSpinBox, QTimeEdit,
    QMessageBox
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QTime
from PyQt5.QtGui import QFont, QPalette, QColor

from app.logger import Logger


# API 配置
API_BASE_URL = "http://localhost:1007"
API_GET_PENDING = f"{API_BASE_URL}/api/wechat-friend/pending"
API_UPDATE_STATUS = f"{API_BASE_URL}/api/wechat-friend/status"

# 默认配置
DEFAULT_CONFIG = {
    'add_message': '陕西营业执照注销咨询',
    'permission': '朋友圈',
    'work_start_time': '08:00',
    'work_end_time': '22:00',
    'min_interval': 40,  # 最小间隔（分钟）
    'max_interval': 80,  # 最大间隔（分钟）
    'license_key': 'ddYLEeDbz432owZLyaO502zjEz8lb7ReLDi4LiRcP2K'
}


class AutoFriendTab(QWidget):
    """自动加微信好友标签页"""
    
    # 信号定义
    automation_started = pyqtSignal()
    automation_stopped = pyqtSignal()
    
    def __init__(self, parent_logger: Optional[Logger] = None):
        super().__init__()
        
        # 创建独立的日志记录器
        log_dir = Path(__file__).parent.parent / "logs" / "auto_friend"
        log_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = str(log_dir / f"auto_friend_{timestamp}.log")
        self.logger = Logger(log_file=log_file)
        
        # 初始化变量
        self.wx = None
        self.is_running = False
        self.is_connected = False
        self.next_add_time = None
        self.wxautox_activated = False  # 激活状态标志
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.check_and_add_friend)
        self.connect_thread = None  # 连接微信的后台线程
        
        # 配置
        self.config = DEFAULT_CONFIG.copy()
        
        self.init_ui()
        self.init_connections()
        self.logger.info("自动加好友标签页初始化完成")
    
    def init_ui(self):
        """初始化UI"""
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(10)
        main_layout.setContentsMargins(10, 10, 10, 10)
        
        # ===== 顶部：微信连接状态 =====
        connection_group = QGroupBox("微信连接")
        connection_layout = QHBoxLayout(connection_group)
        
        self.lbl_connection_status = QLabel("状态：未连接")
        self.lbl_connection_status.setStyleSheet("font-weight: bold; color: red;")
        connection_layout.addWidget(self.lbl_connection_status)
        
        connection_layout.addSpacing(20)
        
        connection_layout.addWidget(QLabel("激活码:"))
        self.edit_license = QLineEdit(self.config['license_key'])
        self.edit_license.setMaximumWidth(250)
        connection_layout.addWidget(self.edit_license)
        
        connection_layout.addStretch()
        
        self.btn_connect = QPushButton("连接微信")
        self.btn_connect.setStyleSheet("QPushButton { background-color: #2196F3; color: white; padding: 6px 12px; font-weight: bold; }")
        connection_layout.addWidget(self.btn_connect)
        
        self.btn_disconnect = QPushButton("断开连接")
        self.btn_disconnect.setEnabled(False)
        connection_layout.addWidget(self.btn_disconnect)
        
        main_layout.addWidget(connection_group)
        
        # ===== 中间：控制面板和配置 =====
        middle_widget = QWidget()
        middle_layout = QHBoxLayout(middle_widget)
        middle_layout.setContentsMargins(0, 0, 0, 0)
        
        # 左侧：控制面板
        control_group = QGroupBox("控制面板")
        control_layout = QVBoxLayout(control_group)
        
        # 状态显示
        status_widget = QWidget()
        status_layout = QHBoxLayout(status_widget)
        status_layout.setContentsMargins(0, 0, 0, 0)
        
        self.lbl_status = QLabel("状态：未启动")
        self.lbl_status.setStyleSheet("font-weight: bold; color: orange;")
        status_layout.addWidget(self.lbl_status)
        
        status_layout.addStretch()
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(150)
        status_layout.addWidget(self.progress_bar)
        
        control_layout.addWidget(status_widget)
        
        # 控制按钮
        buttons_layout = QHBoxLayout()
        
        self.btn_start = QPushButton("开始加好友")
        self.btn_start.setStyleSheet("QPushButton { background-color: #4CAF50; color: white; padding: 6px 12px; font-weight: bold; }")
        self.btn_start.setEnabled(False)
        buttons_layout.addWidget(self.btn_start)
        
        self.btn_stop = QPushButton("停止")
        self.btn_stop.setStyleSheet("QPushButton { background-color: #f44336; color: white; padding: 6px 12px; font-weight: bold; }")
        self.btn_stop.setEnabled(False)
        buttons_layout.addWidget(self.btn_stop)
        
        self.btn_test_add = QPushButton("测试添加好友")
        self.btn_test_add.setStyleSheet("QPushButton { background-color: #FF9800; color: white; padding: 6px 12px; font-weight: bold; }")
        self.btn_test_add.setEnabled(False)
        buttons_layout.addWidget(self.btn_test_add)
        
        buttons_layout.addStretch()
        control_layout.addLayout(buttons_layout)
        
        # 统计信息
        stats_group = QGroupBox("统计信息")
        stats_layout = QGridLayout(stats_group)
        
        stats_layout.addWidget(QLabel("今日已加:"), 0, 0)
        self.lbl_today_count = QLabel("0")
        self.lbl_today_count.setStyleSheet("font-weight: bold; color: green;")
        stats_layout.addWidget(self.lbl_today_count, 0, 1)
        
        stats_layout.addWidget(QLabel("下次添加:"), 1, 0)
        self.lbl_next_time = QLabel("--:--")
        self.lbl_next_time.setStyleSheet("font-weight: bold; color: blue;")
        stats_layout.addWidget(self.lbl_next_time, 1, 1)
        
        stats_layout.addWidget(QLabel("剩余待加:"), 2, 0)
        self.lbl_remaining = QLabel("--")
        self.lbl_remaining.setStyleSheet("font-weight: bold;")
        stats_layout.addWidget(self.lbl_remaining, 2, 1)
        
        control_layout.addWidget(stats_group)
        control_layout.addStretch()
        
        middle_layout.addWidget(control_group)
        
        # 右侧：配置区域
        config_group = QGroupBox("配置选项")
        config_layout = QVBoxLayout(config_group)
        
        # 附加消息
        msg_layout = QHBoxLayout()
        msg_layout.addWidget(QLabel("附加消息:"))
        self.edit_message = QLineEdit(self.config['add_message'])
        config_layout.addLayout(msg_layout)
        config_layout.addWidget(self.edit_message)
        
        # 权限设置
        perm_layout = QHBoxLayout()
        perm_layout.addWidget(QLabel("权限设置:"))
        self.edit_permission = QLineEdit(self.config['permission'])
        self.edit_permission.setMaximumWidth(100)
        perm_layout.addWidget(self.edit_permission)
        perm_layout.addStretch()
        config_layout.addLayout(perm_layout)
        
        # 工作时间
        time_layout = QHBoxLayout()
        time_layout.addWidget(QLabel("工作时间:"))
        
        self.time_start = QTimeEdit()
        self.time_start.setTime(QTime.fromString(self.config['work_start_time'], 'HH:mm'))
        self.time_start.setDisplayFormat('HH:mm')
        time_layout.addWidget(self.time_start)
        
        time_layout.addWidget(QLabel("-"))
        
        self.time_end = QTimeEdit()
        self.time_end.setTime(QTime.fromString(self.config['work_end_time'], 'HH:mm'))
        self.time_end.setDisplayFormat('HH:mm')
        time_layout.addWidget(self.time_end)
        
        time_layout.addStretch()
        config_layout.addLayout(time_layout)
        
        # 间隔时间
        interval_layout = QHBoxLayout()
        interval_layout.addWidget(QLabel("间隔时间:"))
        
        self.spin_min_interval = QSpinBox()
        self.spin_min_interval.setRange(10, 180)
        self.spin_min_interval.setValue(self.config['min_interval'])
        self.spin_min_interval.setSuffix(" 分钟")
        interval_layout.addWidget(self.spin_min_interval)
        
        interval_layout.addWidget(QLabel("-"))
        
        self.spin_max_interval = QSpinBox()
        self.spin_max_interval.setRange(10, 180)
        self.spin_max_interval.setValue(self.config['max_interval'])
        self.spin_max_interval.setSuffix(" 分钟")
        interval_layout.addWidget(self.spin_max_interval)
        
        interval_layout.addStretch()
        config_layout.addLayout(interval_layout)
        
        config_layout.addStretch()
        middle_layout.addWidget(config_group)
        
        main_layout.addWidget(middle_widget)
        
        # ===== 底部：操作日志 =====
        log_group = QGroupBox("操作日志")
        log_layout = QVBoxLayout(log_group)
        
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setFont(QFont("Consolas", 9))
        
        palette = self.log_text.palette()
        palette.setColor(QPalette.ColorRole.Base, QColor("#f8f8f8"))
        self.log_text.setPalette(palette)
        
        log_layout.addWidget(self.log_text)
        
        # 日志控制按钮
        log_controls = QWidget()
        log_controls_layout = QHBoxLayout(log_controls)
        log_controls_layout.setContentsMargins(0, 0, 0, 0)
        
        self.btn_clear_log = QPushButton("清空日志")
        self.btn_clear_log.setMaximumWidth(100)
        log_controls_layout.addWidget(self.btn_clear_log)
        
        self.btn_save_log = QPushButton("保存日志")
        self.btn_save_log.setMaximumWidth(100)
        log_controls_layout.addWidget(self.btn_save_log)
        
        log_controls_layout.addStretch()
        log_layout.addWidget(log_controls)
        
        main_layout.addWidget(log_group)
        
        # 连接日志信号
        self.logger.log_signal.connect(self.on_log_message)
    
    def init_connections(self):
        """初始化信号连接"""
        # 微信连接
        self.btn_connect.clicked.connect(self.connect_wechat)
        self.btn_disconnect.clicked.connect(self.disconnect_wechat)
        
        # 自动化控制
        self.btn_start.clicked.connect(self.start_adding_friends)
        self.btn_stop.clicked.connect(self.stop_adding_friends)
        self.btn_test_add.clicked.connect(self.test_add_friend)
        
        # 日志控制
        self.btn_clear_log.clicked.connect(self.clear_log)
        self.btn_save_log.clicked.connect(self.save_log)
    
    def on_log_message(self, level: str, message: str, timestamp: str):
        """处理日志消息"""
        color_map = {
            'DEBUG': '#666666',
            'INFO': '#000000',
            'WARNING': '#FF8C00',
            'ERROR': '#FF0000',
            'CRITICAL': '#8B0000'
        }
        color = color_map.get(level, '#000000')
        
        log_entry = f'[{timestamp}] [{level}] {message}'
        self.log_text.append(f'<span style="color: {color};">{log_entry}</span>')
        
        scrollbar = self.log_text.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())
    
    def connect_wechat(self):
        """连接微信 - 通过调用外部脚本"""
        if hasattr(self, 'wx') and self.wx is not None and self.is_connected:
            self.logger.warning("微信已经连接")
            return
        
        self.logger.info("正在连接微信...")
        self.btn_connect.setEnabled(False)
        
        # 只在未激活时激活 wxautox4
        license_key = self.edit_license.text().strip()
        if license_key and not self.wxautox_activated:
            self.logger.info("正在激活 wxautox4...")
            import subprocess
            try:
                result = subprocess.run(
                    ['wxautox4', '-a', license_key],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='ignore'
                )
                if result.returncode == 0:
                    self.logger.info("激活成功")
                    self.wxautox_activated = True
            except Exception as e:
                self.logger.warning(f"激活过程出错: {e}，尝试继续...")
        
        # 调用外部脚本连接微信
        self.logger.info("正在启动连接脚本...")
        script_path = os.path.join(os.path.dirname(__file__), '..', 'connect_wechat.py')
        script_path = os.path.abspath(script_path)
        
        try:
            result = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=30
            )
            
            # 解析输出
            output = result.stdout + result.stderr
            
            # 查找 RESULT 行
            for line in output.split('\n'):
                if line.startswith('RESULT:'):
                    json_str = line[7:].strip()  # 跳过 "RESULT:" 并去除空格
                    try:
                        data = json.loads(json_str)
                        if data['success']:
                            self.logger.info(f"微信连接成功! 昵称: {data['nickname']}")
                            self._on_wechat_connect_success(data['nickname'])
                            return
                        else:
                            self.logger.error(f"连接失败: {data['error']}")
                            self._on_wechat_connect_error(data['error'])
                            return
                    except Exception as e:
                        self.logger.error(f"解析失败: {e}, json_str: '{json_str}'")
            
            # 如果没找到 RESULT
            self.logger.error(f"未找到结果: {output}")
            self._on_wechat_connect_error(output)
                
        except subprocess.TimeoutExpired:
            self.logger.error("连接超时")
            self._on_wechat_connect_error("连接超时")
        except Exception as e:
            self.logger.error(f"调用连接脚本失败: {e}")
            self._on_wechat_connect_error(str(e))
    
    def _on_wechat_connect_success(self, current_user):
        """连接成功回调 - current_user 是昵称字符串"""
        self.wx = None  # 外部脚本创建的，无法直接使用
        self.is_connected = True
        self.lbl_connection_status.setText(f"状态：已连接 ({current_user})")
        self.lbl_connection_status.setStyleSheet("font-weight: bold; color: green;")
        self.btn_disconnect.setEnabled(True)
        self.btn_start.setEnabled(True)
        self.btn_test_add.setEnabled(True)
        self.logger.info("===== 微信连接成功 =====")
        QMessageBox.information(self, "成功", f"微信连接成功！\n当前用户: {current_user}")
    
    def _on_wechat_connect_error(self, error_msg):
        """连接失败回调"""
        self.logger.error(f"连接微信失败: {error_msg}")
        self.btn_connect.setEnabled(True)
        QMessageBox.critical(self, "错误", f"连接微信失败:\n{error_msg}")
    
    def disconnect_wechat(self):
        """断开微信连接"""
        self.logger.info("断开微信连接")
        self.wx = None
        self.is_connected = False
        
        self.lbl_connection_status.setText("状态：未连接")
        self.lbl_connection_status.setStyleSheet("font-weight: bold; color: red;")
        
        self.btn_connect.setEnabled(True)
        self.btn_disconnect.setEnabled(False)
        self.btn_start.setEnabled(False)
        self.btn_test_add.setEnabled(False)
        
        if self.is_running:
            self.stop_adding_friends()
    
    def start_adding_friends(self):
        """开始自动加好友"""
        if not self.is_connected:
            self.logger.error("微信未连接，无法开始")
            return
        
        if self.is_running:
            return
        
        self.logger.info("=" * 50)
        self.logger.info("开始自动加好友任务")
        self.logger.info(f"工作时间: {self.time_start.time().toString('HH:mm')} - {self.time_end.time().toString('HH:mm')}")
        self.logger.info(f"间隔时间: {self.spin_min_interval.value()}-{self.spin_max_interval.value()} 分钟")
        self.logger.info("=" * 50)
        
        self.is_running = True
        self.btn_start.setEnabled(False)
        self.btn_stop.setEnabled(True)
        self.lbl_status.setText("状态：运行中")
        self.lbl_status.setStyleSheet("font-weight: bold; color: green;")
        
        self.automation_started.emit()
        
        # 立即执行一次
        self.check_and_add_friend()
    
    def test_add_friend(self):
        """测试添加好友"""
        if not self.is_connected:
            self.logger.error("微信未连接，无法测试")
            QMessageBox.warning(self, "警告", "请先连接微信")
            return
        
        self.logger.info("=" * 50)
        self.logger.info("【测试模式】开始测试添加好友")
        
        # 创建测试用户数据
        test_user = {
            'id': 'test-user-001',
            'companyName': '测试公司',
            'legalRepresentativeName': '测试用户',
            'legalRepresentativePhone': '18392447939',
            'registrationTime': None
        }
        
        self.logger.info(f"测试用户: {test_user['legalRepresentativeName']}")
        self.logger.info(f"测试手机号: {test_user['legalRepresentativePhone']}")
        
        # 调用添加好友
        success, error_message = self.add_friend_with_details(test_user)
        
        if success:
            self.logger.info("【测试模式】添加好友成功！")
            QMessageBox.information(self, "测试结果", "添加好友成功！\n\n请检查微信是否收到添加好友请求。")
        else:
            self.logger.error(f"【测试模式】添加好友失败: {error_message}")
            QMessageBox.warning(self, "测试结果", f"添加好友失败:\n{error_message}")
        
        self.logger.info("=" * 50)
    
    def stop_adding_friends(self):
        """停止自动加好友"""
        if not self.is_running:
            return
        
        self.logger.info("停止自动加好友任务")
        
        self.is_running = False
        self.timer.stop()
        
        self.btn_start.setEnabled(True)
        self.btn_stop.setEnabled(False)
        self.lbl_status.setText("状态：已停止")
        self.lbl_status.setStyleSheet("font-weight: bold; color: orange;")
        
        self.lbl_next_time.setText("--:--")
        
        self.automation_stopped.emit()
    
    def check_and_add_friend(self):
        """检查时间并添加好友"""
        if not self.is_running:
            return
        
        try:
            # 检查是否在工作时间
            current_time = QTime.currentTime()
            start_time = self.time_start.time()
            end_time = self.time_end.time()
            
            if current_time < start_time or current_time > end_time:
                self.logger.info(f"当前时间 {current_time.toString('HH:mm')} 不在工作时间，等待...")
                # 设置定时器，明天工作时间再试
                self.schedule_next_check(60)  # 1小时后重试
                return
            
            # 获取待添加用户
            self.logger.info("正在获取待添加用户...")
            user = self.get_pending_user()
            
            if not user:
                self.logger.info("没有待添加的用户，10分钟后重试")
                self.schedule_next_check(10)
                return
            
            # 添加好友
            self.logger.info(f"准备添加好友: {user.get('legalRepresentativeName', '未知')} ({user.get('legalRepresentativePhone', '')})")
            success, error_message = self.add_friend_with_details(user)

            # 更新状态
            if success:
                self.logger.info("添加好友成功")
                self.mark_user_status(user['id'], 'invited')
            else:
                # 根据错误类型设置不同状态
                if error_message and ('无法找到该用户' in error_message or '不存在' in error_message):
                    self.logger.error(f"添加好友失败 - 用户不存在: {error_message}")
                    self.mark_user_status(user['id'], 'not_found', error_message)
                else:
                    self.logger.error(f"添加好友失败: {error_message or '未知错误'}")
                    self.mark_user_status(user['id'], 'failed', error_message)
            
            # 更新统计
            self.update_stats()
            
            # 安排下次添加
            interval = random.randint(
                self.spin_min_interval.value(),
                self.spin_max_interval.value()
            )
            self.schedule_next_check(interval)
            
        except Exception as e:
            self.logger.error(f"添加好友过程出错: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            # 出错后继续，但间隔短一些
            self.schedule_next_check(5)
    
    def get_pending_user(self) -> Optional[Dict[str, Any]]:
        """从API获取一个待添加的用户"""
        try:
            response = requests.get(API_GET_PENDING, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 200:
                    user = data.get('data')
                    if user:
                        return user
            self.logger.warning(f"获取待添加用户失败: {response.text}")
            return None
        except Exception as e:
            self.logger.error(f"调用API获取用户失败: {e}")
            return None
    
    def add_friend_with_details(self, user: Dict[str, Any]) -> tuple[bool, str]:
        """通过外部脚本添加好友"""
        try:
            phone = user.get('legalRepresentativePhone', '')
            name = user.get('legalRepresentativeName', '未知')
            company = user.get('companyName', '未知')
            
            if not phone:
                self.logger.error("用户手机号为空")
                return False, "用户手机号为空"
            
            message = self.edit_message.text().strip()
            
            self.logger.info("=" * 50)
            self.logger.info(f"开始添加好友流程")
            self.logger.info(f"用户姓名: {name}")
            self.logger.info(f"公司名称: {company}")
            self.logger.info(f"手机号: {phone}")
            self.logger.info(f"附加消息: {message}")
            self.logger.info("=" * 50)
            
            # 调用外部脚本添加好友
            script_path = os.path.join(os.path.dirname(__file__), '..', 'add_friend.py')
            script_path = os.path.abspath(script_path)
            
            self.logger.info(f"[Step 1] 调用添加好友脚本，手机号: {phone}")
            
            result = subprocess.run(
                [sys.executable, script_path, phone, name, message],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=30
            )
            
            # 解析输出
            output = result.stdout + result.stderr
            
            for line in output.split('\n'):
                if line.startswith('RESULT:'):
                    json_str = line[7:].strip()
                    try:
                        data = json.loads(json_str)
                        if data['success']:
                            self.logger.info(f"添加成功: {data['result']}")
                            return True, ""
                        else:
                            self.logger.error(f"添加失败: {data['error']}")
                            return False, data['error']
                    except Exception as e:
                        self.logger.error(f"解析失败: {e}")
            
            self.logger.error(f"未找到结果: {output}")
            return False, output
            
        except subprocess.TimeoutExpired:
            self.logger.error("添加好友超时")
            return False, "添加好友超时"
        except Exception as e:
            self.logger.error(f"添加好友失败: {e}")
            return False, str(e)
        
        # 兜底返回（理论上不会执行到这里）
        return False, "未知错误"
    
    def mark_user_status(self, user_id: str, status: str, message: Optional[str] = None):
        """标记用户加好友状态"""
        try:
            data = {
                'id': user_id,
                'status': status,
                'message': message if message else self.edit_message.text().strip()
            }
            
            response = requests.post(API_UPDATE_STATUS, json=data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if result.get('code') == 200:
                    self.logger.info(f"用户状态已更新为: {status}")
                else:
                    self.logger.warning(f"更新状态失败: {result.get('message')}")
            else:
                self.logger.warning(f"更新状态请求失败: {response.status_code}")
        except Exception as e:
            self.logger.error(f"调用API更新状态失败: {e}")
    
    def schedule_next_check(self, minutes: int):
        """安排下次检查"""
        if not self.is_running:
            return
        
        self.next_add_time = datetime.now() + timedelta(minutes=minutes)
        self.lbl_next_time.setText(self.next_add_time.strftime('%H:%M'))
        
        self.logger.info(f"下次添加时间: {self.next_add_time.strftime('%Y-%m-%d %H:%M')} ({minutes}分钟后)")
        
        # 设置定时器（转换为毫秒）
        self.timer.stop()
        self.timer.singleShot(minutes * 60 * 1000, self.check_and_add_friend)
    
    def update_stats(self):
        """更新统计信息"""
        try:
            # 获取统计
            response = requests.get(f"{API_BASE_URL}/api/wechat-friend/stats", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 200:
                    stats = data.get('data', {})
                    invited = stats.get('invited', 0)
                    added = stats.get('added', 0)
                    pending = stats.get('pending', 0)
                    
                    # 今日已加（invited + added）
                    today_count = invited + added
                    self.lbl_today_count.setText(str(today_count))
                    
                    # 剩余待加
                    self.lbl_remaining.setText(str(pending))
        except Exception as e:
            self.logger.debug(f"更新统计失败: {e}")
    
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
            f"auto_friend_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            "Text Files (*.txt);;All Files (*.*)"
        )
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(self.log_text.toPlainText())
                self.logger.info(f"日志已保存到: {file_path}")
            except Exception as e:
                self.logger.error(f"保存日志失败: {e}")
    
    def stop_automation(self):
        """供外部调用的停止方法"""
        if self.is_running:
            self.stop_adding_friends()