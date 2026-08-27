# GYJL Task List

## Current Task (全量优化演进路线)

### [Bug 修复] 影人排行榜点击反向检索作品过滤修复 ☑️ (2026-08-27 21:35)
- [x] 优化 `App.tsx`：扩展 `filteredMovies` 搜索匹配逻辑，支持模糊匹配 `director`、`cast`、`review`、`overview` 字段 ☑️ (2026-08-27 21:34)
- [x] 优化 `App.tsx`：在 `onSelectPerson` 中重置其他单项筛选，保证点击导演/演员时无阻碍展示其全部作品 ☑️ (2026-08-27 21:34)
- [x] 优化 `App.tsx`：搜索框添加一键清空 `(X)` 按钮，更新占位符提示 ☑️ (2026-08-27 21:34)
- [x] 补充 `tests/phaseAdvance.test.ts` 导演与演员搜索匹配测试，全量 12 个测试套件（94 个测试）100% 通过且 Vite 生产打包通过 ☑️ (2026-08-27 21:35)
- [x] 升级 `package.json` 至 v1.5.1 并同步记录 `更新日志.md` ☑️ (2026-08-27 21:35)

---

### [重大版本升级] 影人阵容排行榜 & 纯享海报墙模式 & 全局快捷键流 & 外部导入兼容 ☑️ (2026-08-27 21:28)
- [x] 优化 `components/Stats.tsx` & `App.tsx`：构建「最常看导演 Top 5」与「最喜爱主演 Top 5」排行榜，并支持点击影人反向检索作品 ☑️ (2026-08-27 21:24)
- [x] 新增 `components/PosterWallCard.tsx` & `App.tsx`：构建 Netflix 级「纯享海报墙模式 (Poster Wall View)」及视图切换控制器 ☑️ (2026-08-27 21:25)
- [x] 升级 `hooks/useKeyboardShortcuts.ts`：支持 `N` 新增、`/` 搜索、`1/2` 切换视图、`Esc` 退出、`?` 帮助等全局全键盘流 ☑️ (2026-08-27 21:25)
- [x] 优化 `components/ReportShareModal.tsx`：增加多年份时光机报告生成及影人偏好高光长图导出 ☑️ (2026-08-27 21:24)
- [x] 优化 `utils/fileUtils.ts`：扩展 CSV 解析器，深度兼容豆瓣、NeoDB、Trakt 备份格式 ☑️ (2026-08-27 21:25)
- [x] 编写 `tests/phaseAdvance.test.ts`，全量 12 个测试套件、93 个单元测试 100% 通过且 Vite 生产打包通过 ☑️ (2026-08-27 21:27)
- [x] 升级 `package.json` 至 v1.5.0 并同步记录 `更新日志.md` ☑️ (2026-08-27 21:28)

---

### [修复与优化] 标签与类型同名去重与自动过滤加固 ☑️ (2026-08-27 21:15)
- [x] 优化 `utils/tagExtractor.ts`：`extractSmartTags` 核心去重过滤，当标签与类型存在相同时，保留类型，标签自动剔除重复项 ☑️ (2026-08-27 21:13)
- [x] 优化 `components/MovieForm.tsx`：TMDB 选择、AI 填表、剪贴板解析、智能打标签与手动输入标签全链路校验并过滤与 `genre` 重复的标签 ☑️ (2026-08-27 21:14)
- [x] 编写 `tests/tagsAndHeatmap.test.ts` 过滤同名类型测试用例，全量 90 个单元测试 100% 通过且 Vite 生产打包通过 ☑️ (2026-08-27 21:14)
- [x] 升级 `package.json` 至 v1.4.12 并同步记录 `更新日志.md` ☑️ (2026-08-27 21:15)

---

