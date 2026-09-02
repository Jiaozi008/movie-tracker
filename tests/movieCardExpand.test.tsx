import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovieCard } from '../components/MovieCard';
import { Movie, MovieStatus, MediaType } from '../types';

const mockMovie: Movie = {
    id: 'test-tv-1',
    title: '悬案',
    year: '2026',
    director: '张导演',
    cast: '演员甲, 演员乙',
    rating: 4.5,
    mediaType: 'tv' as MediaType,
    status: MovieStatus.WATCHING,
    platform: '本地',
    genre: '悬疑',
    overview: '一桩悬案一个单元，两个单元一季悬案。深入剖析人性与救赎。',
    review: '非常精彩的悬疑神作！',
    quote: '真相永远只有一个',
    currentEpisode: 5,
    totalEpisodes: 17,
    playbackSpeed: 1.5,
    tags: ['口碑佳作', '悬疑烧脑', '温暖治愈'],
    addedAt: 1772496000000,
    watchHistory: [
        { episode: 1, date: 1772496000000, playbackSpeed: 1.0 },
        { episode: 2, date: 1772500000000, playbackSpeed: 1.5 },
        { episode: 3, date: 1772500000000, playbackSpeed: 1.5 },
        { episode: 4, date: 1772500000000, playbackSpeed: 1.5 },
        { episode: 5, date: 1772500000000, playbackSpeed: 1.5 },
    ]
};

describe('MovieCard 独立放大展开与收起测试', () => {
    it('默认状态下渲染正面卡片与“详情”按钮，不渲染大弹窗', () => {
        render(
            <MovieCard
                movie={mockMovie}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />
        );

        // 卡片标题与标签展示
        expect(screen.getByText('悬案')).toBeInTheDocument();
        expect(screen.getByText('#口碑佳作')).toBeInTheDocument();
        
        // 详情按钮存在
        const detailBtn = screen.getByRole('button', { name: /详情/ });
        expect(detailBtn).toBeInTheDocument();

        // 此时独立弹窗的“收起卡片”按钮不应存在
        expect(screen.queryByText('收起卡片')).not.toBeInTheDocument();
    });

    it('点击“详情”后弹出独立放大卡片视窗，展示完整剧情简介、倍速流水与收起按钮', () => {
        const handleQuickEpisodeUpdate = vi.fn();
        const handleSelectPerson = vi.fn();

        render(
            <MovieCard
                movie={mockMovie}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
                onQuickEpisodeUpdate={handleQuickEpisodeUpdate}
                onSelectPerson={handleSelectPerson}
            />
        );

        // 点击“详情”
        const detailBtn = screen.getByRole('button', { name: /详情/ });
        fireEvent.click(detailBtn);

        // 独立放大弹窗已挂载到 body 中，且出现“收起卡片”按钮
        const collapseBtn = screen.getByRole('button', { name: /收起卡片/ });
        expect(collapseBtn).toBeInTheDocument();

        // 放大视窗内展示剧情简介
        expect(screen.getByText(/一桩悬案一个单元/)).toBeInTheDocument();
        // 放大视窗内展示分段倍速流水
        expect(screen.getByText(/分段倍速流水/)).toBeInTheDocument();
        // 放大视窗内展示追剧打卡足迹
        expect(screen.getByText(/追剧打卡足迹/)).toBeInTheDocument();

        // 点击“收起卡片”按钮，弹窗关闭
        fireEvent.click(collapseBtn);
        expect(screen.queryByText('收起卡片')).not.toBeInTheDocument();
    });

    it('支持按 Escape 键退出放大卡片视窗', () => {
        render(
            <MovieCard
                movie={mockMovie}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />
        );

        // 打开弹窗
        fireEvent.click(screen.getByRole('button', { name: /详情/ }));
        expect(screen.getByText('收起卡片')).toBeInTheDocument();

        // 按 Esc 键
        fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
        expect(screen.queryByText('收起卡片')).not.toBeInTheDocument();
    });
});
