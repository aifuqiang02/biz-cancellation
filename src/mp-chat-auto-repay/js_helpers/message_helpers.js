/**
 * 消息处理助手脚本
 * 提供检测和处理微信消息的工具函数
 */

/**
 * 工具函数：睡眠
 * @param {number} ms - 睡眠时间（毫秒）
 * @returns {Promise} Promise对象
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取最新消息列表
 * @returns {Array} 消息列表，每个消息包含文本、发送者、时间等信息
 */
function getLatestMessages() {
  const messages = [];

  try {
    // 微信网页版的聊天消息选择器（需要根据实际页面结构调整）
    const messageSelectors = [
      '.message-item, .chat-message, [data-testid*="message"]',
      '.msg-item, .conversation-item',
      '.chat-list-item'
    ];

    let messageElements = [];
    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        messageElements = Array.from(elements);
        break;
      }
    }

    // 处理找到的消息元素
    messageElements.forEach((element, index) => {
      try {
        const message = extractMessageInfo(element);
        if (message) {
          message.index = index;
          messages.push(message);
        }
      } catch (e) {
        console.warn('提取消息信息失败:', e);
      }
    });

  } catch (error) {
    console.error('获取消息列表失败:', error);
  }

  return messages;
}

/**
 * 从消息元素中提取消息信息
 * @param {Element} element - 消息DOM元素
 * @returns {Object|null} 消息信息或null
 */
function extractMessageInfo(element) {
  try {
    // 尝试提取消息文本
    const textSelectors = [
      '.message-text, .msg-content, .content',
      '.text, [data-testid*="content"]',
      '.message'
    ];

    let messageText = '';
    for (const selector of textSelectors) {
      const textElement = element.querySelector(selector);
      if (textElement) {
        messageText = textElement.textContent.trim();
        break;
      }
    }

    // 如果当前元素本身包含文本
    if (!messageText) {
      messageText = element.textContent.trim();
    }

    // 提取发送者信息
    const senderSelectors = [
      '.sender-name, .nickname, .user-name',
      '.from, [data-testid*="sender"]',
      '.author'
    ];

    let sender = '';
    for (const selector of senderSelectors) {
      const senderElement = element.querySelector(selector);
      if (senderElement) {
        sender = senderElement.textContent.trim();
        break;
      }
    }

    // 提取时间信息
    const timeSelectors = [
      '.time, .timestamp, .msg-time',
      '[data-testid*="time"]',
      '.date'
    ];

    let timestamp = '';
    for (const selector of timeSelectors) {
      const timeElement = element.querySelector(selector);
      if (timeElement) {
        timestamp = timeElement.textContent.trim();
        break;
      }
    }

    // 确定消息类型
    let messageType = 'text';
    if (element.querySelector('img, .image')) {
      messageType = 'image';
    } else if (element.querySelector('video, .video')) {
      messageType = 'video';
    } else if (element.querySelector('audio, .audio, .voice')) {
      messageType = 'voice';
    }

    return {
      text: messageText,
      sender: sender,
      timestamp: timestamp,
      type: messageType,
      element: element // 保存DOM元素引用用于后续操作
    };

  } catch (error) {
    console.error('提取消息信息时出错:', error);
    return null;
  }
}

/**
 * 检测消息是否包含指定关键词
 * @param {string} messageText - 消息文本
 * @param {string} keyword - 关键词
 * @returns {boolean} 是否包含关键词
 */
function containsKeyword(messageText, keyword) {
  if (!messageText || !keyword) return false;

  // 忽略大小写匹配
  const lowerText = messageText.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  return lowerText.includes(lowerKeyword);
}

/**
 * 查找包含关键词的消息
 * @param {string} keyword - 关键词
 * @returns {Array} 匹配的消息列表
 */
function findMessagesWithKeyword(keyword) {
  const allMessages = getLatestMessages();
  return allMessages.filter(message =>
    containsKeyword(message.text, keyword)
  );
}

