#!/usr/bin env python
# -*- coding: utf-8 -*-
"""
完整的好友添加脚本
功能：读取待添加列表 → 添加好友 → 更新状态
"""

import sys
import os
import time
import json
import random
import requests
import subprocess
import pythoncom

# API配置
API_BASE_URL = "http://localhost:1007"
API_GET_PENDING = f"{API_BASE_URL}/api/wechat-friend/pending"
API_UPDATE_STATUS = f"{API_BASE_URL}/api/wechat-friend/status"

# 添加消息
ADD_MESSAGE = "陕西营业执照注销咨询"
PERMISSION = "朋友圈"


def log(msg):
    """日志输出"""
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")


def get_pending_user():
    """从API获取一个待添加的用户"""
    try:
        response = requests.get(API_GET_PENDING, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('code') == 200:
                user = data.get('data')
                if user:
                    return user
        log(f"获取待添加用户失败: {response.text}")
        return None
    except Exception as e:
        log(f"调用API获取用户失败: {e}")
        return None


def update_user_status(user_id, status, message=""):
    """更新用户状态"""
    try:
        data = {
            'id': user_id,
            'status': status,
            'message': message or ADD_MESSAGE
        }
        response = requests.post(API_UPDATE_STATUS, json=data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('code') == 200:
                log(f"用户状态已更新为: {status}")
                return True
            else:
                log(f"更新状态失败: {result.get('message')}")
        return False
    except Exception as e:
        log(f"调用API更新状态失败: {e}")
        return False


def add_friend_via_script(phone, name, message):
    """通过外部脚本添加好友"""
    script_path = os.path.join(os.path.dirname(__file__), 'add_friend.py')
    
    try:
        result = subprocess.run(
            [sys.executable, script_path, phone, name, message],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
            timeout=30
        )
        
        output = result.stdout + result.stderr
        
        for line in output.split('\n'):
            if line.startswith('RESULT:'):
                json_str = line[7:].strip()
                try:
                    data = json.loads(json_str)
                    if data['success']:
                        log(f"添加成功: {data['result']}")
                        return True, ""
                    else:
                        log(f"添加失败: {data['error']}")
                        return False, data['error']
                except Exception as e:
                    log(f"解析失败: {e}")
        
        log(f"未找到结果: {output}")
        return False, output
        
    except subprocess.TimeoutExpired:
        log("添加好友超时")
        return False, "超时"
    except Exception as e:
        log(f"添加好友失败: {e}")
        return False, str(e)


def wait_for_next_add(min_interval, max_interval):
    """等待下一次添加"""
    wait_minutes = random.randint(min_interval, max_interval)
    log(f"等待 {wait_minutes} 分钟后继续...")
    return wait_minutes


def main():
    log("=" * 50)
    log("微信好友自动添加程序启动")
    log("=" * 50)
    
    # 初始化COM
    pythoncom.CoInitialize()
    
    # 激活微信窗口（启动时激活一次）
    try:
        import pygetwindow as gw
        wechat_windows = gw.getWindowsWithTitle('微信')
        if wechat_windows:
            w = wechat_windows[0]
            w.activate()
            w.restore()
            log("微信窗口已激活")
    except Exception as e:
        log(f"激活微信窗口失败: {e}")
    
    count = 0
    max_count = 20  # 每次运行最多添加20个
    
    while count < max_count:
        # 1. 获取待添加用户
        log("获取待添加用户...")
        user = get_pending_user()
        
        if not user:
            log("没有待添加的用户，程序结束")
            break
        
        user_id = user.get('id')
        phone = user.get('legalRepresentativePhone', '')
        name = user.get('legalRepresentativeName', '未知')
        company = user.get('companyName', '未知')
        
        log(f"待添加用户: {name}, 手机号: {phone}, 公司: {company}")
        
        # 2. 添加好友
        success, error_msg = add_friend_via_script(phone, name, ADD_MESSAGE)
        
        if success:
            # 3. 更新状态为"已发送"
            update_user_status(user_id, "已发送", ADD_MESSAGE)
            count += 1
            log(f"添加成功! 已添加 {count} 个")
        else:
            # 添加失败，更新状态
            # 检查是否是频繁错误
            if '过于频繁' in error_msg:
                log(f"微信限制，等待30分钟后重试...")
                update_user_status(user_id, "等待重试", error_msg)
                time.sleep(30 * 60)  # 等待30分钟
                continue
            elif '未找到' in error_msg or '没有搜索到' in error_msg:
                # 搜索不到用户，可能是手机号不对，跳过
                log(f"搜索不到用户，跳过")
                update_user_status(user_id, "搜索失败", error_msg)
            else:
                update_user_status(user_id, "添加失败", error_msg)
                log(f"添加失败: {error_msg}")
        
        # 4. 等待间隔
        if count < max_count:
            wait_minutes = wait_for_next_add(40, 80)  # 40-80分钟随机间隔
            log(f"等待 {wait_minutes} 分钟...")
            time.sleep(wait_minutes * 60)
    
    log("=" * 50)
    log(f"程序结束，共添加 {count} 个好友")
    log("=" * 50)


if __name__ == "__main__":
    main()
