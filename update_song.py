import os
import sqlite3
import re
import time
import urllib.request
import urllib.parse
import json
import logging
import traceback
import threading
import struct
import datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import mido

# ==============================================================================
# CONFIGURATION
# ==============================================================================
HTTP_SERVER_PORT = 8765
HEARTBEAT_SEC = 0.25       # 250ms loop (4Hz): Ultra-low CPU, zero gaming latency
METADATA_POLL_SEC = 1.5    # 1.5s check for next track
YOUTUBE_API_KEY = "AIzaSyBnnMkAZZtrlF4qCFBKilsjUu_zKeXcfKQ"
DEFAULT_TARGET_LANG = "en" # Target language for live translation

# Primary Paths
PRIMARY_DB_PATH = r"C:\Users\icell\Music\djay\djay Media Library\MediaLibrary.db"
SEARCH_ROOTS = [
    r"C:\Users\icell\Music\djay",
    r"C:\Users\icell\AppData\Local\Packages\59BEBC1A.djay_e3tqh12mt5rj6"
]
METADATA_PATH = r"C:\Users\icell\AppData\Local\Packages\59BEBC1A.djay_e3tqh12mt5rj6\LocalCache\Local\Algoriddim\djay\Metadata"
LOCAL_LRC_DIR = r"G:\My Drive\Music\djayPro\lyrics"

# High-Performance Local NVMe Paths (Eliminates GoogleDriveFS Cloud Sync Contention)
TRIGGER_DIR = r"C:\StreamerBot"
CACHE_DIR = os.path.join(TRIGGER_DIR, "cache")
LOG_FILE = os.path.join(TRIGGER_DIR, "djay_daemon.log")
TRIGGER_FILE = os.path.join(TRIGGER_DIR, "trigger.txt")

CACHE_FILE = os.path.join(CACHE_DIR, "youtube_cache.json")
LYRICS_CACHE_FILE = os.path.join(CACHE_DIR, "lyrics_cache.json")
TRANS_CACHE_FILE = os.path.join(CACHE_DIR, "translations_cache.json")

# Streamer.bot Watched Output Location (Only written on track transitions)
OUTPUT_DIR = r"G:\My Drive\Backup\Streamerbot\Output"
TEXT_FILE = os.path.join(OUTPUT_DIR, "nowplaying.txt")
URL_FILE = os.path.join(OUTPUT_DIR, "video_url.txt")

for d in [TRIGGER_DIR, CACHE_DIR, OUTPUT_DIR]:
    if not os.path.exists(d):
        try: os.makedirs(d)
        except: pass

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s %(message)s',
    datefmt='%H:%M:%S',
    filemode='w'
)

def log(msg):
    try:
        print(msg)
        logging.info(msg)
    except: pass

# ==============================================================================
# FAST FILE WRITER (Prevents disk spam)
# ==============================================================================
def smart_write(filepath, content, force=False):
    """Writes to file only if content has changed, eliminating disk thrashing."""
    try:
        if not force and os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                if f.read().strip() == content.strip():
                    return False
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        log(f"[WRITE ERROR] {filepath}: {e}")
        return False

def fire_local_trigger():
    smart_write(TRIGGER_FILE, str(time.time()), force=True)
    log("[TRIGGER] Local trigger file updated.")

def load_json(path):
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except: pass
    return {}

def save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
    except: pass

