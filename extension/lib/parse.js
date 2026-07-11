/**
 * 页面内容解析模块
 * 提取网页正文、元数据，清理无关元素
 */

/**
 * 提取页面元数据
 */
export function extractMetadata(document) {
  const meta = {};

  // 标题
  meta.title = document.title || '';

  // 尝试从 og:title 获取
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) meta.ogTitle = ogTitle.getAttribute('content');

  // 作者
  const authorMeta = document.querySelector('meta[name="author"]');
  if (authorMeta) meta.author = authorMeta.getAttribute('content');

  // 描述
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) meta.description = descMeta.getAttribute('content');

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) meta.ogDescription = ogDesc.getAttribute('content');

  // 发布时间
  const dateMeta = document.querySelector('meta[property="article:published_time"]')
    || document.querySelector('meta[name="pubdate"]')
    || document.querySelector('meta[name="publish-date"]')
    || document.querySelector('time[datetime]');
  if (dateMeta) {
    meta.publishedTime = dateMeta.getAttribute('content') || dateMeta.getAttribute('datetime');
  }

  // 站点名称
  const siteMeta = document.querySelector('meta[property="og:site_name"]');
  if (siteMeta) meta.siteName = siteMeta.getAttribute('content');

  return meta;
}

/**
 * 提取全文 HTML
 */
export function extractFullContent(document) {
  return document.body.innerHTML;
}

/**
 * 提取选中文本的 HTML
 */
export function extractSelection(document) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) {
    return '';
  }

  // 获取选中区域的 HTML
  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}

/**
 * 使用 Readability 提取正文
 * 需要在全局加载了 Readability 库后调用
 */
export function extractReadabilityContent(document) {
  if (typeof Readability !== 'undefined') {
    try {
      const article = new Readability(document.cloneNode(true)).parse();
      if (article) {
        return {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt || '',
          textContent: article.textContent || '',
          byline: article.byline || '',
          publishedTime: article.publishedTime || '',
          siteName: article.siteName || ''
        };
      }
    } catch (e) {
      console.warn('Readability 解析失败:', e);
    }
  }
  return null;
}

/**
 * 清理 HTML：移除广告、脚本、样式等无关元素
 */
export function cleanHtml(html, document) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // 移除脚本和样式
  const removals = body.querySelectorAll(
    'script, style, nav, footer, header, ' +
    'aside, iframe, .ad, .ads, .advertisement, .banner, ' +
    '.social-share, .comments, .comment, .sidebar, ' +
    '#sidebar, #comments, #footer, #header, ' +
    '[role="complementary"], [role="navigation"]'
  );

  removals.forEach(el => el.remove());

  // 移除空标签
  const empties = body.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6');
  empties.forEach(el => {
    if (el.textContent.trim() === '' && el.children.length === 0) {
      el.remove();
    }
  });

  return body.innerHTML;
}

/**
 * 从页面提取结构化数据
 * @param {string} mode - 'full' | 'readability' | 'selection'
 * @param {Document} document
 * @returns {Object} {title, url, content, selection, metadata}
 */
export function extractPageContent(mode, document) {
  const url = document.URL || window.location.href;
  const metadata = extractMetadata(document);

  let result = {
    title: document.title || metadata.title || '',
    url: url,
    content: '',
    html: '',
    selection: '',
    excerpt: '',
    metadata: metadata
  };

  switch (mode) {
    case 'full':
      result.html = extractFullContent(document);
      result.content = cleanHtml(result.html, document);
      result.excerpt = document.title || '';
      break;

    case 'readability':
      const article = extractReadabilityContent(document);
      if (article) {
        result.title = article.title || result.title;
        result.content = article.content;
        result.excerpt = article.excerpt || article.textContent?.substring(0, 200) || '';
        result.html = article.content;
      } else {
        // 降级到全文模式
        result.html = extractFullContent(document);
        result.content = cleanHtml(result.html, document);
      }
      break;

    case 'selection':
      result.html = extractSelection(document);
      result.content = result.html;
      result.selection = window.getSelection()?.toString() || '';
      result.excerpt = result.selection.substring(0, 200);
      break;

    default:
      result.html = extractFullContent(document);
      result.content = cleanHtml(result.html, document);
  }

  return result;
}
