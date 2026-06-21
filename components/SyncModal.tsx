import React, { useState, useEffect, useRef } from 'react';
import { SyncConfig, Movie } from '../types';
import { verifyToken } from '../services/githubGistService';
import { Button } from './ui/Button';
import {
  Cloud,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Loader2,
  Github,
  Smartphone,
  Copy,
  Check,
  FileJson,
  ArrowRightLeft,
  QrCode,
  Scan,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Camera,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import LZString from 'lz-string';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SyncConfig;
  movies: Movie[];
  onImportMovies: (movies: Movie[]) => void;
  onSaveConfig: (cfg: Partial<SyncConfig>) => void;
  onUpload: () => void;
  onDownload: () => void;
  isSyncing: boolean;
  syncStatus: 'idle' | 'success' | 'error';
  statusMessage: string;
}

const MAX_QR_CHUNK_SIZE = 500; // Safe limit for reliable scanning

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  config,
  movies,
  onImportMovies,
  onSaveConfig,
  onUpload,
  onDownload,
  isSyncing,
  syncStatus,
  statusMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');
  const [tempToken, setTempToken] = useState(config.githubToken);
  const [isVerifying, setIsVerifying] = useState(false);

  // Local Sync States
  const [localJson, setLocalJson] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [importError, setImportError] = useState('');

  // QR Code States
  const [showQrMode, setShowQrMode] = useState<'none' | 'send' | 'receive'>('none');
  const [qrChunks, setQrChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [receivedChunks, setReceivedChunks] = useState<Record<number, string>>({});
  const [totalChunksExpected, setTotalChunksExpected] = useState(0);

  // Scanner Ref
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Auto-play effect for QR chunks
  useEffect(() => {
    let interval: any;
    if (isAutoPlay && qrChunks.length > 1) {
      interval = setInterval(() => {
        setCurrentChunkIndex((prev) => (prev + 1) % qrChunks.length);
      }, 1500); // 1.5s per frame
    }
    return () => clearInterval(interval);
  }, [isAutoPlay, qrChunks.length]);

  // Clean up scanner on unmount or mode change
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [showQrMode]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!tempToken) return;
    setIsVerifying(true);
    const isValid = await verifyToken(tempToken);
    setIsVerifying(false);

    if (isValid) {
      onSaveConfig({ githubToken: tempToken });
      alert('Token 验证通过！已保存。');
    } else {
      alert('Token 无效或已过期，请检查权限。');
    }
  };

  const handleClear = () => {
    if (window.confirm('确定要清除 Token 吗？这将无法同步数据。')) {
      setTempToken('');
      onSaveConfig({ githubToken: '', gistId: '' });
    }
  };

  const handleCopyData = () => {
    const data = JSON.stringify(movies, null, 2);
    navigator.clipboard.writeText(data).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handlePasteImport = () => {
    try {
      if (!localJson.trim()) return;
      const parsed = JSON.parse(localJson);
      if (Array.isArray(parsed)) {
        if (
          window.confirm(
            `确定要导入 ${parsed.length} 条记录吗？这将覆盖现有 ID 相同的记录。`,
          )
        ) {
          onImportMovies(parsed);
          setLocalJson('');
          setImportError('');
          alert('导入成功！');
          onClose();
        }
      } else {
        setImportError('数据格式错误：必须是 JSON 数组');
      }
    } catch (e) {
      setImportError('JSON 解析失败，请检查格式');
    }
  };

  // --- QR Logic ---

  const prepareQrData = () => {
    // Strip images to save space
    const leanMovies = movies.map((m) => {
      const { posterImage, ...rest } = m;
      return rest;
    });

    const jsonString = JSON.stringify(leanMovies);
    const compressed = LZString.compressToBase64(jsonString);

    // Chunking
    const total = Math.ceil(compressed.length / MAX_QR_CHUNK_SIZE);
    const chunks = [];
    for (let i = 0; i < total; i++) {
      const chunk = compressed.slice(
        i * MAX_QR_CHUNK_SIZE,
        (i + 1) * MAX_QR_CHUNK_SIZE,
      );
      // Protocol: CL:{index}:{total}:{data}
      chunks.push(`CL:${i}:${total}:${chunk}`);
    }

    setQrChunks(chunks);
    setCurrentChunkIndex(0);
    setShowQrMode('send');
  };

  const startScanner = () => {
    setShowQrMode('receive');
    setReceivedChunks({});
    setTotalChunksExpected(0);

    // Slight delay to ensure DOM is ready
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: 250 },
        false,
      );

      scanner.render(
        (decodedText) => {
          if (decodedText.startsWith('CL:')) {
            const parts = decodedText.split(':');
            if (parts.length >= 4) {
              const index = parseInt(parts[1]);
              const total = parseInt(parts[2]);
              const data = parts.slice(3).join(':'); // Rejoin in case data has colons

              setTotalChunksExpected(total);
              setReceivedChunks((prev) => {
                if (prev[index]) return prev; // Already have it
                return { ...prev, [index]: data };
              });
            }
          }
        },
        (error) => {
          // Ignore transient scan errors
        },
      );

      scannerRef.current = scanner;
    }, 100);
  };

  const finalizeQrImport = () => {
    try {
      // Sort keys and join
      const keys = Object.keys(receivedChunks)
        .map(Number)
        .sort((a, b) => a - b);

      // Check missing
      if (keys.length !== totalChunksExpected) {
        alert(`数据不完整，收到 ${keys.length}/${totalChunksExpected} 块数据。请继续扫描。`);
        return;
      }

      const fullCompressed = keys.map((k) => receivedChunks[k]).join('');
      const jsonString = LZString.decompressFromBase64(fullCompressed);

      if (!jsonString) throw new Error('解压失败');

      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        if (
          window.confirm(
            `解析成功！共 ${parsed.length} 条记录（无图片）。确认导入吗？`,
          )
        ) {
          onImportMovies(parsed);
          if (scannerRef.current) scannerRef.current.clear();
          setShowQrMode('none');
          onClose();
          alert('导入成功！');
        }
      }
    } catch (e) {
      console.error(e);
      alert('数据解析失败，请确保所有二维码都已成功扫描。');
    }
  };

  const renderQrMode = () => {
    if (showQrMode === 'send') {
      return (
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-inner">
            <QRCodeSVG value={qrChunks[currentChunkIndex]} size={200} />
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-white mb-1">
              {currentChunkIndex + 1} / {qrChunks.length}
            </p>
            <p className="text-xs text-slate-400">
              请使用另一台设备的“接收数据”扫描
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setCurrentChunkIndex(Math.max(0, currentChunkIndex - 1))
              }
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              size="sm"
              variant={isAutoPlay ? 'primary' : 'secondary'}
              onClick={() => setIsAutoPlay(!isAutoPlay)}
            >
              {isAutoPlay ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setCurrentChunkIndex(
                  Math.min(qrChunks.length - 1, currentChunkIndex + 1),
                )
              }
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          <p className="text-xs text-yellow-500/80 px-4 text-center">
            注意：为保证传输成功率，二维码模式不包含图片数据。
          </p>

          <Button variant="ghost" size="sm" onClick={() => setShowQrMode('none')}>
            返回
          </Button>
        </div>
      );
    }

    if (showQrMode === 'receive') {
      const progress =
        totalChunksExpected > 0
          ? (Object.keys(receivedChunks).length / totalChunksExpected) * 100
          : 0;

      return (
        <div className="flex flex-col items-center space-y-4 w-full">
          <div
            id="qr-reader"
            className="w-full bg-black rounded-lg overflow-hidden border border-slate-700"
          ></div>

          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>接收进度</span>
              <span>
                {Object.keys(receivedChunks).length} /{' '}
                {totalChunksExpected || '?'}
              </span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {progress === 100 && totalChunksExpected > 0 && (
            <Button onClick={finalizeQrImport} className="w-full animate-bounce">
              <Check size={16} className="mr-2" /> 完成并导入
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQrMode('none')}
          >
            取消
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: 'calc(100dvh - 2rem)',
        }}
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="text-indigo-400" size={20} />
            <h2 className="text-lg font-bold text-white">数据同步</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 shrink-0">
          <button
            onClick={() => {
              setActiveTab('cloud');
              setShowQrMode('none');
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'cloud'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Cloud size={16} /> 云端同步
          </button>
          <button
            onClick={() => {
              setActiveTab('local');
              setShowQrMode('none');
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'local'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone size={16} /> 本地传输
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {/* CLOUD TAB */}
          {activeTab === 'cloud' && (
            <div className="space-y-6">
              {statusMessage && (
                <div
                  className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                    syncStatus === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {syncStatus === 'success' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  {statusMessage}
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300 flex items-center justify-between">
                  GitHub Token
                  <a
                    href="https://github.com/settings/tokens/new?description=CineLogSync&scopes=gist"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-400 flex items-center gap-1 hover:underline"
                  >
                    获取 Token <ExternalLink size={10} />
                  </a>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Github
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      size={16}
                    />
                    <input
                      type="password"
                      value={tempToken}
                      onChange={(e) => setTempToken(e.target.value)}
                      placeholder="ghp_..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  {config.githubToken === tempToken && tempToken ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleClear}
                      className="px-3"
                    >
                      清除
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleVerify}
                      disabled={!tempToken || isVerifying}
                      className="px-3"
                    >
                      {isVerifying ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        '保存'
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  数据将保存到你的私有 GitHub Gist (cinelog_backup.json)。你需要创建一个勾选了{' '}
                  <code>gist</code> 权限的 Classic Token。
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800/80">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold text-slate-200">自动云同步</label>
                  <p className="text-xs text-slate-500">启动应用或有数据修改时自动完成同步对齐</p>
                </div>
                <button
                  onClick={() => onSaveConfig({ autoSync: !config.autoSync })}
                  disabled={!config.githubToken}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.autoSync && config.githubToken ? 'bg-indigo-600' : 'bg-slate-700'
                  } ${!config.githubToken ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.autoSync && config.githubToken ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-slate-800 my-2"></div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={onUpload}
                  disabled={!config.githubToken || isSyncing}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={20} className="text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-300">
                    上传到云端
                  </span>
                </button>

                <button
                  onClick={onDownload}
                  disabled={!config.githubToken || isSyncing}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Download size={20} className="text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-300">
                    从云端下载
                  </span>
                </button>
              </div>

              {config.lastSyncTime > 0 && (
                <div className="text-center text-xs text-slate-500">
                  上次同步: {new Date(config.lastSyncTime).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          )}

          {/* LOCAL TAB */}
          {activeTab === 'local' && (
            <div className="space-y-6">
              {showQrMode !== 'none' ? (
                renderQrMode()
              ) : (
                <>
                  <div className="bg-slate-800/50 p-3 rounded-lg text-xs text-slate-400 border border-slate-700/50">
                    <p>
                      在不同设备间复制粘贴下方的 JSON 数据即可实现同步。如果图片较多，建议使用文件导出/导入。
                    </p>
                  </div>

                  {/* QR Code Entry Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={prepareQrData}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-indigo-500/50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <QrCode size={20} className="text-indigo-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-300">
                        生成二维码
                      </span>
                    </button>
                    <button
                      onClick={startScanner}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-emerald-500/50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Scan size={20} className="text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-300">
                        扫描二维码
                      </span>
                    </button>
                  </div>

                  <div className="h-px bg-slate-800 my-2"></div>

                  {/* Export Section */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Upload size={14} className="text-indigo-400" /> 导出本机数据
                    </label>
                    <div className="relative">
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-500 font-mono h-24 overflow-hidden select-none relative">
                        {JSON.stringify(movies).slice(0, 300)}...
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/90 pointer-events-none"></div>
                      </div>
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCopyData}
                          className="flex items-center gap-1 shadow-lg"
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          {isCopied ? '已复制' : '复制全部'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-800 my-2"></div>

                  {/* Import Section */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Download size={14} className="text-emerald-400" /> 导入数据
                    </label>
                    <textarea
                      value={localJson}
                      onChange={(e) => setLocalJson(e.target.value)}
                      placeholder="在此处粘贴其他设备导出的 JSON 数据..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white font-mono h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-600"
                    />
                    {importError && (
                      <p className="text-xs text-red-400">{importError}</p>
                    )}
                    <Button
                      onClick={handlePasteImport}
                      disabled={!localJson.trim()}
                      className="w-full"
                      variant="secondary"
                    >
                      <FileJson size={16} className="mr-2" /> 确认导入
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
