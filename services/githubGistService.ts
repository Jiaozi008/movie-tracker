
import LZString from 'lz-string';
import { Movie } from "../types";

const GIST_FILENAME = "cinelog_backup.json";
const GIST_DESCRIPTION = "CineLog AI Auto Backup";

export const verifyToken = async (token: string): Promise<boolean> => {
    try {
        const res = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        return res.ok;
    } catch (e) {
        console.error("Token verification failed", e);
        return false;
    }
};

export const findExistingBackupGist = async (token: string): Promise<string | null> => {
    try {
        const res = await fetch("https://api.github.com/gists", {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        
        if (!res.ok) return null;
        
        const gists = await res.json();
        const backupGist = gists.find((g: any) => 
            g.files && g.files[GIST_FILENAME]
        );
        
        return backupGist ? backupGist.id : null;
    } catch (e) {
        console.error("Failed to find gist", e);
        return null;
    }
};

export const createBackupGist = async (token: string, data: Movie[]): Promise<string> => {
    const res = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            description: GIST_DESCRIPTION,
            public: false, // Private gist
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        })
    });

    if (!res.ok) throw new Error("创建备份失败");
    const json = await res.json();
    return json.id;
};

export const updateBackupGist = async (token: string, gistId: string, data: Movie[]): Promise<void> => {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        })
    });

    if (!res.ok) throw new Error("上传备份失败");
};

export const downloadBackupGist = async (token: string, gistId: string): Promise<Movie[]> => {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
        },
    });

    if (!res.ok) throw new Error("获取备份信息失败");
    const gist = await res.json();
    
    const file = gist.files[GIST_FILENAME];
    if (!file || !file.raw_url) throw new Error("备份文件已损坏或丢失");

    const contentRes = await fetch(file.raw_url);
    if (!contentRes.ok) throw new Error("下载备份内容失败");
    
    const rawText = await contentRes.text();
    if (!rawText || rawText.trim() === '') {
        return [];
    }

    // 1. 尝试直接作为明文 JSON 解析
    try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        
        // 若解析结果是字符串字面量，尝试将其解压后再解析
        if (typeof parsed === 'string') {
            const decompressed = LZString.decompressFromBase64(parsed);
            if (decompressed) {
                const parsedDecompressed = JSON.parse(decompressed);
                if (Array.isArray(parsedDecompressed)) {
                    return parsedDecompressed;
                }
            }
        }
    } catch {
        // 解析 JSON 失败，可能为密文，进入解压步骤
    }

    // 2. 尝试使用 LZString 解压密文并解析
    try {
        const decompressed = LZString.decompressFromBase64(rawText);
        if (decompressed) {
            const parsed = JSON.parse(decompressed);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("LZString decompression failed", e);
    }

    throw new Error("下载成功但数据解析失败，文件格式不符合预期");
};
