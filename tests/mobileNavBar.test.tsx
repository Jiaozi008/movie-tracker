import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNavBar } from '../components/MobileNavBar';

describe('MobileNavBar Component', () => {
    it('renders all 5 tabs properly and responds to tab change', () => {
        const onTabChange = vi.fn();
        const onOpenAddMovie = vi.fn();
        const onOpenAiButler = vi.fn();
        const onOpenSettings = vi.fn();

        const { rerender } = render(
            <MobileNavBar
                activeTab="library"
                onTabChange={onTabChange}
                onOpenAddMovie={onOpenAddMovie}
                onOpenAiButler={onOpenAiButler}
                onOpenSettings={onOpenSettings}
            />
        );

        expect(screen.getByText('影库')).toBeInTheDocument();
        expect(screen.getByText('统计')).toBeInTheDocument();
        expect(screen.getByText('打卡')).toBeInTheDocument();
        expect(screen.getByText('助手')).toBeInTheDocument();
        expect(screen.getByText('设置')).toBeInTheDocument();

        // Click 统计 tab
        fireEvent.click(screen.getByText('统计'));
        expect(onTabChange).toHaveBeenCalledWith('stats');

        // Click 打卡 (center button)
        fireEvent.click(screen.getByLabelText('快速新增记录'));
        expect(onOpenAddMovie).toHaveBeenCalledTimes(1);

        // Click 助手
        fireEvent.click(screen.getByText('助手'));
        expect(onOpenAiButler).toHaveBeenCalledTimes(1);

        // Click 设置
        fireEvent.click(screen.getByText('设置'));
        expect(onOpenSettings).toHaveBeenCalledTimes(1);

        // Re-render with stats active
        rerender(
            <MobileNavBar
                activeTab="stats"
                onTabChange={onTabChange}
                onOpenAddMovie={onOpenAddMovie}
                onOpenAiButler={onOpenAiButler}
                onOpenSettings={onOpenSettings}
            />
        );
        fireEvent.click(screen.getByText('影库'));
        expect(onTabChange).toHaveBeenCalledWith('library');
    });
});
