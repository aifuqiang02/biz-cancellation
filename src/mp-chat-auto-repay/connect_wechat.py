#!/usr/bin env python
# -*- coding: utf-8 -*-
"""
微信连接辅助脚本 - 供 GUI 调用
"""

import sys
import os
import json
import time
import pythoncom

def main():
    # 初始化 COM
    pythoncom.CoInitialize()
    
    try:
        from wxautox4 import WeChat
        from wxautox4.ui import WeChatMainWnd
        
        # 设置微信窗口名称
        WeChatMainWnd._ui_name = '微信'
        
        # 激活微信窗口
        try:
            import pygetwindow as gw
            wechat_windows = gw.getWindowsWithTitle('微信')
            if wechat_windows:
                w = wechat_windows[0]
                w.activate()
                w.restore()
                print("微信窗口已激活")
        except Exception as e:
            print(f"激活窗口失败: {e}")
        
        # 创建 WeChat 实例
        print("正在创建 WeChat 实例...")
        wx = WeChat()
        
        # 获取昵称
        nickname = wx.nickname or "未知用户"
        
        # 输出结果 (JSON格式供GUI解析)
        result = {
            "success": True,
            "nickname": nickname,
            "error": ""
        }
        print(f"RESULT:{json.dumps(result, ensure_ascii=False)}")
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        result = {
            "success": False,
            "nickname": "",
            "error": str(e)
        }
        print(f"RESULT:{json.dumps(result, ensure_ascii=False)}")
        print(f"ERROR:{error_detail}", file=sys.stderr)

if __name__ == "__main__":
    main()
