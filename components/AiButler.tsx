
import React, { useState, useRef, useEffect } from 'react';
import { Movie } from '../types';
import { generateButlerResponse } from '../services/geminiService';
import { Bot, X, Sparkles, Send, Brain, Compass, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

interface AiButlerProps {
    movies: Movie[];
    onToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AiButler: React.FC<AiButlerProps> = ({ movies, onToast }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([
        { role: 'bot', content: '您好！我是您的 AI 观影管家。我可以为您分析观影偏好，或是根据您的品味推荐影片。今天想聊点什么？' }
    ]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleAction = async (command: 'insights' | 'recommendations', customInput?: string) => {
        if (movies.length === 0) {
            onToast?.('您的片库还是空的，先添加一些记录吧！', 'info');
            return;
        }

        const userText = customInput || (command === 'insights' ? '帮我分析一下我的观影口味' : '根据我的品味推荐几部作品');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);

        try {
            const response = await generateButlerResponse(movies, command, customInput);
            setMessages(prev => [...prev, { role: 'bot', content: response }]);
        } catch (error: any) {
            onToast?.(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        handleAction('recommendations', input.trim());
        setInput('');
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 z-40 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all group lg:bottom-10 lg:right-10"
                title="AI 观影管家"
            >
                <Bot size={28} className="group-hover:rotate-12 transition-transform" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
            </button>

            {/* Butler Panel */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-end sm:p-6 pointer-events-none">
                    <div className="bg-slate-900 border border-slate-700 w-full h-[80vh] sm:h-[600px] sm:max-w-md sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-indigo-600 text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold">AI 观影管家</h3>
                                    <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                                        <Sparkles size={10} /> 正在智能分析您的 101 部作品
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-black/20 p-2 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none prose prose-invert prose-sm'
                                        }`}>
                                        {msg.role === 'bot' ? (
                                            <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-tl-none">
                                        <Loader2 size={16} className="animate-spin text-indigo-400" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        {!isLoading && messages.length < 3 && (
                            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
                                <button
                                    onClick={() => handleAction('insights')}
                                    className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-full border border-slate-700 flex items-center gap-2 transition-colors"
                                >
                                    <Brain size={14} className="text-pink-400" /> 深度品味分析
                                </button>
                                <button
                                    onClick={() => handleAction('recommendations')}
                                    className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-full border border-slate-700 flex items-center gap-2 transition-colors"
                                >
                                    <Compass size={14} className="text-cyan-400" /> 帮我找新剧
                                </button>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="问问管家：找一部硬核科幻..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-base sm:text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:text-indigo-400 disabled:text-slate-600 transition-colors"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 text-center mt-3">
                                由 Gemini 2.5 Flash 提供强力驱动
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
