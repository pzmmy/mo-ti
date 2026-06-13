/**
 * background.js - Service Worker
 * 处理右键菜单、消息中转、WebDAV 上传
 */

// 加载内联库
importScripts('lib/turndown.js', 'lib/readability.js');

// ===== Turndown 初始化 =====
function createTurndownService() {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**'
  });

  // 保留 code 标签
  turndown.addRule('code', {
    filter: ['code', 'pre'],
    replacement: function (content, node) {
      if (node.nodeName === 'PRE') {
        const lang = node.firstChild?.className?.match(/lang(uage)?-(\w+)/)?.[2] || '';
        return '\n```' + lang + '\n' + content + '\n```\n';
      }
      return '`' + content + '`';
    }
  });

  // 保留图片
  turndown.addRule('images', {
    filter: 'img',
    replacement: function (content, node) {
      const alt = node.getAttribute('alt') || '';
      const src = node.getAttribute('src') || '';
      const title = node.getAttribute('title') || '';
      if (!src) return '';
      const titlePart = title ? ` "${title}"` : '';
      return `![${alt}](${src}${titlePart})`;
    }
  });

  return turndown;
}

// ===== 获取配置 =====
async function getConfig() {
  const result = await chrome.storage.sync.get({
    serverUrl: '',
    username: '',
    password: '',
    defaultPath: '/clippings/'
  });
  return result;
}

// ===== 生成文件名 =====
function generateFilename(title) {
  const date = new Date();
  const dateStr = date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0') + '_' +
    String(date.getHours()).padStart(2, '0') +
    String(date.getMinutes()).padStart(2, '0') +
    String(date.getSeconds()).padStart(2, '0');

  // 清理标题中的非法字符
  let cleanTitle = (title || 'untitled')
    .replace(/[<>:"\/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);

  return `${dateStr}_${cleanTitle}.md`;
}

// ===== 构建 Markdown 内容 =====
function buildMarkdownContent(pageData) {
  const turndown = createTurndownService();

  // HTML → Markdown
  let markdownBody = '';
  if (pageData.content) {
    markdownBody = turndown.turndown(pageData.content);
  }

  // 构建完整 Markdown
  const lines = [];
  lines.push(`# ${pageData.title}`);
  lines.push('');
  lines.push(`> 来源: [${pageData.url}](${pageData.url})`);
  lines.push('');

  const date = new Date();
  lines.push(`> 剪藏时间: ${date.toLocaleString('zh-CN')}`);
  lines.push('');

  if (pageData.excerpt) {
    lines.push('---');
    lines.push('');
    lines.push(pageData.excerpt);
    lines.push('');
  }

  if (markdownBody) {
    lines.push('---');
    lines.push('');
    lines.push(markdownBody);
    lines.push('');
  }

  return lines.join('\n');
}

// ===== WebDAV 上传 =====
async function webdavSave(config, filePath, content) {
  // 由于引入了 lib/webdav.js, 但 importScripts 不支持 ES module
  // 我们直接在 background.js 中实现 WebDAV 逻辑
  const serverUrl = config.serverUrl.replace(/\/+$/, '');
  const authHeader = (config.username || config.password) ?
    { 'Authorization': 'Basic ' + btoa(config.username + ':' + config.password) } :
    {};

  // Helper: 获取父目录
  function getParentPath(filePath) {
    const normalized = filePath.replace(/\/+$/, '');
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash <= 0) return '/';
    return normalized.substring(0, lastSlash) + '/';
  }

  // Helper: 递归创建目录
  async function ensureDirectory(dirPath) {
    const url = serverUrl + (dirPath.startsWith('/') ? dirPath : '/' + dirPath);
    const response = await fetch(url, {
      method: 'MKCOL',
      headers: authHeader
    });

    if (response.status === 201 || response.status === 200 || response.status === 405) {
      return true;
    }

    if (response.status === 409) {
      const parent = getParentPath(dirPath);
      if (parent !== dirPath) {
        await ensureDirectory(parent);
        const retry = await fetch(url, {
          method: 'MKCOL',
          headers: authHeader
        });
        return retry.status === 201 || retry.status === 200 || retry.status === 405;
      }
      return false;
    }

    if (response.status === 401) throw new Error('WebDAV 认证失败，请检查用户名和密码');
    throw new Error(`创建目录失败 (HTTP ${response.status})`);
  }

  // 确保目录存在
  const dirPath = getParentPath(filePath);
  if (dirPath !== '/') {
    await ensureDirectory(dirPath);
  }

  // PUT 上传
  const putUrl = serverUrl + (filePath.startsWith('/') ? filePath : '/' + filePath);
  const putResponse = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      ...authHeader
    },
    body: content
  });

  if (putResponse.status === 201 || putResponse.status === 204 || putResponse.status === 200) {
    return { success: true, status: putResponse.status };
  }

  throw new Error(`上传失败 (HTTP ${putResponse.status})`);
}

