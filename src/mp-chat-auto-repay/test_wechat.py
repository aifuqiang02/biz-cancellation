#!/usr/bin env python
# -*- coding: utf-8 -*-
"""
测试 - 模拟 PyQt QThread 环境
"""

import sys
import os
import time
import threading
import pythoncom

print("=" * 50)
print("测试创建 WeChat")
print("=" * 50)

def create_wechat():
    print("1. 初始化 COM...")
    pythoncom.CoInitialize()
    
    print("2. 导入 wxautox4...")
    from wxautox4 import WeChat
    from wxautox4.ui import WeChatMainWnd
    
    print("3. 设置 ui_name...")
    WeChatMainWnd._ui_name = '微信'
    
    print("4. 尝试使用 wxautox4 激活微信窗口...")
    import pygetwindow as gw
    wechat_windows = gw.getWindowsWithTitle('微信')
    if wechat_windows:
        w = wechat_windows[0]
        print(f"   找到窗口: {w.title}")
        w.activate()
        w.restore()
        print("   已激活窗口")
        time.sleep(1)
    
    print("5. 创建 WeChat 实例...")
    wx = WeChat()
    print(f"6. 成功! 昵称: {wx.nickname}")

t = threading.Thread(target=create_wechat)
t.start()
t.join(timeout=30)

print("\n完成")