# ==============================================================================
# REAL-TIME PLAYHEAD CLOCK (Analytical Precision + Manual Nudge)
# ==============================================================================
class PlayheadClock:
    def __init__(self):
        self.lock = threading.Lock()
        self.current_song = "..."
        self.next_song = "..."
        self.song_id = 0
        self.is_playing = True
        self.accumulated_seconds = 0.0
        self.last_play_time = time.time()
        self.manual_offset_ms = 0
        self.lyrics_lines = []
        self.current_line = ""
        self.current_translation = ""
        self.current_video_id = ""
        self.next_video_id = ""
        self.detected_language = "en"
        self.ai_sync_status = "Standby"

    def on_track_change(self, new_song: str, initial_offset_sec: float = 0.0):
        with self.lock:
            self.current_song = new_song
            self.song_id = int(time.time() * 1000)
            self.accumulated_seconds = max(0.0, initial_offset_sec)
            self.is_playing = True
            self.last_play_time = time.time()
            self.manual_offset_ms = 0
            self.lyrics_lines = []
            self.current_line = ""
            self.current_translation = ""
            self.detected_language = "en"
            if initial_offset_sec > 0:
                self.ai_sync_status = f"Synced (offset +{initial_offset_sec:.1f}s)"
            else:
                self.ai_sync_status = "Synced"

    def on_midi_play_state(self, playing: bool):
        with self.lock:
            now = time.time()
            if playing and not self.is_playing:
                self.is_playing = True
                self.last_play_time = now
            elif not playing and self.is_playing:
                self.accumulated_seconds += (now - self.last_play_time)
                self.is_playing = False

    def nudge(self, delta_ms: int):
        with self.lock:
            self.manual_offset_ms += delta_ms
            log(f"[CLOCK NUDGE] Offset adjusted by {delta_ms}ms -> Total: {self.manual_offset_ms}ms")

    def set_position_ms(self, target_ms: int):
        with self.lock:
            now = time.time()
            self.accumulated_seconds = max(0.0, target_ms / 1000.0)
            self.last_play_time = now
            log(f"[CLOCK SEEK] Clock set directly to {target_ms}ms ({target_ms/1000:.2f}s)")

    def get_elapsed_ms_internal(self) -> int:
        if not self.is_playing:
            raw_ms = int(self.accumulated_seconds * 1000)
        else:
            now = time.time()
            raw_ms = int((self.accumulated_seconds + (now - self.last_play_time)) * 1000)
        return max(0, raw_ms)

    def get_elapsed_ms(self) -> int:
        with self.lock:
            return max(0, self.get_elapsed_ms_internal() + self.manual_offset_ms)

clock = PlayheadClock()

# ==============================================================================
# STRING & TOKEN NORMALIZATION
# ==============================================================================
def clean_str(s):
    return re.sub(r'[^a-zA-Z0-9]', '', str(s)).lower()

def split_artist_title(song_str):
    if " - " in song_str:
        parts = song_str.split(" - ", 1)
        return parts[0].strip(), parts[1].strip()
    return "", song_str.strip()

def tokenize(s):
    s = s.lower().replace('.lrc', '').replace('.mp3', '')
    words = re.findall(r'[a-z0-9]+', s)
    stop_words = {'feat', 'ft', 'remix', 'mix', 'edit', 'radio', 'original', 'version', 'official', 'audio', 'video'}
    return set(w for w in words if w not in stop_words)

# ==============================================================================
# LIVE TRANSLATION ENGINE (Chunked Batch API + Local NVMe Cache)
# ==============================================================================
class TranslationEngine:
    def __init__(self, target_lang=DEFAULT_TARGET_LANG):
        self.target_lang = target_lang
        self.cache = load_json(TRANS_CACHE_FILE)
        self.lock = threading.Lock()

    def translate_lines(self, song_str, lines, chunk_size=30):
        if not lines or song_str in ("...", "Unidentified Track", "Unknown"):
            return lines, "en"

        cache_key = f"{song_str}__{self.target_lang}"
        with self.lock:
            if cache_key in self.cache:
                cached_data = self.cache[cache_key]
                cached_translations = cached_data.get("translations", [])
                detected_lang = cached_data.get("detected_lang", "en")
                if len(cached_translations) == len(lines):
                    for idx, line in enumerate(lines):
                        line["translation"] = cached_translations[idx]
                    return lines, detected_lang

        detected_lang = "unknown"
        all_translations = []

        try:
            for i in range(0, len(lines), chunk_size):
                chunk = lines[i:i + chunk_size]
                texts = [c.get("text", "").strip() for c in chunk]
                body_text = "\n".join(texts)

                if not body_text.strip():
                    for _ in chunk: all_translations.append("")
                    continue

                url = (f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={self.target_lang}&dt=t&q="
                       + urllib.parse.quote(body_text))
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=3.5) as res:
                    data = json.loads(res.read().decode('utf-8'))
                    if detected_lang == "unknown" and len(data) > 2:
                        detected_lang = data[2]

                    if detected_lang == self.target_lang:
                        with self.lock:
                            self.cache[cache_key] = {"translations": ["" for _ in lines], "detected_lang": self.target_lang}
                            save_json(TRANS_CACHE_FILE, self.cache)
                        for line in lines: line["translation"] = ""
                        return lines, self.target_lang

                    translated_parts = [part[0] for part in data[0] if part[0]]
                    chunk_translated = "".join(translated_parts).split("\n")

                    for idx in range(len(chunk)):
                        t_str = chunk_translated[idx].strip() if idx < len(chunk_translated) else ""
                        all_translations.append(t_str)

            for idx in range(len(lines)):
                lines[idx]["translation"] = all_translations[idx] if idx < len(all_translations) else ""

            with self.lock:
                self.cache[cache_key] = {"translations": all_translations, "detected_lang": detected_lang}
                save_json(TRANS_CACHE_FILE, self.cache)

            log(f"[TRANSLATION SUCCESS] '{song_str}' ({detected_lang} -> {self.target_lang}) {len(all_translations)} lines")
            return lines, detected_lang

        except Exception as e:
            log(f"[TRANSLATION ERROR] {song_str}: {e}")
            for line in lines:
                if "translation" not in line:
                    line["translation"] = ""
            return lines, detected_lang

