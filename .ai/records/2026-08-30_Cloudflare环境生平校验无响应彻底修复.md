# 故障排查与修复：Cloudflare 环境下生平校验与一键校验无响应问题

## 1. 故障原因定位 (Root Cause Analysis)
1. **Cloudflare Pages 缺失 TMDB 边缘代理函数**：
   - 本地开发环境运行有 `server.ts` Express 后端服务响应 `/api/tmdb/*`。
   - 部署到 Cloudflare Pages 后，线上只有静态前端与 `functions/api/gemini.ts`，缺少 `/api/tmdb` 的 Cloudflare Pages Function。
2. **SPA 404 回退误判为成功并引发 JSON 解析崩溃**：
   - 浏览器向 `/api/tmdb/...` 发起请求时，Cloudflare Pages SPA 路由机制将未匹配的请求路径回退返回了 `index.html`（状态码为 200，但类型是 `text/html`）。
   - `fetchTmdb` 仅依据 `res.ok` (200) 判定请求成功，随后代码调用 `res.json()` 尝试解析 HTML 文本，抛出 `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`。
   - 捕获异常后静默返回 `null`，导致前端未触发任何状态变更与界面刷新。

---

## 2. 核心修复措施

1. **新建 Cloudflare Pages Functions TMDB 代理 (`functions/api/tmdb/[[path]].ts`)**：
   - 在 Cloudflare 边缘环境以 Serverless Function 形式运行 TMDB 代理服务，直接在 Cloudflare 全球 CDN 网络转发并缓存 TMDB API 请求。
2. **严格防御 Content-Type 非 JSON 的 SPA 回退 (`services/tmdbService.ts`)**：
   - `fetchTmdb` 严格校验 `Content-Type` 必须包含 `application/json` 或 `text/json`；若命中 HTML 回退则立即自动平滑降级走官方直连通道。
3. **增加实时浮动 Toast 交互反馈 (`components/PersonUniverseModal.tsx` & `PersonCollectionBanner.tsx`)**：
   - 在影人宇宙与专栏中为单人校验与一键全量校验加入醒目的浮动 Toast 反馈（`✅ 已成功获取「XXX」全网生平代表作共 N 部`），让每次点击都拥有清晰的视觉反馈。

---

## 3. 部署与验证
- **测试**：全量 20 个测试套件 150 个测试用例 100% 全部通过。
- **生产构建与发布**：已发布至 Cloudflare Pages：`https://movie-tracker-6if.pages.dev`（版本 `c293c366`）。
- **版本号**：升级至 `v1.8.22`。
