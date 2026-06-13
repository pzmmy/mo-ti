---
type: note
tags: [AI, 配置, DeepSeek]
---

# 配置 DeepSeek AI

墨屉内置了 DeepSeek 支持，配置只需两步：

## 1. 获取 API Key
1. 访问 https://platform.deepseek.com/
2. 注册账号并登录
3. 进入 API Keys 页面，创建新的 API Key
4. 复制 Key（以 `sk-` 开头）

## 2. 在墨屉中配置
1. 打开墨屉设置（`Cmd+,` 或 `Ctrl+,`）
2. 进入「AI 供应商」设置
3. 选择 **DeepSeek**
4. 粘贴 API Key
5. 点击「测试连接」验证

## 其他国产 AI

墨屉还支持以下国产 AI 供应商，配置方式类似：

| 供应商 | 获取地址 |
|--------|----------|
| 通义千问 (DashScope) | https://dashscope.aliyun.com/ |
| 智谱 GLM | https://open.bigmodel.cn/ |
| 月之暗面 Kimi | https://platform.moonshot.cn/ |
| 字节豆包 | https://console.volcengine.com/ark/ |

## 推荐模型

- **DeepSeek**: `deepseek-chat`（日常使用）/ `deepseek-reasoner`（深度推理）
- **通义千问**: `qwen-plus` / `qwen-max`
- **智谱 GLM**: `glm-4-plus`
