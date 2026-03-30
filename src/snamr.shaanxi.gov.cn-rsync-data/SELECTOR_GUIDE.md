# CSS选择器使用指南

## 用户会话选择器

### 确认的正确选择器

经过测试和用户确认，微信私信页面的用户会话使用以下选择器：

```css
.msg-user-item
```

### HTML结构示例

```html
<div class="msg-user-item">艾付强 00:50 怎么称呼你呢</div>
```

### JavaScript使用

```javascript
// 获取所有用户会话
const userElements = document.querySelectorAll('.msg-user-item');

// 获取第一个用户会话
const firstUser = document.querySelector('.msg-user-item');

// 点击第一个用户会话
if (firstUser) {
    firstUser.click();
}
```

## 其他重要选择器

### 私信输入框
```css
div[contenteditable="true"].edit_area
```

### 发送按钮
```css
button.weui-desktop-btn_primary:not(.weui-desktop-btn_disabled)
```

### 聊天消息列表
```css
#msgChatListDiv.chat-msg-list
```

### 更多操作按钮
```css
.more-opr-target, .more-opr-btn
```

### 删除选项
```css
.more-opr-btn  /* 通过JavaScript遍历查找文本内容包含"删除"的元素 */
```

## 调试方法

### 1. 使用程序内置调试
运行程序后点击"调试页面"按钮，查看浏览器控制台输出。

### 2. 浏览器控制台测试
在微信私信页面打开控制台，运行：

```javascript
// 查看所有用户会话
document.querySelectorAll('.msg-user-item')

// 查看第一个用户会话
document.querySelector('.msg-user-item')

// 测试点击
document.querySelector('.msg-user-item').click()
```

### 3. 使用测试脚本
运行 `test_user_selector.js` 中的代码进行调试。

## 注意事项

1. **页面必须完全加载**：确保在私信页面完全加载后再执行选择器
2. **元素可见性**：检查元素是否可见（`offsetWidth > 0 && offsetHeight > 0`）
3. **动态内容**：页面内容可能动态加载，需要适当的等待时间
4. **选择器兼容性**：不同版本的微信页面可能有不同的结构

## 更新日志

- **v1.0.4**: 确认 `.msg-user-item` 为正确的用户会话选择器
- **v1.0.3**: 添加多种选择器支持和调试功能
- **v1.0.2**: 实现私信自动化功能