### [修复与优化] 影视卡片状态徽章尺寸统一与防折行加固 ☑️ (2026-08-27 21:10)
- [x] 优化 `components/MovieCard.tsx`：重构卡片状态与评分胶囊栏为统一高度 `h-6`、内边距 `px-2`、圆角 `rounded-md` 与字号 `text-[11px]` ☑️ (2026-08-27 21:06)
- [x] 优化 `components/MovieCard.tsx`：为「完结/追剧中/想看」、「🏆 推荐/神作/良作/一般」与「★ TMDB 评分」胶囊添加 `whitespace-nowrap shrink-0 leading-none`，彻底杜绝竖排折行变形 ☑️ (2026-08-27 21:06)
- [x] 优化 `components/MovieCard.tsx`：星级评分自适应右对齐，卡片视觉重心规整统一 ☑️ (2026-08-27 21:06)
- [x] 89 个单元测试 100% 通过且 Vite 生产打包通过 ☑️ (2026-08-27 21:06)
- [x] 升级 `package.json` 至 v1.4.11 并同步记录 `更新日志.md` ☑️ (2026-08-27 21:10)

---

### [修复与优化] 标签偏好彻底剥离类型混入 & 类型分布剔除「未知」类型 ☑️ (2026-08-27 21:05)
- [x] 优化 `components/Stats.tsx`：`tagData` 仅聚合 `m.tags`，彻底移除对 `m.genre` 的回退混入；增加空状态优雅占位提示 ☑️ (2026-08-27 21:01)
- [x] 优化 `components/Stats.tsx`：`genreCounts` 严格排除空类型与「未知」标签，雷达图仅展示真实有效影视类型 ☑️ (2026-08-27 21:01)
- [x] 优化 `utils/tagExtractor.ts`：`extractSmartTags` 仅输出具象特征标签，避免生成单一宽泛类型词，评分徽章优先展示 ☑️ (2026-08-27 21:01)
- [x] 编写 `tests/tagsAndHeatmap.test.ts` 纯粹标签与排除未知单元测试，89 个用例 100% 通过且 Vite 生产打包通过 ☑️ (2026-08-27 21:02)
- [x] 升级 `package.json` 至 v1.4.10 并同步记录 `更新日志.md` ☑️ (2026-08-27 21:05)

---

### [新增与优化] 自定义标签 (Tags) 智能提取与统计图表「标签偏好」升级 ☑️ (2026-08-27 21:00)
- [x] 创建 `utils/tagExtractor.ts`：构建 `extractSmartTags` 语义提取算法，根据片名、类型、剧情梗概、评分与 TMDB 关键词提取 2~4 个具象化中文标签 ☑️ (2026-08-27 20:51)
- [x] 升级 `services/tmdbService.ts`：在获取电影/剧集详情时加入关键词与智能标签提取，输出结构中自动附加 `tags` ☑️ (2026-08-27 20:51)
- [x] 升级 `services/geminiService.ts` & `hooks/useMovieAi.ts`：AI 元数据填充接口提示词要求输出标签并打通管道回填 ☑️ (2026-08-27 20:52)
- [x] 升级 `components/MovieForm.tsx`：TMDB 选择、AI 填表、剪贴板解析时自动注入智能标签；新增「✨ 智能打标签」一键操作按钮 ☑️ (2026-08-27 20:53)
- [x] 升级 `components/Stats.tsx`：将「类型偏好 Top 8」重构为「标签偏好 Top 8」，统计用户实际自定义标签并平滑降级兼容旧数据，更换专属 `Tag` 标签徽标 ☑️ (2026-08-27 20:54)
- [x] 编写 `tests/tagsAndHeatmap.test.ts` 智能提取单元测试，88 个用例 100% 通过且 Vite 构建打包成功 ☑️ (2026-08-27 20:54)
- [x] 升级 `package.json` 至 v1.4.9 并同步记录 `更新日志.md` ☑️ (2026-08-27 21:00)

---

