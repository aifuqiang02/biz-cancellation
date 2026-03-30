/**
 * 会话管理助手脚本
 * 提供删除会话、管理会话列表的工具函数
 */

/**
 * 获取会话列表
 * @returns {Array} 会话列表
 */
function getSessionList() {
    const sessions = [];

    try {
        // 微信网页版的会话列表选择器（需要根据实际页面结构调整）
        const sessionSelectors = [
            '.session-item, .chat-item, .conversation-item',
            '.contact-item, .friend-item',
            '[data-testid*="session"], [data-testid*="chat"]'
        ];

        let sessionElements = [];
        for (const selector of sessionSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                sessionElements = Array.from(elements);
                break;
            }
        }

        // 处理找到的会话元素
        sessionElements.forEach((element, index) => {
            try {
                const session = extractSessionInfo(element);
                if (session) {
                    session.index = index;
                    sessions.push(session);
                }
            } catch (e) {
                console.warn('提取会话信息失败:', e);
            }
        });

    } catch (error) {
        console.error('获取会话列表失败:', error);
    }

    return sessions;
}

/**
 * 从会话元素中提取会话信息
 * @param {Element} element - 会话DOM元素
 * @returns {Object|null} 会话信息或null
 */
function extractSessionInfo(element) {
    try {
        // 提取会话名称
        const nameSelectors = [
            '.session-name, .chat-name, .nickname',
            '.title, .name',
            '[data-testid*="name"]'
        ];

        let sessionName = '';
        for (const selector of nameSelectors) {
            const nameElement = element.querySelector(selector);
            if (nameElement) {
                sessionName = nameElement.textContent.trim();
                break;
            }
        }

        // 如果当前元素本身包含名称
        if (!sessionName) {
            sessionName = element.textContent.trim();
        }

        // 提取最后消息预览
        const previewSelectors = [
            '.last-message, .preview, .summary',
            '.msg-preview, .chat-preview',
            '[data-testid*="preview"]'
        ];

        let lastMessage = '';
        for (const selector of previewSelectors) {
            const previewElement = element.querySelector(selector);
            if (previewElement) {
                lastMessage = previewElement.textContent.trim();
                break;
            }
        }

        // 提取未读消息数量
        const unreadSelectors = [
            '.unread-count, .badge, .notification',
            '[data-testid*="unread"]',
            '.count'
        ];

        let unreadCount = 0;
        for (const selector of unreadSelectors) {
            const unreadElement = element.querySelector(selector);
            if (unreadElement) {
                const countText = unreadElement.textContent.trim();
                unreadCount = parseInt(countText) || 0;
                break;
            }
        }

        return {
            name: sessionName,
            lastMessage: lastMessage,
            unreadCount: unreadCount,
            element: element // 保存DOM元素引用用于后续操作
        };

    } catch (error) {
        console.error('提取会话信息时出错:', error);
        return null;
    }
}

/**
 * 查找指定名称的会话
 * @param {string} sessionName - 会话名称
 * @returns {Object|null} 会话信息或null
 */
function findSessionByName(sessionName) {
    const sessions = getSessionList();
    return sessions.find(session =>
        session.name.toLowerCase().includes(sessionName.toLowerCase())
    ) || null;
}

/**
 * 删除指定的会话
 * @param {string} sessionName - 会话名称
 * @returns {Promise<boolean>} 删除是否成功
 */
