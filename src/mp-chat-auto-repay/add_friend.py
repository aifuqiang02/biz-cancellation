#!/usr/bin env python
# -*- coding: utf-8 -*-
"""
微信添加好友辅助脚本
"""

import sys
import os
import json
import pythoncom

def main():
    pythoncom.CoInitialize()
    
    try:
        from wxautox4 import WeChat
        from wxautox4.ui import WeChatMainWnd
        
        WeChatMainWnd._ui_name = '微信'
        
        # 激活微信窗口
        try:
            import pygetwindow as gw
            wechat_windows = gw.getWindowsWithTitle('微信')
            if wechat_windows:
                w = wechat_windows[0]
                w.activate()
                w.restore()
        except:
            pass
        
        # 获取参数
        phone = sys.argv[1] if len(sys.argv) > 1 else ""
        name = sys.argv[2] if len(sys.argv) > 2 else ""
        message = sys.argv[3] if len(sys.argv) > 3 else "你好"
        
        if not phone:
            result = {"success": False, "error": "手机号为空"}
            print(f"RESULT:{json.dumps(result, ensure_ascii=False)}")
            return
        
        # 创建 WeChat 实例并添加好友
        print(f"创建 WeChat 实例，手机号: {phone}...")
        wx = WeChat()
        
        print(f"调用 AddNewFriend...")
        print(f"搜索关键词: {phone}, 附加消息: {message}")
        
        add_result = wx.AddNewFriend(
            keywords=phone,
            addmsg=message,
            remark=None,
            tags=None,
            permission='朋友圈'
        )
        
        # 检查返回结果
        result_str = str(add_result)
        print(f"返回结果: {result_str}")
        
        # 判断是否成功
        is_success = True
        error_msg = ""
        
        # 检查是否包含失败信息
        if '失败' in result_str or '错误' in result_str or '操作过于频繁' in result_str or '未找到' in result_str:
            is_success = False
            # 提取错误信息
            if 'message' in result_str:
                try:
                    import re
                    match = re.search(r"'message': '([^']+)'", result_str)
                    if match:
                        error_msg = match.group(1)
                except:
                    pass
            if not error_msg:
                error_msg = result_str
        
        result = {
            "success": is_success,
            "result": result_str,
            "error": error_msg
        }
        print(f"RESULT:{json.dumps(result, ensure_ascii=False)}")
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        result = {
            "success": False,
            "result": "",
            "error": str(e)
        }
        print(f"RESULT:{json.dumps(result, ensure_ascii=False)}")
        print(f"ERROR:{error_detail}", file=sys.stderr)

if __name__ == "__main__":
    main()
