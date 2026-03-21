import React from 'react';
import { Toast } from '../../hooks/useToast';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

const iconMap = {
    success: <CheckCircle size={18} className="text-emerald-400 shrink-0" />,
    error: <XCircle size={18} className="text-red-400 shrink-0" />,
    info: <Info size={18} className="text-blue-400 shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
};

const bgMap = {
    success: 'bg-emerald-500/10 border-emerald-500/30',
    error: 'bg-red-500/10 border-red-500/30',
    info: 'bg-blue-500/10 border-blue-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl shadow-black/40 animate-in slide-in-from-right-5 fade-in duration-300 ${bgMap[toast.type]} bg-slate-900/90`}
                >
                    {iconMap[toast.type]}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-snug">{toast.message}</p>
                        {toast.action && (
                            <button
                                onClick={() => {
                                    toast.action!.onClick();
                                    onRemove(toast.id);
                                }}
                                className="mt-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                {toast.action.label}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => onRemove(toast.id)}
                        className="text-slate-500 hover:text-white transition-colors p-0.5 shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};
