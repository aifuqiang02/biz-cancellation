#!/usr/bin/env python3
"""
陕西省市场监管局网站自动化采集引擎
实现定时采集办件信息、分页处理、数据提取和JSON输出的自动化逻辑
"""

import random
import time
import requests
from typing import Dict, Any, Optional, Callable
from PyQt5.QtCore import QTimer, QObject, pyqtSignal

from app.browser_controller import BrowserController
from app.logger import Logger


# Server API configuration
SERVER_API_URL = "http://localhost:1007/api/deregistration-businesses/sync-status"


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

        # 配置
        self.config = {
            'round_interval_min': 1200,  # 每轮间隔最小时间（秒）- 20分钟
            'round_interval_max': 1800,  # 每轮间隔最大时间（秒）- 30分钟
            'page_wait_min': 3,          # 翻页等待最小时间（秒）
            'page_wait_max': 8,          # 翻页等待最大时间（秒）
            'max_pages': 50,             # 最大采集页数
            'confirm_actions': True
        }

        # 统计信息
        self.stats = {
            'total_rounds': 0,           # 总轮数
            'total_pages': 0,            # 总页数
            'total_items': 0,            # 总办件数
            'current_round': 0,          # 当前轮数
            'current_page': 0,           # 当前页数
            'errors': 0                  # 错误次数
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
                'total_rounds': 0,           # 总轮数
                'total_pages': 0,            # 总页数
                'total_items': 0,            # 总办件数
                'current_round': 0,          # 当前轮数
                'current_page': 0,           # 当前页数
                'errors': 0                  # 错误次数
            }

            self.is_running = True

            # 开始第一次采集
            self._start_immediate_collection()

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
        # 0. 开始新一轮数据采集
        self._start_data_collection_round()

    def _start_data_collection_round(self) -> None:
        """开始新一轮数据采集"""
        self.stats['total_rounds'] += 1
        self.stats['current_round'] = self.stats['total_rounds']
        self.stats['current_page'] = 0

        self.logger.info(f"")
        self.logger.info(f"╔════════════════════════════════════════════════════════╗")
        self.logger.info(f"║          开始第 {self.stats['current_round']} 轮数据采集                          ║")
        self.logger.info(f"╚════════════════════════════════════════════════════════╝")

        # 初始化本轮数据存储
        self.current_round_data = []

        # 确保页面已加载，然后开始采集
        self._ensure_page_loaded_and_start_collection()

    def _ensure_page_loaded_and_start_collection(self) -> None:
        """确保页面已加载，然后开始采集数据"""
        # 首先检查JavaScript助手是否已经加载完成
        if not self.browser.js_helpers_loaded:
            self.logger.info("JavaScript助手脚本尚未加载完成，等待中...")
            # 等待3秒后重试
            QTimer.singleShot(3000, self._ensure_page_loaded_and_start_collection)
            return

        def on_page_check(result):
            try:
                success = bool(result)
                if success:
                    self.logger.info("页面加载完成，开始采集数据")
                    # 等待页面元素稳定
                    QTimer.singleShot(2000, self._collect_current_page_data)
                else:
                    self.logger.error("页面加载失败或数据未就绪")
                    self.stats['errors'] += 1
                    self._schedule_next_round()
            except Exception as e:
                self.logger.error(f"页面检查失败: {e}")
                self.stats['errors'] += 1
                self._schedule_next_round()

        # 检查JavaScript函数是否已加载，然后检查页面
        self.browser.execute_custom_js("""
            if (typeof window.waitForPageLoad === 'function') {
                console.log('[AUTOMATION] waitForPageLoad函数已加载，开始检查页面');
                window.waitForPageLoad(10000);
            } else {
                console.error('[AUTOMATION] waitForPageLoad函数未加载');
                false;  // 返回false表示失败
            }
        """, on_page_check)

    def _collect_current_page_data(self) -> None:
        """采集当前页面的办件数据"""
        self.stats['current_page'] += 1
        self.stats['total_pages'] += 1

        page_num = self.stats['current_page']
        self.logger.info(f"")
        self.logger.info(f"─── 采集第 {page_num} 页数据 ───")

        # 先调试页面元素，帮助诊断问题
        self.browser.execute_custom_js("window.SnamrHelpers.debugPageElements()")

        def on_data_received(items):
            try:
                self.logger.debug(f"接收到办件数据: {len(items) if items else 0} 项")

                if items is None:
                    items = []
                    self.logger.warning("收到 None 数据，已转换为空列表")
                elif not isinstance(items, list):
                    self.logger.warning(f"接收到的数据类型异常: {type(items)}，已转换为空列表")
                    items = []

                # 为每个办件项添加页码信息
                for item in items:
                    if isinstance(item, dict):
                        item['page'] = page_num
                        item['collected_at'] = time.strftime('%Y-%m-%d %H:%M:%S')

                self.logger.info(f"第 {page_num} 页解析完成: {len(items)} 个办件")
                
                if items:
                    names = [item.get('name', '未知')[:20] for item in items[:5]]
                    self.logger.info(f"  企业名称示例: {names}")
                    if len(items) > 5:
                        self.logger.info(f"  ... 还有 {len(items) - 5} 个")

                # 添加到本轮数据中
                self.current_round_data.extend(items)
                self.stats['total_items'] += len(items)

                # 检查是否有下一页
                self._check_and_go_to_next_page()

            except Exception as e:
                self.logger.error(f"处理办件数据失败: {e}")
                self.stats['errors'] += 1
                self._check_and_go_to_next_page()

        # 解析当前页面的办件信息
        self.browser.execute_custom_js("window.SnamrHelpers.parseApplicationItems()", on_data_received)

    def _check_and_go_to_next_page(self) -> None:
        """检查是否有下一页，如果有则翻页，否则完成本轮采集"""
        def on_next_page_check(has_next):
            try:
                max_pages = self.config.get('max_pages', 50)
                current_page = self.stats['current_page']

                if has_next and current_page < max_pages:
                    self.logger.info(f"检测到下一页，开始翻页 (当前第 {current_page} 页)")
                    self._go_to_next_page()
                else:
                    if not has_next:
                        self.logger.info("没有检测到下一页，采集完成")
                    elif current_page >= max_pages:
                        self.logger.info(f"已达到最大页数限制 ({max_pages})")

                    # 完成本轮采集
                    self._finish_current_round()

            except Exception as e:
                self.logger.error(f"检查下一页失败: {e}")
                self.stats['errors'] += 1
                self._finish_current_round()

        # 检查是否有下一页
        self.logger.info("正在检查是否有下一页...")
        self.browser.execute_custom_js("window.SnamrHelpers.hasNextPage()", on_next_page_check)

    def _go_to_next_page(self) -> None:
        """翻到下一页"""
        def on_page_click(success):
            try:
                if success:
                    self.logger.info("翻页点击成功，等待页面加载")
                    # 随机等待几秒，然后继续采集
                    wait_time = random.randint(
                        self.config.get('page_wait_min', 3),
                        self.config.get('page_wait_max', 8)
                    )
                    self.logger.info(f"等待 {wait_time} 秒后继续采集下一页")
                    QTimer.singleShot(wait_time * 1000, self._collect_current_page_data)
                else:
                    self.logger.warning("翻页点击失败，尝试完成本轮采集")
                    self._finish_current_round()

            except Exception as e:
                self.logger.error(f"翻页处理失败: {e}")
                self.stats['errors'] += 1
                self._finish_current_round()

        # 点击下一页
        self.logger.info("正在点击下一页按钮...")
        self.browser.execute_custom_js("window.SnamrHelpers.clickNextPage()", on_page_click)

    def _finish_current_round(self) -> None:
        """完成本轮数据采集，输出结果并安排下一轮"""
        try:
            # 输出JSON格式的结果
            import json
            result_json = json.dumps(self.current_round_data, ensure_ascii=False, indent=2)

            self.logger.info("=== 本轮数据采集完成 ===")
            self.logger.info(f"轮数: {self.stats['current_round']}")
            self.logger.info(f"采集页数: {self.stats['current_page']}")
            self.logger.info(f"采集办件数: {len(self.current_round_data)}")
            self.logger.info("采集数据 (JSON格式):")
            self.logger.info(result_json)
            self.logger.info("=== 数据采集完成 ===")

            # 发送数据到服务器
            self._send_data_to_server(self.current_round_data)

            # 安排下一轮采集
            self._schedule_next_round()

        except Exception as e:
            self.logger.error(f"完成本轮采集失败: {e}")
            self.stats['errors'] += 1
            self._schedule_next_round()

    def _send_data_to_server(self, data: list) -> None:
        """发送采集数据到服务器"""
        import json  # 确保 json 模块可用
        
        try:
            if not data:
                self.logger.info("没有数据需要同步到服务器")
                return

            self.logger.info(f"[SERVER SYNC] 准备发送 {len(data)} 条数据到服务器")
            self.logger.info(f"[SERVER SYNC] API URL: {SERVER_API_URL}")
            
            # 打印前3条数据预览
            preview_data = data[:3]
            self.logger.info(f"[SERVER SYNC] 数据预览: {json.dumps(preview_data, ensure_ascii=False)}")
            if len(data) > 3:
                self.logger.info(f"[SERVER SYNC] ... 还有 {len(data) - 3} 条数据")

            self.logger.info(f"[SERVER SYNC] 正在发送请求...")
            
            response = requests.post(
                SERVER_API_URL,
                json={"data": data},
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            self.logger.info(f"[SERVER SYNC] 响应状态码: {response.status_code}")
            self.logger.info(f"[SERVER SYNC] 响应内容: {response.text}")

            if response.status_code == 200:
                result = response.json()
                if result.get('code') == 200:
                    sync_data = result.get('data', {})
                    self.logger.info(f"[SERVER SYNC] ✓ 服务器同步成功!")
                    self.logger.info(f"[SERVER SYNC]   - 处理总数: {sync_data.get('totalProcessed', 0)}")
                    self.logger.info(f"[SERVER SYNC]   - 匹配数量: {sync_data.get('totalMatched', 0)}")
                    self.logger.info(f"[SERVER SYNC]   - 更新数量: {sync_data.get('updatedCount', 0)}")
                    
                    updated = sync_data.get('updatedBusinesses', [])
                    if updated:
                        self.logger.info(f"[SERVER SYNC]   - 更新的企业: {updated}")
                else:
                    self.logger.warning(f"[SERVER SYNC] 服务器返回非成功状态: {result.get('msg')}")
            else:
                self.logger.error(f"[SERVER SYNC] ✗ 服务器同步失败! HTTP状态码: {response.status_code}")
                self.logger.error(f"[SERVER SYNC]   响应内容: {response.text[:200]}")

        except requests.exceptions.ConnectionError as e:
            self.logger.error(f"[SERVER SYNC] ✗ 无法连接到服务器: {e}")
            self.logger.error(f"[SERVER SYNC]   请确保服务器已启动在: {SERVER_API_URL}")
        except requests.exceptions.Timeout:
            self.logger.error("[SERVER SYNC] ✗ 服务器请求超时 (30秒)")
        except json.JSONDecodeError as e:
            self.logger.error(f"[SERVER SYNC] ✗ 响应 JSON 解析失败: {e}")
        except Exception as e:
            self.logger.error(f"[SERVER SYNC] ✗ 发送数据到服务器时发生未知错误: {type(e).__name__}: {e}")

    def _start_immediate_collection(self) -> None:
        """立即开始第一轮数据采集"""
        try:
            self.logger.info("开始第一轮数据采集")
            self._execute_automation_flow()
        except Exception as e:
            self.logger.error(f"开始第一轮采集失败: {e}")
            self.stats['errors'] += 1
            self._schedule_next_round()

    def _schedule_next_round(self) -> None:
        """安排下一轮数据采集"""
        if not self.is_running:
            self.logger.info("自动化已停止，不安排下一轮")
            return

        # 计算随机间隔（20-30分钟）
        min_interval = self.config.get('round_interval_min', 1200)  # 默认20分钟
        max_interval = self.config.get('round_interval_max', 1800)  # 默认30分钟

        if min_interval == max_interval:
            interval_seconds = min_interval
        else:
            interval_seconds = random.randint(min_interval, max_interval)

        interval_ms = interval_seconds * 1000

        self.logger.info(f"")
        self.logger.info(f"╔════════════════════════════════════════════════════════╗")
        self.logger.info(f"║  本轮采集完成，等待 {interval_seconds//60} 分 {interval_seconds%60} 秒后开始下一轮      ║")
        self.logger.info(f"╚════════════════════════════════════════════════════════╝")

        if self.refresh_timer:
            self.refresh_timer.stop()

        self.refresh_timer = QTimer(self)
        self.refresh_timer.setSingleShot(True)
        self.refresh_timer.timeout.connect(self._start_new_round)
        self.refresh_timer.start(interval_ms)

    def _start_new_round(self) -> None:
        """开始新一轮数据采集"""
        if not self.is_running:
            return

        try:
            self.logger.info("开始新一轮数据采集")
            self._execute_automation_flow()
        except Exception as e:
            self.logger.error(f"开始新一轮采集失败: {e}")
            self.stats['errors'] += 1
            self._schedule_next_round()

    def manual_check(self) -> None:
        """手动触发数据采集（用于测试）"""
        if not self.is_running:
            self.logger.warning("自动化未运行，无法执行手动采集")
            return

        self.logger.info("执行手动数据采集")
        self._execute_automation_flow()
