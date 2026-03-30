/**
 * 陕西省市场监管局网站办件信息解析助手
 * 用于解析办件列表页面，提取市场主体信息
 */

window.SnamrHelpers = {
  /**
   * 解析当前页面的办件信息
   * @returns {Array} 办件信息数组
   */
  parseApplicationItems: function () {
    try {
      const items = [];
      // 查找包含办件信息的元素
      const wrapDiv = document.querySelector('div.wrap');

      if (!wrapDiv) {
        console.log('未找到包含办件信息的wrap元素');
        return items;
      }

      // 查找包含完整办件信息的父容器
      // 通常每个办件项包含：名称、状态信息、时间、初审状态等
      const applicationContainers = wrapDiv.querySelectorAll('div[class*="application"], table tbody tr, div[class*="item"]');

      console.log(`找到 ${applicationContainers.length} 个可能的办件容器`);

      for (let i = 0; i < applicationContainers.length; i++) {
        const container = applicationContainers[i];
        const text = container.textContent.trim();

        // 跳过空元素和分页信息
        if (!text || text.includes('首页') || text.includes('下一页') || text.includes('末页')) {
          continue;
        }

        // 从DOM元素中提取完整信息
        const item = this.extractApplicationInfoFromElement(container);
        if (item && item.name) {
          items.push(item);
        }
      }

      console.log(`解析到 ${items.length} 个办件项`);
      return items;

    } catch (error) {
      console.error('解析办件信息时出错:', error);
      return [];
    }
  },

  /**
   * 从DOM元素中提取单个办件信息
   * @param {Element} element - 包含办件信息的DOM元素
   * @returns {Object|null} 办件信息对象
   */
  extractApplicationInfoFromElement: function (element) {
    try {
      // 初始化办件信息对象
      const item = {
        name: '',
        status: {},
        time: '',
        review_status: '', // 初审状态
        departments: []
      };

      // 获取元素的完整文本内容
      const fullText = element.textContent.trim();

      // 查找初审状态元素
      const statusElement = element.querySelector('p.qyzx_status');
      if (statusElement) {
        item.review_status = statusElement.textContent.trim();
      }

      // 清理文本，移除多余的空格和换行
      const cleanText = fullText.replace(/\s+/g, ' ').trim();

      // 尝试提取市场主体名称
      // 通常格式类似：市场监管： 正在办理 税务： 未开始 商务： 未开始...
      const nameMatch = cleanText.match(/^(.+?)(?=市场监管：|税务：|商务：|海关：|人社：)/);
      if (nameMatch) {
        item.name = nameMatch[1].trim();
      }

      // 提取各部门状态
      const statusMatches = cleanText.match(/(市场监管|税务|商务|海关|人社)：\s*([^市场监管税务商务海关人社]+)/g);
      if (statusMatches) {
        statusMatches.forEach(match => {
          const deptMatch = match.match(/(市场监管|税务|商务|海关|人社)：\s*(.+)/);
          if (deptMatch) {
            const dept = deptMatch[1];
            const status = deptMatch[2].trim();
            item.status[dept] = status;
            item.departments.push({
              department: dept,
              status: status
            });
          }
        });
      }

      // 提取时间信息
      const timeMatch = cleanText.match(/(\d{4}-\d{2}-\d{2})/);
      if (timeMatch) {
        item.time = timeMatch[1];
      }

      // 如果没有提取到有效信息，返回null
      if (!item.name && Object.keys(item.status).length === 0) {
        return null;
      }

      return item;

    } catch (error) {
      console.error('提取办件信息时出错:', error);
      return null;
    }
  },

  /**
   * 从文本中提取单个办件信息
   * @param {string} text - 包含办件信息的文本
   * @returns {Object|null} 办件信息对象
   */
  extractApplicationInfo: function (text) {
    try {
      // 清理文本，移除多余的空格和换行
      const cleanText = text.replace(/\s+/g, ' ').trim();

      // 初始化办件信息对象
      const item = {
        name: '',
        status: {},
        time: '',
        review_status: '', // 初审状态
        departments: []
      };

      // 尝试提取市场主体名称
      // 通常格式类似：市场监管： 正在办理 税务： 未开始 商务： 未开始...
      const nameMatch = cleanText.match(/^(.+?)(?=市场监管：|税务：|商务：|海关：|人社：)/);
      if (nameMatch) {
        item.name = nameMatch[1].trim();
      }

      // 提取各部门状态
      const statusMatches = cleanText.match(/(市场监管|税务|商务|海关|人社)：\s*([^市场监管税务商务海关人社]+)/g);
      if (statusMatches) {
        statusMatches.forEach(match => {
          const deptMatch = match.match(/(市场监管|税务|商务|海关|人社)：\s*(.+)/);
          if (deptMatch) {
            const dept = deptMatch[1];
            const status = deptMatch[2].trim();
            item.status[dept] = status;
            item.departments.push({
              department: dept,
              status: status
            });
          }
        });
      }

      // 提取时间信息
      const timeMatch = cleanText.match(/(\d{4}-\d{2}-\d{2})/);
      if (timeMatch) {
        item.time = timeMatch[1];
      }

      // 如果没有提取到有效信息，返回null
      if (!item.name && Object.keys(item.status).length === 0) {
        return null;
      }

      return item;

    } catch (error) {
      console.error('提取办件信息时出错:', error);
      return null;
    }
  },

  /**
   * 检查是否有下一页
   * @returns {boolean} 是否有下一页
   */
  hasNextPage: function () {
    try {
      // 查找分页元素
      const pageDiv = document.querySelector('div.page');
      if (!pageDiv) {
        return false;
      }

      // 检查是否包含"下一页"文本
      const hasNext = pageDiv.textContent.includes('下一页');

      // 检查是否已经是最后一页（没有下一页链接或下一页被禁用）
      // 使用更稳健的方法检测“下一页”相关元素，覆盖多种实现方式（a/button/span/rel=next/aria-label/箭头符号）
      const candidates = Array.from(pageDiv.querySelectorAll('a, button, span, li'))
        .filter(el => {
          try {
            if (!el || !el.textContent) return false;
            const text = (el.textContent || '').trim();
            const href = el.getAttribute ? (el.getAttribute('href') || '') : '';
            const aria = el.getAttribute ? (el.getAttribute('aria-label') || '') : '';
            const cls = el.className || '';

            // 常见文本或符号
            const textMatches = text.includes('下一页') || text.includes('下页') ||
              text === '>' || text === '»' || text === '›' || text === '>>';

            // 通过 href 或 aria-label 或 class 名也可能标识为下一页
            const hrefMatches = (href && href.indexOf('下一页') !== -1) || (href && href.toLowerCase().indexOf('page') !== -1 && textMatches);
            const ariaMatches = aria.includes('下一页') || cls.toLowerCase().indexOf('next') !== -1;

            return textMatches || hrefMatches || ariaMatches;
          } catch (e) {
            return false;
          }
        });

      // 过滤掉不可见或被禁用的候选项
      const visibleCandidates = candidates.filter(el => {
        try {
          const style = window.getComputedStyle(el);
          if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
            return false;
          }
          const disabledAttr = el.getAttribute && (el.getAttribute('disabled') !== null || el.getAttribute('aria-disabled') === 'true');
          const classDisabled = el.classList && el.classList.contains('disabled');
          return !disabledAttr && !classDisabled;
        } catch (e) {
          return false;
        }
      });

      const isLastPage = visibleCandidates.length === 0;
      return hasNext && !isLastPage;

    } catch (error) {
      console.error('检查下一页时出错:', error);
      return false;
    }
  },

  /**
   * 点击下一页
   * @returns {boolean} 点击是否成功
   */
  clickNextPage: function () {
    try {
      const pageDiv = document.querySelector('div.page');
      if (!pageDiv) {
        console.log('未找到分页元素');
        return false;
      }

      // 更稳健地查找并点击下一页候选元素（支持 a/button/span 等）
      const candidates = Array.from(pageDiv.querySelectorAll('a, button, span, li'))
        .filter(el => {
          try {
            if (!el || !el.textContent) return false;
            const text = (el.textContent || '').trim();
            const href = el.getAttribute ? (el.getAttribute('href') || '') : '';
            const cls = el.className || '';
            const textMatches = text.includes('下一页') || text.includes('下页') ||
              text === '>' || text === '»' || text === '›' || text === '>>';
            const hrefMatches = (href && href.indexOf('下一页') !== -1) || (href && href.toLowerCase().indexOf('page') !== -1 && textMatches);
            const classMatches = cls.toLowerCase().indexOf('next') !== -1;
            return textMatches || hrefMatches || classMatches;
          } catch (e) {
            return false;
          }
        });

      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        try {
          // 跳过不可见或被禁用的元素
          const style = window.getComputedStyle(el);
          if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
            continue;
          }
          const disabledAttr = el.getAttribute && (el.getAttribute('disabled') !== null || el.getAttribute('aria-disabled') === 'true');
          if (disabledAttr) continue;

          // 如果是链接或按钮，尝试点击
          if (el.tagName === 'A' || el.tagName === 'BUTTON' || typeof el.click === 'function') {
            console.log('点击下一页元素:', el.tagName, el.textContent.trim().substring(0, 30));
            el.click();
            return true;
          }
        } catch (e) {
          console.error('尝试点击下一页时出错:', e);
          continue;
        }
      }

      console.log('未找到可点击的下一页元素');
      return false;

    } catch (error) {
      console.error('点击下一页时出错:', error);
      return false;
    }
  },

  /**
   * 获取当前页码
   * @returns {number} 当前页码
   */
  getCurrentPage: function () {
    try {
      const pageDiv = document.querySelector('div.page');
      if (!pageDiv) {
        return 1;
      }

      // 查找当前页码（通常是高亮或有特殊样式的元素）
      const currentPageEl = pageDiv.querySelector('.current, .active, [style*="color"], [style*="background"]');
      if (currentPageEl) {
        const pageNum = parseInt(currentPageEl.textContent.trim());
        if (!isNaN(pageNum)) {
          return pageNum;
        }
      }

      // 从文本中提取页码信息
      const text = pageDiv.textContent;
      const pageMatch = text.match(/(\d+)\s*(?=下一页|末页)/);
      if (pageMatch) {
        return parseInt(pageMatch[1]);
      }

      return 1; // 默认第一页

    } catch (error) {
      console.error('获取当前页码时出错:', error);
      return 1;
    }
  },

  /**
   * 检查页面是否已加载完成
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {boolean} 页面是否已加载完成
   */
  waitForPageLoad: function (timeout = 10000) {
    // 检查页面关键元素是否存在
    const wrapDiv = document.querySelector('div.wrap');
    const pageDiv = document.querySelector('div.page');

    if (!wrapDiv || !pageDiv) {
      console.log('页面关键元素未找到，等待加载...');
      return false;
    }

    // 检查是否有办件数据
    const hasData = wrapDiv.textContent.trim().length > 0;
    if (!hasData) {
      console.log('页面数据未加载完成，等待加载...');
      return false;
    }

    console.log('页面加载完成');
    return true;
  },

  /**
   * 调试页面元素（用于开发调试）
   */
  debugPageElements: function () {
    console.log('=== SNAMR页面调试信息 ===');

    // 检查关键元素
    const wrapDiv = document.querySelector('div.wrap');
    const pageDiv = document.querySelector('div.page');

    console.log('wrap元素:', wrapDiv ? '找到' : '未找到');
    if (wrapDiv) {
      console.log('wrap内容长度:', wrapDiv.textContent.length);
      console.log('wrap内容预览:', wrapDiv.textContent.substring(0, 200) + '...');
    }

    console.log('page元素:', pageDiv ? '找到' : '未找到');
    if (pageDiv) {
      console.log('page内容:', pageDiv.textContent);
    }

    // 尝试解析办件信息
    const items = this.parseApplicationItems();
    console.log('解析到的办件数量:', items.length);
    if (items.length > 0) {
      console.log('第一个办件示例:', items[0]);
      console.log('包含字段:', Object.keys(items[0]));
    }

    console.log('是否有下一页:', this.hasNextPage());
    console.log('当前页码:', this.getCurrentPage());

    console.log('=== 调试信息结束 ===');
  }
};

// 在全局作用域中暴露函数，方便直接调用
console.log('[SNAMR] 开始暴露JavaScript函数到全局作用域');

window.parseApplicationItems = window.SnamrHelpers.parseApplicationItems.bind(window.SnamrHelpers);
window.hasNextPage = window.SnamrHelpers.hasNextPage.bind(window.SnamrHelpers);
window.clickNextPage = window.SnamrHelpers.clickNextPage.bind(window.SnamrHelpers);
window.getCurrentPage = window.SnamrHelpers.getCurrentPage.bind(window.SnamrHelpers);
window.waitForPageLoad = window.SnamrHelpers.waitForPageLoad.bind(window.SnamrHelpers);
window.debugSnamrPage = window.SnamrHelpers.debugPageElements.bind(window.SnamrHelpers);

console.log('[SNAMR] JavaScript函数暴露完成');
console.log('[SNAMR] 可用函数:', typeof window.waitForPageLoad, typeof window.parseApplicationItems);