translation_engine = TranslationEngine()

# ==============================================================================
# LOCAL LRC INDEX & FAST MATCHER (<1ms)
# ==============================================================================
class LocalLyricsEngine:
    def __init__(self, lrc_dir):
        self.lrc_dir = lrc_dir
        self.lock = threading.Lock()
        self.indexed_files = []
        self.exact_map = {}
        self.build_index()

    def normalize_key(self, s):
        s = s.lower().replace('.lrc', '').replace('.mp3', '')
        s = re.sub(r'\(feat\..*?\)|\[feat\..*?\]|\bft\b', '', s)
        s = re.sub(r'\(remix.*?\)|\[remix.*?\]', '', s)
        return ''.join(re.findall(r'[a-z0-9]', s))

    def build_index(self):
        if not os.path.exists(self.lrc_dir):
            return
        t0 = time.time()
        new_files = []
        new_exact = {}
        try:
            for f in os.listdir(self.lrc_dir):
                if f.lower().endswith('.lrc'):
                    full_path = os.path.join(self.lrc_dir, f)
                    tokens = tokenize(f)
                    norm = self.normalize_key(f)
                    new_files.append((f, tokens, full_path))
                    if norm:
                        new_exact[norm] = full_path
            with self.lock:
                self.indexed_files = new_files
                self.exact_map = new_exact
            log(f"[LYRICS] Indexed {len(new_files)} local .lrc files in {(time.time() - t0)*1000:.1f}ms")
        except Exception as e:
            log(f"[LYRICS INDEX ERROR] {e}")

    def find_lrc(self, song_str):
        if not song_str or song_str in ("...", "Unidentified Track", "Unknown"):
            return None

        norm = self.normalize_key(song_str)
        with self.lock:
            if norm in self.exact_map:
                return self.exact_map[norm]

        q_tokens = tokenize(song_str)
        if not q_tokens:
            return None

        artist, title = split_artist_title(song_str)
        clean_title = re.sub(r'[\(\[\{].*?[\)\]\}]', '', title).strip()
        title_tokens = tokenize(clean_title if clean_title else title)

        best_match = None
        best_score = 0
        with self.lock:
            for fname, tokens, fpath in self.indexed_files:
                common = q_tokens.intersection(tokens)
                if common:
                    if title_tokens and not title_tokens.intersection(common):
                        continue
                    score = len(common) / max(min(len(q_tokens), len(tokens)), 1)
                    if score > best_score and score >= 0.7:
                        best_score = score
                        best_match = fpath
                        if score == 1.0:
                            break

        return best_match

lyrics_engine = LocalLyricsEngine(LOCAL_LRC_DIR)

# ==============================================================================
# LRC PARSER & LRCLIB FETCHER
# ==============================================================================
def parse_lrc(lrc_text):
    pattern = re.compile(r"\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)")
    parsed = []
    for line in lrc_text.splitlines():
        m = pattern.match(line.strip())
        if m:
            mins = int(m.group(1))
            secs = int(m.group(2))
            millis = int(m.group(3).ljust(3, '0')[:3])
            t_ms = (mins * 60 * 1000) + (secs * 1000) + millis
            txt = m.group(4).strip()
            if txt:
                parsed.append({"time_ms": t_ms, "text": txt, "translation": ""})
    return sorted(parsed, key=lambda x: x["time_ms"])

def parse_lrc_file(fpath):
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            return parse_lrc(f.read())
    except Exception as e:
        log(f"[LRC READ ERROR] {fpath}: {e}")
        return None

def is_valid_match(q_artist, q_title, res_artist, res_title):
    t_q = tokenize(q_title)
    t_r = tokenize(res_title)
    if not t_q:
        return False
    title_common = t_q.intersection(t_r)
    if len(title_common) / len(t_q) < 0.5:
        return False

    if q_artist:
        a_q = tokenize(q_artist)
        a_r = tokenize(res_artist)
        if a_q and a_r and not a_q.intersection(a_r):
            return False

    return True

