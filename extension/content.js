/**
 * content.js - 页面内容提取脚本
 * 响应用户操作，提取页面内容
 */

(function() {
  'use strict';

  /**
   * 提取页面内容
   * @param {string} mode - 'full' | 'readability' | 'selection'
   * @returns {Object}
   */
  function extractContent(mode) {
    const url = window.location.href;
    const title = document.title;

    // 读取元数据
    const getMeta = (name) => {
      const el = document.querySelector(
        `meta[name="${name}"], meta[property="${name}"], meta[property="og:${name}"]`
      );
      return el ? el.getAttribute('content') : '';
    };

    let fullHtml = '';
    let selection = '';
    let selectionHtml = '';
    let excerpt = '';

    if (mode === 'selection') {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        selection = sel.toString();
        excerpt = selection.substring(0, 300);
        const range = sel.getRangeAt(0);
        const fragment = range.cloneContents();
        const wrapper = document.createElement('div');
        wrapper.appendChild(fragment);
        selectionHtml = wrapper.innerHTML;
      }
    } else if (mode === 'full') {
      fullHtml = document.body.innerHTML;
    }
    // readability 模式: 让 background 用 Readability 库处理

    return {
      title,
      url,
      fullHtml,
      selection,
      selectionHtml,
      excerpt,
      author: getMeta('author'),
      description: getMeta('description'),
      publishedTime: getMeta('article:published_time') || getMeta('pubdate'),
      siteName: getMeta('site_name'),
      mode
    };
  }

  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract') {
      const result = extractContent(request.mode || 'full');
      sendResponse(result);
    }
    return true;
  });

  console.log('[剪藏到墨屉] content script loaded');
})();
