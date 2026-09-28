/**
 * La despensa shows a curated set of 6 confirmed products, not the full catalog (the store link
 * below it covers that): one diverse pick per confirmed category, one flagged as the artisan
 * special (the only product with a verified "100% artesanal" claim, per `products.ts`).
 */
import { categories, products } from './products';
import type { Product } from './types';

const PANTRY_PRODUCT_IDS = [
  'dulce-mango-durazno',
  'mermelada-frutilla',
  'chutney-chilto',
  'yerba-federal-tradicional',
  'pulpito-tehuelche-escabeche',
  'chipa',
] as const;

export const ARTISAN_SPECIAL_ID = 'dulce-mango-durazno';

export const pantryProducts: Product[] = PANTRY_PRODUCT_IDS.map((id) => {
  const product = products.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`pantry: unknown product id "${id}"`);
  return product;
});

const pantryCategoryIds = new Set(pantryProducts.map((product) => product.category));

/** Only the categories that have a product in the pantry get a filter chip. */
export const pantryCategories = categories.filter((category) => pantryCategoryIds.has(category.id));
