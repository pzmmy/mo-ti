/**
 * WebDAV 客户端
 * 支持 PUT 上传文件和 MKCOL 创建目录，Basic Auth
 */

export class WebDAVClient {
  /**
   * @param {Object} config
   * @param {string} config.serverUrl - WebDAV 服务器根 URL
   * @param {string} config.username - 用户名
   * @param {string} config.password - 密码
   */
  constructor(config) {
    this.serverUrl = config.serverUrl.replace(/\/+$/, '');
    this.username = config.username || '';
    this.password = config.password || '';
  }

  /**
   * Basic Auth 头
   */
  getAuthHeader() {
    if (!this.username && !this.password) return {};
    const encoded = btoa(`${this.username}:${this.password}`);
    return { 'Authorization': `Basic ${encoded}` };
  }

  /**
   * 构建完整 URL
   */
  buildUrl(path) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${this.serverUrl}${cleanPath}`;
  }

  /**
   * 获取路径的父目录
   */
  getParentPath(filePath) {
    const normalized = filePath.replace(/\/+$/, '');
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash <= 0) return '/';
    return normalized.substring(0, lastSlash) + '/';
  }

  /**
   * 递归创建目录
   */
  async ensureDirectory(dirPath) {
    const url = this.buildUrl(dirPath);
    const response = await fetch(url, {
      method: 'MKCOL',
      headers: {
        ...this.getAuthHeader()
      }
    });

    if (response.status === 201 || response.status === 200 || response.status === 405) {
      // 201=Created, 200/405=Already exists
      return true;
    }

    if (response.status === 409) {
      // 父目录不存在，递归创建
      const parent = this.getParentPath(dirPath);
      if (parent !== dirPath) {
        await this.ensureDirectory(parent);
        // 重试创建
        const retryResponse = await fetch(url, {
          method: 'MKCOL',
          headers: {
            ...this.getAuthHeader()
          }
        });
        return retryResponse.status === 201 || retryResponse.status === 200 || retryResponse.status === 405;
      }
      return false;
    }

    if (response.status === 401) {
      throw new Error('WebDAV 认证失败，请检查用户名和密码');
    }

    return false;
  }

  /**
   * 上传文件（递归创建目录）
   * @param {string} filePath - 上传路径 (如 /clippings/article.md)
   * @param {string|Blob} content - 文件内容
   * @param {string} contentType - MIME 类型
   * @returns {Promise<Object>} {success, status, statusText}
   */
  async put(filePath, content, contentType = 'text/markdown; charset=utf-8') {
    // 先确保目录存在
    const dirPath = this.getParentPath(filePath);
    if (dirPath !== '/') {
      await this.ensureDirectory(dirPath);
    }

    const url = this.buildUrl(filePath);
    const headers = {
      'Content-Type': contentType,
      ...this.getAuthHeader()
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: headers,
      body: content
    });

    if (response.status === 201 || response.status === 204 || response.status === 200) {
      return { success: true, status: response.status };
    }

    let errorMsg = `上传失败 (HTTP ${response.status})`;
    if (response.status === 401) {
      errorMsg = 'WebDAV 认证失败，请检查用户名和密码';
    } else if (response.status === 403) {
      errorMsg = 'WebDAV 权限不足，请检查账号权限';
    } else if (response.status === 404) {
      errorMsg = 'WebDAV 服务器路径不存在，请检查配置';
    } else if (response.status >= 500) {
      errorMsg = `WebDAV 服务器错误 (HTTP ${response.status})`;
    }

    throw new Error(errorMsg);
  }

  /**
   * 测试连接
   * @returns {Promise<Object>} {success, message}
   */
  async testConnection() {
    try {
      const url = this.buildUrl('/');
      const response = await fetch(url, {
        method: 'PROPFIND',
        headers: {
          'Depth': '0',
          ...this.getAuthHeader()
        }
      });

      if (response.status === 207 || response.status === 200 || response.status === 401) {
        // 207=Multi-Status (WebDAV 成功响应)
        // 401 也可能是成功（服务器要求认证但我们的请求发了认证头）
        if (response.status === 401) {
          return { success: false, message: '认证失败，请检查用户名和密码' };
        }
        return { success: true, message: '连接成功' };
      }

      if (response.status === 404) {
        return { success: false, message: '服务器路径不存在' };
      }

      return { success: false, message: `服务器返回状态码 ${response.status}` };
    } catch (err) {
      return { success: false, message: `无法连接: ${err.message}` };
    }
  }
}