### [新增与优化] TMDB 自动获取剧情简介与平台评分全链路贯通 ☑️ (2026-08-27 20:45)
- [x] 扩展 `types.ts`：在 `Movie` 结构中新增 `overview?: string`（剧情简介）与 `tmdbRating?: number`（TMDB 平台评分 0~10 分） ☑️ (2026-08-27 20:40)
- [x] 升级 `hooks/useMovieForm.ts` & `hooks/useMovieAi.ts`：表单状态机接入 `overview` 与 `tmdbRating` 初始构建、默认状态与 AI/TMDB 自动填充通道 ☑️ (2026-08-27 20:41)
- [x] 升级 `components/MovieForm.tsx`：状态/评分网格布局升级为 2x2 结构并内嵌 TMDB 平台评分输入胶囊；新增「剧情简介」专属多行文本域，支持 TMDB 自动填充与字数统计 ☑️ (2026-08-27 20:42)
- [x] 升级 `components/MovieCard.tsx`：卡片正面状态栏新增金色 `TMDB 8.4` 专属评分胶囊，展开详情页优雅呈现「剧情简介」客观介绍区块 ☑️ (2026-08-27 20:42)
- [x] 升级 `utils/fileUtils.ts`：CSV 导入导出全量兼容「平台评分」与「剧情简介」表头及双向解析 ☑️ (2026-08-27 20:43)
- [x] 编写 `tests/movieFormEnhance.test.ts` 单元测试，全量 85 个测试用例 100% 通过且 Vite 生产打包成功 ☑️ (2026-08-27 20:44)
- [x] 升级 `package.json` 至 v1.4.8 并更新 `更新日志.md` ☑️ (2026-08-27 20:45)

---

### [优化与修复] 新增记录体验优化、电视剧默认追剧中、倍速位置重构与提交修复 ☑️ (2026-08-27 20:30)
- [x] 优化 `hooks/useMovieForm.ts`：电视剧媒体类型（`mediaType: 'tv'`）切换及初始化时，观看状态自动默认为「追剧中」（`MovieStatus.WATCHING`） ☑️ (2026-08-27 20:25)
- [x] 优化 `components/MovieForm.tsx`：将「⚡ 倍速播放折算」移至「自定义标签」上方，并升级 1.0x~2.0x 快捷点选胶囊与耗时折算提示 ☑️ (2026-08-27 20:27)
- [x] 创建 `utils/uuidUtils.ts`：封装兼容非 HTTPS 与老旧浏览器环境的 `generateUUID()` 防御性唯一 ID 生成器 ☑️ (2026-08-27 20:25)
- [x] 修复 `components/MovieForm.tsx` & `App.tsx`：表单增加 `noValidate` 与前置标题校验、双端常驻底部操作栏，彻底解决点击「添加记录」无反应问题并增加成功 Toast 反馈 ☑️ (2026-08-27 20:27)
- [x] 编写 `tests/movieFormEnhance.test.ts` 自动化单元测试并通过全部 84 个测试用例与生产构建 ☑️ (2026-08-27 20:28)
- [x] 升级 `package.json` 至 v1.4.7 并更新 `更新日志.md` ☑️ (2026-08-27 20:30)

---

### 阶段 1: [P0] 追剧快捷打卡与全局快捷键 ☑️ (2026-08-26 23:03)
- [x] 扩展 `types.ts` 新增 `EpisodeWatchLog` 及 `watchHistory` 打卡时间流水数组 ☑️ (2026-08-26 23:00)
- [x] 封装 `utils/episodeUtils.ts` 实现打卡集数递增/递减、时间戳自动记录、完结自动流转与友好相对时间格式化 ☑️ (2026-08-26 23:00)
- [x] 封装 `hooks/useKeyboardShortcuts.ts` 支持 `Ctrl/Cmd+K`（聚焦搜索）、`N`（新建记录）、`Esc`（关闭弹窗）全局快捷键 ☑️ (2026-08-26 23:01)
- [x] 升级 `components/MovieCard.tsx` 在卡片正面提供快捷 `+1 / -1` 胶囊按钮、最近打卡时间展示及折叠区打卡足迹时间轴 ☑️ (2026-08-26 23:01)
- [x] 升级 `App.tsx` 接入快捷键与打卡处理器，并在搜索栏/新建按钮增加键位 Badge 提示 ☑️ (2026-08-26 23:02)
- [x] 编写 `tests/quickEpisodeUpdate.test.ts` 自动化单元测试并通过全部 62 个用例与打包构建 ☑️ (2026-08-26 23:02)
- [x] 自动记录 `更新日志.md` 并升级版本号至 v1.1.0 ☑️ (2026-08-26 23:03)

---

