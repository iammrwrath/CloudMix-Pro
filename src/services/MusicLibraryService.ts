/**
 * MusicLibraryService
 * Ingests, caches, and indexes the entire music collection including Music.csv (6,257 tracks)
 * and CloudMix Pro IndexedDB tracks for real-time sub-millisecond Cortex AI recommendation querying.
 */

import { CortexTrack } from '../types/cortex';
import { cortexAiService } from './CortexAiService';
import { storageCache } from './StorageCacheService';
import { TrackMetadata } from '../types/dj';
import { decodeHtmlEntities } from '../utils/decodeHtml';

export class MusicLibraryService {
  private tracks: CortexTrack[] = [];
  private isLoaded: boolean = false;
  private loadPromise: Promise<CortexTrack[]> | null = null;
  private listeners: Set<(tracks: CortexTrack[]) => void> = new Set();
  private selectedIndex: number = 0;
  private selectionListeners: Set<(track: TrackMetadata | null, index: number) => void> = new Set();

  public scrollSelection(delta: number): TrackMetadata | null {
    if (this.tracks.length === 0) return null;
    this.selectedIndex = Math.max(0, Math.min(this.tracks.length - 1, this.selectedIndex + delta));
    const track = this.convertPulseToDjTrack(this.tracks[this.selectedIndex]);
    for (const listener of this.selectionListeners) {
      try {
        listener(track, this.selectedIndex);
      } catch (err) {
        console.error('Error notifying selection listener:', err);
      }
    }
    return track;
  }

  public getSelectedTrack(): TrackMetadata | null {
    if (this.tracks.length === 0 || this.selectedIndex < 0 || this.selectedIndex >= this.tracks.length) return null;
    return this.convertPulseToDjTrack(this.tracks[this.selectedIndex]);
  }

  public getSelectedIndex(): number {
    return this.selectedIndex;
  }

  public setSelectedIndex(idx: number): void {
    if (this.tracks.length === 0) return;
    this.selectedIndex = Math.max(0, Math.min(this.tracks.length - 1, idx));
    const track = this.convertPulseToDjTrack(this.tracks[this.selectedIndex]);
    for (const listener of this.selectionListeners) {
      try {
        listener(track, this.selectedIndex);
      } catch (err) {
        console.error('Error notifying selection listener:', err);
      }
    }
  }

  public onSelectionChange(listener: (track: TrackMetadata | null, index: number) => void): () => void {
    this.selectionListeners.add(listener);
    if (this.tracks.length > 0) {
      listener(this.getSelectedTrack(), this.selectedIndex);
    }
    return () => this.selectionListeners.delete(listener);
  }

  public async getTracks(): Promise<CortexTrack[]> {
    if (this.isLoaded) return this.tracks;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.initLibrary();
    return this.loadPromise;
  }

