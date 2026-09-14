import { describe, expect, it } from 'vitest';
import * as copy from './copy';
import { nextFair } from './fairs';
import { categories, products } from './products';
import { provinces } from './provinces';
import type { Category, Product, Province } from './types';
import { isPlaceholder } from '../lib/placeholder';
import { assertContentIntegrity } from './validate';

const fixtureCategories: Category[] = [{ id: 'dulces', label: 'Dulces' }];
const fixtureProducts: Product[] = [
  {
    id: 'dulce-mango-durazno',
    name: 'Dulce de mango y durazno',
    category: 'dulces',
    meta: 'Jujuy',
    imageSlot: 'producto-dulce-mango-durazno',
    provinceId: 'jujuy',
  },
];
const fixtureProvinces: Province[] = [
  {
    id: 'jujuy',
    name: 'Jujuy',
    region: 'NOROESTE',
    panelToken: '--panel-jujuy',
    textTone: 'light',
    terrain: 'hills',
    pin: { x: 115, y: 44 },
    featuredProductId: 'dulce-mango-durazno',
  },
];

describe('assertContentIntegrity', () => {
  it('accepts consistent content', () => {
    expect(() =>
      assertContentIntegrity(fixtureProvinces, fixtureProducts, fixtureCategories),
    ).not.toThrow();
    expect(() =>
      assertContentIntegrity(
        [{ ...fixtureProvinces[0], featuredProductId: null }],
        [{ ...fixtureProducts[0], provinceId: null }],
        fixtureCategories,
      ),
    ).not.toThrow();
  });

  it('throws for a featured product id that does not exist', () => {
    const provincesWithUnknownProduct = [
      { ...fixtureProvinces[0], featuredProductId: 'producto-inexistente' },
    ];

    expect(() =>
      assertContentIntegrity(provincesWithUnknownProduct, fixtureProducts, fixtureCategories),
    ).toThrow('unknown product id: producto-inexistente');
  });

  it('throws for a product category that does not exist', () => {
    expect(() =>
      assertContentIntegrity(
        fixtureProvinces,
        [{ ...fixtureProducts[0], category: 'quesos' }],
        fixtureCategories,
      ),
    ).toThrow('unknown category: quesos');
  });

  it('throws for a product province that does not exist', () => {
    expect(() =>
      assertContentIntegrity(
        fixtureProvinces,
        [{ ...fixtureProducts[0], provinceId: 'mendoza' }],
        fixtureCategories,
      ),
    ).toThrow('unknown province id: mendoza');
  });

  it('throws for duplicate ids', () => {
    expect(() =>
      assertContentIntegrity(fixtureProvinces, fixtureProducts, [
        ...fixtureCategories,
        ...fixtureCategories,
      ]),
    ).toThrow('duplicate category id: dulces');
    expect(() =>
      assertContentIntegrity(
        fixtureProvinces,
        [...fixtureProducts, ...fixtureProducts],
        fixtureCategories,
      ),
    ).toThrow('duplicate product id: dulce-mango-durazno');
    expect(() =>
      assertContentIntegrity(
        [...fixtureProvinces, ...fixtureProvinces],
        fixtureProducts,
        fixtureCategories,
      ),
    ).toThrow('duplicate province id: jujuy');
  });

  it('throws for malformed ids, names and image slots', () => {
    expect(() =>
      assertContentIntegrity(
        [{ ...fixtureProvinces[0], id: 'Jujuy 1' }],
        [{ ...fixtureProducts[0], provinceId: null }],
        fixtureCategories,
      ),
    ).toThrow('invalid province id: Jujuy 1');
    expect(() =>
      assertContentIntegrity(fixtureProvinces, fixtureProducts, [{ id: 'X', label: 'X' }]),
    ).toThrow('invalid category id: X');
    expect(() =>
      assertContentIntegrity(
        fixtureProvinces,
        [{ ...fixtureProducts[0], imageSlot: '../jar' }],
        fixtureCategories,
      ),
    ).toThrow('invalid image slot: ../jar');
    expect(() =>
      assertContentIntegrity(
        fixtureProvinces,
        [{ ...fixtureProducts[0], name: 'a'.repeat(121) }],
        fixtureCategories,
      ),
    ).toThrow('invalid product name: dulce-mango-durazno');
  });
});

describe('shipped content', () => {
  it('passes the integrity check', () => {
    expect(() => assertContentIntegrity(provinces, products, categories)).not.toThrow();
  });

  it('has the five stops in the Instagram highlight order', () => {
    expect(provinces.map((province) => province.id)).toEqual([
      'salta',
      'jujuy',
      'misiones-corrientes',
      'buenos-aires',
      'rio-negro',
    ]);
    expect(provinces.every((province) => province.featuredProductId !== null)).toBe(true);
  });

  it('features the verified Jujuy and Misiones products', () => {
    const featured = (id: string) =>
      products.find(
        (product) =>
          product.id === provinces.find((province) => province.id === id)?.featuredProductId,
      );

    expect(featured('jujuy')?.name).toBe('Dulce de mango y durazno');
    expect(featured('misiones-corrientes')?.name).toBe('Yerba Federal Tradicional');
    expect(featured('salta')?.name).toBe('[Producto destacado de Salta]');
  });

  it('never shows prices', () => {
    const texts = products.flatMap((product) => [product.name, product.meta]);
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.some((text) => /\$|\bARS\b|precio/i.test(text))).toBe(false);
  });

  it('copy never promises prices or discounts (no "%" or "$")', () => {
    const strings: string[] = [];
    const collect = (value: unknown): void => {
      if (typeof value === 'string') {
        strings.push(value);
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach(collect);
      }
    };
    collect(copy);
    collect(products.map((product) => [product.name, product.meta]));

    expect(strings.length).toBeGreaterThan(products.length);
    expect(strings.filter((text) => /[%$]/.test(text))).toEqual([]);
  });

  it('renders unconfirmed operational and marketing claims as placeholders', () => {
    const unconfirmedClaims = [
      ...copy.manifiesto.pillars.map((pillar) => pillar.text),
      copy.manifiesto.body,
      copy.recorrido.stops.salta,
      copy.recorrido.stops.jujuy,
      copy.recorrido.stops['buenos-aires'],
      copy.ferias.titleLead,
      copy.ferias.titleEmphasis,
      copy.comoPedir.steps[1].text,
      copy.comoPedir.steps[2].text,
      copy.comoPedir.homeDelivery,
    ];

    expect(unconfirmedClaims.filter((text) => !isPlaceholder(text))).toEqual([]);
    expect(copy.hero.subcopy).toContain('Dulces de Jujuy');
    expect(copy.hero.subcopy).not.toContain('Quebrada');
  });

  it('keeps unconfirmed fair data as placeholders', () => {
    expect(nextFair.date).toBe('[DD/MM]');
    expect(nextFair.hours).toBe('[HORARIO]');
  });
});
