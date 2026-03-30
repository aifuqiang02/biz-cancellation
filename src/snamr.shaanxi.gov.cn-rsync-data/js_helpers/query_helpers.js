/**
 * DOM查询助手脚本
 * 提供在微信网页版中查询和获取页面元素的工具函数
 */

/**
 * 安全地查询元素，支持多种选择器和重试机制
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Element|null>} 找到的元素或null
 */
function queryElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        function checkElement() {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            if (Date.now() - startTime > timeout) {
                resolve(null);
                return;
            }

            // 继续检查
            setTimeout(checkElement, 100);
        }

        checkElement();
    });
}

/**
 * 查询所有匹配的元素
 * @param {string} selector - CSS选择器
 * @returns {NodeList} 匹配的元素列表
 */
function queryElements(selector) {
    return document.querySelectorAll(selector);
}

/**
 * 等待元素出现并获取其文本内容
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<string|null>} 元素的文本内容或null
 */
function getElementText(selector, timeout = 5000) {
    return queryElement(selector, timeout).then(element => {
        return element ? element.textContent.trim() : null;
    });
}

/**
 * 获取元素的属性值
 * @param {string} selector - CSS选择器
 * @param {string} attribute - 属性名
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<string|null>} 属性值或null
 */
function getElementAttribute(selector, attribute, timeout = 5000) {
    return queryElement(selector, timeout).then(element => {
        return element ? element.getAttribute(attribute) : null;
    });
}

/**
 * 检查元素是否存在
 * @param {string} selector - CSS选择器
 * @returns {boolean} 是否存在
 */
function elementExists(selector) {
    return document.querySelector(selector) !== null;
}

/**
 * 等待页面加载完成
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<boolean>} 是否加载完成
 */
function waitForPageLoad(timeout = 10000) {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve(true);
            return;
        }

        const startTime = Date.now();
        const checkLoad = () => {
            if (document.readyState === 'complete') {
                resolve(true);
                return;
            }

            if (Date.now() - startTime > timeout) {
                resolve(false);
                return;
            }

            setTimeout(checkLoad, 100);
        };

        window.addEventListener('load', () => resolve(true));
        setTimeout(() => resolve(false), timeout);
    });
}

/**
 * 获取页面标题
 * @returns {string} 页面标题
 */
function getPageTitle() {
    return document.title;
}

/**
 * 获取页面URL
 * @returns {string} 页面URL
 */
function getPageUrl() {
    return window.location.href;
}

/**
 * 检查页面是否是微信公众号平台
 * @returns {boolean} 是否是微信公众号平台
 */
function isWeChatMPPage() {
    return window.location.hostname.includes('mp.weixin.qq.com');
}

/**
 * 获取用户信息（如果已登录）
 * @returns {Object|null} 用户信息或null
 */
function getUserInfo() {
    // 尝试从页面中提取用户信息
    // 这需要根据实际的页面结构来调整
    try {
        const userNameElement = document.querySelector('.nickname, .user-name, [data-testid="user-name"]');
        const accountElement = document.querySelector('.account, .user-account, [data-testid="account"]');

        if (userNameElement || accountElement) {
            return {
                name: userNameElement ? userNameElement.textContent.trim() : '',
                account: accountElement ? accountElement.textContent.trim() : '',
                isLoggedIn: true
            };
        }
    } catch (e) {
        // 忽略错误
    }

    return { isLoggedIn: false };
}

// 导出函数供外部调用
window.QueryHelpers = {
    queryElement,
    queryElements,
    getElementText,
    getElementAttribute,
    elementExists,
    waitForPageLoad,
    getPageTitle,
    getPageUrl,
    isWeChatMPPage,
    getUserInfo
};