### 阶段 2: [P1] 自定义标签 (Tags) 与观影打卡热力图 ☑️ (2026-08-26 23:10)
- [x] 扩展 `Movie` 与 `MovieFormState` 支持多标签 `tags: string[]` ☑️ (2026-08-26 23:05)
- [x] `components/MovieForm.tsx` 支持标签快速添加、Chip 移除与常用候选标签池一键点选 ☑️ (2026-08-26 23:06)
- [x] `components/MovieCard.tsx` 正面与详情区展示标签 Chip 徽章 ☑️ (2026-08-26 23:07)
- [x] `App.tsx` 增加标签筛选维度与全维度标签模糊搜索匹配 ☑️ (2026-08-26 23:08)
- [x] `utils/fileUtils.ts` CSV/JSON 导入导出全量支持自定义标签字段 ☑️ (2026-08-26 23:08)
- [x] 创建 `components/ActivityHeatmap.tsx` 仿 GitHub 52 周年度打卡日历热力图，聚合电影与追剧打卡流水并统计连胜天数 ☑️ (2026-08-26 23:07)
- [x] 挂载热力图至 `components/Stats.tsx` 统计面板 ☑️ (2026-08-26 23:07)
- [x] 编写 `tests/tagsAndHeatmap.test.ts` 自动化单元测试（66 个测试 100% 通过）并完成打包构建 ☑️ (2026-08-26 23:09)
- [x] 升级 `package.json` 至 v1.2.0 并更新 `更新日志.md` ☑️ (2026-08-26 23:10)

### 阶段 3: [P2] AI 流式输出与观影报告长图 ☑️ (2026-08-26 23:14)
- [x] `server.ts` 扩展 `/api/gemini/stream` SSE 流式传输接口，代理接入 Gemini `streamGenerateContent` 管道 ☑️ (2026-08-26 23:11)
- [x] `services/geminiService.ts` 与 `hooks/useMovieAi.ts` 接入流式打字机响应与双层错误降级机制 ☑️ (2026-08-26 23:11)
- [x] `utils/statsCalculator.ts` 抽取并解耦 `calculateRewatchKing`、`calculateSpeedDemon`、`calculateJudgePersona` 纯函数 ☑️ (2026-08-26 23:13)
- [x] 创建 `components/ReportShareModal.tsx` 高清影视手账长图生成器，支持 4 款主题、周期过滤、高分作品卡片、类型/标签分布与 300% DPI 渲染导出 ☑️ (2026-08-26 23:12)
- [x] `components/Stats.tsx` 挂载「生成观影长图」入口并支持 Toast 反馈 ☑️ (2026-08-26 23:12)
- [x] 编写 `tests/streamingAndReport.test.ts` 自动化测试并通过全量 69 个测试用例与生产构建 ☑️ (2026-08-26 23:13)
- [x] 升级 `package.json` 至 v1.3.0 并更新 `更新日志.md` ☑️ (2026-08-26 23:14)

### 阶段 4: [P2] IndexedDB 海报存储与离线 PWA ☑️ (2026-08-26 23:17)
- [x] 封装 `utils/posterStorage.ts` 实现基于 IndexedDB 的大容量异步海报存储引擎，解决 LocalStorage 5MB 配额瓶颈 ☑️ (2026-08-26 23:15)
- [x] 重构 `hooks/useMovies.ts` 接入海报后台自动备份、ID 极速检索、删除联动销毁与孤立缓存清理 ☑️ (2026-08-26 23:15)
- [x] 创建 `public/sw.js` Service Worker 离线缓存引擎，实现 Shell 离线秒开与 Stale-While-Revalidate 响应 ☑️ (2026-08-26 23:15)
- [x] 在 `index.html` 中注册 Service Worker 并配置 PWA manifest 与独立 App 安装支持 ☑️ (2026-08-26 23:15)
- [x] 编写 `tests/posterStorageAndPwa.test.ts` 单元测试并通过全量 71 个测试用例与生产构建 ☑️ (2026-08-26 23:16)
- [x] 升级 `package.json` 至 v1.4.0 并更新 `更新日志.md` ☑️ (2026-08-26 23:17)

---

