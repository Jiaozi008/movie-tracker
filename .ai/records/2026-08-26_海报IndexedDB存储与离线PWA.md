# 2026-08-26 海报 IndexedDB 存储与离线 PWA (阶段 4 / v1.4.0)

## 1. 任务背景
在完成追剧打卡（阶段 1）、标签热力图（阶段 2）以及 AI 流式与长图报告（阶段 3）后，收官阶段 4 核心底层建设：
1. 本地海报图片以往直接以 Base64 塞入 LocalStorage，易触碰浏览器 5MB 存储上限并导致 Gist 云同步体积过大。引入 IndexedDB 进行海报异步解耦存储。
2. 完善 PWA 离线支持，构建 Service Worker 离线缓存引擎，支持断网离线秒开与安装为独立 App。

## 2. 核心架构与实现变更

### 2.1 海报 IndexedDB 异步存储引擎 (`utils/posterStorage.ts`)
- **数据库架构**：创建名为 `cinelog_posters_db` 的 IndexedDB 数据库，建立 `posters` 对象仓库。
- **存储接口**：
  - `savePoster(id, dataUrl)`: 异步存储/更新海报数据；
  - `getPoster(id)`: 按影视 ID 异步检索海报；
  - `getAllPosters()`: 批量拉取所有海报缓存；
  - `deletePoster(id)`: 联动销毁删除作品的海报缓存；
  - `cleanupOrphanPosters(activeIds)`: 清理无宿主的孤立海报缓存。
- **业务生命周期联动 (`hooks/useMovies.ts`)**：
  - 应用初始化时自动拉取 IndexedDB 海报补全；
  - 将内存中的本地 Base64 海报异步沉淀到 IndexedDB；
  - 新增、修改、撤销删除及批量删除均与 IndexedDB 保持强一致性；
  - 具备全流程环境防御：无 IndexedDB 环境时平滑优雅降级。

### 2.2 离线 PWA (Progressive Web App) 支持
- **Service Worker 缓存引擎 (`public/sw.js`)**：
  - 缓存版本：`cinelog-pwa-v1.4.0`；
  - 预缓存基础外壳（`index.html`、`manifest.json`、`apple-touch-icon.png`、`logo-high-res.svg`）；
  - 拦截网络请求，对静态资源实行 Stale-While-Revalidate 高效响应；
  - 导航请求实行 Network-First 策略，断网时自动回退至离线缓存；
  - AI、云同步及 API 请求自动直连网络，不造成脏缓存。
- **应用注册与安装引导 (`index.html`)**：
  - 安全注册 Service Worker，支持桌面端与移动端一键「添加到主屏幕 / 安装为独立桌面 App」。

## 3. 测试与验证
- **测试套件**：`tests/posterStorageAndPwa.test.ts`
- **全套验证结果**：
  - `npm test`: 9 个测试套件，全部 71 个测试用例 100% 通过。
  - `npm run build`: Vite 生产构建打包成功。
- **版本归档**：`package.json` 升级至 `1.4.0`，已自动同步更新 `更新日志.md` 与 `.ai/todo.md`。
