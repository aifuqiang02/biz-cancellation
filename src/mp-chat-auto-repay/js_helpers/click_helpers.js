/**
 * 点击操作助手脚本
 * 提供在微信网页版中执行点击操作的工具函数
 */

/**
 * 安全地点击元素
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 等待元素出现的超时时间（毫秒）
 * @returns {Promise<boolean>} 点击是否成功
 */
function clickElement(selector, timeout = 5000) {
    return new Promise(async (resolve) => {
        try {
            const element = await window.QueryHelpers.queryElement(selector, timeout);
            if (!element) {
                resolve(false);
                return;
            }

            // 检查元素是否可见
            if (!isElementVisible(element)) {
                // 尝试滚动到元素位置
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 等待滚动完成
                await sleep(500);
            }

            // 触发点击事件
            element.click();

            // 也触发鼠标事件以模拟真实点击
            const mouseEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(mouseEvent);

            resolve(true);
        } catch (error) {
            console.error('点击元素失败:', error);
            resolve(false);
        }
    });
}

/**
 * 通过坐标点击（备用方法）
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @returns {Promise<boolean>} 点击是否成功
 */
function clickAtPosition(x, y) {
    return new Promise((resolve) => {
        try {
            const element = document.elementFromPoint(x, y);
            if (element) {
                element.click();
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (error) {
            console.error('坐标点击失败:', error);
            resolve(false);
        }
    });
}

/**
 * 双击元素
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 等待元素出现的超时时间（毫秒）
 * @returns {Promise<boolean>} 双击是否成功
 */
function doubleClickElement(selector, timeout = 5000) {
    return new Promise(async (resolve) => {
        try {
            const element = await window.QueryHelpers.queryElement(selector, timeout);
            if (!element) {
                resolve(false);
                return;
            }

            const dblClickEvent = new MouseEvent('dblclick', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(dblClickEvent);

            resolve(true);
        } catch (error) {
            console.error('双击元素失败:', error);
            resolve(false);
        }
    });
}

/**
 * 右键点击元素
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 等待元素出现的超时时间（毫秒）
 * @returns {Promise<boolean>} 右键点击是否成功
 */
function rightClickElement(selector, timeout = 5000) {
    return new Promise(async (resolve) => {
        try {
            const element = await window.QueryHelpers.queryElement(selector, timeout);
            if (!element) {
                resolve(false);
                return;
            }

            const contextMenuEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 2
            });
            element.dispatchEvent(contextMenuEvent);

            resolve(true);
        } catch (error) {
            console.error('右键点击元素失败:', error);
            resolve(false);
        }
    });
}

/**
 * 检查元素是否可见
 * @param {Element} element - DOM元素
 * @returns {boolean} 是否可见
 */
function isElementVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 &&
           rect.top >= 0 && rect.left >= 0 &&
           rect.bottom <= window.innerHeight &&
           rect.right <= window.innerWidth;
}

/**
 * 等待元素可点击（可见且可用）
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Element|null>} 可点击的元素或null
 */
function waitForClickableElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        function checkClickable() {
            const element = document.querySelector(selector);
            if (element && isElementVisible(element) && !element.disabled) {
                resolve(element);
                return;
            }

            if (Date.now() - startTime > timeout) {
                resolve(null);
                return;
            }

            setTimeout(checkClickable, 100);
        }

        checkClickable();
    });
}

/**
 * 模拟人类点击（带随机延时）
 * @param {string} selector - CSS选择器
 * @param {number} minDelay - 最小延时（毫秒）
 * @param {number} maxDelay - 最大延时（毫秒）
 * @returns {Promise<boolean>} 点击是否成功
 */
function humanClickElement(selector, minDelay = 500, maxDelay = 1500) {
    return new Promise(async (resolve) => {
        // 添加随机延时
        const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        await sleep(delay);

        const result = await clickElement(selector);
        resolve(result);
    });
}

/**
 * 工具函数：睡眠
 * @param {number} ms - 睡眠时间（毫秒）
 * @returns {Promise} Promise对象
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 导出函数供外部调用
window.ClickHelpers = {
    clickElement,
    clickAtPosition,
    doubleClickElement,
    rightClickElement,
    isElementVisible,
    waitForClickableElement,
    humanClickElement,
    sleep
};
