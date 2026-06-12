import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as gistService from '../services/githubGistService';
import fs from 'fs';

// Mock html5-qrcode because it accesses camera APIs and browser DOM details not fully in jsdom
vi.mock('html5-qrcode', () => {
    return {
        Html5QrcodeScanner: class {
            constructor() {}
            render() {}
            clear() { return Promise.resolve(); }
        }
    };
});

// Mock recharts to avoid JSDOM measurement warnings/errors
vi.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
        AreaChart: ({ children }: any) => <div>{children}</div>,
        Area: () => null,
        BarChart: ({ children }: any) => <div>{children}</div>,
        Bar: () => null,
        XAxis: () => null,
        YAxis: () => null,
        CartesianGrid: () => null,
        Tooltip: () => null,
        Cell: () => null,
        Legend: () => null,
        RadarChart: ({ children }: any) => <div>{children}</div>,
        PolarGrid: () => null,
        PolarAngleAxis: () => null,
        PolarRadiusAxis: () => null,
        Radar: () => null,
        PieChart: ({ children }: any) => <div>{children}</div>,
        Pie: () => null,
    };
});

describe('App Render & Cloud Download Crash Test', () => {
    beforeAll(() => {
        // Mock localStorage
        const store: Record<string, string> = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: (key: string) => store[key] || null,
                setItem: (key: string, value: string) => { store[key] = value; },
                clear: () => { for (const k in store) delete store[k]; },
                removeItem: (key: string) => { delete store[key]; }
            },
            writable: true
        });

        // Set up local storage with a mock github token so sync buttons are active
        window.localStorage.setItem('cinelog_sync_config_v1', JSON.stringify({
            githubToken: 'mock-token-123',
            gistId: 'mock-gist-456',
            lastSyncTime: 0,
            autoSync: false
        }));
    });

    it('点击从云端下载不应该导致 React 崩溃', async () => {
        // Read actual 255 items from gist_content.txt
        const rawText = fs.readFileSync("C:/Users/Administrator/.gemini/antigravity-ide/scratch/gist_content.txt", "utf-8");
        const cloudMovies = JSON.parse(rawText);

        // Spy on downloadBackupGist to return the actual movies from user gist
        const downloadSpy = vi.spyOn(gistService, 'downloadBackupGist').mockResolvedValue(cloudMovies);

        // Render the App
        const { container } = render(<App />);
        
        // Find and click the "同步" button to open the modal
        const syncButtons = screen.getAllByTitle('云同步');
        expect(syncButtons.length).toBeGreaterThan(0);
        fireEvent.click(syncButtons[0]);

        // Now modal is open. We search for "从云端下载" button
        const downloadButton = screen.getByText('从云端下载');
        expect(downloadButton).toBeDefined();

        // Click download
        fireEvent.click(downloadButton);

        // Wait for sync success message
        await waitFor(() => {
            expect(downloadSpy).toHaveBeenCalled();
        }, { timeout: 5000 });

        // Let's print out what HTML is rendered now to see if it successfully rendered movies
        console.log("App successfully rendered after download!");
        
        // Assert that we don't have a blank screen
        // We should find some elements like "统计面板"
        const statsPanel = screen.getByText('统计面板');
        expect(statsPanel).toBeDefined();
    });
});
