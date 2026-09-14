import type { ImageMetadata } from 'astro';

/** Map of asset path (e.g. `/src/assets/hero-frasco.webp`) to its image metadata. */
export type AssetModules = Record<string, ImageMetadata>;

const SLOT_ID_PATTERN = /^[a-z0-9-]{1,64}$/;
/** Lookup order: the first existing format wins. */
const EXTENSIONS = ['avif', 'webp', 'png', 'jpg'] as const;

// Resolved by Vite at build time. Root of src/assets only: slot ids cannot contain path segments.
const assetModules: AssetModules = import.meta.glob<ImageMetadata>(
  '/src/assets/*.{avif,webp,png,jpg}',
  { eager: true, import: 'default' },
);

/**
 * Returns the image asset for `src/assets/<slotId>.(avif|webp|png|jpg)`, or `null` when none
 * exists (the ImageSlot component then renders a labelled placeholder box).
 * `modules` is injectable for tests.
 */
export function resolveImage(
  slotId: string,
  modules: AssetModules = assetModules,
): ImageMetadata | null {
  if (typeof slotId !== 'string' || !SLOT_ID_PATTERN.test(slotId)) {
    throw new TypeError('invalid image slot id');
  }

  for (const extension of EXTENSIONS) {
    const asset = modules[`/src/assets/${slotId}.${extension}`];
    if (asset) {
      return asset;
    }
  }

  return null;
}
