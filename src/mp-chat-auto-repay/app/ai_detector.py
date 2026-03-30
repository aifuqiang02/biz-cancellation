#!/usr/bin/env python3
"""
AI 意图检测模块
使用 LongCat API 判断用户是否有注销营业执照的办理意向
"""

import requests
import json
from typing import Optional
from app.logger import Logger


class IntentDetector:
    """
    LongCat AI 意图检测器
    用于判断用户消息是否表达了"想要办理营业执照注销"的意向
    """
    
    API_URL = "https://api.longcat.chat/openai/v1/chat/completions"
    API_KEY = "ak_2lY0MP26561m78T5u84Gu3xU8qZ41"
    MODEL = "LongCat-Flash-Chat"
    TIMEOUT = 60  # 60秒超时
    
    def __init__(self, logger: Optional[Logger] = None):
        """
        初始化意图检测器
        
        Args:
            logger: 日志记录器实例
        """
        self.logger = logger
        if self.logger:
            self.logger.info("AI意图检测器初始化完成，模型: LongCat-Flash-Chat")
    
    def detect_cancel_intent(self, messages: str) -> bool:
        """
        检测用户是否有注销营业执照的办理意向
        
        Args:
            messages: 用户发送的所有消息文本（已拼接）
            
        Returns:
            bool: True=有注销意向, False=无注销意向
            
        Raises:
            Exception: API调用失败或解析失败时抛出异常
        """
        if self.logger:
            self.logger.info("===== 开始AI意图检测 =====")
            self.logger.info(f"用户消息长度: {len(messages)} 字符")
            self.logger.debug(f"完整用户消息: {messages[:200]}...")
        
        # 构建系统提示词
        system_prompt = """你是一个意图识别助手。请判断用户消息是否表达了"想要办理营业执照注销"的意向。

只回答 "yes" 或 "no"，不要添加任何解释。

有意愿示例：
- "我要注销营业执照"
- "线上注销怎么办"
- "代办注销多少钱"
- "想注销公司"
- "注销怎么弄"
- "帮我注销一下"
- "如何注销营业执照"

无意愿示例：
- "我注销完成了，为什么还显示正常"
- "注销后多久生效"
- "已经注销了怎么办"
- "注销进度怎么查"
- "注销流程是什么"
- "我之前注销过了"
"""
        
        # 构建请求体
        request_data = {
            "model": self.MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请判断以下用户消息是否有注销办理意向：\n\n{messages}\n\n是否有注销办理意向？(yes/no):"}
            ],
            "max_tokens": 50,
            "temperature": 0.1  # 低温度，更确定性的回答
        }
        
        if self.logger:
            self.logger.info("发送API请求到: https://api.longcat.chat/openai/v1/chat/completions")
            self.logger.debug(f"请求体: {json.dumps(request_data, ensure_ascii=False)}")
            self.logger.info(f"等待API响应 (超时: {self.TIMEOUT}s)...")
        
        try:
            # 发送API请求
            response = requests.post(
                self.API_URL,
                headers={
                    "Authorization": f"Bearer {self.API_KEY}",
                    "Content-Type": "application/json"
                },
                json=request_data,
                timeout=self.TIMEOUT
            )
            
            if self.logger:
                self.logger.info(f"API响应收到，状态码: {response.status_code}")
            
            # 检查HTTP状态码
            response.raise_for_status()
            
            # 解析响应
            result = response.json()
            
            if self.logger:
                self.logger.debug(f"原始响应: {json.dumps(result, ensure_ascii=False)}")
            
            # 提取AI的回答
            if "choices" not in result or len(result["choices"]) == 0:
                error_msg = "API响应格式错误: 缺少choices字段"
                if self.logger:
                    self.logger.error(error_msg)
                    self.logger.error(f"完整响应: {json.dumps(result, ensure_ascii=False)}")
                raise Exception(error_msg)
            
            ai_response = result["choices"][0].get("message", {}).get("content", "").strip().lower()
            
            if self.logger:
                self.logger.info(f"AI原始回答: '{ai_response}'")
            
            # 解析 yes/no
            if "yes" in ai_response:
                if self.logger:
                    self.logger.info("AI判断结果: 用户有注销意向 (yes)")
                return True
            elif "no" in ai_response:
                if self.logger:
                    self.logger.info("AI判断结果: 用户无注销意向 (no)")
                return False
            else:
                error_msg = f"无法解析AI响应，期望 yes/no，实际收到: '{ai_response}'"
                if self.logger:
                    self.logger.error(error_msg)
                raise Exception(error_msg)
                
        except requests.exceptions.Timeout:
            error_msg = f"API请求超时 (>{self.TIMEOUT}秒)"
            if self.logger:
                self.logger.error(error_msg)
            raise Exception(error_msg)
            
        except requests.exceptions.ConnectionError as e:
            error_msg = f"API连接失败: {str(e)}"
            if self.logger:
                self.logger.error(error_msg)
            raise Exception(error_msg)
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"API HTTP错误: {response.status_code} - {str(e)}"
            if self.logger:
                self.logger.error(error_msg)
                try:
                    self.logger.error(f"错误响应: {response.text}")
                except:
                    pass
            raise Exception(error_msg)
            
        except json.JSONDecodeError as e:
            error_msg = f"API响应JSON解析失败: {str(e)}"
            if self.logger:
                self.logger.error(error_msg)
                try:
                    self.logger.error(f"原始响应: {response.text}")
                except:
                    pass
            raise Exception(error_msg)
            
        except Exception as e:
            error_msg = f"AI意图检测发生未知错误: {str(e)}"
            if self.logger:
                self.logger.error(error_msg)
                import traceback
                self.logger.error(f"异常详情: {traceback.format_exc()}")
            raise Exception(error_msg)
