#!/usr/bin/env python3
"""
自动化引擎
实现定时刷新、消息检测、自动回复和会话删除的自动化逻辑
"""

import random
import time
from typing import Dict, Any, Optional, Callable
from PyQt5.QtCore import QTimer, QObject, pyqtSignal

from app.browser_controller import BrowserController
from app.logger import Logger
from app.ai_detector import IntentDetector


class AutomationEngine(QObject):
    """自动化引擎类"""

    # 信号定义
    automation_step_completed = pyqtSignal(str, bool, str)  # 步骤名, 成功, 消息
    message_processed = pyqtSignal(dict, bool)  # 消息信息, 处理结果

    def __init__(self, browser_controller: BrowserController, logger: Logger):
        super().__init__()
        self.browser = browser_controller
        self.logger = logger
        self.is_running = False
        self.refresh_timer: Optional[QTimer] = None
        self.ai_detector = IntentDetector(logger)
        
        # AI分析状态
        self.is_analyzing = False

        # 配置
        self.config = {
            'refresh_interval_min': 30,
            'refresh_interval_max': 60,
            'keyword': '注销',
            'auto_reply_text': '一、自己注销，您可以通过下面地址注销https://snamr.shaanxi.gov.cn:7107/login.do?method=outLogin，这是省局系统，这边只提供注销入口。详细操作自行研究。\n\n二、如果不太擅长电脑相关的，不知道流程的，也可以代办，服务费200 ， 您可以加微信 18392447939',
            'confirm_actions': True
        }

        # 统计信息
        self.stats = {
            'total_checks': 0,
            'messages_found': 0,
            'messages_processed': 0,
            'sessions_deleted': 0,
            'errors': 0
        }

    def start(self, config: Dict[str, Any]) -> bool:
        """开始自动化"""
        if self.is_running:
            self.logger.warning("自动化已经在运行中")
            return False

        try:
            # 更新配置
            self.config.update(config)
            self.logger.info(f"启动自动化，配置: {self.config}")

            # 重置统计信息
            self.stats = {
                'total_checks': 0,
                'messages_found': 0,
                'messages_processed': 0,
                'sessions_deleted': 0,
                'errors': 0
            }

            self.is_running = True

            # 立即开始第一次检查（不要等待）
            self.logger.info("自动化已启动，立即开始第一次检查...")
            QTimer.singleShot(1000, self._perform_check)

            self.automation_step_completed.emit("启动", True, "自动化已启动")
            return True

        except Exception as e:
            self.logger.error(f"启动自动化失败: {e}")
            self.automation_step_completed.emit("启动", False, f"启动失败: {e}")
            return False

    def stop(self) -> bool:
        """停止自动化"""
        if not self.is_running:
            self.logger.info("自动化已停止")
            return True

        try:
            self.is_running = False

            if self.refresh_timer:
                self.refresh_timer.stop()
                self.refresh_timer = None

            self.logger.info("自动化已停止")
            self.automation_step_completed.emit("停止", True, "自动化已停止")
            return True

        except Exception as e:
            self.logger.error(f"停止自动化失败: {e}")
            return False

    def update_config(self, config: Dict[str, Any]) -> None:
        """更新配置"""
        self.config.update(config)
        self.logger.info(f"配置已更新: {config}")

    def get_stats(self) -> Dict[str, int]:
        """获取统计信息"""
        return self.stats.copy()

    def _execute_automation_flow(self) -> None:
        """执行完整的自动化流程"""
        # 0. 刷新页面
        self._refresh_page_and_start_flow()

    def _refresh_page_and_start_flow(self) -> None:
        """刷新页面并开始流程"""
        def on_refresh_complete(success: bool):
            if success:
                self.logger.info("页面刷新完成，开始检查用户会话")
                # 等待页面稳定和元素加载
                QTimer.singleShot(3000, self._check_user_conversations)
            else:
                self.logger.error("页面刷新失败")
                self.stats['errors'] += 1
                self._schedule_next_check()

        # 断开之前的连接，避免重复调用
        try:
            self.browser.page_loaded.disconnect()
        except:
            pass  # 如果没有连接，忽略错误

        # 执行页面刷新
        self.browser.refresh_page()
        self.browser.page_loaded.connect(lambda success: on_refresh_complete(success))

    def _check_user_conversations(self) -> None:
        """1. 检查用户会话列表"""
        self.logger.info("正在检查用户会话列表...")

        # 先调试页面元素，帮助诊断问题
        self.browser.execute_custom_js("window.MessageHelpers.debugPageElements()")

        def on_users_received(users):
            try:
                self.logger.debug(f"Received users data: {users}")
                if users is None:
                    self.logger.warning("Users list is None, converting to empty list")
                    users = []
                self.logger.info(f"找到 {len(users)} 个用户会话")

                if users and len(users) > 0:
                    # 2. 点击第一个用户会话
                    self._click_first_conversation()
                else:
                    self.logger.info("没有用户会话，等待下次检查")
                    self._schedule_next_check()

            except Exception as e:
                self.logger.error(f"处理用户会话失败: {e}")
                self.stats['errors'] += 1
                self._schedule_next_check()

        # 获取用户会话列表
        self.browser.execute_custom_js("window.MessageHelpers.getPrivateMessageUserList()", on_users_received)

    def _click_first_conversation(self) -> None:
        """2. 点击第一个用户会话"""
        def on_click_result(success: bool):
            try:
                if success:
                    self.logger.info("成功点击第一个用户会话")
                    # 等待消息加载
                    QTimer.singleShot(2000, self._check_message_content)
                else:
                    self.logger.info("点击用户会话失败（可忽略，第一个会话默认选中）")
                    # 即使点击失败也继续检查消息内容，因为第一个会话默认就是选中的
                    QTimer.singleShot(1000, self._check_message_content)

            except Exception as e:
                self.logger.error(f"处理点击结果失败: {e}")
                self.stats['errors'] += 1
                self._schedule_next_check()

        # 点击第一个用户会话
        self.browser.execute_custom_js("window.MessageHelpers.clickFirstUserConversation()", on_click_result)

    def _check_message_content(self) -> None:
        """3. 检查消息内容是否包含注销（使用AI意图检测）"""
        self.logger.info("===== 开始AI意图检测流程 =====")
        self.logger.info("步骤1: 获取用户消息文本...")
        
        def on_messages_received(messages_text):
            try:
                if not messages_text:
                    self.logger.info("未获取到用户消息文本，直接删除会话")
                    QTimer.singleShot(4000, self._delete_conversation)
                    return
                
                self.logger.info(f"获取到用户消息，长度: {len(messages_text)} 字符")
                self.logger.debug(f"消息内容: {messages_text[:300]}...")
                
                # 设置AI分析状态
                self.is_analyzing = True
                self.automation_step_completed.emit("AI分析", True, "正在进行AI意图分析...")
                
                # 使用QTimer异步执行AI检测，避免阻塞UI
                QTimer.singleShot(100, lambda: self._analyze_intent_with_ai(messages_text))
                
            except Exception as e:
                self.logger.error(f"处理用户消息失败: {e}")
                self.stats['errors'] += 1
                self._schedule_next_check()
        
        # 获取用户消息文本
        self.browser.execute_custom_js("window.MessageHelpers.getUserMessagesText()", on_messages_received)
    
    def _analyze_intent_with_ai(self, messages_text: str) -> None:
        """使用AI分析用户意图"""
        try:
            self.logger.info("步骤2: 调用AI意图检测...")
            self.logger.debug(f"发送给AI的消息内容: {messages_text[:300]}...")
            
            # 调用AI检测
            has_intent = self.ai_detector.detect_cancel_intent(messages_text)
            
            # 清除AI分析状态
            self.is_analyzing = False
            
            if has_intent:
                self.logger.info("步骤3: AI分析完成，用户有注销意向 -> 准备发送自动回复")
                self.automation_step_completed.emit("AI分析", True, "用户有注销意向，准备回复")
                self._send_reply()
            else:
                self.logger.info("步骤3: AI分析完成，用户无注销意向 -> 准备删除会话")
                self.automation_step_completed.emit("AI分析", True, "用户无注销意向，删除会话")
                QTimer.singleShot(4000, self._delete_conversation)
                
        except Exception as e:
            # AI检测失败，清除状态并抛出异常（不降级）
            self.is_analyzing = False
            error_msg = f"AI意图检测失败: {str(e)}"
            self.logger.error(f"===== {error_msg} =====")
            self.logger.error("按照配置要求，不进行降级处理，流程终止")
            self.automation_step_completed.emit("AI分析", False, error_msg)
            self.stats['errors'] += 1
            
            # 发送错误信号给UI层
            self.message_processed.emit(
                {"error": error_msg, "messages": messages_text},
                False
            )
            
            # 不自动恢复，让用户手动处理错误
            # self._schedule_next_check()  # 不调用，等待用户操作

    def _send_reply(self) -> None:
        """4. 发送回复内容"""
        reply_text = self.config['auto_reply_text']
        
        self.logger.info("===== 发送自动回复 =====")
        self.logger.debug(f"回复内容: {reply_text[:100]}...")
        self.logger.info(f"回复内容长度: {len(reply_text)} 字符")

        def on_reply_result(success: bool):
            try:
                if success:
                    self.logger.info("✓ JavaScript返回: 回复发送成功")
                    self.stats['messages_processed'] += 1
                    self.logger.info(f"统计更新: 已处理消息数 = {self.stats['messages_processed']}")
                    # 发送成功，继续删除会话
                    self.logger.info("准备删除会话，等待5秒让用户看到发送状态...")
                    QTimer.singleShot(5000, self._delete_conversation)
                else:
                    self.logger.error("✗ JavaScript返回: 发送失败")
                    self.logger.error("===== 回复发送失败，流程终止 =====")
                    self.stats['errors'] += 1
                    self.automation_step_completed.emit("发送回复", False, "发送消息失败，流程已停止")
                    # 发送失败，不删除会话，停止流程
                    self.message_processed.emit(
                        {"error": "回复发送失败", "action": "send_reply"},
                        False
                    )
                    # 不调用 _delete_conversation，等待用户处理

            except Exception as e:
                self.logger.error(f"处理回复结果失败: {e}")
                import traceback
                self.logger.error(f"异常详情: {traceback.format_exc()}")
                self.stats['errors'] += 1
                self.automation_step_completed.emit("发送回复", False, f"处理回复结果异常: {e}")
                # 异常时也不继续，停止流程

        # 发送回复
        self.logger.info("调用JavaScript发送私信回复...")
        import json
        reply_json = json.dumps(reply_text)
        self.browser.execute_custom_js(f"window.MessageHelpers.sendPrivateMessageReply({reply_json})", on_reply_result)

    def _delete_conversation(self) -> None:
        """5. 删除当前会话"""
        self.logger.info("===== 删除当前会话 =====")

        def on_delete_result(success: bool):
            self.logger.info(f"===== on_delete_result 回调被调用 =====")
            self.logger.info(f"[回调] success参数值: {success}")
            try:
                if success:
                    self.logger.info("✓ 删除流程完成（等待3秒后）")
                    self.stats['sessions_deleted'] += 1
                    self.logger.info(f"[统计] 已删除会话数 = {self.stats['sessions_deleted']}")
                    # 等待2秒让页面更新，然后检查是否还有会话
                    self.logger.info("[等待] 2秒后检查是否还有更多会话...")
                    QTimer.singleShot(2000, self._check_and_continue_or_wait)
                else:
                    self.logger.error("✗ JavaScript返回: 会话删除失败")
                    self.stats['errors'] += 1
                    self.logger.info(f"[统计] 错误数 = {self.stats['errors']}")
                    self._schedule_next_check()

            except Exception as e:
                self.logger.error(f"处理删除结果失败: {e}")
                import traceback
                self.logger.error(f"异常详情: {traceback.format_exc()}")
                self.stats['errors'] += 1
                self._schedule_next_check()

        # 删除会话 - 由于JS是异步的，我们先执行删除，然后等待固定时间
        self.logger.info("[删除] 开始删除会话流程...")
        self.logger.info("[删除] 步骤1: 调用JavaScript删除函数...")
        
        try:
            # 先执行删除操作（不等待结果）
            self.browser.execute_custom_js("window.MessageHelpers.deleteCurrentConversation()")
            self.logger.info("[删除] 步骤2: 删除命令已发送，等待3秒让操作完成...")
            
            # 使用QTimer延迟回调，给JavaScript时间完成异步操作
            QTimer.singleShot(3000, lambda: on_delete_result(True))
            self.logger.info("[删除] 步骤3: 已设置3秒后回调")
            
        except Exception as e:
            self.logger.error(f"[删除] 调用删除函数异常: {e}")
            import traceback
            self.logger.error(f"[删除] 异常详情: {traceback.format_exc()}")
            # 出错也继续
            QTimer.singleShot(3000, lambda: on_delete_result(True))

    def _check_and_continue_or_wait(self) -> None:
        """检查是否还有会话，有则继续处理，没有则等待刷新间隔"""
        self.logger.info("===== _check_and_continue_or_wait 被调用 =====")
        self.logger.info("[步骤] 开始获取当前会话列表...")

        def on_users_received(users):
            self.logger.info(f"===== on_users_received 回调被调用 =====")
            self.logger.info(f"[数据] 原始返回值类型: {type(users)}, 值: {users}")
            try:
                if users is None:
                    users = []
                    self.logger.warning("[警告] 用户列表为None，已转换为空列表")
                
                self.logger.info(f"[结果] 当前剩余 {len(users)} 个用户会话")
                if users:
                    self.logger.debug(f"[详情] 会话列表: {users}")

                if users and len(users) > 0:
                    # 还有会话，继续处理（不等待刷新间隔）
                    self.logger.info(f"✓ [决策] 检测到 {len(users)} 个未处理会话，继续处理下一个...")
                    self.logger.info("[行动] 调用 _click_first_conversation()...")
                    self._click_first_conversation()
                else:
                    # 没有会话了，按照配置的刷新间隔等待
                    self.logger.info("✓ [决策] 没有更多未处理会话，本次处理完成")
                    self.logger.info("[行动] 即将进入配置的刷新间隔等待...")
                    self._schedule_next_check()

            except Exception as e:
                self.logger.error(f"检查会话列表失败: {e}")
                import traceback
                self.logger.error(f"异常详情: {traceback.format_exc()}")
                self.stats['errors'] += 1
                self._schedule_next_check()

        # 获取当前会话列表
        self.logger.debug("调用JavaScript获取用户会话列表...")
        self.browser.execute_custom_js("window.MessageHelpers.getPrivateMessageUserList()", on_users_received)

    def _schedule_next_check(self) -> None:
        """安排下一次检查"""
        if not self.is_running:
            return

        # 计算随机间隔（在配置的范围内）
        min_interval = self.config.get('refresh_interval_min', 120)  # 默认2分钟
        max_interval = self.config.get('refresh_interval_max', 300)  # 默认5分钟

        if min_interval == max_interval:
            interval_seconds = min_interval
        else:
            interval_seconds = random.randint(min_interval, max_interval)

        interval_ms = interval_seconds * 1000

        self.logger.info(f"{interval_seconds}秒后开始下一次自动化检查")

        if self.refresh_timer:
            self.refresh_timer.stop()

        self.refresh_timer = QTimer(self)
        self.refresh_timer.setSingleShot(True)
        self.refresh_timer.timeout.connect(self._perform_check)
        self.refresh_timer.start(interval_ms)

    def _perform_check(self) -> None:
        """执行自动化检查流程"""
        if not self.is_running:
            return

        try:
            self.stats['total_checks'] += 1
            self.logger.info(f"开始第 {self.stats['total_checks']} 次自动化检查")

            # 执行完整的自动化流程
            self._execute_automation_flow()

        except Exception as e:
            self.logger.error(f"自动化过程出错: {e}")
            self.stats['errors'] += 1
            self._schedule_next_check()  # 继续下一次检查

    def _refresh_page(self) -> None:
        """刷新页面"""
        def on_refresh_complete(success: bool):
            if success:
                self.logger.info("页面刷新完成")
                # 短暂等待页面稳定
                QTimer.singleShot(2000, self._check_messages)
            else:
                self.logger.error("页面刷新失败")
                self.stats['errors'] += 1
                self._schedule_next_check()

        # 执行页面刷新
        self.browser.refresh_page()

        # 等待页面加载完成
        self.browser.page_loaded.connect(lambda success: on_refresh_complete(success))


    def _handle_error(self, error: Exception, context: str) -> None:
        """处理错误"""
        self.logger.error(f"{context}: {error}")
        self.stats['errors'] += 1

        # 如果是严重错误，可以停止自动化
        # 目前选择继续运行

    def manual_check(self) -> None:
        """手动触发检查（用于测试）"""
        if not self.is_running:
            self.logger.warning("自动化未运行，无法执行手动检查")
            return

        self.logger.info("执行手动检查")
        self._perform_check()
