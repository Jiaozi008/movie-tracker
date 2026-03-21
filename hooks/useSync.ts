
import { useState, useEffect, useCallback } from 'react';
import { SyncConfig, Movie } from '../types';
import * as gistService from '../services/githubGistService';

const SYNC_CONFIG_KEY = 'cinelog_sync_config_v1';

export const useSync = (currentMovies: Movie[], onMoviesImported: (movies: Movie[]) => void) => {
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

            // If local config exists but has no token, populate from ENV automatically
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

    useEffect(() => {
        localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    }, [config]);

    const saveConfig = (newConfig: Partial<SyncConfig>) => {
        setConfig(prev => ({ ...prev, ...newConfig }));
    };

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

            // If no Gist ID saved, try to find one or create new
            if (!targetGistId) {
                const foundId = await gistService.findExistingBackupGist(config.githubToken);
                if (foundId) {
                    targetGistId = foundId;
                    saveConfig({ gistId: foundId });
                } else {
                    // Create new
                    const newId = await gistService.createBackupGist(config.githubToken, currentMovies);
                    targetGistId = newId;
                    saveConfig({ gistId: newId });
                }
            } else {
                // Update existing
                await gistService.updateBackupGist(config.githubToken, targetGistId, currentMovies);
            }

            saveConfig({ lastSyncTime: Date.now() });
            setSyncStatus('success');
            setStatusMessage("云端备份成功");
        } catch (e: any) {
            console.error(e);
            setSyncStatus('error');
            setStatusMessage(e.message || "同步失败，请检查 Token 或网络");
        } finally {
            setIsSyncing(false);
            // Clear status after 3s
            setTimeout(() => {
                setSyncStatus('idle');
                setStatusMessage('');
            }, 3000);
        }
    };

    const handleDownload = async () => {
        if (!config.githubToken) return;

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
                    throw new Error("未找到云端备份文件");
                }
            }

            const cloudMovies = await gistService.downloadBackupGist(config.githubToken, targetGistId);

            // Merge logic is handled by the parent via callback to keep hook pure regarding movie state
            onMoviesImported(cloudMovies);

            saveConfig({ lastSyncTime: Date.now() });
            setSyncStatus('success');
            setStatusMessage("已从云端拉取最新数据");
        } catch (e: any) {
            console.error(e);
            setSyncStatus('error');
            setStatusMessage(e.message || "下载失败");
        } finally {
            setIsSyncing(false);
            setTimeout(() => {
                setSyncStatus('idle');
                setStatusMessage('');
            }, 3000);
        }
    };

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