def fetch_lrclib_synced_lyrics(song_str):
    artist, title = split_artist_title(song_str)
    clean_title = re.sub(r'[\(\[\{].*?[\)\]\}]', '', title).strip()
    effective_title = clean_title if clean_title else title
    
    headers = {
        'User-Agent': 'djay-lyrics-daemon/3.0 (https://github.com/iammrwrath/djay-sync)',
        'Accept': 'application/json'
    }

    def try_get(p_artist, p_title):
        try:
            params = {"track_name": p_title}
            if p_artist:
                params["artist_name"] = p_artist
            url = f"https://lrclib.net/api/get?{urllib.parse.urlencode(params)}"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=3.0) as res:
                if res.status == 200:
                    data = json.loads(res.read().decode('utf-8'))
                    synced = data.get("syncedLyrics")
                    if synced:
                        return synced
        except Exception:
            pass
        return None

    synced = None

    # Strategy 1: Exact artist + title
    if artist:
        synced = try_get(artist, effective_title)

    # Strategy 2: Primary artist decomposition (strips songwriter / producer credits from djay metadata)
    if not synced and artist:
        parts = [p.strip() for p in re.split(r'[,/&]|\bfeat\.?|\bft\.?', artist, flags=re.IGNORECASE) if p.strip()]
        if len(parts) > 1:
            synced = try_get(parts[0], effective_title)
            if not synced and len(parts) >= 2:
                synced = try_get(f"{parts[0]}, {parts[1]}", effective_title)
            if not synced and len(parts) >= 3:
                synced = try_get(f"{parts[0]}, {parts[1]}, {parts[2]}", effective_title)

    # Strategy 3: Search endpoint fallback (Strictly validated to avoid false matches)
    if not synced:
        search_queries = []
        if artist:
            primary = re.split(r'[,/&]|\bfeat\.?|\bft\.?', artist, flags=re.IGNORECASE)[0].strip()
            search_queries.append(f"{primary} {effective_title}")
        search_queries.append(effective_title)

        for q in search_queries:
            try:
                params = urllib.parse.urlencode({'q': q})
                url = f"https://lrclib.net/api/search?{params}"
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=3.0) as res:
                    if res.status == 200:
                        items = json.loads(res.read().decode('utf-8'))
                        for item in items:
                            if item.get("syncedLyrics"):
                                r_art = item.get("artistName", "")
                                r_trk = item.get("trackName", "")
                                if is_valid_match(artist, effective_title, r_art, r_trk):
                                    synced = item.get("syncedLyrics")
                                    log(f"[LRCLIB SEARCH MATCH] Query '{q}' -> {r_art} - {r_trk}")
                                    break
                if synced:
                    break
            except Exception:
                pass

    if synced:
        parsed = parse_lrc(synced)
        try:
            safe_name = re.sub(r'[\\/*?:"<>|]', "", song_str).strip()
            save_path = os.path.join(LOCAL_LRC_DIR, f"{safe_name}.lrc")
            with open(save_path, 'w', encoding='utf-8') as lf:
                lf.write(synced)
            log(f"[LRC AUTO-SAVED] Saved to local library: {safe_name}.lrc")
        except:
            pass
        return parsed

    log(f"[LRCLIB ERROR] {song_str}: No synced lyrics found across all search strategies")
    return None

def get_lyrics_for_song(song_str):
    local_path = lyrics_engine.find_lrc(song_str)
    if local_path:
        lines = parse_lrc_file(local_path)
        if lines:
            log(f"[LYRICS INSTANT MATCH] Found in local library: {os.path.basename(local_path)}")
            return lines

    cache = load_json(LYRICS_CACHE_FILE)
    if song_str in cache:
        cached = cache.get(song_str)
        if isinstance(cached, list):
            return cached

    lines = fetch_lrclib_synced_lyrics(song_str)
    cache[song_str] = lines if lines else "NOT_FOUND"
    save_json(LYRICS_CACHE_FILE, cache)
    return lines

def bg_fetch_lyrics_and_translate(song_str, is_current=False):
    lines = get_lyrics_for_song(song_str)
    if not lines:
        return

    lines, lang = translation_engine.translate_lines(song_str, lines)

    if is_current:
        with clock.lock:
            if clock.current_song == song_str:
                clock.lyrics_lines = lines
                clock.detected_language = lang
                clock.song_id = int(time.time() * 1000)
        log(f"[LYRICS + TRANS LOADED] {song_str} ({len(lines)} lines, lang: {lang})")
    else:
        log(f"[PRE-FETCHED LYRICS + TRANS] Next track ready: {song_str} ({lang})")