  public subscribe(listener: (tracks: CortexTrack[]) => void): () => void {
    this.listeners.add(listener);
    if (this.isLoaded) {
      listener([...this.tracks]);
    }
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const copy = [...this.tracks];
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch (err) {
        console.error('Error notifying MusicLibraryService listener:', err);
      }
    }
  }

  public detectGenre(title?: string, artist?: string, album?: string, pathOrUrl?: string, bpm?: number): string {
    const text = `${title || ''} ${artist || ''} ${album || ''} ${pathOrUrl || ''}`.toLowerCase();

    // 1. Dembow & Dominican Urban (Highest priority to avoid falling into 120-128 BPM house traps)
    if (
      /\b(dembow|dominican|dominicano|dominicana|quisqueya|santodomingo|santo domingo|rd|republica dominicana)\b/.test(text) ||
      /\b(el alfa|angel dior|rochy rd|chimbala|bulin 47|kiko el crazy|tokischa|yailin|chael|tivi gunz|haraca kiko|el mayor clasico|ceky viciny|shelow shaq|dowba montana|quimico ultra mega|braulio fogon|leo rd|amenazzy|liro shaq|el cherry scom|onguito|yomel|zojord|flow 28|jey one|yaisel|el fecho|dj adoni|adoni)\b/.test(text) ||
      /\b(gogo dance|la mam[aá] de la mam[aá]|killo killo|ella era sana|coronao|curazao|singapur|pakata|taka taka|chikilio|teke teke|los aparatos|piropi|pal de velitas|suave|a correr los lakers|el juidero|capotillero)\b/.test(text)
    ) {
      return 'Dembow';
    }

    // 2. Reggaeton & Perreo & Urbano Latino
    if (
      /\b(reggaeton|reguet[oó]n|perreo|sandungueo|bellakeo|neoperreo|urbano latino|trap latino)\b/.test(text) ||
      /\b(bad bunny|daddy yankee|don omar|wisin|yandel|ozuna|rauw alejandro|anuel|feid|ferxxo|myke towers|farruko|nicky jam|zion|lennox|arcangel|de la ghetto|jhayco|jhay cortez|chencho corleone|plan b|mora|sech|ryan castro|blessd|eladio carri[oó]n|tego calderon|calle 13|residente|karol g|becky g|natti natasha|rosal[ií]a|cris mj|floyy)\b/.test(text)
    ) {
      return 'Reggaeton';
    }

    // 3. Bachata
    if (
      /\b(bachata|bachateando)\b/.test(text) ||
      /\b(romeo santos|aventura|prince royce|antony santos|anthony santos|raulin rodriguez|raul[ií]n|luis vargas|frank reyes|zacarias ferreira|el chaval|yoskar sarante|monchy)\b/.test(text)
    ) {
      return 'Bachata';
    }

    // 4. Salsa, Merengue & Tropical Latin
    if (
      /\b(salsa|merengue|cumbia|mambo|guaracha|tropical)\b/.test(text) ||
      /\b(hector lavoe|celia cruz|marc anthony|el gran combo|grupo niche|juan luis guerra|eddy herrera|los hermanos rosario|sergio vargas|fernando villalona|toño rosario|omega el fuerte|omega)\b/.test(text)
    ) {
      return 'Latin / Urbano';
    }

    // 5. Dancehall & Reggae & Soca
    if (
      /\b(dancehall|reggae|ragga|soca|dub|soundclash|riddim|yardie|kingston|dance hall)\b/.test(text) ||
      /\b(vybz kartel|popcaan|sean paul|shabba ranks|beenie man|bounty killer|buju banton|capleton|sizzla|chronixx|koffee|shenseea|skillibeng|masicka|alkaline|mavado|aidonia|busy signal|tarrus riley|konshens|spice|dexta daps|ding dong|teejay|govana|squash|jahmiel|demarco|kranium|elephant man|wayne wonder|super cat|damian marley|bob marley|ky-mani marley|ziggy marley|stephen marley)\b/.test(text)
    ) {
      return 'Dancehall';
    }

    // 6. Afrobeats & Amapiano
    if (
      /\b(afro|afrobeats|amapiano|afropop|highlife|afro house|afro fusion)\b/.test(text) ||
      /\b(burna boy|wizkid|davido|rema|asake|olamide|tiwa savage|tems|fireboy|ayra starr|omah lay|kizz daniel|ckay|joeboy|bnxn|victony|ruger|shallipopi|tekno|p-square|flavour|yemi alade|adekunle gold|uncle waffles|major league djz|kabza de small|dj maphorisa|tyler icu|focalistic|kamo mphela)\b/.test(text)
    ) {
      return 'Afrobeats';
    }

    // 7. Hip-Hop / Rap & Drill & Trap
    if (
      /\b(hip hop|hip-hop|rap|trap|boom bap|freestyle|drill|cypher|bars|mixtape)\b/.test(text) ||
      /\b(drake|kendrick lamar|j\.?\s*cole|travis scott|future|metro boomin|21 savage|lil baby|lil durk|gunna|young thug|playboi carti|jack harlow|kanye west|kanye|eminem|jay-z|jay z|nas|50 cent|lil wayne|tupac|2pac|biggie|notorious big|snoop dogg|ice cube|dmx|cardi b|nicki minaj|megan thee stallion|ice spice|glorilla|asap rocky|a\$ap rocky|pop smoke|fivio foreign|a boogie|dave east|chief keef|gucci mane|migos|quavo|offset|takeoff|lil uzi vert|polo g|nle choppa|central cee)\b/.test(text)
    ) {
      return 'Hip-Hop / Rap';
    }

    // 8. R&B & Soul & Funk
    if (
      /\b(r&b|rnb|soul|neo-soul|funk|motown|slow jam)\b/.test(text) ||
      /\b(sza|the weeknd|weeknd|brent faiyaz|summer walker|bryson tiller|chris brown|usher|beyonc[eé]|alicia keys|kehlani|partynextdoor|giveon|her|h\.e\.r\.|daniel caesar|frank ocean|steve lacy|chloe bailey|jazmine sullivan|tory lanez)\b/.test(text)
    ) {
      return 'R&B / Soul';
    }

    // 9. House & Tech House & Club
    if (
      /\b(tech house|deep house|house|electro house|funky house|disco|jackin house|tribal house|club mix|extended mix)\b/.test(text) ||
      /\b(mau p|fisher|chris lake|john summit|dom dolla|fred again|swedish house mafia|david guetta|ti[eë]sto|calvin harris|diplo|avicii|martin garrix|alesso|kaskade|deadmau5|armin van buuren|james hype|gorgon city|vintage culture|cloonee|michael bibi|pawsa|green velvet|meduza|acraze|solardo|camelphat|sidepiece)\b/.test(text)
    ) {
      return 'House';
    }

    // 10. Techno & Minimal
    if (
      /\b(techno|acid|minimal|industrial|peak time|hard techno|berlin)\b/.test(text) ||
      /\b(charlotte de witte|amelie lens|carl cox|reinier zonneveld|adam beyer|boris brejcha|tale of us|enrico sangiuliano|i hate models|nina kraviz)\b/.test(text)
    ) {
      return 'Techno';
    }

    // 11. Drum & Bass & Jungle
    if (
      /\b(drum & bass|drum and bass|dnb|jungle|liquid dnb|jump up|neurofunk)\b/.test(text) ||
      /\b(chase & status|sub focus|wilkinson|andy c|netsky|dimension|hybrid minds|hedex|kanine|shy fx|goldie|bou)\b/.test(text)
    ) {
      return 'Drum & Bass';
    }

    // 12. Dubstep & Bass Music
    if (
      /\b(dubstep|riddim|bass house|future bass|tearout|brostep|sub bass)\b/.test(text) ||
      /\b(excision|subtronics|zomboy|virtual riot|svdden death|wooli|ray volpe|marauda|spag heddy|must die|phaseone|bear grillz|sullivan king|riot ten|kai wachi|dion timmer|kompany|buku|flux pavilion|zeds dead)\b/.test(text)
    ) {
      return 'Bass / Dubstep';
    }

    // 13. Trance & Psytrance
    if (
      /\b(trance|psytrance|goa|uplifting trance|progressive trance)\b/.test(text) ||
      /\b(above & beyond|astrix|infected mushroom|vini vici|aly & fila|paul van dyk|ferry corsten)\b/.test(text)
    ) {
      return 'Trance';
    }

    // 14. Pop & Dance Pop
    if (
      /\b(pop|synthpop|dance pop|electropop|hyperpop)\b/.test(text) ||
      /\b(taylor swift|dua lipa|ariana grande|billie eilish|olivia rodrigo|katy perry|rihanna|lady gaga|bruno mars|ed sheeran|justin bieber|miley cyrus|selena gomez|harry styles)\b/.test(text)
    ) {
      return 'Pop / Dance';
    }

    // 15. Rock & Alternative
    if (
      /\b(rock|metal|indie|punk|alternative|grunge|hard rock)\b/.test(text) ||
      /\b(nirvana|metallica|linkin park|green day|blink-182|red hot chili peppers|foo fighters|arctic monkeys|the strokes)\b/.test(text)
    ) {
      return 'Rock / Alternative';
    }

    // 16. BPM heuristics ONLY when genuine analyzed BPM is provided (not dummy 125.0 unanalyzed placeholder)
    if (bpm && bpm !== 125.0) {
      if (bpm >= 170 && bpm <= 178) return 'Drum & Bass';
      if (bpm >= 138 && bpm <= 145) return 'Dubstep / Trap';
      if (bpm >= 128 && bpm <= 136) return 'Techno / Electro';
      if (bpm >= 120 && bpm <= 127) return 'House';
      if (bpm >= 105 && bpm <= 118) return 'Afrobeats';
      if (bpm >= 85 && bpm <= 104) return 'Hip-Hop / Rap';
      if (bpm >= 65 && bpm <= 84) return 'R&B / Soul';
    }

    return 'Dembow / Latin';
  }

  public async initLibrary(): Promise<CortexTrack[]> {
    const combined: Map<string, CortexTrack> = new Map();

    // 0. Primary: Direct Algoriddim djay Pro MediaLibrary.db ingestion (6,000+ local tracks with real audio file paths)
    try {
      if ((window as any).desktopAPI?.readDjayLibrary) {
        const djayTracks = await (window as any).desktopAPI.readDjayLibrary();
        if (Array.isArray(djayTracks) && djayTracks.length > 0) {
          for (const dt of djayTracks) {
            combined.set(dt.id, {
              ...dt,
              energyLevel: dt.bpm >= 128 ? 8 : dt.bpm >= 120 ? 7 : 6,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Could not load djay library:', err);
    }

    // 1. Load tracks from CloudMix Pro IndexedDB (only for tracks not already freshly resolved from djay Pro DB)
    try {
      const storedTracks = await storageCache.getAllTracks();
      for (const t of storedTracks) {
        const pulseT = this.convertDjTrackToPulse(t);
        if (!combined.has(pulseT.id)) {
          combined.set(pulseT.id, pulseT);
        }
      }
    } catch (err) {
      console.warn('Could not load tracks from storageCache:', err);
    }

    // Fallback seed if completely empty
    if (combined.size === 0) {
      const demos = this.getFallbackDemoTracks();
      for (const d of demos) {
        combined.set(d.id, d);
      }
    }

    // INSTANT UI DISPLAY: Populate live tracks and notify immediately (< 50ms)
    this.tracks = Array.from(combined.values());
    this.isLoaded = true;
    this.notify();

    // Persist active library to IndexedDB in non-blocking background
    try {
      const djTracks = this.tracks.map((t) => this.convertPulseToDjTrack(t));
      storageCache.saveTracks(djTracks).catch((e) => console.warn('Background track cache save error:', e));
    } catch {}

    // BACKGROUND INCREMENTAL SCAN: Load saved local directory and Music.csv asynchronously without blocking UI startup
    setTimeout(async () => {
      let updated = false;

      // 3. Scan saved local music folder path in background
      try {
        const savedPath = await storageCache.getSetting<string>('local_music_path', '');
        if (savedPath && savedPath.trim()) {
          const localTracks = await this.scanLocalFolder(savedPath.trim());
          for (const t of localTracks) {
            if (!combined.has(t.id)) {
              combined.set(t.id, t);
              updated = true;
            }
          }
        }
      } catch (err) {
        console.warn('Could not scan local music folder in background:', err);
      }

      // 4. Load from Music.csv via Electron IPC or Fetch
      try {
        let csvContent = '';
        if ((window as any).desktopAPI?.readMusicCsv) {
          csvContent = await (window as any).desktopAPI.readMusicCsv();
        } else {
          const res = await fetch('/Music.csv');
          if (res.ok) {
            csvContent = await res.text();
          }
        }

        if (csvContent && csvContent.length > 50) {
          const parsedCsv = this.parseMusicCsv(csvContent);
          for (const t of parsedCsv) {
            if (!combined.has(t.id)) {
              combined.set(t.id, t);
              updated = true;
            }
          }
        }
      } catch (err) {
        console.warn('Could not load Music.csv in background:', err);
      }

      if (updated) {
        this.tracks = Array.from(combined.values());
        this.notify();
        try {
          const djTracks = this.tracks.map((t) => this.convertPulseToDjTrack(t));
          storageCache.saveTracks(djTracks).catch(() => {});
        } catch {}
      }
    }, 250);

    return this.tracks;
  }

  public convertPulseToDjTrack(track: CortexTrack): TrackMetadata {
    const cleanTitle = decodeHtmlEntities(track.title);
    const cleanArtist = decodeHtmlEntities(track.artist);
    const cleanAlbum = decodeHtmlEntities(track.album || '');
    const genre = track.genre && track.genre !== 'Various' && track.genre !== 'Music'
      ? track.genre
      : this.detectGenre(cleanTitle, cleanArtist, cleanAlbum, track.fileUrl, track.bpm);

    return {
      id: track.id,
      title: cleanTitle,
      artist: cleanArtist,
      album: cleanAlbum,
      genre,
      year: track.year || new Date().getFullYear(),
      duration: track.duration || 180,
      bpm: track.bpm || 124,
      key: track.key || '8A',
      camelotKey: track.camelotKey || '8A',
      fileUrl: track.fileUrl,
      fileSource: track.fileSource as any,
      coverArtUrl: track.coverArtUrl,
      dateAdded: new Date().toLocaleDateString(),
      rating: track.rating || 4,
      hotCues: [],
      savedLoops: [],
      beatGrid: { bpm: track.bpm || 124, firstBeatOffset: 0.0, meter: 4 },
    };
  }

  /**
   * Scans a local folder for audio files via Electron IPC (scan-directory).
   * Returns tracks with real file:/// URLs.
   */
  public async scanLocalFolder(dirPath: string): Promise<CortexTrack[]> {
    if (!dirPath || !(window as any).desktopAPI?.scanDirectory) return [];

    try {
      const files: Array<{ name: string; fullPath: string; size: number }> =
        await (window as any).desktopAPI.scanDirectory(dirPath);

      if (!Array.isArray(files) || files.length === 0) return [];

      return files.map((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        // Try to parse "Artist - Title.mp3" convention
        const nameNoExt = f.name.replace(/\.[^.]+$/, '');
        let title = decodeHtmlEntities(nameNoExt);
        let artist = 'Local File';
        if (nameNoExt.includes(' - ')) {
          const parts = nameNoExt.split(' - ');
          artist = decodeHtmlEntities(parts[0].trim());
          title = decodeHtmlEntities(parts.slice(1).join(' - ').trim());
        }

        const id = `local_${f.fullPath.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)}`;
        // Encode the path for use as file:/// URL
        const fileUrl = 'file:///' + f.fullPath.replace(/\\/g, '/').replace(/^\//, '');

        const genre = this.detectGenre(title, artist, undefined, f.fullPath, 124.0);

        return {
          id,
          title,
          artist,
          genre,
          duration: 210,
          bpm: 124.0,
          key: '8A',
          camelotKey: '8A',
          energyLevel: 6,
          fileUrl,
          filePath: f.fullPath,
          fileSource: 'local' as const,
          rating: 3,
        };
      });
    } catch (err) {
      console.warn('[MusicLibrary] scanLocalFolder error:', err);
      return [];
    }
  }

  /**
   * Re-scan a local path and merge results into the live library.
   * Called by SettingsModal after the user saves a new path.
   * Returns the number of tracks found.
   */
  public async refreshFromLocalPath(dirPath: string): Promise<number> {
    await storageCache.setSetting('local_music_path', dirPath);
    const newTracks = await this.scanLocalFolder(dirPath);

    let added = 0;
    for (const t of newTracks) {
      if (!this.tracks.some((existing) => existing.id === t.id)) {
        this.tracks.unshift(t);
        added++;
      }
    }

    if (added > 0 || newTracks.length > 0) {
      this.isLoaded = true;
      this.notify();

      try {
        const djTracks = newTracks.map((t) => this.convertPulseToDjTrack(t));
        await storageCache.saveTracks(djTracks);
      } catch (err) {
        console.warn('Failed to persist scanned tracks to storageCache:', err);
      }
    }

    return newTracks.length;
  }


  // Fast robust CSV parser for Music.csv format
  public parseMusicCsv(csvText: string): CortexTrack[] {
    const results: CortexTrack[] = [];
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return results;

    // Header index mapping
    const headerLine = lines[0];
    const headers = this.parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());
    const titleIdx = headers.indexOf('title');
    const artistIdx = headers.indexOf('artist');
    const albumIdx = headers.indexOf('album');
    const timeIdx = headers.indexOf('time');
    const bpmIdx = headers.indexOf('bpm');
    const keyIdx = headers.indexOf('key');
    const urlIdx = headers.indexOf('url');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = this.parseCsvLine(line);
      const title = decodeHtmlEntities((cols[titleIdx] || 'Untitled').trim().replace(/^"|"$/g, ''));
      const artist = decodeHtmlEntities((cols[artistIdx] || 'Unknown Artist').trim().replace(/^"|"$/g, ''));
      const album = cols[albumIdx] ? decodeHtmlEntities(cols[albumIdx].trim().replace(/^"|"$/g, '')) : undefined;
      const timeStr = (cols[timeIdx] || '03:00').trim();
      const bpmRaw = parseFloat(cols[bpmIdx] || '124');
      const keyRaw = (cols[keyIdx] || '8A').trim();
      const rawUrl = (cols[urlIdx] || '').trim();

      // Parse duration mm:ss to seconds
      let durationSec = 180;
      if (timeStr.includes(':')) {
        const [m, s] = timeStr.split(':').map((n) => parseInt(n, 10) || 0);
        durationSec = m * 60 + s;
      }

      const bpm = isNaN(bpmRaw) || bpmRaw <= 0 ? 124.0 : Math.round(bpmRaw * 10) / 10;
      const camelotKey = cortexAiService.normalizeCamelotKey(keyRaw);

      // Estimate energy level from BPM and genre
      let energy = 5;
      if (bpm >= 135) energy = 9;
      else if (bpm >= 126) energy = 8;
      else if (bpm >= 120) energy = 7;
      else if (bpm >= 100) energy = 6;
      else if (bpm >= 85) energy = 5;
      else energy = 4;

      const id = `csv_${i}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24)}`;

      // Decode file:/// or file://localhost/ URL for native Electron loading
      let fileUrl = rawUrl;
      try {
        if (fileUrl.startsWith('file://localhost/')) {
          fileUrl = 'file:///' + decodeURIComponent(fileUrl.replace(/^file:\/\/localhost\//i, ''));
        } else if (fileUrl.startsWith('file:///')) {
          fileUrl = decodeURIComponent(fileUrl);
        }
      } catch {}

      const genre = this.detectGenre(title, artist, album, fileUrl, bpm);

      results.push({
        id,
        title,
        artist,
        album,
        genre,
        duration: durationSec,
        bpm,
        key: keyRaw,
        camelotKey,
        energyLevel: energy,
        fileUrl: fileUrl || 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'csv',
        rating: 4,
      });
    }

    return results;
  }

  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        fields.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    fields.push(cur);
    return fields;
  }

  public convertDjTrackToPulse(track: TrackMetadata): CortexTrack {
    return {
      id: track.id,
      title: decodeHtmlEntities(track.title),
      artist: decodeHtmlEntities(track.artist),
      album: track.album ? decodeHtmlEntities(track.album) : track.album,
      genre: track.genre,
      year: track.year,
      duration: track.duration,
      bpm: track.bpm,
      key: track.key,
      camelotKey: track.camelotKey || cortexAiService.normalizeCamelotKey(track.key),
      energyLevel: track.bpm >= 128 ? 8 : track.bpm >= 120 ? 7 : 5,
      fileUrl: track.fileUrl,
      fileSource: track.fileSource,
      rating: track.rating,
      coverArtUrl: track.coverArtUrl,
    };
  }

  public addTrack(track: CortexTrack) {
    if (!this.tracks.some((t) => t.id === track.id)) {
      this.tracks.unshift(track);
      this.notify();
    }
  }

  private getFallbackDemoTracks(): CortexTrack[] {
    return [
      {
        id: 'pulse-demo-1',
        title: 'Shiver (Club Mix)',
        artist: 'John Summit & Hayla',
        album: 'Comfort in Chaos',
        genre: 'Tech House',
        duration: 236,
        bpm: 126.0,
        key: 'Am',
        camelotKey: '8A',
        energyLevel: 8,
        fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-2',
        title: 'Where Are U Now (Afro VIP)',
        artist: 'Skrillex & Diplo',
        album: 'Jack U Remixed',
        genre: 'Afro House',
        duration: 220,
        bpm: 124.0,
        key: 'Em',
        camelotKey: '9A',
        energyLevel: 8,
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-3',
        title: 'Rhyme Dust (Dimension Remix)',
        artist: 'MK & Dom Dolla',
        album: 'Rhyme Dust Remixed',
        genre: 'Drum & Bass',
        duration: 205,
        bpm: 174.0,
        key: 'Fm',
        camelotKey: '4A',
        energyLevel: 9,
        fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-4',
        title: 'Starlight Symphony',
        artist: 'Kavinsky & Daft Sound',
        album: 'Nightcall Legends',
        genre: 'Synthwave',
        duration: 228,
        bpm: 124.0,
        key: 'Fm',
        camelotKey: '4A',
        energyLevel: 7,
        fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-5',
        title: 'Solar Flare (Festival VIP)',
        artist: 'Martin G & Hardwell',
        album: 'Ultra Miami 2026',
        genre: 'Mainstage',
        duration: 195,
        bpm: 128.0,
        key: 'Am',
        camelotKey: '8A',
        energyLevel: 9,
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-6',
        title: "'97 Hov",
        artist: 'Benny the Butcher',
        album: 'The Plugs I Met',
        genre: 'Hip Hop',
        duration: 251,
        bpm: 82.0,
        key: 'Gm',
        camelotKey: '6A',
        energyLevel: 6,
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'csv',
        rating: 4,
      },
      {
        id: 'pulse-demo-7',
        title: 'BROTHER',
        artist: 'Jessie Reyez & 6LACK',
        album: 'YESSIE',
        genre: 'R&B',
        duration: 179,
        bpm: 80.0,
        key: 'Bbm',
        camelotKey: '3A',
        energyLevel: 5,
        fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
        fileSource: 'csv',
        rating: 5,
      },
      {
        id: 'pulse-demo-8',
        title: 'GOLIATH',
        artist: 'Jessie Reyez',
        album: 'YESSIE',
        genre: 'Trap / R&B',
        duration: 186,
        bpm: 86.0,
        key: 'Cm',
        camelotKey: '5A',
        energyLevel: 6,
        fileUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        fileSource: 'csv',
        rating: 4,
      },
      {
        id: 'pulse-demo-9',
        title: 'Do It To It',
        artist: 'ACRAZE & Cherish',
        album: 'Do It To It',
        genre: 'House',
        duration: 158,
        bpm: 125.0,
        key: 'Dm',
        camelotKey: '7A',
        energyLevel: 8,
        fileUrl: 'https://cdn.freesound.org/previews/415/415444_5121236-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
      {
        id: 'pulse-demo-10',
        title: 'Breathe',
        artist: 'CamelPhat & Cristoph ft. Jem Cooke',
        album: 'Dark Matter',
        genre: 'Melodic House',
        duration: 313,
        bpm: 125.0,
        key: 'Cm',
        camelotKey: '5A',
        energyLevel: 7,
        fileUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
        fileSource: 'local',
        rating: 5,
      },
    ];
  }
}

export const musicLibraryService = new MusicLibraryService();
