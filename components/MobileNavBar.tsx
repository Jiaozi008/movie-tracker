import React from 'react';
import { Film, BarChart2, Plus, Bot, Settings } from 'lucide-react';

export type MobileTab = 'library' | 'stats';

interface MobileNavBarProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    onOpenAddMovie: () => void;
    onOpenAiButler: () => void;
    onOpenSettings: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
    activeTab,
    onTabChange,
    onOpenAddMovie,
    onOpenAiButler,
    onOpenSettings,
}) => {
    return (
        <nav
            aria-label="移动端底部导航"
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-8px_25px_rgba(0,0,0,0.45)] pb-[env(safe-area-inset-bottom,0px)]"
        >
            <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
                {/* 1. 影库 */}
                <button
                    type="button"
                    onClick={() => onTabChange('library')}
                    className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-90 ${
                        activeTab === 'library'
                            ? 'text-indigo-400 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <div className={`p-1 rounded-lg transition-colors ${activeTab === 'library' ? 'bg-indigo-500/15' : ''}`}>
                        <Film size={20} className={activeTab === 'library' ? 'stroke-[2.5]' : 'stroke-2'} />
                    </div>
                    <span className="text-[11px] mt-0.5 tracking-tight">影库</span>
                </button>

                {/* 2. 统计 */}
                <button
                    type="button"
                    onClick={() => onTabChange('stats')}
                    className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200 active:scale-90 ${
                        activeTab === 'stats'
                            ? 'text-indigo-400 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <div className={`p-1 rounded-lg transition-colors ${activeTab === 'stats' ? 'bg-indigo-500/15' : ''}`}>
                        <BarChart2 size={20} className={activeTab === 'stats' ? 'stroke-[2.5]' : 'stroke-2'} />
                    </div>
                    <span className="text-[11px] mt-0.5 tracking-tight">统计</span>
                </button>

                {/* 3. 居中凸起打卡 (Center Raised FAB) */}
                <div className="flex-1 flex flex-col items-center justify-center -mt-5">
                    <button
                        type="button"
                        onClick={onOpenAddMovie}
                        className="w-[52px] h-[52px] rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 border-2 border-slate-900 active:scale-95 hover:scale-105 transition-all duration-200 group"
                        title="快速新增记录"
                        aria-label="快速新增记录"
                    >
                        <Plus size={26} className="stroke-[2.8] transition-transform duration-200 group-hover:rotate-90" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 tracking-tight">打卡</span>
                </div>

                {/* 4. AI 助手 */}
                <button
                    type="button"
                    onClick={onOpenAiButler}
                    className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-slate-400 hover:text-slate-200 active:scale-90 transition-all duration-200"
                >
                    <div className="p-1 rounded-lg hover:bg-slate-800/60 relative">
                        <Bot size={20} className="stroke-2 text-indigo-400" />
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                    </div>
                    <span className="text-[11px] mt-0.5 tracking-tight">助手</span>
                </button>

                {/* 5. 设置 / 同步 */}
                <button
                    type="button"
                    onClick={onOpenSettings}
                    className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-slate-400 hover:text-slate-200 active:scale-90 transition-all duration-200"
                >
                    <div className="p-1 rounded-lg hover:bg-slate-800/60">
                        <Settings size={20} className="stroke-2" />
                    </div>
                    <span className="text-[11px] mt-0.5 tracking-tight">设置</span>
                </button>
            </div>
        </nav>
    );
};
