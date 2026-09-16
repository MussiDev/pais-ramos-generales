/**
 * Site-wide configuration: contact channels and location.
 * The WhatsApp number has no hard-coded default; it comes from PUBLIC_WHATSAPP_NUMBER.
 */

export interface SiteLocation {
  locality: string;
  region: string;
  country: string;
}

export interface SiteConfig {
  whatsappNumber: string;
  defaultMessage: string;
  instagramHandle: string;
  email: string;
  storeUrl: string;
  location: SiteLocation;
}

export interface SiteEnv {
  PUBLIC_WHATSAPP_NUMBER?: string;
}

export interface SiteConfigIssue {
  field: keyof SiteConfig;
  message: string;
}

export class SiteConfigError extends Error {
  readonly issues: SiteConfigIssue[];
  readonly fields: Array<keyof SiteConfig>;

  constructor(issues: SiteConfigIssue[]) {
    super(`Invalid site configuration: ${issues.map((issue) => issue.message).join('; ')}`);
    this.name = 'SiteConfigError';
    this.issues = issues;
    this.fields = issues.map((issue) => issue.field);
  }
}

const WHATSAPP_NUMBER_PATTERN = /^\d{10,15}$/;
const INSTAGRAM_HANDLE_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
const EMAIL_MAX_LENGTH = 254;
/** A value that is entirely a bracketed marker, e.g. "[EMAIL]", is pending client confirmation. */
const PENDING_VALUE_PATTERN = /^\[[^\]]+\]$/;

export function createSiteConfig(env: SiteEnv): SiteConfig {
  return {
    whatsappNumber: (env.PUBLIC_WHATSAPP_NUMBER ?? '').trim(),
    defaultMessage: 'Hola! Quiero hacer un pedido',
    instagramHandle: 'paisramosgenerales',
    email: 'paisramosgenerales@gmail.com',
    storeUrl: 'https://paisramosgenerales.empretienda.com.ar/',
    location: {
      locality: 'Funes',
      region: 'Santa Fe',
      country: 'AR',
    },
  };
}

export function validateSiteConfig(config: SiteConfig): SiteConfig {
  const issues: SiteConfigIssue[] = [];

  if (typeof config.whatsappNumber !== 'string' || config.whatsappNumber.trim() === '') {
    issues.push({
      field: 'whatsappNumber',
      message: 'whatsappNumber is required (set PUBLIC_WHATSAPP_NUMBER)',
    });
  } else if (!WHATSAPP_NUMBER_PATTERN.test(config.whatsappNumber)) {
    issues.push({
      field: 'whatsappNumber',
      message: 'whatsappNumber must be digits only, 10-15 characters (E.164 without "+")',
    });
  }

  if (
    typeof config.instagramHandle !== 'string' ||
    !INSTAGRAM_HANDLE_PATTERN.test(config.instagramHandle)
  ) {
    issues.push({
      field: 'instagramHandle',
      message: 'instagramHandle must match ^[A-Za-z0-9._]{1,30}$',
    });
  }

  if (typeof config.email !== 'string' || !isValidEmail(config.email)) {
    issues.push({
      field: 'email',
      message: `email must be at most ${EMAIL_MAX_LENGTH} characters and contain exactly one "@"`,
    });
  }

  if (issues.length > 0) {
    throw new SiteConfigError(issues);
  }

  return config;
}

function isValidEmail(email: string): boolean {
  if (PENDING_VALUE_PATTERN.test(email)) {
    return true;
  }
  return email.length <= EMAIL_MAX_LENGTH && email.split('@').length === 2;
}

export const siteConfig: SiteConfig = createSiteConfig(
  (import.meta.env as SiteEnv | undefined) ?? {},
);
