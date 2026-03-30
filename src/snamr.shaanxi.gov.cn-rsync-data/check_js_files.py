#!/usr/bin/env python3
"""
检查所有JavaScript文件是否有语法问题
"""

import os
from pathlib import Path

def check_js_files():
    """检查所有JavaScript文件"""
    js_dir = Path(__file__).parent / 'js_helpers'

    if not js_dir.exists():
        print(f"[ERROR] js_helpers目录不存在: {js_dir}")
        return False

    js_files = [
        'query_helpers.js',
        'click_helpers.js',
        'message_helpers.js',
        'session_helpers.js',
        'snamr_helpers.js'
    ]

    for js_file in js_files:
        js_path = js_dir / js_file
        if not js_path.exists():
            print(f"[MISSING] {js_file}")
            continue

        try:
            with open(js_path, 'r', encoding='utf-8') as f:
                content = f.read()

            print(f"\n=== {js_file} ({len(content)} chars) ===")
            print("开头:")
            lines = content.split('\n')
            for i, line in enumerate(lines[:3]):
                print(f"  {i+1}: {line}")

            print("结尾:")
            for i, line in enumerate(lines[-3:]):
                print(f"  {len(lines)-3+i+1}: {line}")

            # 检查基本语法
            open_braces = content.count('{')
            close_braces = content.count('}')
            if open_braces != close_braces:
                print(f"[ERROR] 括号不匹配: {open_braces} 个 '{{', {close_braces} 个 '}}'")

            # 检查是否有未闭合的字符串
            in_string = False
            string_char = None
            for i, char in enumerate(content):
                if char in ['"', "'"] and (i == 0 or content[i-1] != '\\'):
                    if not in_string:
                        in_string = True
                        string_char = char
                    elif char == string_char:
                        in_string = False
                        string_char = None

            if in_string:
                print(f"[ERROR] 未闭合的字符串 (使用 {string_char})")

        except Exception as e:
            print(f"[ERROR] 读取 {js_file} 失败: {e}")

    return True

if __name__ == "__main__":
    check_js_files()
