#!/usr/bin/env python3
"""
浏览器控制器
封装对 QWebEngineView 的操作，执行 JavaScript 代码与页面交互
"""

import json
import random
from pathlib import Path
from typing import Optional, Dict, Any, Callable, Awaitable
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage
from PyQt5.QtCore import QTimer, pyqtSignal, QObject, QUrl, pyqtSlot

from app.logger import Logger


class JSCallbackHandler(QObject):
    """JavaScript回调处理器"""

    def __init__(self, logger: Logger):
        super().__init__()
        self.logger = logger

    @pyqtSlot(str)
    def logInfo(self, message: str):
        """记录信息日志"""
        self.logger.info(f"[JS] {message}")

    @pyqtSlot(str)
    def logWarning(self, message: str):
        """记录警告日志"""
        self.logger.warning(f"[JS] {message}")

    @pyqtSlot(str)
    def logError(self, message: str):
        """记录错误日志"""
        self.logger.error(f"[JS] {message}")

    @pyqtSlot(str)
    def logDebug(self, message: str):
        """记录调试日志"""
        self.logger.debug(f"[JS] {message}")


class BrowserController(QObject):
    """浏览器控制器类"""

    # 信号定义
    page_loaded = pyqtSignal(bool)  # 页面加载完成信号 (success)
    js_result_received = pyqtSignal(str, object)  # JS执行结果信号 (callback_id, result)
    js_helpers_loaded_signal = pyqtSignal()  # JavaScript助手脚本加载完成信号

    def __init__(self, web_view: QWebEngineView, logger: Logger):
        super().__init__()
        self.web_view = web_view
        self.logger = logger
        self.js_helpers_loaded = False
        self.pending_callbacks: Dict[str, Callable] = {}

        # 创建JavaScript回调处理器
        self.js_callback_handler = JSCallbackHandler(self.logger)

        # 获取项目根目录
        self.project_root = Path(__file__).parent.parent

        # 初始化
        self._setup_connections()
        # 不在初始化时注入JS，等待页面加载完成后再注入

        # 设置定期检查JavaScript日志的定时器
        self._js_log_timer = QTimer(self)
        self._js_log_timer.timeout.connect(self._check_js_logs)
        self._js_log_timer.start(2000)  # 每2秒检查一次

    def _setup_connections(self):
        """设置信号连接"""
        self.web_view.loadFinished.connect(self._on_page_loaded)

    def _on_page_loaded(self, success: bool):
        """页面加载完成处理"""
        if success:
            self.logger.info("页面加载完成，等待DOM完全准备好后再注入JS助手脚本")

            # 使用QTimer延迟执行，确保DOM完全加载
            from PyQt5.QtCore import QTimer
            QTimer.singleShot(2000, self._inject_js_after_page_load)  # 2秒后注入
        else:
            self.logger.error("页面加载失败")

    def _inject_js_after_page_load(self):
        """页面加载完成后注入JavaScript助手脚本"""
        self.logger.info("开始在页面加载完成后注入JS助手脚本")

        # 跳过回调处理器设置，直接使用备选日志方案
        self.logger.info("使用简化的日志方案（不依赖回调处理器）")

        self._setup_simple_js_callback()
        self._inject_js_helpers()
        self.logger.info("JS助手脚本注入完成")

        # 确保JavaScript日志检查定时器正在运行
        if not self._js_log_timer.isActive():
            self._js_log_timer.start(2000)

        # 发送页面加载完成信号（成功）
        self.page_loaded.emit(True)

    def cleanup(self):
        """清理资源"""
        try:
            if hasattr(self, '_js_log_timer') and self._js_log_timer:
                self._js_log_timer.stop()
        except:
            pass

    def _check_js_logs(self):
        """定期检查JavaScript日志缓冲区"""
        try:
            # 执行JavaScript获取日志缓冲区内容
            js_code = """
                (function() {
                    var logs = window.jsLogBuffer || [];
                    window.jsLogBuffer = []; // 清空缓冲区
                    return logs;
                })();
            """

            def on_logs_received(logs):
                try:
                    if logs and isinstance(logs, list):
                        for log_entry in logs:
                            if isinstance(log_entry, dict) and 'level' in log_entry and 'message' in log_entry:
                                level = log_entry.get('level', 'info')
                                message = log_entry.get('message', '')

                                if level == 'info':
                                    self.logger.info(f"[JS] {message}")
                                elif level == 'warning':
                                    self.logger.warning(f"[JS] {message}")
                                elif level == 'error':
                                    self.logger.error(f"[JS] {message}")
                                elif level == 'debug':
                                    self.logger.debug(f"[JS] {message}")
                except Exception as e:
                    self.logger.debug(f"处理JavaScript日志时出错: {e}")

            self._run_js_code(js_code, on_logs_received)

        except Exception as e:
            self.logger.debug(f"检查JavaScript日志失败: {e}")

    def _inject_js_helpers(self):
        """注入JavaScript助手脚本"""
        try:
            # 跳过复杂的回调处理器设置，直接使用备选日志方案
            self.logger.info("使用简化的日志方案（不依赖回调处理器）")

            # PyQt5兼容性：简化回调设置（总是执行）
            self.logger.debug("开始设置简化JavaScript回调...")
            self._setup_simple_js_callback()
            self.logger.debug("简化JavaScript回调设置完成")

            js_files = [
                'query_helpers.js',
                'click_helpers.js',
                'message_helpers.js',
                'session_helpers.js',
                'snamr_helpers.js'
            ]

            for js_file in js_files:
                js_path = self.project_root / 'js_helpers' / js_file
                if js_path.exists():
                    with open(js_path, 'r', encoding='utf-8') as f:
                        js_code = f.read()
                        self._run_js_code(js_code)
                        self.logger.debug(f"注入JS脚本: {js_file}")
                else:
                    self.logger.warning(f"JS脚本文件不存在: {js_path}")

            self.js_helpers_loaded = True
            self.logger.info("所有JS助手脚本注入完成")

            # 发送JavaScript加载完成信号（使用独立的 signal）
            try:
                self.js_helpers_loaded_signal.emit()
            except Exception:
                # 如果信号不可用，不要让异常中断流程
                pass

            # 验证关键函数是否正确暴露
            self._verify_js_functions_loaded()

        except Exception as e:
            self.logger.error(f"注入JS助手脚本失败: {e}")
            # 即使注入失败，也标记为已尝试
            self.js_helpers_loaded = True

    def _verify_js_functions_loaded(self):
        """验证JavaScript关键函数是否正确加载"""
        def on_verify_result(result):
            if result:
                self.logger.info("JavaScript函数验证成功: 所有关键函数已正确加载")
            else:
                self.logger.error("JavaScript函数验证失败: 部分函数可能未正确加载")

        # 检查关键函数是否存在
        self.execute_custom_js("""
            var functions_ok = true;
            var required_functions = [
                'window.waitForPageLoad',
                'window.parseApplicationItems',
                'window.hasNextPage',
                'window.clickNextPage'
            ];

            for (var i = 0; i < required_functions.length; i++) {
                var func_name = required_functions[i];
                if (typeof eval(func_name) !== 'function') {
                    console.error('[VERIFY] 函数未找到: ' + func_name);
                    functions_ok = false;
                } else {
                    console.log('[VERIFY] 函数已加载: ' + func_name);
                }
            }

            functions_ok;
        """, on_verify_result)

    def _setup_js_callback(self):
        """设置JavaScript回调 (PyQt5兼容方式)"""
        try:
            page = self.web_view.page()
            self.logger.debug(f"页面对象类型: {type(page)}")

            # 在PyQt5中，尝试多种方法来设置JavaScript回调
            callback_set = False

            try:
                self.logger.debug("开始尝试设置JavaScript回调...")
                # 方法1: 尝试使用QWebEngineFrame (PyQt5早期版本)
                self.logger.debug(f"检查mainFrame: {hasattr(page, 'mainFrame')}")
                if hasattr(page, 'mainFrame'):
                    main_frame = page.mainFrame()
                    self.logger.debug(f"mainFrame类型: {type(main_frame)}")
                    self.logger.debug(f"mainFrame有addToJavaScriptWindowObject: {hasattr(main_frame, 'addToJavaScriptWindowObject')}")
                    if hasattr(main_frame, 'addToJavaScriptWindowObject'):
                        main_frame.addToJavaScriptWindowObject("pyqtCallbackHandler", self.js_callback_handler)
                        self.logger.debug("使用mainFrame.addToJavaScriptWindowObject设置JavaScript回调")
                        callback_set = True

                # 方法2: 尝试使用QWebEnginePage (PyQt5 5.6+)
                self.logger.debug(f"检查page.addToJavaScriptWindowObject: {hasattr(page, 'addToJavaScriptWindowObject')}")
                if not callback_set and hasattr(page, 'addToJavaScriptWindowObject'):
                    page.addToJavaScriptWindowObject("pyqtCallbackHandler", self.js_callback_handler)
                    self.logger.debug("使用page.addToJavaScriptWindowObject设置JavaScript回调")
                    callback_set = True

                # 方法3: 使用信号槽机制 (PyQt5通用方法) - 作为最后备选
                if not callback_set:
                    # 尝试连接JavaScript控制台消息信号（某些PyQt5版本支持）
                    try:
                        if hasattr(page, 'javaScriptConsoleMessage'):
                            signal_obj = getattr(page, 'javaScriptConsoleMessage', None)
                            if signal_obj and hasattr(signal_obj, 'connect'):
                                signal_obj.connect(self._handle_js_console_message)
                                self.logger.debug("使用信号槽机制处理JavaScript回调")
                                callback_set = True
                            else:
                                self.logger.debug("javaScriptConsoleMessage信号不可用")
                    except Exception as signal_error:
                        self.logger.debug(f"信号连接尝试失败（这是正常的）: {signal_error}")

                if not callback_set:
                    self.logger.warning("所有JavaScript回调设置方法都不可用")
                    return False

            except Exception as frame_error:
                self.logger.warning(f"设置JavaScript窗口对象失败: {frame_error}")
                return False

            # 执行一个简单的JavaScript来定义全局回调函数
            # 注意：我们将回调函数定义为直接调用Python方法
            self._run_js_code("""
                // 定义全局回调函数
                window.pyqtCallback = function(callbackId, result) {
                    try {
                        // 由于PyQt5的限制，我们使用一个简化的回调机制
                        console.log('pyqtCallback called with:', callbackId, result);
                        // 这里我们将回调ID和结果存储在全局变量中，稍后处理
                        window._pendingCallback = {id: callbackId, result: result};
                    } catch (e) {
                        console.error('pyqtCallback error:', e);
                    }
                };

                // 设置一个标志，表示回调系统已初始化
                window.pyqtCallbackReady = true;

                // 全局日志函数 - 同时输出到控制台和Python日志
                window.jsLog = {
                    info: function(message) {
                        console.log('[JS-INFO]', message);
                        try {
                            if (window.pyqtCallbackHandler && window.pyqtCallbackHandler.logInfo) {
                                window.pyqtCallbackHandler.logInfo(message);
                            }
                        } catch (e) {
                            console.warn('Failed to send log to Python:', e);
                        }
                    },
                    warning: function(message) {
                        console.warn('[JS-WARN]', message);
                        try {
                            if (window.pyqtCallbackHandler && window.pyqtCallbackHandler.logWarning) {
                                window.pyqtCallbackHandler.logWarning(message);
                            }
                        } catch (e) {
                            console.warn('Failed to send log to Python:', e);
                        }
                    },
                    error: function(message) {
                        console.error('[JS-ERROR]', message);
                        try {
                            if (window.pyqtCallbackHandler && window.pyqtCallbackHandler.logError) {
                                window.pyqtCallbackHandler.logError(message);
                            }
                        } catch (e) {
                            console.warn('Failed to send log to Python:', e);
                        }
                    },
                    debug: function(message) {
                        console.debug('[JS-DEBUG]', message);
                        try {
                            if (window.pyqtCallbackHandler && window.pyqtCallbackHandler.logDebug) {
                                window.pyqtCallbackHandler.logDebug(message);
                            }
                        } catch (e) {
                            console.warn('Failed to send log to Python:', e);
                        }
                    }
                };

                // 为了兼容性，也定义简化的日志函数
                window.logToPython = window.jsLog.info;
            """)
            self.logger.debug("JavaScript回调和日志系统设置完成")
            return callback_set
        except Exception as e:
            self.logger.error(f"设置JS回调失败: {e}")
            return False

    def _handle_js_console_message(self, level, message, line_number, source_id):
        """处理JavaScript控制台消息"""
        try:
            # 检查是否是我们的日志消息
            if message.startswith('[JS-'):
                # 已经是通过jsLog发送的消息，不需要再次处理
                return

            # 处理其他JavaScript日志
            if level == 0:  # QWebEnginePage::InfoMessageLevel
                self.logger.info(f"[JS-INFO] {message}")
            elif level == 1:  # QWebEnginePage::WarningMessageLevel
                self.logger.warning(f"[JS-WARN] {message}")
            elif level == 2:  # QWebEnginePage::ErrorMessageLevel
                self.logger.error(f"[JS-ERROR] {message}")
            else:
                self.logger.debug(f"[JS-DEBUG] {message}")

        except Exception as e:
            self.logger.error(f"处理JavaScript控制台消息失败: {e}")

    def _setup_simple_js_callback(self):
        """设置简化的JavaScript回调 (PyQt5兼容)"""
        try:
            # PyQt5兼容：将所有JavaScript函数直接定义在页面中
            self._run_js_code("""
                // 简化的回调机制
                window.pyqtCallback = function(callbackId, result) {
                    console.log('Callback received:', callbackId, result);
                    // 将结果存储在全局变量中
                    window._lastCallbackResult = result;
                    window._lastCallbackId = callbackId;
                };

                // 全局日志缓冲区 - 用于存储JavaScript日志
                window.jsLogBuffer = [];
                window.jsLogMaxSize = 100; // 最大缓冲100条日志

                // 全局日志函数 - 输出到控制台并存储到缓冲区
                window.jsLog = {
                    info: function(message) {
                        console.log('[JS-INFO]', message);
                        window.jsLogBuffer.push({level: 'info', message: message, timestamp: Date.now()});
                        if (window.jsLogBuffer.length > window.jsLogMaxSize) {
                            window.jsLogBuffer.shift(); // 移除最旧的日志
                        }
                    },
                    warning: function(message) {
                        console.warn('[JS-WARN]', message);
                        window.jsLogBuffer.push({level: 'warning', message: message, timestamp: Date.now()});
                        if (window.jsLogBuffer.length > window.jsLogMaxSize) {
                            window.jsLogBuffer.shift();
                        }
                    },
                    error: function(message) {
                        console.error('[JS-ERROR]', message);
                        window.jsLogBuffer.push({level: 'error', message: message, timestamp: Date.now()});
                        if (window.jsLogBuffer.length > window.jsLogMaxSize) {
                            window.jsLogBuffer.shift();
                        }
                    },
                    debug: function(message) {
                        console.debug('[JS-DEBUG]', message);
                        window.jsLogBuffer.push({level: 'debug', message: message, timestamp: Date.now()});
                        if (window.jsLogBuffer.length > window.jsLogMaxSize) {
                            window.jsLogBuffer.shift();
                        }
                    }
                };

                // MessageHelpers对象 - 直接定义所有函数
                window.MessageHelpers = {
                    getPrivateMessageUserList: function() {
                        console.log('getPrivateMessageUserList called');
                        const users = [];
                        try {
                            const userElements = document.querySelectorAll('.msg-user-item');
                            console.log('Found elements:', userElements.length);

                            userElements.forEach((element, index) => {
                                const userText = element.textContent.trim();
                                console.log('Element', index, ':', userText.substring(0, 30));
                                if (userText) {
                                    users.push({
                                        index: index,
                                        text: userText,
                                        element: element
                                    });
                                }
                            });

                            console.log('Returning users:', users.length);
                            return users;
                        } catch (error) {
                            console.error('Error in getPrivateMessageUserList:', error);
                            return [];
                        }
                    },

                    clickFirstUserConversation: function() {
                        try {
                            const firstUser = document.querySelector('.msg-user-item');
                            if (firstUser) {
                                console.log('Clicking first user conversation');
                                firstUser.click();
                                return true;
                            }
                            return false;
                        } catch (error) {
                            console.error('Error clicking user:', error);
                            return false;
                        }
                    },

                    debugPageElements: function() {
                        console.log('=== Debug Page Elements ===');
                        const selectors = ['.msg-user-item', '.user_list', 'div[contenteditable]'];
                        selectors.forEach(selector => {
                            const elements = document.querySelectorAll(selector);
                            console.log(`${selector}: ${elements.length} elements`);
                        });
                    }
                };

                console.log('JavaScript helpers initialized');
            """)
            self.logger.debug("简化的JavaScript回调设置完成")
        except Exception as e:
            self.logger.error(f"设置简化JS回调失败: {e}")

    def _run_js_code(self, code: str, callback: Optional[Callable] = None) -> None:
        """执行JavaScript代码 (PyQt5版本)"""
        if callback:
            # 生成唯一的回调ID
            callback_id = f"callback_{random.randint(100000, 999999)}"
            self.pending_callbacks[callback_id] = callback

            # 直接使用PyQt5的runJavaScript回调机制
            # PyQt5的runJavaScript方法接受一个回调函数参数
            try:
                self.web_view.page().runJavaScript(code, lambda result: self._handle_js_result(result, callback, callback_id))
            except Exception as e:
                self.logger.error(f"执行带回调的JavaScript失败: {e}")
                if callback:
                    try:
                        callback(None)
                    except Exception as cb_e:
                        self.logger.error(f"调用失败回调失败: {cb_e}")
        else:
            # 简单执行，无回调
            self.web_view.page().runJavaScript(code)

    def _handle_js_result(self, result, callback, callback_id):
        """处理JavaScript执行结果"""
        try:
            if callback_id in self.pending_callbacks:
                del self.pending_callbacks[callback_id]

            if callback:
                callback(result)
        except Exception as e:
            self.logger.error(f"处理JavaScript结果失败: {e}")

    def _run_js_sync(self, code: str, callback: Callable) -> None:
        """同步执行JavaScript代码 (PyQt5兼容版本)"""
        try:
            # 直接执行代码，使用PyQt5的runJavaScript回调
            def handle_result(result):
                try:
                    if result is None:
                        self.logger.debug("JS返回空结果")
                        callback([])
                    elif isinstance(result, dict) and 'error' in result:
                        self.logger.error(f"JS执行错误: {result['error']}")
                        callback([])
                    else:
                        callback(result)
                except Exception as e:
                    self.logger.error(f"处理JS结果失败: {e}")
                    callback([])

            self.web_view.page().runJavaScript(code, handle_result)

        except Exception as e:
            self.logger.error(f"同步JS执行失败: {e}")
            callback([])

    def load_url(self, url: str) -> None:
        """加载URL"""
        self.logger.info(f"加载URL: {url}")
        self.web_view.load(QUrl(url))

    def refresh_page(self) -> None:
        """刷新页面"""
        self.logger.info("刷新页面")
        self.web_view.reload()

    def get_page_title(self, callback: Callable[[Optional[str]], None]) -> None:
        """获取页面标题"""
        self._run_js_code("window.QueryHelpers.getPageTitle()", callback)

    def get_page_url(self, callback: Callable[[Optional[str]], None]) -> None:
        """获取页面URL"""
        self._run_js_code("window.QueryHelpers.getPageUrl()", callback)

    def is_wechat_mp_page(self, callback: Callable[[bool], None]) -> None:
        """检查是否是微信公众号平台页面"""
        self._run_js_code("window.QueryHelpers.isWeChatMPPage()", callback)

    def get_user_info(self, callback: Callable[[Optional[Dict]], None]) -> None:
        """获取用户信息"""
        def handle_result(result):
            if result and isinstance(result, dict):
                callback(result)
            else:
                callback(None)
        self._run_js_code("window.QueryHelpers.getUserInfo()", handle_result)

    def get_latest_messages(self, callback: Callable[[list], None]) -> None:
        """获取最新消息列表"""
        def handle_result(result):
            if result and isinstance(result, list):
                callback(result)
            else:
                callback([])
        self._run_js_code("window.MessageHelpers.getLatestMessages()", handle_result)

    def find_messages_with_keyword(self, keyword: str, callback: Callable[[list], None]) -> None:
        """查找包含关键词的消息"""
        def handle_result(result):
            if result and isinstance(result, list):
                callback(result)
            else:
                callback([])
        self._run_js_code(f"window.MessageHelpers.findMessagesWithKeyword('{keyword}')", handle_result)

    def reply_to_message(self, reply_text: str, callback: Callable[[bool], None]) -> None:
        """回复消息"""
        # 转义引号
        escaped_text = reply_text.replace("'", "\\'").replace('"', '\\"')
        self._run_js_code(f"window.MessageHelpers.replyToMessage('{escaped_text}')", callback)

    def delete_session(self, session_name: str, callback: Callable[[bool], None]) -> None:
        """删除会话"""
        escaped_name = session_name.replace("'", "\\'").replace('"', '\\"')
        self._run_js_code(f"window.SessionHelpers.deleteSession('{escaped_name}')", callback)

    def get_session_list(self, callback: Callable[[list], None]) -> None:
        """获取会话列表"""
        def handle_result(result):
            if result and isinstance(result, list):
                callback(result)
            else:
                callback([])
        self._run_js_code("window.SessionHelpers.getSessionList()", handle_result)

    def click_element(self, selector: str, callback: Callable[[bool], None]) -> None:
        """点击元素"""
        escaped_selector = selector.replace("'", "\\'").replace('"', '\\"')
        self._run_js_code(f"window.ClickHelpers.clickElement('{escaped_selector}')", callback)

    def element_exists(self, selector: str, callback: Callable[[bool], None]) -> None:
        """检查元素是否存在"""
        escaped_selector = selector.replace("'", "\\'").replace('"', '\\"')
        self._run_js_code(f"window.QueryHelpers.elementExists('{escaped_selector}')", callback)

    def wait_for_page_load(self, timeout: int = 10000, callback: Callable[[bool], None] = None) -> None:
        """等待页面加载完成"""
        if callback:
            self._run_js_code(f"window.QueryHelpers.waitForPageLoad({timeout})", callback)
        else:
            self._run_js_code(f"window.QueryHelpers.waitForPageLoad({timeout})")

    def execute_custom_js(self, js_code: str, callback: Optional[Callable] = None) -> None:
        """执行自定义JavaScript代码"""
        if callback:
            # 由于PyQt5回调机制复杂，使用同步方法
            self._run_js_sync(js_code, callback)
        else:
            self._run_js_code(js_code)

    def get_private_message_users(self, callback: Callable[[list], None]) -> None:
        """获取私信用户列表"""
        def handle_result(result):
            self.logger.debug(f"getPrivateMessageUserList result: {result}, type: {type(result)}")
            if result is None:
                self.logger.warning("JavaScript function returned None, using empty list")
                callback([])
            elif isinstance(result, list):
                callback(result)
            else:
                self.logger.warning(f"Unexpected result type: {type(result)}, using empty list")
                callback([])
        self._run_js_code("window.MessageHelpers.getPrivateMessageUserList()", handle_result)

    def click_first_user_conversation(self, callback: Callable[[bool], None]) -> None:
        """点击第一个用户会话"""
        self._run_js_code("window.MessageHelpers.clickFirstUserConversation()", callback)

    def check_message_for_keyword(self, callback: Callable[[bool], None]) -> None:
        """检查消息是否包含注销关键词"""
        self._run_js_code("window.MessageHelpers.checkMessageContainsKeyword()", callback)

    def send_private_reply(self, reply_text: str, callback: Callable[[bool], None]) -> None:
        """发送私信回复"""
        escaped_text = reply_text.replace("'", "\\'").replace('"', '\\"')
        self._run_js_code(f"window.MessageHelpers.sendPrivateMessageReply('{escaped_text}')", callback)

    def delete_current_conversation(self, callback: Callable[[bool], None]) -> None:
        """删除当前会话"""
        self._run_js_code("window.MessageHelpers.deleteCurrentConversation()", callback)

    def debug_page_elements(self) -> None:
        """调试页面元素"""
        self._run_js_code("window.MessageHelpers.debugPageElements()")
