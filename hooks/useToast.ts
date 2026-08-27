import { useState, useCallback, useRef } from 'react';
import { generateUUID } from '../utils/uuidUtils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const useToast = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const removeToast = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((
        message: string,
        type: ToastType = 'info',
        options?: { duration?: number; action?: Toast['action'] }
    ) => {
        const id = generateUUID();
        const duration = options?.duration ?? (type === 'error' ? 5000 : 3000);

        const toast: Toast = { id, message, type, duration, action: options?.action };
        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            const timer = setTimeout(() => removeToast(id), duration);
            timersRef.current.set(id, timer);
        }

        return id;
    }, [removeToast]);

    const success = useCallback((msg: string, opts?: { action?: Toast['action'] }) =>
        addToast(msg, 'success', opts), [addToast]);

    const error = useCallback((msg: string, opts?: { duration?: number }) =>
        addToast(msg, 'error', opts), [addToast]);

    const info = useCallback((msg: string, opts?: { action?: Toast['action'] }) =>
        addToast(msg, 'info', opts), [addToast]);

    const warning = useCallback((msg: string) =>
        addToast(msg, 'warning'), [addToast]);

    return { toasts, addToast, removeToast, success, error, info, warning };
};
