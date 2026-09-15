import { despensa } from './copy';
import type { ImageSlot, Product } from './types';

/**
 * Image slot for a product photo: `src/assets/<product.imageSlot>.*`, with a visible
 * "[FOTO: <name>]" label while the asset is missing. Brackets of placeholder names are removed so
 * the label stays a single placeholder marker.
 */
export function productImageSlot(
  product: Product,
  aspectRatio: ImageSlot['aspectRatio'],
): ImageSlot {
  const plainName = product.name.replace(/[[\]]/g, '').trim();
  return {
    id: product.imageSlot,
    label: `[${despensa.photoLabel}: ${plainName}]`,
    alt: plainName,
    aspectRatio,
  };
}
