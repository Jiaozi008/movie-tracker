# 修复记录：彻底解决本地打开无样式/纯 HTML 裸奔界面与 Tailwind CDN 依赖

## 1. 现象描述 (Symptom)
用户反馈在本地启动或刷新页面时，页面频繁退化为没有 CSS 样式的原生 HTML 元素（白底黑字、原生丑陋按钮纵向堆叠、无任何布局网格），看起来像“破损的图片界面”或需要多次刷新才能偶尔恢复。

## 2. 根因剖析 (Root Cause)
1. **外部 CDN 依赖阻塞**：原 `index.html` 中通过 `<script src="https://cdn.tailwindcss.com"></script>` 动态在客户端运行时编译注入 CSS。在国内网络环境下，`cdn.tailwindcss.com` 经常遭遇高延迟、DNS 污染或网络超时，导致 Tailwind 样式未能注入。
2. **Service Worker 本地缓存冲突**：原 `sw.js` 在 `localhost` 下同样被激活，缓存了未加载完样式的 `index.html` 外壳，导致每次刷新依然从本地 Cache 读出破损结构。
3. **残留 importmap 冲突**：`index.html` 中遗留了指向 `aistudiocdn.com` 的外部依赖，干扰本地 Vite 构建。

## 3. 修复方案 (Fix Applied)
1. **本地工程化接入 Tailwind CSS**：
   - 安装 devDependencies: `tailwindcss@^3.4.17`、`postcss@^8.4.49`、`autoprefixer@^10.4.20`。
   - 新建 `tailwind.config.js` 与 `postcss.config.js`，正确配置 content 扫描路径与自定义主题扩展（`brand`、`dark`、`Inter` 字体）。
   - `index.css` 头部引入 `@tailwind base; @tailwind components; @tailwind utilities;`。
2. **清理 `index.html` 外部网络脚本**：
   - 彻底删除 `<script src="https://cdn.tailwindcss.com"></script>` 与 inline `tailwind.config`。
   - 彻底删除 `importmap`。
3. **开发环境 Service Worker 隔离机制**：
   - `index.html` 中在 `localhost` / `127.0.0.1` 环境下主动执行 `navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))`，注销本地 SW，避免任何本地开发缓存异常。
   - 仅在正式生产线上部署（`https:` 且非本地环境）时启用 PWA 离线 Service Worker。

## 4. 验证结果 (Verification)
- `npm run build`：本地成功生成 `dist/assets/index-*.css` (61.05 kB)，0% 外部 CDN 依赖。
- `npm test`：10 个测试套件，80 个单元测试 100% 全部通过。
- 版本号升级至 `v1.4.6`，同步归档更新日志。
