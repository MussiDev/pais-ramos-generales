import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl, productMessage } from './whatsapp';

const NUMBER = '5493416114425';

describe('whatsapp links', () => {
  it('builds a wa.me URL with a URL-encoded message', () => {
    const url = buildWhatsAppUrl(NUMBER, 'Hola! Quiero consultar por Dulce de mango y durazno');

    expect(url).toBe(
      'https://wa.me/5493416114425?text=Hola!%20Quiero%20consultar%20por%20Dulce%20de%20mango%20y%20durazno',
    );
    expect(buildWhatsAppUrl(NUMBER, '¿Tenés chipá & yerba?')).toBe(
      `https://wa.me/${NUMBER}?text=${encodeURIComponent('¿Tenés chipá & yerba?')}`,
    );
  });

  it('trims the message before encoding it', () => {
    expect(buildWhatsAppUrl(NUMBER, '  Hola  ')).toBe(`https://wa.me/${NUMBER}?text=Hola`);
  });

  it('product message includes the product name', () => {
    expect(productMessage('Dulce de mango y durazno')).toBe(
      'Hola! Quiero consultar por Dulce de mango y durazno',
    );
    expect(productMessage('  Chipá  ')).toBe('Hola! Quiero consultar por Chipá');
  });

  it('throws on an invalid number', () => {
    for (const invalid of ['', '341-611-4425', '+5493416114425', '123456789', '1234567890123456']) {
      expect(() => buildWhatsAppUrl(invalid, 'Hola')).toThrow(TypeError);
      expect(() => buildWhatsAppUrl(invalid, 'Hola')).toThrow('invalid WhatsApp number');
    }
  });

  it('throws on a message over 500 characters', () => {
    expect(() => buildWhatsAppUrl(NUMBER, 'a'.repeat(501))).toThrow(RangeError);
    expect(() => buildWhatsAppUrl(NUMBER, 'a'.repeat(501))).toThrow('message too long');
    expect(buildWhatsAppUrl(NUMBER, `  ${'a'.repeat(500)}  `)).toContain('?text=');
  });

  it('throws on an empty product name', () => {
    expect(() => productMessage('')).toThrow(TypeError);
    expect(() => productMessage('   ')).toThrow('product name required');
  });

  it('throws on a product name over 120 characters', () => {
    expect(() => productMessage('a'.repeat(121))).toThrow(RangeError);
  });
});
