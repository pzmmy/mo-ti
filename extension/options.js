/**
 * options.js - 设置页面逻辑
 */

(function() {
  'use strict';

  // DOM 引用
  const serverUrl = document.getElementById('serverUrl');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const defaultPath = document.getElementById('defaultPath');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const status = document.getElementById('status');

  // ===== 加载配置 =====
  async function loadSettings() {
    const config = await chrome.storage.sync.get({
      serverUrl: '',
      username: '',
      password: '',
      defaultPath: '/clippings/'
    });

    serverUrl.value = config.serverUrl || '';
    username.value = config.username || '';
    password.value = config.password || '';
    defaultPath.value = config.defaultPath || '/clippings/';
  }

  // ===== 保存配置 =====
  async function saveSettings() {
    const config = {
      serverUrl: serverUrl.value.trim(),
      username: username.value.trim(),
      password: password.value,
      defaultPath: defaultPath.value.trim() || '/clippings/'
    };

    if (!config.serverUrl) {
      showStatus('error', '请输入 WebDAV 服务器地址');
      return;
    }

    // HTTPS 强制检查
    if (url.startsWith('http://')) {
      showStatus('⚠️ WebDAV 建议使用 HTTPS 连接，密码将通过明文传输', 'warn');
    } else if (!url.startsWith('https://')) {
      showStatus('error', '服务器地址必须以 http:// 或 https:// 开头');
      return;
    }

    // 确保路径格式
    if (!config.defaultPath.startsWith('/')) {
      config.defaultPath = '/' + config.defaultPath;
    }
    if (!config.defaultPath.endsWith('/')) {
      config.defaultPath += '/';
    }

    try {
      await chrome.storage.sync.set(config);
      showStatus('success', '✓ 设置已保存');
    } catch (err) {
      showStatus('error', `保存失败: ${err.message}`);
    }
  }

  // ===== 测试连接 =====
  async function testConnection() {
    if (!serverUrl.value.trim()) {
      showStatus('error', '请先输入服务器地址');
      return;
    }

    setTesting(true);
    showStatus('info', '正在测试连接...');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testConnection',
        serverUrl: serverUrl.value.trim(),
        username: username.value.trim(),
        password: password.value
      });

      if (response && response.success) {
        showStatus('success', '✓ 连接成功！WebDAV 服务器正常运行');
      } else {
        showStatus('error', `✗ ${response?.message || '连接失败'}`);
      }
    } catch (err) {
      showStatus('error', `✗ 测试失败: ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  // ===== 事件绑定 =====
  document.addEventListener('DOMContentLoaded', loadSettings);

  saveBtn.addEventListener('click', saveSettings);

  testBtn.addEventListener('click', testConnection);

  // Enter 键保存
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      saveSettings();
    }
  });

  // ===== 工具函数 =====
  function showStatus(type, message) {
    status.className = `status show ${type}`;
    status.textContent = message;

    if (type === 'success') {
      setTimeout(() => {
        status.className = 'status';
      }, 3000);
    }
  }

  function setTesting(testing) {
    testBtn.disabled = testing;
    if (testing) {
      testBtn.innerHTML = '<span class="spinner"></span> 测试中...';
    } else {
      testBtn.textContent = '测试连接';
    }
  }
})();
