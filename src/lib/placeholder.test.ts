import { describe, expect, it } from 'vitest';
import { isPlaceholder, splitPlaceholders } from './placeholder';

describe('placeholders', () => {
  it('detects and splits bracketed placeholders', () => {
    expect(isPlaceholder('[ORIGEN]')).toBe(true);
    expect(isPlaceholder('Jusuy · [ORIGEN]')).toBe(true);

    expect(splitPlaceholders('Envíos a domicilio en [ZONA DE ENVÍO]')).toEqual([
      { text: 'Envíos a domicilio en ', placeholder: false },
      { text: '[ZONA DE ENVÍO]', placeholder: true },
    ]);
    expect(splitPlaceholders('[DD/MM] · [HORARIO] hs')).toEqual([
      { text: '[DD/MM]', placeholder: true },
      { text: ' · ', placeholder: false },
      { text: '[HORARIO]', placeholder: true },
      { text: ' hs', placeholder: false },
    ]);
  });

  it('keeps a whole bracketed sentence (with punctuation and accents) as one placeholder', () => {
    expect(splitPlaceholders('[Nos escribís, te asesoramos y te lo llevamos.]')).toEqual([
      { text: '[Nos escribís, te asesoramos y te lo llevamos.]', placeholder: true },
    ]);
    expect(
      splitPlaceholders('Cerros de siete colores y [dulces cocinados despacio, directo de quienes los hacen].'),
    ).toEqual([
      { text: 'Cerros de siete colores y ', placeholder: false },
      { text: '[dulces cocinados despacio, directo de quienes los hacen]', placeholder: true },
      { text: '.', placeholder: false },
    ]);
  });

  it('is stable across repeated calls (no global regex state leaks)', () => {
    expect(isPlaceholder('[A]')).toBe(true);
    expect(isPlaceholder('[A]')).toBe(true);
    expect(splitPlaceholders('[A]')).toEqual(splitPlaceholders('[A]'));
  });

  it('returns plain text unchanged when there is no placeholder', () => {
    expect(isPlaceholder('Dulce de mango y durazno')).toBe(false);
    expect(isPlaceholder('[]')).toBe(false);
    expect(splitPlaceholders('Somos Diana y Patry.')).toEqual([
      { text: 'Somos Diana y Patry.', placeholder: false },
    ]);
  });

  it('empty strings render as [PENDIENTE]', () => {
    expect(splitPlaceholders('')).toEqual([{ text: '[PENDIENTE]', placeholder: true }]);
    expect(splitPlaceholders('   ')).toEqual([{ text: '[PENDIENTE]', placeholder: true }]);
    expect(isPlaceholder('')).toBe(true);
  });
});