async function deleteSession(sessionName) {
    try {
        console.log(`尝试删除会话: ${sessionName}`);

        // 查找会话
        const session = findSessionByName(sessionName);
        if (!session) {
            console.warn(`未找到会话: ${sessionName}`);
            return false;
        }

        // 右键点击会话以显示上下文菜单
        const success = await window.ClickHelpers.rightClickElement(session.element);
        if (!success) {
            console.error('无法打开会话上下文菜单');
            return false;
        }

        // 等待上下文菜单出现
        await window.ClickHelpers.sleep(500);

        // 查找删除选项并点击
        const deleteSelectors = [
            '.delete-option, .remove-option, .delete-menu-item',
            '[data-testid*="delete"], [data-testid*="remove"]',
            '.context-menu .delete'
        ];

        let deleteOption = null;
        for (const selector of deleteSelectors) {
            deleteOption = await window.QueryHelpers.queryElement(selector, 2000);
            if (deleteOption) break;
        }

        // 如果没找到，通过文本内容查找
        if (!deleteOption) {
            const menuItems = document.querySelectorAll('menu, .menu-item, .context-menu-item');
            for (const item of menuItems) {
                const text = item.textContent || '';
                if (text.includes('删除') || text.includes('移除') || text.includes('Delete') || text.includes('Remove')) {
                    deleteOption = item;
                    break;
                }
            }
        }

        if (deleteOption) {
            await window.ClickHelpers.clickElement(deleteOption);
        } else {
            console.error('未找到删除选项');
            return false;
        }

        // 等待删除确认对话框
        await window.ClickHelpers.sleep(500);

        // 查找确认按钮
        const confirmSelectors = [
            '.confirm-btn, .ok-btn, .yes-btn',
            '[data-testid*="confirm"], [data-testid*="ok"]',
            '.modal .confirm'
        ];

        let confirmButton = null;
        for (const selector of confirmSelectors) {
            confirmButton = await window.QueryHelpers.queryElement(selector, 2000);
            if (confirmButton) break;
        }

        // 如果没找到，通过文本内容查找
        if (!confirmButton) {
            const buttons = document.querySelectorAll('button, .btn, [role="button"]');
            for (const button of buttons) {
                const text = button.textContent || '';
                if (text.includes('确认') || text.includes('确定') || text.includes('Confirm') || text.includes('OK')) {
                    confirmButton = button;
                    break;
                }
            }
        }

        if (confirmButton) {
            await window.ClickHelpers.clickElement(confirmButton);
            console.log(`会话 "${sessionName}" 删除成功`);
            return true;
        } else {
            // 有些界面可能不需要确认，直接删除
            console.log(`会话 "${sessionName}" 已执行删除操作`);
            return true;
        }

    } catch (error) {
        console.error('删除会话失败:', error);
        return false;
    }
}

/**
 * 批量删除会话
 * @param {Array<string>} sessionNames - 会话名称列表
 * @param {number} delay - 删除间隔延时（毫秒）
 * @returns {Promise<Array<Object>>} 删除结果列表
 */
async function deleteMultipleSessions(sessionNames, delay = 1000) {
    const results = [];

    for (const sessionName of sessionNames) {
        try {
            const success = await deleteSession(sessionName);
            results.push({
                name: sessionName,
                success: success
            });

            // 添加延时避免操作过快
            if (delay > 0) {
                await window.ClickHelpers.sleep(delay);
            }
        } catch (error) {
            console.error(`删除会话 "${sessionName}" 时出错:`, error);
            results.push({
                name: sessionName,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

/**
 * 标记会话为已读
 * @param {string} sessionName - 会话名称
 * @returns {Promise<boolean>} 标记是否成功
 */
async function markSessionAsRead(sessionName) {
    try {
        const session = findSessionByName(sessionName);
        if (!session) {
            console.warn(`未找到会话: ${sessionName}`);
            return false;
        }

        // 直接点击会话以打开它（通常会清除未读标记）
        await window.ClickHelpers.clickElement(session.element);
        await window.ClickHelpers.sleep(500);

        return true;
    } catch (error) {
        console.error('标记会话已读失败:', error);
        return false;
    }
}

/**
 * 获取未读消息数量总计
 * @returns {number} 未读消息总数
 */
function getTotalUnreadCount() {
    const sessions = getSessionList();
    return sessions.reduce((total, session) => total + (session.unreadCount || 0), 0);
}

/**
 * 获取有未读消息的会话
 * @returns {Array} 有未读消息的会话列表
 */
function getSessionsWithUnread() {
    const sessions = getSessionList();
    return sessions.filter(session => session.unreadCount > 0);
}

// 导出函数供外部调用
window.SessionHelpers = {
    getSessionList,
    extractSessionInfo,
    findSessionByName,
    deleteSession,
    deleteMultipleSessions,
    markSessionAsRead,
    getTotalUnreadCount,
    getSessionsWithUnread
};