# ==============================================================================
# YOUTUBE VIDEO RESOLVER & DUAL-DECK PRE-FETCHER
# ==============================================================================
def extract_video_id(url_or_id):
    if not url_or_id or url_or_id in ("about:blank", "NOT_FOUND", "SEARCHING..."):
        return ""
    m = re.search(r'[a-zA-Z0-9_-]{11}', url_or_id)
    return m.group(0) if m else ""

def yt_search(query):
    if YOUTUBE_API_KEY and YOUTUBE_API_KEY != "YOUR_API_KEY_HERE":
        try:
            q = urllib.parse.quote(query)
            url = f"https://www.googleapis.com/youtube/v3/search?part=id&q={q}&type=video&maxResults=1&key={YOUTUBE_API_KEY}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=2.0) as res:
                data = json.loads(res.read().decode())
                if data.get("items"):
                    vid_id = data["items"][0]["id"]["videoId"]
                    return f"https://www.youtube.com/watch?v={vid_id}&autoplay=1"
        except Exception as e:
            log(f"[YT API ERROR] Scrape fallback: {e}")

    try:
        q = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={q}&sp=EgIQAQ%253D%253D"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=2.0) as res:
            html = res.read().decode()
            vid_ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
            if vid_ids:
                return f"https://www.youtube.com/watch?v={vid_ids[0]}&autoplay=1"
    except Exception as e:
        log(f"[YT SCRAPE ERROR] {e}")
    return None

def resolve_youtube_url(song_str):
    cache = load_json(CACHE_FILE)
    if song_str in cache:
        cached = cache.get(song_str)
        if cached != "SEARCHING...":
            return cached

    url = yt_search(f"{song_str} official music video")
    if not url: url = yt_search(f"{song_str} lyric video")
    if not url: url = yt_search(song_str)

    final_url = url if url else "NOT_FOUND"
    cache[song_str] = final_url
    save_json(CACHE_FILE, cache)
    return final_url

def bg_fetch_video(song, is_current=False):
    url = resolve_youtube_url(song)
    vid_id = extract_video_id(url)
    
    if is_current:
        with clock.lock:
            clock.current_video_id = vid_id
        final_write = "about:blank" if url == "NOT_FOUND" else url
        if smart_write(URL_FILE, final_write):
            log(f"[UPDATE] Current Track Video: {final_write}")
            fire_local_trigger()
    else:
        with clock.lock:
            clock.next_video_id = vid_id
        log(f"[PRE-FETCHED NEXT VIDEO] Pre-buffered ID: {vid_id} ({url})")

