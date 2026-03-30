# 微信服务号自动化回复程序

基于 PyQt6 + QtWebEngine 实现的微信服务号自动化管理系统，能够自动检测用户消息、回复并删除会话。

## 功能特性

- 图形化界面 + 内嵌浏览器
- 自动检测关键词消息并回复
- 自动删除处理过的会话
- 实时日志记录（包含JavaScript调试日志）
- 可配置的参数设置
- 私信页面快速访问（自动获取token）
- 全自动私信处理（检测回复删除）
- JavaScript日志同步显示，无需打开控制台调试
- 完善的错误处理和调试信息
- 多重JavaScript回调兼容机制，支持不同PyQt5版本
- 完善的信号连接错误处理和降级机制
- 优化JavaScript注入时机，确保在页面完全加载后注入
- 移除复杂回调处理器依赖，使用稳定的备选日志方案
- 实现JavaScript日志缓冲区机制，定期同步日志到界面
- 修复JavaScript回调函数未定义错误
- 智能发送状态判断，即使JavaScript报告失败也会继续流程
- 精确的消息检测，只检查用户发送的消息内容

## 环境要求

- Python 3.10+
- Windows/Linux/macOS
- 已测试：PyQt5 + PyQtWebEngine（兼容性更好）

### 快速开始（推荐）
1. **自动配置环境**：
   ```cmd
   install_deps.bat
   ```

2. **一键启动程序**：
   ```cmd
   start_program.cmd
   ```

### 其他启动方式

**手动激活环境后运行**：
```cmd
activate_venv.bat
venv\Scripts\python.exe app/main.py
```

**使用PowerShell**：
```powershell
.\activate_venv.ps1
venv\Scripts\python.exe app/main.py
```

**强制使用虚拟环境**：
```cmd
python run_venv.py
```

## 使用方法

1. **激活环境**：`activate_venv.bat`
2. **启动程序**：`python run.py`
3. **手动登录**：点击"加载微信网页版"按钮并登录
4. **私信功能**：点击"私信"按钮访问用户私信页面
5. **配置参数**：设置关键词、回复内容、刷新间隔等
6. **调试页面**：点击"调试页面"按钮查看页面元素信息
7. **开始自动化**：点击"开始自动化"按钮（按设置的间隔自动处理私信）
8. **监控日志**：查看实时操作日志

## 项目结构

```
mp-chat-auto-repay/
├── app/                 # 核心应用代码
├── js_helpers/          # JavaScript助手脚本
├── venv/                # 虚拟环境
├── logs/                # 日志文件
├── requirements.txt     # 依赖配置
├── start_program.cmd    # 一键启动脚本(推荐)
├── test_pyqt.py         # PyQt组件测试脚本
├── activate_venv.bat    # 环境激活脚本(CMD)
├── activate_venv.ps1    # 环境激活脚本(PowerShell)
├── .gitignore           # Git忽略配置
├── SELECTOR_GUIDE.md    # CSS选择器使用指南
└── README.md            # 说明文档
```

## 工作原理

程序通过内嵌浏览器访问微信网页版，提供两种工作模式：

**手动模式**：
- 手动点击按钮进行各项操作
- 适合测试和单次操作

**自动化模式**：
- 点击"开始自动化"后按设置间隔执行完整流程：
  1. 刷新私信页面
  2. 检查是否有用户会话
  3. 点击第一个用户会话
  4. 检查消息是否包含"注销"关键词
  5. 如包含则自动回复
  6. 删除会话（无论是否发送了回复）

## 配置说明

- **刷新间隔**：建议30-120秒
- **关键词**：支持中文，如"注销"
- **回复内容**：自定义回复消息
- **操作确认**：可开启/关闭敏感操作确认

## 注意事项

- 合规使用，确保符合微信平台服务条款
- 定期检查日志，监控自动化行为
- 需要保持登录状态，程序重启后需重新登录

### 故障排除

#### 虚拟环境问题
- **激活失败 ("系统找不到指定的路径")**：
  - 确保虚拟环境已创建：`python -m venv venv`
  - 检查路径是否正确，虚拟环境应在项目根目录下
  - 使用绝对路径：`call D:\path\to\project\venv\Scripts\activate.bat`

- **中文字符乱码**：
  - 脚本已修复编码问题，如仍有问题请使用英文输出版本
  - 或手动在命令行中设置：`chcp 65001`

