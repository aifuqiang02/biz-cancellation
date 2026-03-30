#!/usr/bin/env python3
"""
日志记录器
提供统一的日志接口，支持同时输出到控制台、文件和UI界面
"""

import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional
from PyQt5.QtCore import QObject, pyqtSignal


class Logger(QObject):
    """日志记录器类"""

    # 信号定义 - 用于发送日志消息到UI
    log_signal = pyqtSignal(str, str, str)  # level, message, timestamp

    def __init__(self, log_file: Optional[str] = None, log_level: str = "INFO"):
        super().__init__()

        # 设置日志级别映射
        self.level_mapping = {
            'DEBUG': logging.DEBUG,
            'INFO': logging.INFO,
            'WARNING': logging.WARNING,
            'ERROR': logging.ERROR,
            'CRITICAL': logging.CRITICAL
        }

        # 获取日志级别
        self.log_level = self.level_mapping.get(log_level.upper(), logging.INFO)

        # 设置日志文件路径
        if log_file is None:
            # 默认日志文件路径
            log_dir = Path(__file__).parent.parent / "logs"
            log_dir.mkdir(exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = str(log_dir / f"wechat_automation_{timestamp}.log")

        self.log_file = log_file

        # 设置Python标准日志记录器
        self._setup_standard_logger()

        # 初始化日志
        self.info("日志系统初始化完成")
        self.info(f"日志文件: {self.log_file}")

    def _setup_standard_logger(self):
        """设置Python标准日志记录器"""
        # 创建日志记录器
        self.std_logger = logging.getLogger('wechat_automation')
        self.std_logger.setLevel(self.log_level)

        # 移除所有现有的处理器
        for handler in self.std_logger.handlers[:]:
            self.std_logger.removeHandler(handler)

        # 创建格式化器
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

        # 控制台处理器
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(self.log_level)
        console_handler.setFormatter(formatter)
        self.std_logger.addHandler(console_handler)

        # 文件处理器
        try:
            file_handler = logging.FileHandler(self.log_file, encoding='utf-8')
            file_handler.setLevel(self.log_level)
            file_handler.setFormatter(formatter)
            self.std_logger.addHandler(file_handler)
        except Exception as e:
            print(f"创建日志文件失败: {e}")

    def _log(self, level: str, message: str, *args, **kwargs):
        """内部日志方法"""
        # 获取当前时间戳
        timestamp = datetime.now().strftime('%H:%M:%S')

        # 发送信号到UI
        self.log_signal.emit(level, message, timestamp)

        # 使用标准日志记录器记录
        log_method = getattr(self.std_logger, level.lower(), self.std_logger.info)
        log_method(message, *args, **kwargs)

    def debug(self, message: str, *args, **kwargs):
        """记录调试信息"""
        self._log('DEBUG', message, *args, **kwargs)

    def info(self, message: str, *args, **kwargs):
        """记录信息"""
        self._log('INFO', message, *args, **kwargs)

    def warning(self, message: str, *args, **kwargs):
        """记录警告信息"""
        self._log('WARNING', message, *args, **kwargs)

    def error(self, message: str, *args, **kwargs):
        """记录错误信息"""
        self._log('ERROR', message, *args, **kwargs)

    def critical(self, message: str, *args, **kwargs):
        """记录严重错误信息"""
        self._log('CRITICAL', message, *args, **kwargs)

    def exception(self, message: str, *args, **kwargs):
        """记录异常信息"""
        self.error(f"{message} - 异常详情: {str(sys.exc_info()[1])}", *args, **kwargs)

    def log_performance(self, operation: str, duration: float, success: bool = True):
        """记录性能信息"""
        status = "成功" if success else "失败"
        message = f"操作 '{operation}' {status}, 耗时: {duration:.2f}秒"
        if success:
            self.info(message)
        else:
            self.warning(message)

    def log_stats(self, stats: dict):
        """记录统计信息"""
        message = "统计信息: " + ", ".join([f"{k}: {v}" for k, v in stats.items()])
        self.info(message)

    def log_message_processing(self, message_info: dict, action: str, success: bool):
        """记录消息处理日志"""
        sender = message_info.get('sender', '未知')
        text_preview = message_info.get('text', '')[:50]
        status = "成功" if success else "失败"

        message = f"消息处理 - 发送者: {sender}, 内容: '{text_preview}...', 操作: {action}, 状态: {status}"
        if success:
            self.info(message)
        else:
            self.error(message)

    def get_log_file_path(self) -> str:
        """获取日志文件路径"""
        return self.log_file

    def rotate_log_file(self) -> str:
        """轮换日志文件"""
        # 创建新的日志文件路径
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_log_file = str(Path(self.log_file).parent / f"wechat_automation_{timestamp}.log")

        # 重新设置文件处理器
        for handler in self.std_logger.handlers[:]:
            if isinstance(handler, logging.FileHandler):
                self.std_logger.removeHandler(handler)

        try:
            file_handler = logging.FileHandler(new_log_file, encoding='utf-8')
            file_handler.setLevel(self.log_level)
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            file_handler.setFormatter(formatter)
            self.std_logger.addHandler(file_handler)

            old_file = self.log_file
            self.log_file = new_log_file

            self.info(f"日志文件已轮换: {old_file} -> {new_log_file}")
            return new_log_file

        except Exception as e:
            self.error(f"轮换日志文件失败: {e}")
            return self.log_file