# ==============================================================================
# FAST DJAY DATABASE & METADATA ENGINES (Mtime-Gated: 0 Queries/Min during play)
# ==============================================================================
class DjayEngine:
    def __init__(self):
        self.db_path = self.find_db_path()
        self.uuid_cache = {}
        self.last_db_mtime = 0.0
        self.cached_song_info = (None, 0, 0.0)
        self.last_meta_mtime = 0.0
        self.cached_next_song = "..."
        log(f"[DATABASE] Connected to: {self.db_path}")

    def find_db_path(self):
        if os.path.exists(PRIMARY_DB_PATH):
            return PRIMARY_DB_PATH
        files = []
        for root in SEARCH_ROOTS:
            if os.path.exists(root):
                for r, _, fs in os.walk(root):
                    for f in fs:
                        if f.endswith(('.db', '.djaymedialibrary')):
                            files.append(os.path.join(r, f))
        if files:
            files.sort(key=os.path.getmtime, reverse=True)
            return files[0]
        return PRIMARY_DB_PATH

    @staticmethod
    def extract_metadata_strings(blob):
        pattern = b'(?:[\x20-\x7E]|[\xC2-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF4][\x80-\xBF]{3}){2,}'
        strings = re.findall(pattern, blob)
        decoded = []
        for s in strings:
            try:
                d = s.decode('utf-8').strip()
                d = re.sub(r'^[\s\x00-\x1F\x7F]+|[\s\x00-\x1F\x7F]+$', '', d)
                if len(d) > 1:
                    decoded.append(d)
            except: pass
        return decoded

    def get_current_song_info(self):
        """Fast MTIME-gated query into historySessionItems (<0.01ms when unchanged, ~1ms on change)."""
        if not self.db_path or not os.path.exists(self.db_path):
            return None, 0, 0.0
        try:
            cur_mtime = os.path.getmtime(self.db_path)
            wal_path = self.db_path + "-wal"
            if os.path.exists(wal_path):
                try:
                    cur_mtime = max(cur_mtime, os.path.getmtime(wal_path))
                except: pass

            # If the database has not been touched by djay Pro, return cached info instantly
            if cur_mtime == self.last_db_mtime and self.cached_song_info[0] is not None:
                return self.cached_song_info

            self.last_db_mtime = cur_mtime
            conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True, timeout=0.5)
            cur = conn.cursor()
            cur.execute("SELECT data FROM database2 WHERE collection='historySessionItems' ORDER BY rowid DESC LIMIT 1")
            row = cur.fetchone()
            conn.close()

            if row:
                blob = row[0]
                decoded = self.extract_metadata_strings(blob)
                title = "Unknown"
                artist = ""
                for i, s in enumerate(decoded):
                    s_lower = s.lower()
                    if s_lower == 'title' and i > 0:
                        title = decoded[i-1]
                    elif s_lower == 'artist' and i > 0:
                        artist = decoded[i-1]

                deck_num = 1
                deck_idx = blob.find(b'deckNumber')
                if deck_idx >= 9:
                    try:
                        deck_val = struct.unpack('<d', blob[deck_idx-9:deck_idx-1])[0]
                        deck_num = int(round(deck_val))
                    except: pass

                start_ts = 0.0
                st_idx = blob.find(b'startTime')
                if st_idx >= 9:
                    try:
                        val = struct.unpack('<d', blob[st_idx-9:st_idx-1])[0]
                        base = datetime.datetime(2001, 1, 1, tzinfo=datetime.timezone.utc)
                        start_dt = (base + datetime.timedelta(seconds=val)).astimezone()
                        start_ts = start_dt.timestamp()
                    except: pass

                if title != "Unknown":
                    name = f"{artist} - {title}" if artist else title
                    self.cached_song_info = (name, deck_num, start_ts)
                    return self.cached_song_info
        except Exception as e:
            pass
        return self.cached_song_info if self.cached_song_info[0] else (None, 0, 0.0)

    def resolve_uuid(self, uuid_hex):
        """Point lookup by key in mediaItems: cached in memory (<0.01ms)."""
        uuid_hex = uuid_hex.lower()
        if uuid_hex in self.uuid_cache:
            return self.uuid_cache[uuid_hex]

        try:
            conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True, timeout=0.5)
            cur = conn.cursor()
            cur.execute("SELECT data FROM database2 WHERE collection='mediaItems' AND key = ?", (uuid_hex,))
            row = cur.fetchone()
            conn.close()

            if row:
                decoded = self.extract_metadata_strings(row[0])
                title = None
                artist = None
                for i, s in enumerate(decoded):
                    s_lower = s.lower()
                    if s_lower == 'title' and i > 0:
                        title = decoded[i-1]
                    elif s_lower == 'artist' and i > 0:
                        artist = decoded[i-1]

                if title:
                    name = f"{artist} - {title}" if artist else title
                    self.uuid_cache[uuid_hex] = name
                    return name
        except: pass
        return None

    def get_next_song(self, current_song):
        """High-speed MTIME-gated scan of recent metadata files."""
        if not os.path.exists(METADATA_PATH):
            return "..."

        try:
            cur_meta_mtime = os.path.getmtime(METADATA_PATH)
            if cur_meta_mtime == self.last_meta_mtime and self.cached_next_song != "...":
                if clean_str(self.cached_next_song) != clean_str(current_song):
                    return self.cached_next_song

            self.last_meta_mtime = cur_meta_mtime
            subdirs = [os.path.join(METADATA_PATH, d) for d in os.listdir(METADATA_PATH)]
            subdirs.sort(key=os.path.getmtime, reverse=True)

            files = []
            for sd in subdirs[:4]:
                try:
                    for f in os.listdir(sd):
                        fp = os.path.join(sd, f)
                        files.append((os.path.getmtime(fp), f))
                except: pass

            files.sort(key=lambda x: x[0], reverse=True)

            for mtime, fname in files[:10]:
                m = re.search(r'[a-f0-9]{32}', fname, re.I)
                if not m: continue
                u = m.group(0).lower()
                name = self.resolve_uuid(u)
                if not name or name in ("Unknown", "Unidentified Track", "..."):
                    continue
                if clean_str(name) != clean_str(current_song) and clean_str(name) not in clean_str(current_song):
                    self.cached_next_song = name
                    return name
        except Exception as e:
            pass
        return self.cached_next_song

djay_engine = DjayEngine()

