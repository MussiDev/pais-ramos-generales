import type { Category, Product, Province } from './types';

const ID_PATTERN = /^[a-z-]{2,32}$/;
const PRODUCT_ID_PATTERN = /^[a-z0-9-]{1,64}$/;
const IMAGE_SLOT_PATTERN = /^[a-z0-9-]{1,64}$/;
const PRODUCT_NAME_MAX_LENGTH = 120;

/**
 * Enforces id formats, uniqueness and foreign keys across the content modules.
 * Called at module load of the page so `pnpm build` fails on inconsistent content.
 */
export function assertContentIntegrity(
  provinces: Province[],
  products: Product[],
  categories: Category[],
): void {
  const categoryIds = collectIds('category', categories, ID_PATTERN);
  const productIds = collectIds('product', products, PRODUCT_ID_PATTERN);
  const provinceIds = collectIds('province', provinces, ID_PATTERN);

  for (const product of products) {
    if (product.name.trim() === '' || product.name.length > PRODUCT_NAME_MAX_LENGTH) {
      throw new Error(`invalid product name: ${product.id}`);
    }
    if (!IMAGE_SLOT_PATTERN.test(product.imageSlot)) {
      throw new Error(`invalid image slot: ${product.imageSlot} (product ${product.id})`);
    }
    if (!categoryIds.has(product.category)) {
      throw new Error(`unknown category: ${product.category} (product ${product.id})`);
    }
    if (product.provinceId !== null && !provinceIds.has(product.provinceId)) {
      throw new Error(`unknown province id: ${product.provinceId} (product ${product.id})`);
    }
  }

  for (const province of provinces) {
    if (province.featuredProductId !== null && !productIds.has(province.featuredProductId)) {
      throw new Error(
        `unknown product id: ${province.featuredProductId} (province ${province.id})`,
      );
    }
  }
}

function collectIds(kind: string, records: Array<{ id: string }>, pattern: RegExp): Set<string> {
  const ids = new Set<string>();
  for (const { id } of records) {
    if (!pattern.test(id)) {
      throw new Error(`invalid ${kind} id: ${id}`);
    }
    if (ids.has(id)) {
      throw new Error(`duplicate ${kind} id: ${id}`);
    }
    ids.add(id);
  }
  return ids;
}
