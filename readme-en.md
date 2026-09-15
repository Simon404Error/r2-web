![93c1205d.png](https://image.viki.moe/github/93c1205d.png)

**[中文](./readme.md) | English**

# R2 Web

📁 A lightweight, elegant, pure-browser Cloudflare R2 file manager. Everything happens right in your browser.

> Featured in _[Tech Enthusiast Weekly (Issue 387)][ruanyifeng-weekly]_ and [HelloGitHub (Issue 123)][hellogithub-123].

## Live Demo

Follow the [Quick Start](#quick-start) to configure R2 CORS, then open **[r2.viki.moe](https://r2.viki.moe)**. Credentials stay in your browser.

## Why R2 Web?

The Cloudflare dashboard works for basic operations, but browsing, moving, renaming, and uploading many files can be cumbersome. Desktop clients require installation, while CLI tools are not ideal for everyone. R2 Web provides an instant, cross-platform management interface built specifically for R2.

### What makes it different

| Advantage | Details |
| --- | --- |
| **Direct, client-side access** | The browser calls the R2 S3 API directly; files and credentials never pass through a third-party backend |
| **Zero build, zero framework** | `src` is the deployable artifact, built on native Web APIs for easy auditing and self-hosting |
| **Large-file workflow** | Automatic multipart uploads with pause/resume, live speed and byte progress, up to 1 TiB per file |
| **Focused file management** | Directory browsing, previews, sorting, multi-select, copy, move, rename, and recursive delete |
| **Image-hosting friendly** | Drag/paste upload, filename templates, local image compression, and Markdown/HTML link copying |
| **Cross-platform UX** | PWA, dark mode, and zh / zh_TW / en / ja localization |

> R2 Web is not a replacement for complex permission management, automation, or API integration. Use the Cloudflare dashboard, official SDK/CLI, or rclone for those workflows and for files larger than 1 TiB.

## Features

| Category | Capabilities |
| --- | --- |
| **Browse & manage** | Paginated directories, lazy thumbnails, name/date/size sorting, batch copy/move/delete |
| **Upload** | Picker, drag, paste, concurrency, automatic multipart, pause/resume, conflict handling, 1 TiB limit |
| **Filename templates** | `[name]`, `[ext]`, `[hash:N]`, date, timestamp, UUID, and directory templates |
| **Image compression** | Local WebAssembly compression for JPEG, PNG, WebP, and AVIF; optional Tinify support |
| **Preview & share** | Image, video, audio, and text previews; public/presigned URLs, QR, Markdown, and HTML |
| **Personalization** | Grid/list views, density controls, light/dark themes, localization, and PWA |

## Screenshots

![9392ee.png](https://image.viki.moe/github/9392ee.png)

![ea7dd6.png](https://image.viki.moe/github/ea7dd6.png)

## Quick Start

### 1. Configure R2 Bucket CORS

In Cloudflare, go to **R2 → Bucket → Settings → CORS Policy**:

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

For self-hosting, replace `AllowedOrigins` with your domain. Exposing `ETag` is required to complete multipart uploads.

### 2. Create and enter credentials

Create an R2 API token scoped to the target bucket. At [r2.viki.moe](https://r2.viki.moe), enter the Account ID, Access Key ID, Secret Access Key, and Bucket Name.

### 3. Start managing files

Drag, paste, or click to upload. Right-click files to preview, copy links, move, rename, or delete. For image hosting, enable filename templates and local image compression.

## Self-Hosting

R2 Web is a static site. Deploy the repository's `src` directory as-is.

| Platform | One-click deploy |
| --- | --- |
| Vercel | [![Deploy with Vercel](https://vercel.com/button)][vercel-deploy] |
| Netlify | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)][netlify-deploy] |
| Cloudflare Pages | [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)][cloudflare-deploy] |

After deployment, add the new domain to your R2 CORS `AllowedOrigins`.

## Common Configuration

### Filename templates

- `[name]_[hash:6].[ext]` — original name plus content hash
- `images/[date:YYYY/MM/DD]/[uuid].[ext]` — date-based directories
- `backup/[timestamp]-[name].[ext]` — timestamped backups

### Configuration sharing

Generate a configuration link or QR code to sync settings between devices.

> [!CAUTION]
> Shared configuration contains R2 credentials. Send it only through trusted channels and never publish it publicly.

## Local Development

```bash
git clone https://github.com/vikiboss/r2-web.git
cd r2-web
pnpm install

npx serve src
# or
python3 -m http.server 5500 --directory src
```

No build is required. Dependencies are primarily used through browser Import Maps and for local type checking. See [AGENTS.md](./AGENTS.md) for development conventions.

## FAQ

**Are my credentials safe?**  Credentials are stored only in browser `localStorage`, and requests go directly to R2. Use a bucket-scoped API token with minimum required permissions.

**Which browsers are supported?**  The latest Chrome, Edge, Firefox, and Safari. Internet Explorer is not supported.

**Where does image compression happen?**  Local mode runs through WebAssembly in the browser. Tinify mode sends images to the Tinify service.

**Why is my upload failing?**  Check credentials, bucket permissions, and CORS. Multipart uploads require `POST` / `PUT` / `DELETE` and an exposed `ETag` header. Files must not exceed 1 TiB.

## Feedback

- [GitHub Issues](https://github.com/vikiboss/r2-web/issues) — bugs and feature requests
- [QQ Group](https://qm.qq.com/q/e47kAlbdsc) — Group ID: 1091212613

## License

MIT License

[ruanyifeng-weekly]: https://www.ruanyifeng.com/blog/2026/03/weekly-issue-387.html
[hellogithub-123]: https://hellogithub.com/periodical/volume/123
[vercel-deploy]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvikiboss%2Fr2-web&project-name=r2-web&repository-name=r2-web
[netlify-deploy]: https://app.netlify.com/start/deploy?repository=https%3A%2F%2Fgithub.com%2Fvikiboss%2Fr2-web&integrationName=r2-web&integrationSlug=r2-web
[cloudflare-deploy]: https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fvikiboss%2Fr2-web
