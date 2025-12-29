
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SessionPlayer } from './session-player';

// Mock Tone.js
vi.mock('tone', () => {
    return {
        Player: vi.fn().mockImplementation(() => ({
            toDestination: vi.fn().mockReturnThis(),
            connect: vi.fn().mockReturnThis(),
            dispose: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            volume: { value: 0 },
            buffer: { duration: 100, get: () => ({ getChannelData: () => new Float32Array(100) }) }
        })),
        PitchShift: vi.fn().mockImplementation(() => ({
            toDestination: vi.fn().mockReturnThis(),
            dispose: vi.fn(),
        })),
        gainToDb: vi.fn(),
        start: vi.fn().mockResolvedValue(undefined),
        context: { state: 'suspended' }
    };
});

// Mock Server Actions
vi.mock('@/app/actions', () => ({
    saveJamSettings: vi.fn(),
    saveExtractedSection: vi.fn(),
    getExtractedSections: vi.fn().mockResolvedValue([]),
    deleteExtractedSection: vi.fn(),
    renameExtractedSection: vi.fn(),
}));

describe('SessionPlayer Looping Logic', () => {
    const defaultProps = {
        tracks: [{ name: 'guitar.mp3', url: 'http://example.com/guitar.mp3' }],
        baseBpm: 120,
        videoId: 123,
    };

    it('renders without crashing', () => {
        render(<SessionPlayer {...defaultProps} />);
        expect(screen.getByText('Set Start')).toBeDefined();
        expect(screen.getByText('Set End')).toBeDefined();
    });

    it('shows warning if trying to consistency loop without points', () => {
        render(<SessionPlayer {...defaultProps} />);
        const loopBtn = screen.getByText('Loop');
        fireEvent.click(loopBtn);
        expect(screen.getByText('Please select start and end points')).toBeDefined();
    });

    // Testing internal state logic via UI interactions is tricky without a real audio context
    // because currentTime depends on playback. 
    // However, we can test that buttons exist and basic validation triggers.
});
