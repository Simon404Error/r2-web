![93c1205d.png](https://image.viki.moe/github/93c1205d.png)

**中文 | [English](./readme-en.md)**

# R2 Web

📁 轻盈优雅的 Web 原生 Cloudflare R2 文件管理器，一切皆在浏览器中完成。

<a href="https://hellogithub.com/repository/vikiboss/r2-web" target="_blank"><img src="https://api.hellogithub.com/v1/widgets/recommend.svg?rid=bd21b5fa51c94603a53054b5a3becc27&claim_uid=wXMelR56paDoO2x&theme=dark" alt="Featured｜HelloGitHub" style="width: 250px; height: 54px;" width="250" height="54" /></a>

> 本项目曾被 [《科技爱好者周刊（第 387 期）》][ruanyifeng-weekly] 和 [《HelloGitHub（第 123 期）》][hellogithub-123] 推荐。

## 在线使用

按 [快速开始](#快速开始) 配置 R2 CORS，然后访问 **[r2.viki.moe](https://r2.viki.moe)**。凭证只保存在浏览器本地。

## 为什么做 R2 Web？

Cloudflare 控制台适合基础操作，但大量文件的浏览、移动、重命名和临时上传并不高效；桌面客户端需要安装，CLI 又不适合所有人。R2 Web 希望补上一个随开随用、跨平台且专注 R2 的管理界面。

### 差异化优势

| 优势 | 说明 |
| --- | --- |
| **纯客户端直连** | 浏览器直接调用 R2 S3 API，没有中转服务器，文件和凭证不经过第三方后端 |
| **零构建、零框架** | `src` 即部署产物，基于原生 Web API，便于审计、修改和私有部署 |
| **大文件体验** | 自动分片，支持暂停/继续、实时速度和大小进度，最大支持 1 TiB |
| **专注文件管理** | 目录浏览、预览、排序、批量选择，以及复制、移动、重命名、递归删除 |
| **图床友好** | 拖拽/粘贴上传、文件名模板、本地图片压缩、Markdown/HTML 链接复制 |
| **跨平台体验** | PWA、深色模式和 zh / zh_TW / en / ja 多语言支持 |

> R2 Web 不替代复杂权限管理、自动化脚本或 API 集成；这些场景建议使用 Cloudflare 控制台、官方 SDK、CLI 或 rclone。

## 功能速览

| 类别 | 能力 |
| --- | --- |
| **浏览与管理** | 分页目录、懒加载缩略图、名称/日期/大小排序、批量复制/移动/删除 |
| **分片上传** | 选择、拖拽、粘贴；并发上传；自动分片；暂停/继续；冲突处理 |
| **文件名模板** | `[name]`、`[ext]`、`[hash:N]`、日期、时间戳、UUID 和目录模板 |
| **图片压缩** | JPEG、PNG、WebP、AVIF 本地 WebAssembly 压缩，也可选 Tinify |
| **预览与分享** | 图片、视频、音频、文本预览；直链、二维码、Markdown、HTML 格式 |
| **个性化** | 网格/列表、显示密度、浅色/深色主题、多语言、PWA |

## 界面截图

![9392ee.png](https://image.viki.moe/github/9392ee.png)

![ea7dd6.png](https://image.viki.moe/github/ea7dd6.png)

## 快速开始

### 1. 配置 R2 桶 CORS

在 Cloudflare 控制台进入 **R2 → 存储桶 → 设置 → CORS 策略**：

```json
[
  {
    "AllowedOrigins": ["https://r2.viki.moe"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 86400
  }
]
```

私有部署时，将 `AllowedOrigins` 替换为自己的域名。`ETag` 是完成分片上传所必需的响应头。

### 2. 创建并填写凭证

创建权限限定到目标 bucket 的 R2 API Token，在 [r2.viki.moe](https://r2.viki.moe) 填写 Account ID、Access Key ID、Secret Access Key 和 Bucket Name。

### 3. 开始管理

拖拽、粘贴或点击上传；右键文件可预览、复制链接、移动、重命名或删除。作为图床使用时，建议启用文件名模板和图片压缩。

## 私有部署

R2 Web 是静态站点，部署仓库中的 `src` 目录即可。

| 平台 | 一键部署 |
| --- | --- |
| Vercel | [![Deploy with Vercel](https://vercel.com/button)][vercel-deploy] |
| Netlify | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)][netlify-deploy] |
| Cloudflare Pages | [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)][cloudflare-deploy] |

部署完成后，请将新域名加入 R2 CORS 的 `AllowedOrigins`。

## 常用配置

### 文件名模板

- `[name]_[hash:6].[ext]` — 原文件名 + 内容哈希
- `images/[date:YYYY/MM/DD]/[uuid].[ext]` — 按日期组织目录
- `backup/[timestamp]-[name].[ext]` — 时间戳备份文件名

### 配置分享

可以生成配置分享链接或二维码，在设备间快速同步设置。

> [!CAUTION]
> 分享内容包含 R2 访问凭证。仅通过可信渠道传递，不要发布到公开平台。

## 本地开发

```bash
git clone https://github.com/vikiboss/r2-web.git
cd r2-web
pnpm install

npx serve src
# 或
python3 -m http.server 5500 --directory src
```

项目不需要构建；依赖主要用于浏览器 Import Maps 和本地类型检查。开发约定见 [AGENTS.md](./AGENTS.md)。

## FAQ

**凭证安全吗？**  凭证仅存储在浏览器 `localStorage`，请求直接发送到 R2。仍建议使用限定 bucket 和最小权限的 API Token。

**支持哪些浏览器？**  支持最新版 Chrome、Edge、Firefox 和 Safari，不支持 IE。

**图片压缩在哪里进行？**  本地模式使用 WebAssembly 在浏览器内完成；选择 Tinify 时，图片会发送到 Tinify 服务。

**为什么上传失败？**  检查凭证、bucket 权限和 CORS。分片上传要求允许 `POST` / `PUT` / `DELETE` 并暴露 `ETag`；单文件不能超过 1 TiB。

## 反馈

- [GitHub Issues](https://github.com/vikiboss/r2-web/issues) — Bug 与功能建议
- [反馈 QQ 群](https://qm.qq.com/q/e47kAlbdsc) — 群号：1091212613

## License

MIT License

[ruanyifeng-weekly]: https://www.ruanyifeng.com/blog/2026/03/weekly-issue-387.html
[hellogithub-123]: https://hellogithub.com/periodical/volume/123
[vercel-deploy]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvikiboss%2Fr2-web&project-name=r2-web&repository-name=r2-web
[netlify-deploy]: https://app.netlify.com/start/deploy?repository=https%3A%2F%2Fgithub.com%2Fvikiboss%2Fr2-web&integrationName=r2-web&integrationSlug=r2-web
[cloudflare-deploy]: https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fvikiboss%2Fr2-web
