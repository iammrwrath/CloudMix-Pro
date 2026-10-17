/**
 * HTML Entity Decoding & Metadata Sanitization Utility
 * Decodes escaped HTML entities (e.g., &#39;, &quot;, &amp;, &apos;, &#x27;, &lt;, &gt;)
 * returned by YouTube Data API v3, CSV imports, and external libraries so track titles,
 * artist names, and playlist titles render cleanly across all UI panels.
 */

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#34;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#039;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&hellip;': '…',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
};

let cachedParserArea: HTMLTextAreaElement | null = null;

export function decodeHtmlEntities(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  if (!input.includes('&')) return input;

  let decoded = input;

  // 1. Fast regex pass for double-encoded or standard named/numeric entities
  for (let pass = 0; pass < 2; pass++) {
    if (!decoded.includes('&')) break;

    decoded = decoded
      .replace(/&(amp|quot|apos|lt|gt|nbsp|ndash|mdash|lsquo|rsquo|ldquo|rdquo|hellip|copy|reg|trade|#34|#39|#039|#x27|#x2F);/gi, (match) => {
        const lower = match.toLowerCase();
        return NAMED_ENTITIES[lower] ?? NAMED_ENTITIES[match] ?? match;
      })
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = parseInt(dec, 10);
        return !isNaN(code) && code > 0 ? String.fromCodePoint(code) : _;
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const code = parseInt(hex, 16);
        return !isNaN(code) && code > 0 ? String.fromCodePoint(code) : _;
      });
  }

  // 2. Browser DOMParser / textarea fallback for any remaining uncommon HTML entities
  if (decoded.includes('&') && typeof document !== 'undefined') {
    try {
      if (!cachedParserArea) {
        cachedParserArea = document.createElement('textarea');
      }
      cachedParserArea.innerHTML = decoded;
      decoded = cachedParserArea.value;
    } catch {
      // Fallback if DOM unavailable
    }
  }

  return decoded.trim();
}

export function sanitizeTrackMetadata<T extends { title?: string; artist?: string; album?: string }>(track: T): T {
  if (!track) return track;
  return {
    ...track,
    title: track.title ? decodeHtmlEntities(track.title) : track.title,
    artist: track.artist ? decodeHtmlEntities(track.artist) : track.artist,
    album: track.album ? decodeHtmlEntities(track.album) : track.album,
  };
}
