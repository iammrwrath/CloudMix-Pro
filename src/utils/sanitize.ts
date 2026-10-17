import { decodeHtmlEntities, sanitizeTrackMetadata } from './decodeHtml';

/**
 * Decodes escaped HTML entities (&#39;, &quot;, &amp;, &apos;, etc.)
 * using DOMParser when in a browser environment with a fast multi-pass fallback.
 */
export function decodeEntities(str?: string | null): string {
  if (!str) return '';
  if (typeof str !== 'string' || !str.includes('&')) return str || '';
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(str, 'text/html');
      const parsed = doc.documentElement.textContent;
      if (parsed) return decodeHtmlEntities(parsed);
    } catch {
      // Fallback to regex/textarea decoder
    }
  }
  return decodeHtmlEntities(str);
}

export { decodeHtmlEntities, sanitizeTrackMetadata };
