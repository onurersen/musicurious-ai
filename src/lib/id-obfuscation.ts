import Sqids from 'sqids';

// Initialize Sqids with a custom alphabet and min length for professional-looking IDs
// This alphabet removes characters that look similar (like 0, O, 1, I, l) to avoid confusion
const sqids = new Sqids({
    alphabet: 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    minLength: 8,
});

/**
 * Encodes a numeric ID into an obfuscated string.
 * Use this when generating URLs.
 */
export function encodeId(id: number): string {
    return sqids.encode([id]);
}

/**
 * Decodes an obfuscated string back to a numeric ID.
 * Returns null if the ID is invalid.
 */
export function decodeId(id: string): number | null {
    try {
        const decoded = sqids.decode(id);
        return decoded.length > 0 ? decoded[0] : null;
    } catch {
        return null;
    }
}
