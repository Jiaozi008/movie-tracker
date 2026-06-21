
import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncConfig, Movie } from '../types';
import * as gistService from '../services/githubGistService';
import { mergeMovies } from '../utils/syncUtils';

const SYNC_CONFIG_KEY = 'cinelog_sync_config_v1';

export const useSync = (
    currentMovies: Movie[], 
    syncWithCloud: (cloudMovies: Movie[]) => { hasLocalChanges: boolean; hasRemoteChanges: boolean; mergedMoviesCount: number }
) => {
    const [config, setConfig] = useState<SyncConfig>(() => {
        const envToken = import.meta.env.VITE_GITHUB_GIST_TOKEN || '';
        try {
            const saved = localStorage.getItem(SYNC_CONFIG_KEY);
            const parsed = saved ? JSON.parse(saved) : null;

            if (!parsed) {
                return {
                    githubToken: envToken,
                    gistId: '',
                    lastSyncTime: 0,
                    autoSync: false
                };
            }

            if (!parsed.githubToken && envToken) {
                parsed.githubToken = envToken;
            }

            return parsed;
        } catch {
            return { githubToken: envToken, gistId: '', lastSyncTime: 0, autoSync: false };
        }
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    const lastSyncedMoviesRef = useRef<Movie[]>(currentMovies);
    const autoUploadTimerRef = useRef<any>(null);

    useEffect(() => {
        localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    }, [config]);

    const saveConfig = (newConfig: Partial<SyncConfig>) => {
        setConfig(prev => ({ ...prev, ...newConfig }));
    };

    // Debounced auto-upload effect
    useEffect(() => {
        if (currentMovies !== lastSyncedMoviesRef.current) {
            const hasChanges = JSON.stringify(currentMovies) !== JSON.stringify(lastSyncedMoviesRef.current);
            
            if (hasChanges) {
                if (config.autoSync && config.githubToken && !isSyncing) {
                    if (autoUploadTimerRef.current) {
                        clearTimeout(autoUploadTimerRef.current);
                    }
                    
                    autoUploadTimerRef.current = setTimeout(async () => {
                        try {
                            let targetGistId = config.gistId;
                            if (targetGistId && config.githubToken) {
                                await gistService.updateBackupGist(config.githubToken, targetGistId, currentMovies);
                                saveConfig({ lastSyncTime: Date.now() });
                                lastSyncedMoviesRef.current = currentMovies;
                                console.log("CineLog Auto Sync: Uploaded local changes successfully");
                            }
                        } catch (err) {
                            console.error("CineLog Auto Sync: Failed to upload local changes", err);
                        }
                    }, 5000); // 5s debounce
                } else {
                    // Update reference anyway when autoSync is disabled to prevent sudden upload on toggle
                    lastSyncedMoviesRef.current = currentMovies;
                }
            }
        }
        
        return () => {
            if (autoUploadTimerRef.current) {
                clearTimeout(autoUploadTimerRef.current);
            }
        };
    }, [currentMovies, config.autoSync, config.githubToken, isSyncing, config.gistId]);

    const handleUpload = async () => {
        if (!config.githubToken) {
            setStatusMessage("请先配置 GitHub Token");
            setSyncStatus('error');
            return;
        }

        setIsSyncing(true);
        setSyncStatus('idle');
        try {
            let targetGistId = config.gistId;

            if (!targetGistId) {
                const foundId = await gistService.findExistingBackupGist(config.githubToken);
                if (foundId) {
                    targetGistId = foundId;
                    saveConfig({ gistId: foundId });
                } else {
                    const newId = await gistService.createBackupGist(config.githubToken, currentMovies);
                    targetGistId = newId;
                    saveConfig({ gistId: newId });
                }
            } else {
                await gistService.updateBackupGist(config.githubToken, targetGistId, currentMovies);
            }

            saveConfig({ lastSyncTime: Date.now() });
            lastSyncedMoviesRef.current = currentMovies;
            setSyncStatus('success');
            setStatusMessage("云端备份成功");
        } catch (e: any) {
            console.error(e);
            setSyncStatus('error');
            setStatusMessage(e.message || "同步失败，请检查 Token 或网络");
        } finally {
            setIsSyncing(false);
            setTimeout(() => {
                setSyncStatus('idle');
                setStatusMessage('');
            }, 3000);
        }
    };

    const handleDownload = async (isSilent = false) => {
        if (!config.githubToken) return;

        setIsSyncing(true);
        if (!isSilent) {
            setSyncStatus('idle');
            setStatusMessage("正在与云端对齐数据...");
        }
        try {
            let targetGistId = config.gistId;
            if (!targetGistId) {
                const foundId = await gistService.findExistingBackupGist(config.githubToken);
                if (foundId) {
                    targetGistId = foundId;
                    saveConfig({ gistId: foundId });
                } else {
                    throw new Error("未找到云端备份文件");
                }
            }

            const cloudMovies = await gistService.downloadBackupGist(config.githubToken, targetGistId);

            // Execute smart merge
            const { hasLocalChanges, hasRemoteChanges } = syncWithCloud(cloudMovies);

            let updatedMovies = currentMovies;
            if (hasLocalChanges) {
                // Get the merged content to keep local reference in sync
                const deletedStorage = localStorage.getItem('cinelog_deleted_movies_v1');
                const deletedRecords = deletedStorage ? JSON.parse(deletedStorage) : {};
                const mergeRes = mergeMovies(currentMovies, cloudMovies, deletedRecords);
                updatedMovies = mergeRes.merged;
            }

            lastSyncedMoviesRef.current = updatedMovies;

            if (hasRemoteChanges) {
                if (!isSilent) setStatusMessage("云端需要同步，正在上传最新更新...");
                await gistService.updateBackupGist(config.githubToken, targetGistId, updatedMovies);
            }

            saveConfig({ lastSyncTime: Date.now() });
            if (!isSilent) {
                setSyncStatus('success');
                setStatusMessage("同步完成：多端数据已对齐");
            }
        } catch (e: any) {
            console.error("CineLog Sync Error:", e);
            if (!isSilent) {
                setSyncStatus('error');
                setStatusMessage(e.message || "数据下载/对齐失败");
            }
        } finally {
            setIsSyncing(false);
            if (!isSilent) {
                setTimeout(() => {
                    setSyncStatus('idle');
                    setStatusMessage('');
                }, 3000);
            }
        }
    };

    // Update ref when page loads or sync status changes to keep standard sync baseline
    useEffect(() => {
        lastSyncedMoviesRef.current = currentMovies;
    }, []);

    return {
        config,
        saveConfig,
        handleUpload,
        handleDownload,
        isSyncing,
        syncStatus,
        statusMessage
    };
};

