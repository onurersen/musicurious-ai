
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
    it('should merge class names correctly', () => {
        const result = cn('c-1', 'c-2');
        expect(result).toBe('c-1 c-2');
    });

    it('should handle conditional classes', () => {
        const result = cn('c-1', true && 'c-2', false && 'c-3');
        expect(result).toBe('c-1 c-2');
    });

    it('should merge tailwind classes using tailwind-merge', () => {
        const result = cn('p-2', 'p-4');
        expect(result).toBe('p-4');
    });
    
    it('should handle objects', () => {
        const result = cn({ 'c-1': true, 'c-2': false, 'c-3': true });
        expect(result).toBe('c-1 c-3');
    });
    
    it('should handle arrays', () => {
        const result = cn(['c-1', 'c-2']);
        expect(result).toBe('c-1 c-2');
    });
    
    it('should handle mix of everything', () => {
        const result = cn('c-1', ['c-2'], { 'c-3': true }, 'p-2', 'p-4');
        expect(result).toBe('c-1 c-2 c-3 p-4');
    });
});