### [Debug 修复] 追剧打卡统计看板全链路动态联动修复 ☑️ (2026-08-26 23:32)
- [x] `utils/episodeUtils.ts`: 打卡 `+1 / -1` 时自动同步重算 `actualWatchTime`，消除时长冻结 Bug ☑️ (2026-08-26 23:29)
- [x] `components/Stats.tsx`: 升级时间范围过滤与 `trendData` 观影趋势图，聚合 `watchHistory` 流水时间戳 ☑️ (2026-08-26 23:29)
- [x] `App.tsx`: 主页时间筛选 (`dateFilter` & `dateOptions`) 全面关联 `watchHistory` 打卡时间 ☑️ (2026-08-26 23:29)
- [x] `tests/quickEpisodeUpdate.test.ts`: 新增时长与集数动态联动单元测试（72 个测试 100% 通过）☑️ (2026-08-26 23:31)
- [x] 升级版本号至 `v1.4.1` 并更新 `更新日志.md` ☑️ (2026-08-26 23:32)

---

### [Debug 修复 2] 剧集集数统计与多季独立计算彻底修复 ☑️ (2026-08-26 23:50)
- [x] `utils/titleNormalizer.ts`: 移除剥离季数（第一季/第二季/Season/S01）的误伤逻辑，避免多季被吞噬合并导致集数不更新 ☑️ (2026-08-26 23:48)
- [x] `utils/statsCalculator.ts`: `calculateTotalEpisodes` 与 `calculateTvDuration` 接入 `TimeFilterOptions`，按月/按年精确统计 `watchHistory` 流水集数与时长 ☑️ (2026-08-26 23:48)
- [x] `components/Stats.tsx` & `ReportShareModal.tsx`: 传入时间过滤参数，实现打卡集数毫秒级动态跳变 ☑️ (2026-08-26 23:48)
- [x] `tests/statsCalculator.test.ts`: 新增多季独立统计与按月精确统计测试（74 个测试 100% 通过）☑️ (2026-08-26 23:49)
- [x] 升级版本号至 `v1.4.2` 并更新 `更新日志.md` ☑️ (2026-08-26 23:50)

---

### [Debug 修复 3] 追剧快捷打卡底账补齐与统计公式全面加固 ☑️ (2026-08-27 00:06)
- [x] `utils/episodeUtils.ts`: 修复点击 `+1` 时前序集数底账丢失导致按周期筛选统计倒扣减少的严重 Bug，自动以 `addedAt` 补齐前序集数流水底账 ☑️ (2026-08-27 00:04)
- [x] `components/MovieForm.tsx`: 弹窗表单修改当前集数时，双向智能补齐/裁剪 `watchHistory` 流水数组，避免流水脱节 ☑️ (2026-08-27 00:04)
- [x] `utils/statsCalculator.ts`: 严格复核全套统计公式，加固兜底分支中的倍速除法计算 ☑️ (2026-08-27 00:04)
- [x] `tests/quickEpisodeUpdate.test.ts`: 新增无底账打卡 +1 防倒扣测试与回归验证（75 个测试 100% 通过）☑️ (2026-08-27 00:05)
- [x] 升级版本号至 `v1.4.3` 并更新 `更新日志.md` ☑️ (2026-08-27 00:06)

---

### [移动端适配与优化] 全功能移动端体验深度加固 ☑️ (2026-08-27 00:22)
- [x] `components/MovieCard.tsx`: 追剧 `+1 / -1` 快捷打卡按钮触控热区增大、引入 `touch-manipulation` 消除点击延迟，增强弹性反馈 ☑️ (2026-08-27 00:19)
- [x] `components/ActivityHeatmap.tsx`: 52 周热力图在移动端自动平滑右滑至最新周，支持 iOS 惯性滑动并优化点击外围收起气泡 ☑️ (2026-08-27 00:19)
- [x] `components/ReportShareModal.tsx`: 长图海报弹窗全面接入 `env(safe-area-inset-bottom)` 安全区域与全宽手指触控按钮 ☑️ (2026-08-27 00:20)
- [x] `components/MovieForm.tsx` & `App.tsx`: 常用标签候选池与状态滑动栏增加触控加速与手势优化 ☑️ (2026-08-27 00:20)
- [x] 升级版本号至 `v1.4.4` 并更新 `更新日志.md` ☑️ (2026-08-27 00:22)

---

