# AGENTS.md

本文档为本仓库提供开发指南。

## 项目速览

**R2 Web** — 纯客户端 Cloudflare R2 存储桶文件管理器，零构建、零框架、零后端。

**核心特性** 文件上传、目录浏览、文件预览、文件操作、图片压缩、PWA、多语言（zh/zh_TW/en/ja）、浅色/深色主题、多选批量操作。

**快速启动**

```bash
npx serve src
# 或
python3 -m http.server 5500 --directory src
```

## 代码地图

### 快速定位表

| 任务               | 文件                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| 修改文件名模板逻辑 | `src/js/utils.js` — `applyFilenameTemplate`                                 |
| 修改图片压缩逻辑   | `src/js/upload-manager.js` — `compressFile`                                 |
| 添加 i18n 文案     | `src/js/i18n.js` — `const I18N`                                             |
| 修改按钮样式       | `src/css/components.css` — `.btn`                                           |
| 添加设计 Token     | `src/css/tokens.css`                                                        |
| 修改 R2 API 操作   | `src/js/r2-client.js`                                                       |
| 修改文件浏览逻辑   | `src/js/file-explorer.js`                                                   |
| 修改上传管理逻辑   | `src/js/upload-manager.js`                                                  |
| 多选批量操作逻辑   | `src/js/file-explorer.js` — `toggleSelect` / `selectAll` / `clearSelection` |

### 工具函数列表

以下函数定义在 `src/js/utils.js`，供各模块导入：

- `t(key, vars)` — i18n 翻译（来自 `src/js/i18n.js`）
- `applyFilenameTemplate(tpl, file)` — 文件名模板处理，占位符：`[name]`、`[ext]`、`[hash:N]`、`[date:FORMAT]`、`[timestamp]`、`[uuid]`、`/`
- `compressFile(file, config, onStatus)` — 图片压缩（定义在 `upload-manager.js`）
  - PNG 特殊处理：直接优化缓冲区，不重新编码
  - 自适应逻辑：压缩后更大则使用原文件

## 项目结构

```
r2-web/
├── readme.md          — 项目说明、使用指南
├── package.json       — 依赖声明（仅用于类型提示）
├── jsconfig.json      — JSDoc 类型检查配置
└── src/               — 源码目录（即部署目录）
     ├── index.html    — 应用外壳、import map、对话框模板
     ├── main.js       — 入口（仅 new App()）
     ├── manifest.json — PWA 配置
     ├── style.css     — 样式主入口（仅导入 css 子目录）
     ├── js/           — 业务逻辑模块
     │    ├── app.js              — 主协调器
     │    ├── config-manager.js   — 配置持久化、Base64 分享
     │    ├── r2-client.js        — S3 API 客户端
     │    ├── ui-manager.js       — 主题、Toast、对话框、Tooltip
     │    ├── file-explorer.js    — 目录导航、排序、分页、缩略图
     │    ├── upload-manager.js   — 上传、文件名模板、图片压缩
     │    ├── file-preview.js     — 图片/视频/音频/文本预览
     │    ├── file-operations.js  — 重命名、复制、移动、删除
     │    ├── i18n.js             — 多语言（zh/zh_TW/en/ja）
     │    ├── constants.js        — 常量
     │    └── utils.js            — 工具函数
     └── css/          — 样式模块（CSS Layers）
          ├── reset.css       — CSS Reset
          ├── tokens.css      — 设计 Token（定义所有变量）
          ├── base.css        — 全局基础样式
          ├── layout.css      — 布局容器
          ├── components.css  — 通用 UI 组件
          ├── utilities.css   — 工具类
          └── animations.css  — 动画与过渡
```

## 架构速查

### JavaScript 类架构

每个类独立为一个模块，位于 `src/js/`：

| 类               | 文件                 | 职责                                         |
| ---------------- | -------------------- | -------------------------------------------- |
| `ConfigManager`  | `config-manager.js`  | localStorage 持久化、Base64 配置分享         |
| `R2Client`       | `r2-client.js`       | S3 API 客户端（基于 `aws4fetch` 签名）       |
| `UIManager`      | `ui-manager.js`      | 主题、Toast、对话框、上下文菜单、Tooltip     |
| `FileExplorer`   | `file-explorer.js`   | 目录导航、排序、分页、懒加载缩略图、列表缓存 |
| `UploadManager`  | `upload-manager.js`  | 拖拽/粘贴上传、文件名模板、图片压缩          |
| `FilePreview`    | `file-preview.js`    | 图片/视频/音频/文本预览                      |
| `FileOperations` | `file-operations.js` | 重命名、复制、移动、删除（递归删除目录）     |
| `App`            | `app.js`             | 主协调器、i18n 处理                          |

## i18n 速查

### 多语言机制

- **I18N 对象** `src/js/i18n.js`（zh / zh_TW / en / ja 四语言）
- **翻译函数** `t(key, vars)` 支持变量替换
- **支持语言** zh（中文）、zh_TW（繁体）、en（英语）、ja（日语）
- **语言切换** `App.updateLanguage()` 自动更新所有文案

### 添加新文案

1. 在 `src/js/i18n.js` 的 `I18N` 对象添加 zh / zh_TW / en / ja 键值
2. 代码中使用 `t('key')` 或 `t('key', { var: 'value' })`
3. HTML 元素使用 `data-tooltip-key="key"` 支持动态更新

**示例**

```javascript
// 1. 在 I18N 对象添加
const I18N = {
  zh: {
    deleteConfirm: '确定删除 {name} 吗？',
    deleteSuccess: '删除成功',
  },
  en: {
    deleteConfirm: 'Delete {name}?',
    deleteSuccess: 'Deleted successfully',
  },
  ja: {
    deleteConfirm: '{name} を削除しますか？',
    deleteSuccess: '削除しました',
  },
}

// 2. 代码中使用
const message = t('deleteConfirm', { name: fileName })
uiManager.toast(t('deleteSuccess'), 'success')

// 3. Tooltip 使用
button.dataset.tooltipKey = 'deleteConfirm'
button.dataset.tooltip = t('deleteConfirm')
```
