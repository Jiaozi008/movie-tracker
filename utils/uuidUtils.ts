/**
 * 安全的 UUID 生成工具，兼容 HTTPS、HTTP 本地局域网以及老旧浏览器环境
 */
export function generateUUID(): string {
  try {
    const gCrypto = typeof window !== 'undefined' ? window.crypto : (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined);
    if (gCrypto && typeof gCrypto.randomUUID === 'function') {
      return gCrypto.randomUUID();
    }
  } catch {
    // 降级到 Math.random
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
