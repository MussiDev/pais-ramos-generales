import { describe, expect, it } from 'vitest';
import {
  SiteConfigError,
  createSiteConfig,
  validateSiteConfig,
  type SiteConfig,
} from './site';

const VALID_NUMBER = '5493416114425';

function configWith(overrides: Partial<SiteConfig>): SiteConfig {
  return { ...createSiteConfig({ PUBLIC_WHATSAPP_NUMBER: VALID_NUMBER }), ...overrides };
}

function captureError(fn: () => unknown): SiteConfigError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(SiteConfigError);
    return error as SiteConfigError;
  }
  throw new Error('expected validateSiteConfig to throw');
}

describe('site config', () => {
  it('accepts the default configuration', () => {
    const config = createSiteConfig({ PUBLIC_WHATSAPP_NUMBER: VALID_NUMBER });

    expect(validateSiteConfig(config)).toBe(config);
    expect(config.whatsappNumber).toBe(VALID_NUMBER);
    expect(config.instagramHandle).toBe('paisramosgenerales');
    expect(config.location).toEqual({
      locality: 'Funes',
      region: 'Santa Fe',
      country: 'AR',
    });
    expect(config.defaultMessage.length).toBeGreaterThan(0);
  });

  it('does not accept the pending-value placeholder for email', () => {
    const config = createSiteConfig({ PUBLIC_WHATSAPP_NUMBER: VALID_NUMBER });

    expect(config.email).toBe('paisramosgenerales@gmail.com');
    expect(config.email).not.toBe('[EMAIL]');
    expect(validateSiteConfig(config)).toBe(config);
  });

  it('accepts a bracketed placeholder email without format validation', () => {
    for (const email of ['[EMAIL]', '[CORREO PENDIENTE]']) {
      const config = configWith({ email });
      expect(validateSiteConfig(config)).toBe(config);
    }

    // Only a value that is entirely a placeholder is exempt.
    const partial = captureError(() => validateSiteConfig(configWith({ email: 'x [EMAIL]' })));
    expect(partial.fields).toEqual(['email']);
  });

  it('throws when the WhatsApp number is missing', () => {
    for (const env of [{}, { PUBLIC_WHATSAPP_NUMBER: '' }, { PUBLIC_WHATSAPP_NUMBER: '   ' }]) {
      const error = captureError(() => validateSiteConfig(createSiteConfig(env)));
      expect(error.message).toContain(
        'whatsappNumber is required (set PUBLIC_WHATSAPP_NUMBER)',
      );
    }
  });

  it('throws when the WhatsApp number has non-digit characters or wrong length', () => {
    for (const whatsappNumber of ['+5493416114425', '549 341 611', '54934a6114425', '123456789', '1234567890123456']) {
      const error = captureError(() => validateSiteConfig(configWith({ whatsappNumber })));
      expect(error.message).toContain('whatsappNumber');
      expect(error.message).toMatch(/digits only, 10-15/);
      expect(error.fields).toEqual(['whatsappNumber']);
    }
  });

  it('throws naming the field for an invalid Instagram handle or email', () => {
    const handleError = captureError(() =>
      validateSiteConfig(configWith({ instagramHandle: 'bad handle!' })),
    );
    expect(handleError.message).toContain('instagramHandle');
    expect(handleError.fields).toEqual(['instagramHandle']);

    const tooLongHandle = captureError(() =>
      validateSiteConfig(configWith({ instagramHandle: 'a'.repeat(31) })),
    );
    expect(tooLongHandle.fields).toEqual(['instagramHandle']);

    for (const email of ['no-at-sign.com', 'two@@example.com', `${'a'.repeat(250)}@x.com`]) {
      const emailError = captureError(() => validateSiteConfig(configWith({ email })));
      expect(emailError.message).toContain('email');
      expect(emailError.fields).toEqual(['email']);
    }

    const allErrors = captureError(() =>
      validateSiteConfig(
        configWith({ whatsappNumber: '', instagramHandle: '', email: 'nope' }),
      ),
    );
    expect(allErrors.fields).toEqual(['whatsappNumber', 'instagramHandle', 'email']);
  });
});