# ==============================================================================
# MIDI IN LISTENER THREAD
# ==============================================================================
def start_midi_listener():
    while True:
        try:
            port_candidates = [p for p in mido.get_input_names() if 'djay_sync' in p]
            if not port_candidates:
                time.sleep(2.0)
                continue

            target_port = port_candidates[0]
            log(f"[MIDI] Connected to loopback port: {target_port}")

            with mido.open_input(target_port) as inport:
                for msg in inport:
                    if msg.type in ('note_on', 'note_off') and msg.note in (1, 2):
                        is_play = (msg.type == 'note_on' and msg.velocity > 0)
                        clock.on_midi_play_state(is_play)
                        log(f"[MIDI EVENT] Deck {'1' if msg.note == 1 else '2'} Play State -> {is_play}")
        except Exception as e:
            time.sleep(3.0)

# ==============================================================================
# EMBEDDED MULTI-THREADED HTTP SERVER (Delta Sync + Keep-Alive)
# ==============================================================================
class LyricsHTTPHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        # 1. API: /lyrics JSON (Delta Payload: Only transfers lyrics array on song change)
        if self.path.startswith("/lyrics"):
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            try:
                client_sid = int(qs.get("song_id", [0])[0])
            except:
                client_sid = 0
            want_full = (qs.get("full", ["0"])[0] == "1") or (client_sid == 0)

            elapsed_ms = clock.get_elapsed_ms()
            with clock.lock:
                current_sid = clock.song_id
                song_changed = (client_sid != current_sid)

                payload = {
                    "current_song": clock.current_song,
                    "next_song": clock.next_song,
                    "song_id": current_sid,
                    "is_playing": clock.is_playing,
                    "elapsed_ms": elapsed_ms,
                    "manual_offset_ms": clock.manual_offset_ms,
                    "ai_sync_status": clock.ai_sync_status,
                    "current_line": clock.current_line,
                    "current_translation": clock.current_translation,
                    "detected_language": clock.detected_language,
                    "video_id": clock.current_video_id,
                    "next_video_id": clock.next_video_id,
                }

                if want_full or song_changed:
                    payload["lines"] = clock.lyrics_lines
                    payload["has_lines"] = True
                else:
                    payload["has_lines"] = False

            data = json.dumps(payload).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            self.wfile.write(data)

        # 2. API: /nudge?ms=500 or /nudge?sec=1.0
        elif self.path.startswith("/nudge"):
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            delta_ms = 0
            if "ms" in qs:
                delta_ms = int(qs["ms"][0])
            elif "sec" in qs:
                delta_ms = int(float(qs["sec"][0]) * 1000)
            
            clock.nudge(delta_ms)
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", "2")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            self.wfile.write(b"OK")

        # 3. API: /seek?ms=45000 or /seek?sec=45
        elif self.path.startswith("/seek"):
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            target_ms = 0
            if "ms" in qs:
                target_ms = int(qs["ms"][0])
            elif "sec" in qs:
                target_ms = int(float(qs["sec"][0]) * 1000)

            clock.set_position_ms(target_ms)
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", "2")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            self.wfile.write(b"OK")

        # 4. Browser Source: /player (Instant Dual-Deck YouTube Player)
        elif self.path.startswith("/player"):
            fpath = os.path.join(TRIGGER_DIR, "obs_player.html")
            self.serve_file(fpath, "text/html; charset=utf-8")

        # 5. Browser Source: /overlay (Live Synced Lyrics + Translation + Interactive Sync)
        elif self.path.startswith("/overlay"):
            fpath = os.path.join(TRIGGER_DIR, "lyrics_overlay.html")
            self.serve_file(fpath, "text/html; charset=utf-8")

        # 6. Browser Source: /widget (Now Playing & Next Song)
        elif self.path.startswith("/widget"):
            fpath = os.path.join(OUTPUT_DIR, "music_widget.html")
            self.serve_file(fpath, "text/html; charset=utf-8")

        # 7. Browser Source: /allinone (Combined Player + Lyrics + Translation + Widget)
        elif self.path.startswith("/allinone"):
            fpath = os.path.join(TRIGGER_DIR, "all_in_one.html")
            self.serve_file(fpath, "text/html; charset=utf-8")

        else:
            self.send_response(404)
            self.end_headers()

    def serve_file(self, fpath, content_type):
        if os.path.exists(fpath):
            try:
                with open(fpath, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Connection", "keep-alive")
                self.end_headers()
                self.wfile.write(content)
                return
            except Exception as e:
                log(f"[HTTP SERVE ERROR] {e}")
        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        pass

def start_http_server():
    try:
        server = ThreadingHTTPServer(("0.0.0.0", HTTP_SERVER_PORT), LyricsHTTPHandler)
        log(f"[HTTP SERVER] Multi-threaded HTTP/1.1 listening on http://127.0.0.1:{HTTP_SERVER_PORT}")
        server.serve_forever()
    except Exception as e:
        log(f"[HTTP SERVER ERROR] {e}")

# ==============================================================================
# MAIN BACKGROUND LOOP (Zero Subprocesses, Zero Gaming Lag)
# ==============================================================================
def main_loop():
    # Set Windows Process Priority to BELOW_NORMAL (Guarantees zero interference with Overwatch)
    try:
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x00004000)
        log("[SYSTEM] Process priority set to BELOW_NORMAL_PRIORITY_CLASS (Gaming Safe)")
    except Exception as e:
        log(f"[SYSTEM] Priority note: {e}")

    log("="*60)
    log("--- DJAY PRO HYBRID DAEMON v3.3 (ZERO-STUTTER GAMING PRO) ---")
    log("Features: Mtime-Gated SQLite (0 queries/min during play), NVMe Cache, Delta Sync HTTP/1.1")
    log(f"HTTP Server: http://127.0.0.1:{HTTP_SERVER_PORT}")
    log(f"Cache Directory: {CACHE_DIR}")
    log("="*60)

    # 1. Start HTTP Server
    threading.Thread(target=start_http_server, daemon=True).start()

    # 2. Start MIDI In Listener
    threading.Thread(target=start_midi_listener, daemon=True).start()

    last_current_song = ""
    last_next_song = ""
    last_meta_scan_time = 0.0
    last_text_content = ""  # Track last written content in memory — avoids Google Drive reads

    while True:
        try:
            time.sleep(HEARTBEAT_SEC)
            now = time.time()

            # --- 1. DETECT CURRENT SONG FROM HISTORY (Mtime-Gated, 0 SQLite queries during play) ---
            current_song, deck_num, start_ts = djay_engine.get_current_song_info()
            if not current_song:
                current_song = "..."

            # --- 2. SONG TRANSITION DETECTED ---
            if current_song != last_current_song:
                last_current_song = current_song
                
                # Account for any initial seconds between track start and DB write
                initial_offset = 0.0
                if start_ts > 0 and (now - start_ts) < 600.0:
                    initial_offset = max(0.0, now - start_ts)

                clock.on_track_change(current_song, initial_offset_sec=initial_offset)
                log(f"[TRACK CHANGE] Now Playing: {current_song} (Deck {deck_num}, initial offset {initial_offset:.1f}s)")

                # Immediate Lyrics & Translation in Background Thread
                threading.Thread(target=bg_fetch_lyrics_and_translate, args=(current_song, True), daemon=True).start()

                # Fast YouTube Video Resolution & Trigger
                cached_vid = load_json(CACHE_FILE).get(current_song)
                if cached_vid and cached_vid not in ("SEARCHING...", "NOT_FOUND"):
                    with clock.lock:
                        clock.current_video_id = extract_video_id(cached_vid)
                    smart_write(URL_FILE, cached_vid)
                    fire_local_trigger()
                else:
                    threading.Thread(target=bg_fetch_video, args=(current_song, True), daemon=True).start()

            # --- 3. NEXT SONG DETECTION (Runs every 1.5s with mtime gating) ---
            if now - last_meta_scan_time >= METADATA_POLL_SEC:
                last_meta_scan_time = now
                next_song = djay_engine.get_next_song(current_song)
                
                with clock.lock:
                    clock.next_song = next_song

                if next_song != last_next_song:
                    last_next_song = next_song
                    if next_song not in ("...", "Unidentified Track", "Unknown"):
                        log(f"[NEXT TRACK] Detected Next: {next_song}")

                        # Pre-fetch lyrics AND translation for next song silently
                        threading.Thread(target=bg_fetch_lyrics_and_translate, args=(next_song, False), daemon=True).start()

                        # Pre-fetch video ID for next song (Dual-Deck Pre-Buffering!)
                        cache = load_json(CACHE_FILE)
                        if next_song in cache:
                            v_url = cache.get(next_song)
                            with clock.lock:
                                clock.next_video_id = extract_video_id(v_url)
                        else:
                            threading.Thread(target=bg_fetch_video, args=(next_song, False), daemon=True).start()

                # Update nowplaying.txt ONLY when content changed (in-memory diff — zero Google Drive reads during stable playback)
                new_text_content = f"{current_song}\n{next_song}"
                if new_text_content != last_text_content:
                    last_text_content = new_text_content
                    smart_write(TEXT_FILE, new_text_content, force=True)

        except Exception as e:
            log(f"\n[DAEMON ERROR] {e}")
            traceback.print_exc()
            time.sleep(1.0)

if __name__ == "__main__":
    main_loop()
