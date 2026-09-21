import { LyricsDocument, LyricsLine, TrackMetadata } from '../types/dj';

const LRCLIB_URL = 'https://lrclib.net/api/search';
const TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

export class LyricsService {
  async load(track: TrackMetadata, targetLanguage = 'en'): Promise<LyricsDocument | null> {
    if (track.lyricsLrc) {
      const lines = this.parse(track.lyricsLrc);
      return lines.length ? { lines, targetLanguage, provider: 'track-metadata' } : null;
    }

    const params = new URLSearchParams({
      q: `${track.artist} ${track.title}`,
    });
    if (track.duration > 0) params.set('duration', String(Math.round(track.duration)));

    const response = await fetch(`${LRCLIB_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const candidates = (await response.json()) as Array<{
      syncedLyrics?: string;
      plainLyrics?: string;
      artistName?: string;
      trackName?: string;
      duration?: number;
    }>;
    const candidate = candidates
      .filter((item) => item.syncedLyrics)
      .sort((a, b) => this.score(b, track) - this.score(a, track))[0];
    if (!candidate?.syncedLyrics) return null;

    const lines = this.parse(candidate.syncedLyrics);
    if (!lines.length) return null;
    await this.translate(lines, targetLanguage);
    return { lines, targetLanguage, provider: 'lrclib' };
  }

  parse(lrcText: string): LyricsLine[] {
    const lines: LyricsLine[] = [];
    const pattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    for (const rawLine of lrcText.split(/\r?\n/)) {
      const matches = [...rawLine.matchAll(pattern)];
      const text = rawLine.replace(pattern, '').trim();
      if (!text) continue;
      for (const match of matches) {
        const fraction = (match[3] || '').padEnd(3, '0').slice(0, 3);
        lines.push({
          timestampMs: (Number(match[1]) * 60 + Number(match[2])) * 1000 + Number(fraction || 0),
          text,
        });
      }
    }
    return lines.sort((a, b) => a.timestampMs - b.timestampMs);
  }

  private score(candidate: { artistName?: string; trackName?: string; duration?: number }, track: TrackMetadata) {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    let score = 0;
    if (normalize(candidate.artistName || '') === normalize(track.artist)) score += 3;
    if (normalize(candidate.trackName || '') === normalize(track.title)) score += 4;
    if (candidate.duration && track.duration) {
      score += Math.max(0, 2 - Math.abs(candidate.duration - track.duration) / 10);
    }
    return score;
  }

  private async translate(lines: LyricsLine[], targetLanguage: string) {
    if (targetLanguage === 'auto' || !lines.length) return;
    const chunks: LyricsLine[][] = [];
    for (let i = 0; i < lines.length; i += 25) chunks.push(lines.slice(i, i + 25));
    for (const chunk of chunks) {
      try {
        const body = chunk.map((line) => line.text).join('\n');
        const params = new URLSearchParams({
          client: 'gtx',
          sl: 'auto',
          tl: targetLanguage,
          dt: 't',
          q: body,
        });
        const response = await fetch(`${TRANSLATE_URL}?${params.toString()}`);
        if (!response.ok) continue;
        const payload = (await response.json()) as Array<Array<[string]>>;
        const translated = (payload[0] || []).map((part) => part[0]).join('').split('\n');
        chunk.forEach((line, index) => {
          line.translation = translated[index] || '';
        });
      } catch {
        // Lyrics remain available if translation is unavailable.
      }
    }
  }
}

export const lyricsService = new LyricsService();