// ===== 右键菜单 =====
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-moti',
    title: '剪藏到墨屉',
    contexts: ['page', 'selection', 'link']
  });

  chrome.contextMenus.create({
    id: 'clip-to-moti-full',
    title: '剪藏全文到墨屉',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'clip-to-moti-selection',
    title: '剪藏选中文字到墨屉',
    contexts: ['selection']
  });
});

// ===== 右键菜单点击 =====
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    let mode = 'full';
    if (info.menuItemId === 'clip-to-moti-selection' || info.menuItemId === 'clip-to-moti') {
      mode = info.menuItemId === 'clip-to-moti-selection' ? 'selection' : 'full';
    } else if (info.menuItemId === 'clip-to-moti-full') {
      mode = 'full';
    }

    // 向 content script 发送提取指令
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (mode) => {
        // 获取页面内容
        function extract(mode) {
          const url = window.location.href;
          const title = document.title;

          let content = '';
          let selection = '';

          if (mode === 'selection') {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) {
              selection = sel.toString();
              const range = sel.getRangeAt(0);
              const fragment = range.cloneContents();
              const wrapper = document.createElement('div');
              wrapper.appendChild(fragment);
              content = wrapper.innerHTML;
            }
          } else {
            content = document.body.innerHTML;
          }

          return { title, url, content, selection, mode };
        }
        return extract(mode);
      },
      args: [mode]
    });

    if (!result || !result.result) {
      throw new Error('无法获取页面内容');
    }

    const pageData = result.result;
    await performSave(pageData, null);
  } catch (err) {
    console.error('右键剪藏失败:', err);
    // 通知用户
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '剪藏失败',
        message: err.message
      });
    } catch (e) {
      // notifications API may not be available
    }
  }
});

// ===== 执行保存 =====
async function performSave(pageData, extraOptions) {
  const config = await getConfig();

  if (!config.serverUrl) {
    throw new Error('请先在设置中配置 WebDAV 服务器');
  }

  // 确定保存路径
  let basePath = extraOptions?.path || config.defaultPath || '/clippings/';
  if (!basePath.endsWith('/')) basePath += '/';

  // 生成文件名
  const filename = extraOptions?.filename || generateFilename(pageData.title);
  const filePath = basePath + filename;

  // 构建 Markdown
  const markdown = buildMarkdownContent(pageData);

  // 上传
  return await webdavSave(config, filePath, markdown);
}

// ===== 消息处理 =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理来自 popup 的内容提取请求
  if (request.action === 'extractContent') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('无法获取当前标签页');

        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (mode) => {
            function extract(mode) {
              const url = window.location.href;
              const title = document.title;

              // 读取元数据
              const getMeta = (name) => {
                const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
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
              } else {
                fullHtml = document.body.innerHTML;
              }

              return {
                title,
                url,
                fullHtml,
                selection,
                selectionHtml,
                excerpt,
                author: getMeta('author') || getMeta('article:author'),
                publishedTime: getMeta('article:published_time') || getMeta('pubdate'),
                mode
              };
            }
            return extract(mode);
          },
          args: [request.mode || 'full']
        });

        if (!result || !result.result) {
          throw new Error('无法从页面提取内容');
        }

        sendResponse({ success: true, data: result.result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 处理保存请求
  if (request.action === 'save') {
    (async () => {
      try {
        const result = await performSave(request.pageData, request.options || {});
        sendResponse({ success: true, ...result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 测试 WebDAV 连接
  if (request.action === 'testConnection') {
    (async () => {
      try {
        const serverUrl = request.serverUrl.replace(/\/+$/, '');
        const auth = (request.username || request.password) ?
          { 'Authorization': 'Basic ' + btoa(request.username + ':' + request.password) } :
          {};

        const response = await fetch(serverUrl + '/', {
          method: 'PROPFIND',
          headers: {
            'Depth': '0',
            ...auth
          }
        });

        if (response.status === 207 || response.status === 200) {
          sendResponse({ success: true, message: '连接成功' });
        } else if (response.status === 401) {
          sendResponse({ success: false, message: '认证失败，请检查用户名和密码' });
        } else if (response.status === 404) {
          sendResponse({ success: false, message: '服务器路径不存在' });
        } else {
          sendResponse({ success: false, message: `服务器返回状态码 ${response.status}` });
        }
      } catch (err) {
        sendResponse({ success: false, message: `无法连接: ${err.message}` });
      }
    })();
    return true;
  }
});
