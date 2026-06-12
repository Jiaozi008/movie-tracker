# 观影记录 - 多刷（重温）功能 TODO 任务清单

- [x] **1. 数据结构扩展**
  - [x] 在 `types.ts` 中的 `Movie` 接口添加 `watchIteration?: number` 可选字段。

- [x] **2. 电视剧多刷统计修复**
  - [x] 修改 `utils/statsCalculator.ts`：将电视剧分组 Key 从 `title` 升级为 `[标题] + [刷数]`（即 `${normalizeTitle(m.title)}-iteration-${m.watchIteration || 1}`）。
  - [x] 确保 `calculateTvDuration` 和 `calculateTotalEpisodes` 能正确处理多刷增量。

- [x] **3. 表单状态与智能推荐**
  - [x] 修改 `hooks/useMovieForm.ts`：增加 `watchIteration: string` 状态，并完成初始化与重置逻辑。
  - [x] 修改 `components/MovieForm.tsx`：
    - [x] 在输入标题或选择建议时，自动扫描历史并默认填充建议值 `N + 1` 刷。
    - [x] UI 中添加精致的重温轮次加减组件（支持输入和 `[-] 第 X 刷 [+]` 交互）。
    - [x] 提交时转换并持久化 `watchIteration` 数值。

- [x] **4. 卡片徽章与重温足迹时间轴**
  - [x] 修改 `components/MovieCard.tsx`：
    - [x] 头部展示极具现代感的重温徽章（如“二刷”、“三刷”）。
    - [x] 展开详情中，匹配并绘制 **重温足迹 (Rewatch Timeline)**，以时间轴形式横向/纵向对比所有刷次的数据（时间、评分、倍速、平台、评语）。

- [x] **5. 统计面板 Stats 增强**
  - [x] 修改 `components/Stats.tsx`：
    - [x] 增加 **重温率 (Rewatch Rate)** 百分比计算与展示。
    - [x] 增加 **重温之王 (Rewatch King)** 卡片，显示重温次数最多的影片与次数。

- [x] **6. 功能验证与清理**
  - [x] 测试添加重温数据、修改轮次、展示多刷徽章和时间轴是否正确。
  - [x] 测试 Stats 面板电视剧累加结果是否正确。
  - [x] 验证导入导出、云同步兼容性。
