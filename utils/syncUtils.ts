import { Movie } from '../types';

export interface MergeResult {
    merged: Movie[];
    hasLocalChanges: boolean;
    hasRemoteChanges: boolean;
    updatedDeletedRecords: Record<string, number>;
}

/**
 * 智能双向合并本地与云端的观影记录
 * 
 * 合并策略：
 * 1. 遍历云端和本地数据。
 * 2. 如果记录已在本地删除（存在于 deletedRecords 且云端 lastUpdated < deletedAt），云端需要被删除（hasRemoteChanges = true，不计入合并结果）。
 * 3. 如果云端 lastUpdated >= deletedAt，说明该记录又被修改或重新创建，应保留该记录并从 deletedRecords 中移除。
 * 4. 如果记录仅存在于一侧：
 *    - 仅在本地：属于本地新增记录，保留，hasRemoteChanges = true。
 *    - 仅在云端：属于云端新增记录，保留，hasLocalChanges = true。
 * 5. 如果两侧都存在：
 *    - 对比 lastUpdated，取最新的一侧。
 *    - 若云端新，则 hasLocalChanges = true。
 *    - 若本地新，则 hasRemoteChanges = true。
 */
export const mergeMovies = (
    localMovies: Movie[],
    cloudMovies: Movie[],
    deletedRecords: Record<string, number> = {}
): MergeResult => {
    const mergedMap = new Map<string, Movie>();
    const updatedDeletedRecords = { ...deletedRecords };
    
    let hasLocalChanges = false;
    let hasRemoteChanges = false;

    // 建立本地电影 Map
    const localMap = new Map<string, Movie>();
    localMovies.forEach(m => localMap.set(m.id, m));

    // 1. 处理云端电影
    cloudMovies.forEach(c => {
        const deletedAt = updatedDeletedRecords[c.id];
        
        if (deletedAt !== undefined) {
            // 这条电影在本地被删除了
            if ((c.lastUpdated || 0) < deletedAt) {
                // 云端是老数据，保持删除状态，标记云端需要同步删除
                hasRemoteChanges = true;
                return;
            } else {
                // 云端数据比本地删除时间还要新，说明它是重新激活或在另一端更新的数据，恢复该记录
                delete updatedDeletedRecords[c.id];
            }
        }

        const local = localMap.get(c.id);
        if (!local) {
            // 云端有，本地没有：云端新增的
            mergedMap.set(c.id, c);
            hasLocalChanges = true;
        } else {
            // 两侧都有：对比 lastUpdated 时间戳
            const cTime = c.lastUpdated || 0;
            const lTime = local.lastUpdated || 0;
            
            if (cTime > lTime) {
                // 云端更新
                mergedMap.set(c.id, c);
                hasLocalChanges = true;
            } else if (lTime > cTime) {
                // 本地更新
                mergedMap.set(c.id, local);
                hasRemoteChanges = true;
            } else {
                // 相同，保留
                mergedMap.set(c.id, local);
            }
        }
    });

    // 2. 处理本地电影中，云端没有的数据（本地新增的）
    localMovies.forEach(l => {
        if (!mergedMap.has(l.id)) {
            // 云端完全没有这个 ID 
            mergedMap.set(l.id, l);
            hasRemoteChanges = true;
        }
    });

    // 清理过期的被删记录（保留30天内）
    const now = Date.now();
    const expireTime = 30 * 24 * 60 * 60 * 1000; // 30天
    Object.keys(updatedDeletedRecords).forEach(id => {
        if (now - updatedDeletedRecords[id] > expireTime) {
            delete updatedDeletedRecords[id];
        }
    });

    const merged = Array.from(mergedMap.values());
    // 按添加时间降序排序
    merged.sort((a, b) => b.addedAt - a.addedAt);

    return {
        merged,
        hasLocalChanges,
        hasRemoteChanges,
        updatedDeletedRecords
    };
};
