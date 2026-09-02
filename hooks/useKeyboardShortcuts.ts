import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
    onSearchFocus?: () => void;
    onNewMovie?: () => void;
    onEscape?: () => void;
    onViewModeChange?: (mode: 'grid' | 'poster' | 'compact') => void;
    onExperienceModeToggle?: () => void;
    onShowHelp?: () => void;
    enabled?: boolean;
}

export function useKeyboardShortcuts({
    onSearchFocus,
    onNewMovie,
    onEscape,
    onViewModeChange,
    onExperienceModeToggle,
    onShowHelp,
    enabled = true
}: KeyboardShortcutsOptions) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const isTyping =
                activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement ||
                activeElement instanceof HTMLSelectElement ||
                (activeElement as HTMLElement)?.isContentEditable;

            // 1. Escape -> Close Modals (Always active)
            if (e.key === 'Escape') {
                onEscape?.();
                return;
            }

            // 2. Ctrl / Cmd + K -> Focus Search
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                onSearchFocus?.();
                return;
            }

            // If user is typing in form inputs, do not trigger single-key hotkeys
            if (isTyping || e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }

            // 3. '/' -> Focus Search
            if (e.key === '/') {
                e.preventDefault();
                onSearchFocus?.();
                return;
            }

            // 4. 'n' / 'N' -> New Movie
            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                onNewMovie?.();
                return;
            }

            // 5. '1', '2', '3' -> Switch View Mode
            if (e.key === '1') {
                e.preventDefault();
                onViewModeChange?.('grid');
                return;
            }
            if (e.key === '2') {
                e.preventDefault();
                onViewModeChange?.('poster');
                return;
            }
            if (e.key === '3') {
                e.preventDefault();
                onViewModeChange?.('compact');
                return;
            }

            // 6. 'c' / 'C' -> Toggle Experience Mode (Classic Dashboard <-> Cinematic Temple)
            if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                onExperienceModeToggle?.();
                return;
            }

            // 7. '?' -> Shortcut Help
            if (e.key === '?') {
                e.preventDefault();
                onShowHelp?.();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSearchFocus, onNewMovie, onEscape, onViewModeChange, onExperienceModeToggle, onShowHelp, enabled]);
}
