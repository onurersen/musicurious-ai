
import { describe, it, expect } from 'vitest';
import { encodeId, decodeId } from './id-obfuscation';

describe('ID Obfuscation', () => {
    it('should encode a number to a string', () => {
        const id = 123;
        const encoded = encodeId(id);
        expect(typeof encoded).toBe('string');
        expect(encoded.length).toBeGreaterThan(0);
    });

    it('should decode an encoded string back to the original number', () => {
        const id = 456;
        const encoded = encodeId(id);
        const decoded = decodeId(encoded);
        expect(decoded).toBe(id);
    });

    it('should return null for invalid strings', () => {
        const result = decodeId('invalid-string-that-is-not-sqids');
        // Sqids might decode something or return empty array depending on implementation
        // But our decodeId wrapper returns null if decoding fails or is empty.
        // Let's verify our wrapper behavior.
        // If the string contains characters not in the alphabet it usually returns properly or throws?
        // Our wrapper has a try/catch block.
        // Let's test with chars not in alphabet
        const result2 = decodeId('invalid_chars!');
        expect(result2).toBeNull();
    });

    it('should handle large numbers', () => {
        const id = 999999999;
        const encoded = encodeId(id);
        const decoded = decodeId(encoded);
        expect(decoded).toBe(id);
    });
});