### [Bug 修复] 彻底解决本地打开无样式/纯 HTML 裸奔界面与 Tailwind CDN 依赖问题 ☑️ (2026-08-27 13:13)
- [x] 安装配置本地 `tailwindcss`、`postcss`、`autoprefixer` 并新建 `tailwind.config.js` / `postcss.config.js` ☑️ (2026-08-27 13:12)
- [x] `index.css` 引入 `@tailwind` 本地编译指令，构建产物独立打包本地 CSS (61KB)，0% 外部 CDN 依赖 ☑️ (2026-08-27 13:12)
- [x] 清理 `index.html` 外部 CDN script 与旧版 importmap，增加开发环境自动注销 ServiceWorker 机制，杜绝缓存死锁 ☑️ (2026-08-27 13:12)
- [x] 80 个单元测试 100% 通过，`npm run build` 成功，版本升级至 `v1.4.6` ☑️ (2026-08-27 13:13)

---

### [新增记录全能升级] 表单分层、半星评分、智能剪贴板、备选海报库与草稿暂存深度重构 ☑️ (2026-08-27 12:35)
- [x] `components/StarRating.tsx`: 升级 0.5 半星评分，支持左右半区交互与 50% 裁剪渲染，联动 10 分制双模评级文案 ☑️ (2026-08-27 12:26)
- [x] `utils/clipboardParser.ts`: 编写剪贴板智能解析引擎，提取书名号片名、豆瓣/IMDb 链接、年份与季数并配套单元测试 ☑️ (2026-08-27 12:26)
- [x] `hooks/useMovieForm.ts`: 引入草稿暂存读写机制与今天/昨天/前天偏移日期生成工具 ☑️ (2026-08-27 12:26)
- [x] `services/tmdbService.ts` & `components/TmdbSearchModal.tsx`: 升级 TMDB 电视剧分季选择面板与多海报图库拉取，支持录入单季专属集数、专属海报与首播年份，彻底解决多季合并汇总痛点 ☑️ (2026-08-27 12:28)
- [x] `components/MovieForm.tsx`: 落地渐进式折叠表单、快捷日期胶囊、备选海报海选滑轨、剪贴板一键解析、Ctrl+V 截图直接贴图与草稿防误触恢复 ☑️ (2026-08-27 12:34)
- [x] `components/MovieCard.tsx`: 增加短评一键复制与多刷重温时间轴流水展示 ☑️ (2026-08-27 12:34)
- [x] 运行全量 10 个测试套件（80 个单元测试 100% 通过）与构建验证 ☑️ (2026-08-27 12:34)
- [x] 升级版本号至 `v1.4.5` 并同步更新 `更新日志.md` ☑️ (2026-08-27 12:35)

---

## Finished (历史已完成)
- [x] 修复 GitHub Gist 自动同步置灰及挂起问题 ☑️ (2026-06-22 11:27)
- [x] 编写智能双向合并算法 (基于 lastUpdated 和删除标记) ☑️ (2026-06-21 11:56)
- [x] 重构 `useMovies.ts` 以记录被删除的记录 (Tombstone) ☑️ (2026-06-21 11:56)
- [x] 重构 `useSync.ts` 实现页面加载自动同步、变动防抖自动同步 and 每日定时同步 ☑️ (2026-06-21 11:56)
- [x] 升级 `SyncModal.tsx`，添加“自动同步”开关与状态反馈 ☑️ (2026-06-21 11:56)
- [x] 测试并验证同步机制 (包括网页端 and 模拟的移动端同步) ☑️ (2026-06-21 11:56)
- [x] 增加更多“观看平台”的选择，集成国际主流流媒体 (2026-03-21)
- [x] “状态”、“观看平台”和“评分”自动填充上次记录 (2026-03-21)
- [x] 搜索时自动剔除过于笼统的“剧情”或“Drama”标签 (2026-03-21)
- [x] 表单智能下拉标题补全（包含无序多关键词模糊匹配） (2026-03-21)
- [x] 跨实体类型全量记录智能继承及错误覆盖 Bug 修复 (2026-03-21)
- [x] 环境变量 VITE_GITHUB_GIST_TOKEN 自动化 Token 填充 (2026-03-21)

## Last Updated: 2026-08-27 12:28:00

