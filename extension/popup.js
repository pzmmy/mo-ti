/**
 * popup.js - 弹窗交互逻辑
 */

(function() {
  'use strict';

  let currentData = null;
  let tags = [];
  let selectedMode = 'full';

  // DOM 引用
  const pageTitle = document.getElementById('pageTitle');
  const pageUrl = document.getElementById('pageUrl');
  const savePath = document.getElementById('savePath');
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const status = document.getElementById('status');
  const tagsInput = document.getElementById('tagsInput');
  const tagsWrapper = document.getElementById('tagsWrapper');
  const modeBtns = document.querySelectorAll('.mode-btn');

  // ===== 初始化 =====
  document.addEventListener('DOMContentLoaded', async () => {
    // 加载配置
    const config = await chrome.storage.sync.get({
      defaultPath: '/clippings/'
    });
    savePath.value = config.defaultPath;

    // 提取页面内容
    await extractPageContent();
  });

  // ===== 提取页面内容 =====
  async function extractPageContent() {
    showStatus('info', '正在获取页面内容...');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'extractContent',
        mode: selectedMode
      });

      if (!response || !response.success) {
        throw new Error(response?.error || '无法获取页面内容');
      }

      currentData = response.data;

      // 更新 UI
      pageTitle.textContent = currentData.title || '无标题';
      pageUrl.textContent = currentData.url || '';
      hideStatus();

      // 如果没有选中文字且模式是 selection，提示
      if (selectedMode === 'selection' && !currentData.selection) {
        showStatus('info', '未选中文字，将使用全文模式');
        setMode('full');
      }
    } catch (err) {
      pageTitle.textContent = '获取内容失败';
      showStatus('error', err.message);
      saveBtn.disabled = true;
    }
  }

  // ===== 设置剪藏模式 =====
  function setMode(mode) {
    selectedMode = mode;
    modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
      // 重新提取
      extractPageContent();
    });
  });

  // ===== 标签管理 =====
  function renderTags() {
    // 清除已有 tag 元素（保留输入框）
    const existingTags = tagsWrapper.querySelectorAll('.tag');
    existingTags.forEach(t => t.remove());

    // 在输入框前插入 tag
    tags.forEach((tag, index) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.innerHTML = `${escapeHtml(tag)} <span class="tag-remove" data-index="${index}">×</span>`;
      tagsWrapper.insertBefore(tagEl, tagsInput);

      tagEl.querySelector('.tag-remove').addEventListener('click', () => {
        tags.splice(index, 1);
        renderTags();
      });
    });
  }

  function addTag(text) {
    text = text.trim().replace(/[,，]/g, '');
    if (!text) return;
    if (tags.includes(text)) return;
    tags.push(text);
    renderTags();
  }

  tagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagsInput.value);
      tagsInput.value = '';
    }
  });

  tagsInput.addEventListener('blur', () => {
    if (tagsInput.value.trim()) {
      addTag(tagsInput.value);
      tagsInput.value = '';
    }
  });

  tagsWrapper.addEventListener('click', () => {
    tagsInput.focus();
  });

  // ===== 保存按钮 =====
  saveBtn.addEventListener('click', async () => {
    if (!currentData) return;

    setSaving(true);
    showStatus('info', '正在剪藏...');

    try {
      let content = '';

      if (selectedMode === 'selection') {
        content = currentData.selectionHtml || currentData.selection || '';
      } else if (selectedMode === 'full') {
        content = currentData.fullHtml || '';
      } else {
        // readability 模式：使用 fullHtml，background 中用 Readability 处理
        content = currentData.fullHtml || '';
      }

      const pageData = {
        title: currentData.title || '无标题',
        url: currentData.url || '',
        content: content,
        excerpt: currentData.excerpt || currentData.selection?.substring(0, 200) || '',
        tags: tags,
        mode: selectedMode,
        author: currentData.author || '',
        publishedTime: currentData.publishedTime || ''
      };

      const response = await chrome.runtime.sendMessage({
        action: 'save',
        pageData: pageData,
        options: {
          path: savePath.value.trim() || '/clippings/',
          tags: tags
        }
      });

      if (!response || !response.success) {
        throw new Error(response?.error || '保存失败');
      }

      showStatus('success', '✓ 剪藏成功！');
      setTimeout(() => window.close(), 1500);
    } catch (err) {
      showStatus('error', `✗ ${err.message}`);
      setSaving(false);
    }
  });

  // ===== 设置链接 =====
  function openSettings() {
    chrome.runtime.openOptionsPage();
  }

  document.getElementById('settingsBtn').addEventListener('click', (e) => {
    e.preventDefault();
    openSettings();
  });

  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    openSettings();
  });

  // ===== 工具函数 =====
  function setSaving(saving) {
    saveBtn.disabled = saving;
    saveBtnText.innerHTML = saving ? '<span class="spinner"></span> 正在剪藏...' : '剪藏到墨屉';
  }

  function showStatus(type, message) {
    status.className = `status show ${type}`;
    status.textContent = message;
  }

  function hideStatus() {
    status.className = 'status';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
