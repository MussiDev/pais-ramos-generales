/**
 * WhatsApp deep links: https://wa.me/<number>?text=<url-encoded message>.
 * Invalid input throws so the problem surfaces at build time.
 */

const NUMBER_PATTERN = /^\d{10,15}$/;
const MESSAGE_MAX_LENGTH = 500;
const PRODUCT_NAME_MAX_LENGTH = 120;

export function buildWhatsAppUrl(number: string, message: string): string {
  if (typeof number !== 'string' || !NUMBER_PATTERN.test(number)) {
    throw new TypeError('invalid WhatsApp number');
  }

  const text = message.trim();
  if (text.length > MESSAGE_MAX_LENGTH) {
    throw new RangeError('message too long');
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function productMessage(productName: string): string {
  const name = typeof productName === 'string' ? productName.trim() : '';
  if (name === '') {
    throw new TypeError('product name required');
  }
  if (name.length > PRODUCT_NAME_MAX_LENGTH) {
    throw new RangeError('product name too long');
  }

  return `Hola! Quiero consultar por ${name}`;
}
