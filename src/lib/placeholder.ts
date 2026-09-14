/**
 * Placeholder markers: unconfirmed client data is written as bracketed text, e.g. "[ORIGEN]".
 */

/** Matches one bracketed marker with non-empty content. Global: use `new RegExp` per call. */
export const PLACEHOLDER_PATTERN = /\[[^[\]]+\]/g;

/** Rendered in place of empty content so gaps stay visible. */
export const EMPTY_CONTENT_MARKER = '[PENDIENTE]';

export interface TextSegment {
  text: string;
  placeholder: boolean;
}

/** True when the value contains at least one placeholder marker, or is empty (renders as pending). */
export function isPlaceholder(value: string): boolean {
  if (value.trim() === '') {
    return true;
  }
  return new RegExp(PLACEHOLDER_PATTERN.source).test(value);
}

/** Splits text into plain and placeholder segments, preserving order and whitespace. */
export function splitPlaceholders(text: string): TextSegment[] {
  if (text.trim() === '') {
    return [{ text: EMPTY_CONTENT_MARKER, placeholder: true }];
  }

  const segments: TextSegment[] = [];
  const pattern = new RegExp(PLACEHOLDER_PATTERN.source, 'g');
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), placeholder: false });
    }
    segments.push({ text: match[0], placeholder: true });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), placeholder: false });
  }

  return segments;
}