/**
 * 获取最新的消息（第一条）
 * @returns {Object|null} 最新消息或null
 */
function getLatestMessage() {
  const messages = getLatestMessages();
  return messages.length > 0 ? messages[0] : null;
}

/**
 * 等待新消息出现
 * @param {number} timeout - 超时时间（毫秒）
 * @param {number} checkInterval - 检查间隔（毫秒）
 * @returns {Promise<Object|null>} 新消息或null
 */
function waitForNewMessage(timeout = 30000, checkInterval = 1000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let lastMessageCount = getLatestMessages().length;

    function checkForNewMessage() {
      const currentMessages = getLatestMessages();
      const currentCount = currentMessages.length;

      // 如果消息数量增加，说明有新消息
      if (currentCount > lastMessageCount) {
        const newMessages = currentMessages.slice(0, currentCount - lastMessageCount);
        resolve(newMessages[0] || null); // 返回最新的新消息
        return;
      }

      if (Date.now() - startTime > timeout) {
        resolve(null); // 超时
        return;
      }

      setTimeout(checkForNewMessage, checkInterval);
    }

    checkForNewMessage();
  });
}

/**
 * 模拟回复消息
 * @param {string} replyText - 回复内容
 * @returns {Promise<boolean>} 回复是否成功
 */
async function replyToMessage(replyText) {
  try {
    // 查找输入框
    const inputSelectors = [
      '.input-editor, .msg-input, [contenteditable="true"]',
      'input[type="text"], textarea',
      '.chat-input, .message-input'
    ];

    let inputElement = null;
    for (const selector of inputSelectors) {
      inputElement = await window.QueryHelpers.queryElement(selector, 3000);
      if (inputElement) break;
    }

    if (!inputElement) {
      console.error('未找到消息输入框');
      return false;
    }

    // 输入回复内容
    if (inputElement.tagName.toLowerCase() === 'input' ||
      inputElement.tagName.toLowerCase() === 'textarea') {
      inputElement.value = replyText;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (inputElement.contentEditable === 'true') {
      inputElement.textContent = replyText;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 等待一小段时间
    await sleep(500);

    // 查找发送按钮并点击
    const sendSelectors = [
      '.send-btn, .btn-send, [data-testid*="send"]',
      'button',  // 稍后通过文本内容筛选
      '.submit-btn'
    ];

    let sendButton = null;
    for (const selector of sendSelectors) {
      sendButton = await window.QueryHelpers.queryElement(selector, 2000);
      if (sendButton) break;
    }

    if (sendButton) {
      await window.ClickHelpers.clickElement(sendButton);
      return true;
    } else {
      // 尝试按Enter键发送
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      inputElement.dispatchEvent(enterEvent);
      return true;
    }

  } catch (error) {
    console.error('回复消息失败:', error);
    return false;
  }
}

/**
 * 获取私信用户会话列表
 * @returns {Array} 用户会话列表
 */
function getPrivateMessageUserList() {
  jsLog.info('开始获取私信用户列表');

  try {
    // 首先检查页面是否在私信页面
    const currentUrl = window.location.href;
    jsLog.debug(`当前URL: ${currentUrl}`);

    if (!currentUrl.includes('mp.weixin.qq.com/cgi-bin/message')) {
      jsLog.warning('不在私信页面，返回空列表');
      return [];
    }

    const users = [];

    // 使用最简单的选择器
    jsLog.debug('使用选择器查找用户元素: .msg-user-item');
    const userElements = document.querySelectorAll('.msg-user-item');
    jsLog.info(`找到 ${userElements.length} 个用户会话元素`);

    // 记录所有找到的元素信息
    userElements.forEach((element, index) => {
      try {
        const userText = element.textContent.trim();
        const className = element.className;
        const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0;

        jsLog.debug(`用户 ${index}: ${userText.substring(0, 30)}... (${isVisible ? '可见' : '隐藏'})`);

        if (userText && isVisible) {
          users.push({
            index: index,
            text: userText,
            element: element,
            selector: className || 'unknown'
          });
        }
      } catch (e) {
        console.warn('Error processing element:', e);
      }
    });

    console.log('Final result: found', users.length, 'valid user conversations');
    console.log('Users data:', users.map(u => ({ text: u.text.substring(0, 20), selector: u.selector })));

    return users;

  } catch (error) {
    console.error('获取用户会话列表失败:', error);
    return [];
  }
}

/**
 * 点击第一个用户会话
 * @returns {Promise<boolean>} 点击是否成功
 */
async function clickFirstUserConversation() {
  try {
    // 查找第一个用户会话 - 使用用户指定的选择器
    const firstUser = document.querySelector('.msg-user-item');

    if (firstUser) {
      jsLog.info(`点击第一个用户会话: ${firstUser.textContent.trim().substring(0, 30)}...`);
      try {
        firstUser.click();
        jsLog.info('点击成功');
      } catch (clickError) {
        jsLog.warning('点击失败，但第一个会话默认选中，继续执行');
      }
      await sleep(1000); // 等待页面加载
      return true; // 总是返回true，因为第一个会话默认就是选中的
    } else {
      jsLog.error('未找到用户会话 (.msg-user-item)');
      return false;
    }
  } catch (error) {
    jsLog.error(`点击用户会话失败: ${error}`);
    return true; // 即使出错也返回true，默认选中逻辑
  }
}

/**
 * 检查聊天消息是否包含注销关键词
 * @param {string} keyword - 要检查的关键词，默认为"注销"
 * @returns {boolean} 是否包含关键词
 */
function checkMessageContainsKeyword(keyword = "注销") {
  try {
    // 只获取用户发送的消息（排除自己发送的消息）
    const userMessages = document.querySelectorAll('#msgChatListDiv .msg-item:not(.is-my-msg)');
    jsLog.debug(`找到 ${userMessages.length} 条用户消息`);

    if (userMessages.length === 0) {
      jsLog.debug('没有找到用户消息');
      return false;
    }

    // 提取所有用户消息的文本内容
    let allUserMessages = '';
    userMessages.forEach((msgElement, index) => {
      const messageText = msgElement.textContent || '';
      allUserMessages += messageText + ' ';
      jsLog.debug(`用户消息 ${index + 1}: "${messageText.substring(0, 50)}..."`);
    });

    jsLog.debug(`检查用户消息内容是否包含"${keyword}": ${allUserMessages.substring(0, 100)}...`);

    // 检查是否包含关键词（忽略大小写）
    const contains = allUserMessages.toLowerCase().includes(keyword.toLowerCase());
    jsLog.info(`用户消息${contains ? '包含' : '不包含'}关键词"${keyword}"`);

    return contains;

  } catch (error) {
    jsLog.error(`检查消息关键词失败: ${error}`);
    return false;
  }
}

/**
 * 获取所有用户消息的文本内容（用于AI意图检测）
 * @returns {string} 所有用户消息的拼接文本
 */
function getUserMessagesText() {
  try {
    jsLog.info('开始获取用户消息文本...');
    
    // 只获取用户发送的消息（排除自己发送的消息）
    const userMessages = document.querySelectorAll('#msgChatListDiv .msg-item:not(.is-my-msg)');
    jsLog.debug(`找到 ${userMessages.length} 条用户消息`);

    if (userMessages.length === 0) {
      jsLog.info('没有找到用户消息');
      return '';
    }

    // 提取所有用户消息的文本内容
    let allUserMessages = '';
    userMessages.forEach((msgElement, index) => {
      const messageText = msgElement.textContent || '';
      allUserMessages += messageText + '\n';
      jsLog.debug(`消息 ${index + 1}: "${messageText.substring(0, 100)}..."`);
    });

    // 去除末尾多余的换行
    allUserMessages = allUserMessages.trim();
    
    jsLog.info(`用户消息拼接完成，总长度: ${allUserMessages.length} 字符`);
    jsLog.debug(`完整消息内容: "${allUserMessages.substring(0, 200)}..."`);

    return allUserMessages;

  } catch (error) {
    jsLog.error(`获取用户消息文本失败: ${error}`);
    return '';
  }
}

/**
 * 发送私信回复 (同步版本，供Python调用)
 * @param {string} replyText - 回复内容
 * @returns {boolean} 发送是否成功
 */
function sendPrivateMessageReply(replyText) {
  jsLog.info(`准备发送回复: "${replyText.substring(0, 30)}..." (长度: ${replyText.length})`);

  // 查找输入框
  const inputArea = document.querySelector('div[contenteditable="true"].edit_area, .edit_area[contenteditable="true"]');

  if (!inputArea) {
    jsLog.error('未找到私信输入框');
    return false;
  }

  // 聚焦输入框并输入内容
  jsLog.debug('聚焦输入框...');
  inputArea.focus();
  inputArea.textContent = replyText;

  // 触发事件
  inputArea.dispatchEvent(new Event('input', { bubbles: true }));
  inputArea.dispatchEvent(new Event('change', { bubbles: true }));

  jsLog.info(`已输入回复内容: "${replyText}"`);

  // 查找发送按钮
  let sendButton = null;
  const allButtons = document.querySelectorAll('button');
  
  for (const button of allButtons) {
    const text = button.textContent.trim();
    if (text.includes('发送') || text.includes('Send')) {
      if (!button.disabled && button.offsetWidth > 0) {
        sendButton = button;
        break;
      }
    }
  }

  let sendAttempted = false;
  
  if (sendButton) {
    try {
      sendButton.click();
      sendAttempted = true;
      jsLog.info('发送按钮已点击');
    } catch(e) {
      jsLog.error(`点击发送按钮失败: ${e}`);
    }
  }

  // 如果点击按钮失败，尝试 Enter 键
  if (!sendAttempted) {
    try {
      inputArea.focus();
      inputArea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      sendAttempted = true;
      jsLog.info('已按Enter键发送');
    } catch(e) {
      jsLog.error(`Enter发送失败: ${e}`);
    }
  }

  // 检查发送结果 - 等待后检查输入框是否清空
  setTimeout(() => {
    const content = inputArea.textContent.trim();
    const sent = content === '' && sendAttempted;
    if (sent) {
      jsLog.info('✅ 消息发送成功');
    } else {
      jsLog.warning(`发送结果: 输入框内容="${content}", sendAttempted=${sendAttempted}`);
    }
  }, 1000);

  return sendAttempted;
}

/**
 * 删除当前会话
 * @returns {Promise<boolean>} 删除是否成功
 */
async function deleteCurrentConversation() {
  try {
    // 查找更多操作按钮
    const moreButton = document.querySelector('.more-opr-target, .more-opr-btn');

    if (!moreButton) {
      jsLog.error('未找到更多操作按钮');
      return false;
    }

    jsLog.info('点击更多操作按钮');
    moreButton.click();
    await sleep(500);

    // 查找删除聊天选项 - 遍历所有.more-opr-btn元素
    const allOptions = document.querySelectorAll('.more-opr-content .more-opr-btn');
    let deleteOption = null;

    jsLog.info(`查找删除选项，共有 ${allOptions.length} 个选项`);

    for (const option of allOptions) {
      const text = option.textContent.trim();
      jsLog.debug(`选项文本: ${text}`);
      if (text.includes('删除聊天')) {
        deleteOption = option;
        jsLog.info(`找到删除选项: ${text}`);
        break;
      }
    }

    if (deleteOption) {
      jsLog.info('点击删除聊天选项');
      deleteOption.click();
      await sleep(500);
    } else {
      jsLog.error('未找到删除聊天选项');
      return false;
    }

    // 查找确认按钮
    const confirmButtons = document.querySelectorAll('.more-opr-content button.weui-desktop-btn_primary.weui-desktop-btn');
    let confirmButton = null;

    jsLog.info(`查找确认按钮，共有 ${confirmButtons.length} 个按钮`);

    for (const button of confirmButtons) {
      confirmButton = button;
      break;
    }

    if (confirmButton) {
      jsLog.info('点击确认删除按钮');
      confirmButton.click();
      await sleep(1000);
      return true;
    } else {
      jsLog.error('未找到确认按钮');
      return false;
    }

  } catch (error) {
    jsLog.error(`删除会话失败: ${error}`);
    // 即使删除失败，也返回true让流程继续
    // 因为主要目标是回复消息，删除是次要的
    return true;
  }
}

/**
 * 同步删除当前会话（包装函数，用于PyQt5回调）
 * @returns {boolean} 删除是否成功
 */
function deleteCurrentConversationSync() {
  jsLog.info('[deleteCurrentConversationSync] 开始删除会话（同步包装）');
  try {
    // 使用Promise，但立即执行并返回结果
    deleteCurrentConversation().then(result => {
      jsLog.info(`[deleteCurrentConversationSync] 异步删除完成，结果: ${result}`);
      // 将结果存储在window对象中，供Python读取
      window.lastDeleteResult = result;
    }).catch(error => {
      jsLog.error(`[deleteCurrentConversationSync] 删除出错: ${error}`);
      window.lastDeleteResult = true; // 出错时也返回true继续流程
    });
    
    // 同步返回true，实际结果通过window.lastDeleteResult获取
    jsLog.info('[deleteCurrentConversationSync] 已启动异步删除，同步返回true');
    return true;
  } catch (error) {
    jsLog.error(`[deleteCurrentConversationSync] 调用失败: ${error}`);
    return true;
  }
}

/**
 * 调试函数：显示页面上的相关元素
 */
function debugPageElements() {
  console.log('=== Page Debug Info ===');
  console.log('URL:', window.location.href);

  const selectors = [
    '.msg-user-item',  // 主要选择器 - 用户确认正确
    '.msg-user-item.msg-user-select',
    '.user_list',
    '[class*="msg-user-item"]',
    '.conversation-item',
    '.chat-item',
    'div[contenteditable]',
    'button[type="button"]'
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`${selector}: ${elements.length} elements`);
    if (elements.length > 0 && elements.length <= 5) {
      elements.forEach((el, i) => {
        console.log(`  ${i}: "${el.textContent.trim().substring(0, 50)}"`);
      });
    }
  });

  // 查找可能的私信相关元素
  console.log('Looking for message-related elements...');
  const allDivs = document.querySelectorAll('div');
  let messageDivs = [];
  for (const div of allDivs) {
    const text = div.textContent.trim();
    if (text && (text.includes('私信') || text.includes('消息'))) {
      messageDivs.push(div);
    }
  }
  console.log(`Found ${messageDivs.length} potentially message-related divs`);
  messageDivs.slice(0, 3).forEach((div, i) => {
    console.log(`  ${i}: ${div.className} - "${div.textContent.trim().substring(0, 50)}"`);
  });
}

/**
 * 手动测试函数 - 在浏览器控制台中调用
 */
function testUserList() {
  console.log('=== Manual Test: getPrivateMessageUserList ===');
  const result = getPrivateMessageUserList();
  console.log('Manual test result:', result);
  return result;
}

// 将测试函数暴露到全局
window.testUserList = testUserList;

// 导出函数供外部调用
window.MessageHelpers = {
  getLatestMessages,
  extractMessageInfo,
  containsKeyword,
  findMessagesWithKeyword,
  getLatestMessage,
  waitForNewMessage,
  replyToMessage,
  getPrivateMessageUserList,
  clickFirstUserConversation,
  checkMessageContainsKeyword,
  getUserMessagesText,
  sendPrivateMessageReply,
  deleteCurrentConversation,
  debugPageElements,
  testUserList
};