#### 依赖安装问题
- **PyQt5安装失败**：
  - 使用预编译版本：`pip install PyQt5 PyQtWebEngine --only-binary=all`
  - 或升级pip：`python -m pip install --upgrade pip`

- **其他依赖失败**：
  - 重新运行：`pip install -r requirements.txt`
  - 检查Python版本 (需要3.10+)

- **程序已切换到PyQt5**：
  - PyQt5比PyQt6更稳定，兼容性更好
  - 如果遇到问题，请使用：`test_pyqt.py` 测试组件

#### 虚拟环境问题（重要）
- **显示(base)环境仍激活**：
  - 使用一键启动脚本：`start_program.cmd`（推荐）
  - 或重新打开CMD窗口运行：`activate_venv.bat`
  - 或使用：`python run_venv.py`（强制使用虚拟环境）

- **PyQt5-WebEngine安装失败**：
  - 运行：`start_program.cmd`（会自动检查并安装）
  - 或手动：`pip install PyQtWebEngine --force-reinstall`
  - 使用预编译版本：`pip install PyQtWebEngine --only-binary=all`

- **PowerShell环境混乱**：
  - 使用CMD而不是PowerShell：`start_program.cmd`
  - 或重新打开PowerShell窗口

#### 程序运行问题
- **无法加载页面**：检查网络连接和微信服务状态
- **脚本执行失败**：可能是页面结构变更，需更新选择器
- **登录失效**：重新手动登录微信

- **选择器问题**：
- **找不到用户会话**：确认使用 `.msg-user-item` 选择器
- **调试选择器**：点击"调试页面"按钮或查看 `SELECTOR_GUIDE.md`
- **页面结构变更**：微信页面更新时可能需要调整选择器

- **JavaScript回调问题**：
- **`window.pyqtCallback is not a function`**：这是已修复的问题
- **`javaScriptWindowObjectCleared` 属性不存在**：PyQt5兼容性问题已修复
- **程序版本**：使用PyQt5版本，无需担心此错误
- **手动测试**：在浏览器控制台运行 `window.testUserList()` 测试函数

## 更新日志

### v1.0.1 (2026-01-10)
- ✅ 程序成功运行！支持完整的自动化功能
- 修复环境配置问题，支持虚拟环境隔离
- 从PyQt6切换到PyQt5，提高兼容性和稳定性
- 添加多种启动方式：`start_program.cmd`、`python run.py`、`venv\Scripts\python.exe app/main.py`
- 添加调试脚本：`test_pyqt.py`、`test_venv.bat`
- 完善故障排除指南和环境配置说明

### v1.0.2 (2026-01-11)
- 🚀 添加全自动私信处理功能
- 实现完整的自动化流程：刷新→检查会话→点击用户→检测关键词→自动回复→删除会话
- 按设置间隔自动执行完整流程，无需人工干预
- 添加私信页面快速访问功能（自动获取token）
- 优化UI布局，浏览器区域更大，按钮更紧凑
- 新增JavaScript助手函数支持DOM操作
- 添加自动化功能测试脚本

### v1.0.3 (2026-01-11)
- 🔧 修复用户会话检测问题，改进CSS选择器和调试功能
- 添加页面元素调试功能，自动分析DOM结构
- 增强JavaScript错误处理，防止None值导致崩溃
- 添加"调试页面"按钮，便于排查页面元素问题
- 改进选择器策略，支持多种页面结构
- 添加详细的调试日志和元素可见性检查

### v1.0.5 (2026-01-11)
- 🎯 确认正确的CSS选择器：`.msg-user-item`
- 优化用户会话检测算法，使用用户提供的准确选择器
- 改进元素点击和内容检测逻辑
- 添加选择器测试脚本，便于调试
- 🔧 重大简化：移除复杂的PyQt5回调机制
- 采用直接JavaScript注入方式，提高兼容性
- 修复所有PyQt5兼容性问题
- 💡 优化点击逻辑：第一个会话默认选中，点击失败不影响流程
- 🔄 改进删除策略：无论消息是否包含关键词，都删除会话
- 🔧 修复CSS选择器：移除不支持的:contains伪类，使用DOM遍历

### v1.0.0 (2024-01-XX)
- 初始版本发布
- 实现基本自动化功能
- 支持消息检测和自动回复
- 提供图形化界面和日志系统

## 许可证

本项目仅供学习和研究使用，请勿用于商业用途。
