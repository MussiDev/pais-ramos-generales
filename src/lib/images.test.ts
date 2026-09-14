import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';
import { resolveImage } from './images';

const jpg: ImageMetadata = { src: '/jar.jpg', width: 800, height: 1000, format: 'jpg' };
const webp: ImageMetadata = { src: '/jar.webp', width: 800, height: 1000, format: 'webp' };

describe('resolveImage', () => {
  it('returns null for a slot with no asset', () => {
    expect(resolveImage('hero-frasco', {})).toBeNull();
    expect(resolveImage('hero-frasco', { '/src/assets/otro.jpg': jpg })).toBeNull();
    // Only the supported extensions count.
    expect(resolveImage('hero-frasco', { '/src/assets/hero-frasco.gif': jpg })).toBeNull();
  });

  it('returns the asset for a matching slot, preferring modern formats', () => {
    expect(resolveImage('hero-frasco', { '/src/assets/hero-frasco.jpg': jpg })).toBe(jpg);
    expect(
      resolveImage('hero-frasco', {
        '/src/assets/hero-frasco.jpg': jpg,
        '/src/assets/hero-frasco.webp': webp,
      }),
    ).toBe(webp);
  });

  it('throws on an invalid slot id', () => {
    for (const invalid of ['', '../secret', 'products/jar', 'Hero', 'a'.repeat(65)]) {
      expect(() => resolveImage(invalid, {})).toThrow(TypeError);
      expect(() => resolveImage(invalid, {})).toThrow('invalid image slot id');
    }
  });

  it('uses the real asset folder by default', () => {
    expect(resolveImage('slot-that-does-not-exist')).toBeNull();
  });
});
