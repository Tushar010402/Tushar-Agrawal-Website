'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Headphones,
  Volume2,
  VolumeX,
  Music,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  AmbientEngine,
  AMBIENT_PRESETS,
  getPreset,
  presetForSlug,
  type AmbientPreset,
} from '@/lib/ambient-engine';

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────

interface BlogReaderProps {
  title: string;
  content: string;
  description: string;
  author?: string;
  /** Pre-generated narration MP3 (neural TTS). When set, the player uses it
   *  instead of browser speech synthesis — real seeking, consistent voice. */
  audioUrl?: string;
  audioDuration?: number;
  /** SRT file with sentence-level cues, displayed as synced subtitles. */
  captionsUrl?: string;
  /** Stable slug — picks this post's default ambient soundtrack. */
  slug?: string;
  /** Other narrated posts, for "Up next" continuous listening. */
  upNext?: { slug: string; title: string }[];
  /** Auto-start playback on mount (set when arriving via ?play=1). */
  autoPlay?: boolean;
}

type ChunkType = 'intro' | 'heading' | 'text' | 'data' | 'diagram' | 'transition' | 'conclusion';

interface SpeechChunk {
  text: string;
  type: ChunkType;
}

// ─────────────────────────────────────
// SRT subtitle parsing (for pre-generated narration)
// ─────────────────────────────────────

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function parseSrt(srt: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const toSec = (h: string, m: string, s: string, ms: string) =>
    Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
  for (const block of srt.split(/\r?\n\s*\r?\n/)) {
    const lines = block.trim().split(/\r?\n/);
    const timeIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeIdx === -1) continue;
    const m = lines[timeIdx].match(
      /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/
    );
    if (!m) continue;
    const text = lines.slice(timeIdx + 1).join(' ').trim();
    if (!text) continue;
    cues.push({ start: toSec(m[1], m[2], m[3], m[4]), end: toSec(m[5], m[6], m[7], m[8]), text });
  }
  return cues;
}

// ─────────────────────────────────────
// Content Analysis Helpers
// ─────────────────────────────────────

const isAsciiArtLine = (line: string): boolean => {
  const stripped = line.replace(/\s/g, '');
  if (stripped.length < 4) return false;
  const artChars = stripped.replace(/[a-zA-Z0-9.,;:!?'"()₹$€%@&]/g, '');
  return artChars.length > stripped.length * 0.5;
};

const isProgrammingCode = (block: string): boolean => {
  const pat =
    /\b(import|export|function|const|let|var|class|def|return|if|else|for|while|try|catch|async|await|from|require|module|print|console|=>|===|!==|\{|\}|;$)/m;
  const lines = block.split('\n').filter((l) => l.trim());
  const codeLines = lines.filter((l) => pat.test(l));
  return codeLines.length > lines.length * 0.3;
};

const isDataTable = (block: string): boolean => {
  const lines = block.split('\n').filter((l) => l.trim());
  const tableLines = lines.filter(
    (l) => (l.includes('│') || l.includes('|')) && l.split(/[│|]/).length >= 3
  );
  return tableLines.length > lines.length * 0.3;
};

const isDiagram = (block: string): boolean => {
  const lines = block.split('\n').filter((l) => l.trim());
  const artLines = lines.filter((l) => isAsciiArtLine(l));
  return artLines.length > lines.length * 0.35;
};

const isStatsBlock = (block: string): boolean => {
  const lines = block.split('\n').filter((l) => l.trim());
  const dataLines = lines.filter((l) => /[\d₹$€%]/.test(l) && !isAsciiArtLine(l));
  return dataLines.length > lines.length * 0.25;
};

const extractBlockTitle = (block: string): string => {
  const lines = block.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    const cleaned = line.replace(/[=\-─_*#]/g, '').trim();
    if (cleaned.length > 3 && !isAsciiArtLine(line) && /[a-zA-Z]/.test(cleaned)) {
      return cleaned;
    }
  }
  return '';
};

const parseTableToSpeech = (block: string): string => {
  const lines = block.split('\n').filter((l) => l.trim());
  const title = extractBlockTitle(block);
  const tableLines = lines.filter(
    (l) =>
      (l.includes('│') || l.includes('|')) &&
      !l.match(/^[─\-│|┼+\s]+$/) &&
      l.split(/[│|]/).filter((c) => c.trim()).length >= 2
  );
  if (tableLines.length < 2) return extractReadableText(block);

  const parseRow = (line: string): string[] =>
    line.split(/[│|]/).map((c) => c.trim()).filter((c) => c && !c.match(/^[-─┼+\s]+$/));

  const headers = parseRow(tableLines[0]);
  const rows = tableLines.slice(1).map(parseRow);
  let speech = title ? `Here's a comparison of ${title}. ` : 'Let me share some data. ';
  const max = Math.min(rows.length, 8);
  for (let i = 0; i < max; i++) {
    const row = rows[i];
    if (row.length >= 2) {
      const label = row[0];
      const vals = row.slice(1);
      if (headers.length > 1) {
        const parts = vals.map((v, j) => {
          const h = headers[j + 1] || '';
          return h ? `${h} is ${v}` : v;
        }).join(', and ');
        speech += `For ${label}, ${parts}. `;
      } else {
        speech += `${label}: ${vals.join(', ')}. `;
      }
    }
  }
  if (rows.length > max) speech += `And ${rows.length - max} more entries. `;
  return speech;
};

const extractReadableText = (block: string): string => {
  const lines = block.split('\n').filter((l) => l.trim());
  const title = extractBlockTitle(block);
  const readable: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.match(/^[=\-─_*+│|┼┌┐└┘├┤┬┴]+$/)) continue;
    if (isAsciiArtLine(t)) continue;
    if (t.length < 4) continue;
    const cleaned = t
      .replace(/^[•●○◦▸▹→►]\s*/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/[█░▒▓▄▀]+\s*/, '')
      .replace(/[│|]/g, ': ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleaned.length > 3 && /[a-zA-Z0-9]/.test(cleaned)) readable.push(cleaned);
  }
  let speech = title ? `${title}. ` : '';
  speech += readable.join('. ') + '. ';
  return speech;
};

// ─────────────────────────────────────
// Content-to-Speech Processor
// ─────────────────────────────────────

function processContentForSpeech(title: string, description: string, md: string): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  chunks.push({ text: `You're listening to: ${title}. ... ${description}. ... Let's get started.`, type: 'intro' });

  const lines = md.split('\n');
  let i = 0;
  let currentText = '';
  let listItems: string[] = [];
  let listIsNumbered = false;
  const headingVariants = [
    "Now, let's talk about", 'Moving on to', 'Next up:', "Let's explore",
    "Now let's look at", "Here's the section on",
  ];
  let hIdx = 0;

  const flushText = () => {
    if (currentText.trim().length > 10) {
      const sentences = currentText.trim().match(/[^.!?]+[.!?]+/g) || [currentText.trim()];
      let group = '';
      for (const s of sentences) {
        if ((group + s).length > 350) {
          if (group.trim()) chunks.push({ text: group.trim(), type: 'text' });
          group = s;
        } else group += ' ' + s;
      }
      if (group.trim()) chunks.push({ text: group.trim(), type: 'text' });
    }
    currentText = '';
  };

  const flushList = () => {
    if (!listItems.length) return;
    const out = listIsNumbered
      ? listItems.map((it, idx) => `Number ${idx + 1}: ${it}`)
      : listItems.length <= 3
        ? listItems.map((it, idx) => idx === 0 ? `First, ${it}` : idx === listItems.length - 1 ? `And finally, ${it}` : `Next, ${it}`)
        : listItems.map((it, idx) => idx === 0 ? `First, ${it}` : idx === listItems.length - 1 ? `And lastly, ${it}` : it);
    chunks.push({ text: out.join('. ') + '.', type: 'text' });
    listItems = [];
    listIsNumbered = false;
  };

  const cleanInline = (s: string) =>
    s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`([^`]+)`/g, '$1');

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith('```')) {
      flushText(); flushList();
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { blockLines.push(lines[i]); i++; }
      i++;
      const block = blockLines.join('\n');
      if (isProgrammingCode(block)) { continue; }
      else if (isDataTable(block)) { chunks.push({ text: parseTableToSpeech(block), type: 'data' }); }
      else if (isDiagram(block)) {
        const t = extractBlockTitle(block);
        if (t) chunks.push({ text: `There's a diagram here illustrating: ${t}. The key details are in the surrounding text.`, type: 'diagram' });
        const r = extractReadableText(block);
        if (r.trim().length > 20) chunks.push({ text: r, type: 'data' });
      } else if (isStatsBlock(block)) { chunks.push({ text: extractReadableText(block), type: 'data' }); }
      else { const r = extractReadableText(block); if (r.trim().length > 20) chunks.push({ text: r, type: 'data' }); }
      continue;
    }

    if (trimmed.match(/^[-*_]{3,}$/)) { flushText(); flushList(); chunks.push({ text: '...', type: 'transition' }); i++; continue; }

    const hm = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      flushText(); flushList();
      const txt = cleanInline(hm[2]);
      if (hm[1].length <= 2) { chunks.push({ text: `... ${headingVariants[hIdx++ % headingVariants.length]} ${txt}.`, type: 'heading' }); }
      else { chunks.push({ text: `${txt}.`, type: 'heading' }); }
      i++; continue;
    }

    const bm = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bm) { flushText(); if (listIsNumbered) flushList(); listIsNumbered = false; listItems.push(cleanInline(bm[1])); i++; continue; }

    const nm = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (nm) { flushText(); if (!listIsNumbered && listItems.length) flushList(); listIsNumbered = true; listItems.push(cleanInline(nm[2])); i++; continue; }

    if (!trimmed) { flushList(); if (currentText.trim()) currentText += ' '; i++; continue; }

    flushList();
    const cleaned = cleanInline(trimmed).replace(/!\[([^\]]*)\]\([^)]+\)/g, '').trim();
    if (cleaned) currentText += (currentText ? ' ' : '') + cleaned;
    i++;
  }

  flushText(); flushList();
  chunks.push({ text: "... And that's the end of this article. Thanks for listening!", type: 'conclusion' });
  return chunks.filter((c) => c.text.replace(/\.\.\./g, '').trim().length > 2);
}

// ─────────────────────────────────────
// Voice Ranking & Prosody
// ─────────────────────────────────────

function rankVoice(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (n.includes('premium')) s += 100;
  if (n.includes('enhanced')) s += 80;
  if (n.includes('natural')) s += 70;
  if (n.includes('samantha') && n.includes('enhanced')) s += 90;
  if (n.includes('karen') && n.includes('premium')) s += 95;
  if (n.includes('daniel') && n.includes('enhanced')) s += 85;
  if (n.includes('zoe') && n.includes('premium')) s += 92;
  if (n.includes('fiona') && n.includes('enhanced')) s += 83;
  if (n.includes('google us english')) s += 60;
  if (n.includes('google uk english')) s += 62;
  if (n.includes('microsoft') && n.includes('online')) s += 65;
  if (n.includes('microsoft')) s += 40;
  if (n.includes('samantha') && !n.includes('enhanced')) s += 30;
  if (v.lang === 'en-US') s += 10;
  if (v.lang === 'en-GB') s += 8;
  return s;
}

function getProsody(type: ChunkType, base: number) {
  switch (type) {
    case 'intro': return { rate: base * 0.92, pitch: 1.08 };
    case 'heading': return { rate: base * 0.88, pitch: 1.12 };
    case 'text': return { rate: base, pitch: 1.0 };
    case 'data': return { rate: base * 0.9, pitch: 0.97 };
    case 'diagram': return { rate: base * 0.93, pitch: 1.02 };
    case 'transition': return { rate: base * 0.7, pitch: 1.0 };
    case 'conclusion': return { rate: base * 0.9, pitch: 1.06 };
    default: return { rate: base, pitch: 1.0 };
  }
}

// ─────────────────────────────────────
// Small visual bits
// ─────────────────────────────────────

function EqBars({ playing, light = false }: { playing: boolean; light?: boolean }) {
  const color = light ? '#fff' : 'var(--accent)';
  if (!playing) return <Headphones className="w-4 h-4" style={{ color }} />;
  return (
    <div className="flex items-end gap-[3px] h-4" aria-hidden="true">
      <span className="w-[3px] rounded-full animate-[eq-bounce_0.9s_ease-in-out_infinite]" style={{ background: color, height: '60%' }} />
      <span className="w-[3px] rounded-full animate-[eq-bounce_0.9s_ease-in-out_0.25s_infinite]" style={{ background: color, height: '100%' }} />
      <span className="w-[3px] rounded-full animate-[eq-bounce_0.9s_ease-in-out_0.5s_infinite]" style={{ background: color, height: '45%' }} />
      <span className="w-[3px] rounded-full animate-[eq-bounce_0.9s_ease-in-out_0.15s_infinite]" style={{ background: color, height: '80%' }} />
    </div>
  );
}

function CoverArt({ playing, size = 'lg' }: { playing: boolean; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-full aspect-square max-w-[220px]' : 'w-10 h-10';
  return (
    <div
      className={`${dim} rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #b45309 80%)' }}
    >
      <Headphones className={size === 'lg' ? 'w-16 h-16 text-white/85' : 'w-5 h-5 text-white/85'} />
      {playing && (
        <div className={`absolute ${size === 'lg' ? 'bottom-3 left-3' : 'bottom-1 left-1'}`}>
          <EqBars playing light />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

export function BlogReader({ title, content, description, author, audioUrl, audioDuration, captionsUrl, slug, upNext, autoPlay }: BlogReaderProps) {
  const hasFile = Boolean(audioUrl);
  // ── State ──
  const [isActive, setIsActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [ambientOn, setAmbientOn] = useState(true);
  const [ambientVol, setAmbientVol] = useState(30); // 0–100 → 0–0.09 gain
  const [fileDur, setFileDur] = useState(audioDuration || 0);
  const [mounted, setMounted] = useState(false);
  const [preset, setPreset] = useState<AmbientPreset>(() => presetForSlug(slug || title));
  const [ended, setEnded] = useState(false);

  useEffect(() => setMounted(true), []);

  // ── Restore saved preferences (soundtrack, ambience, speed) ──
  useEffect(() => {
    try {
      const sp = localStorage.getItem('reader:preset');
      if (sp) setPreset(getPreset(sp));
      const av = localStorage.getItem('reader:ambvol');
      if (av !== null) setAmbientVol(Number(av));
      const ao = localStorage.getItem('reader:ambient');
      if (ao !== null) { setAmbientOn(ao === '1'); ambientOnRef.current = ao === '1'; }
      const sv = localStorage.getItem('reader:speed');
      if (sv) { const n = Number(sv); setSpeed(n); speedRef.current = n; }
    } catch { /* private mode */ }
  }, []);

  // Keep page content clear of the fixed mini bar (replaces an in-article
  // spacer that sat in the wrong place).
  useEffect(() => {
    if (isActive) {
      document.body.style.paddingBottom = '84px';
      return () => { document.body.style.paddingBottom = ''; };
    }
  }, [isActive]);

  // ── Refs ──
  const chunksRef = useRef<SpeechChunk[]>([]);
  const chunkRef = useRef(0);
  const speedRef = useRef(1);
  const mutedRef = useRef(false);
  const voiceRef = useRef('');
  const playingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ambientRef = useRef<AmbientEngine | null>(null);
  const ambientOnRef = useRef(true);
  const presetRef = useRef<AmbientPreset>(preset);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const cuesRef = useRef<SubtitleCue[] | null>(null);
  const cueIdxRef = useRef(0);

  useEffect(() => { presetRef.current = preset; }, [preset]);

  const ambientGain = (v: number) => (v / 100) * 0.09;

  const totalDuration = useCallback(() => {
    const words = chunksRef.current.reduce((s, c) => s + c.text.split(/\s+/).length, 0);
    return Math.ceil((words / 155) * 60);
  }, []);

  // ── Load voices ──
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { setIsSupported(false); return; }
    const load = () => {
      const eng = window.speechSynthesis.getVoices()
        .filter((v) => v.lang.startsWith('en'))
        .sort((a, b) => rankVoice(b) - rankVoice(a));
      setVoices(eng);
      if (eng.length > 0 && !voiceRef.current) {
        setSelectedVoice(eng[0].name);
        voiceRef.current = eng[0].name;
      }
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  // ── Build chunks ──
  useEffect(() => {
    chunksRef.current = processContentForSpeech(title, description, content);
  }, [title, description, content]);

  // ── Cleanup ──
  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
    ambientRef.current?.stop();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
      audioElRef.current = null;
    }
  }, []);

  // ── Timer (synth mode only — file mode gets time from `timeupdate`) ──
  useEffect(() => {
    if (isPlaying && !isPaused && !hasFile) {
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, isPaused, hasFile]);

  // ── Speech engine ──
  const speak = useCallback((idx: number) => {
    if (idx >= chunksRef.current.length) {
      setIsPlaying(false); setIsPaused(false); setProgress(100);
      playingRef.current = false; setElapsed(0); setCurrentChunk(0);
      chunkRef.current = 0; setCurrentText('');
      ambientRef.current?.stop(); ambientRef.current = null;
      return;
    }
    const synth = window.speechSynthesis;
    const chunk = chunksRef.current[idx];
    const { rate, pitch } = getProsody(chunk.type, speedRef.current);
    setCurrentText(chunk.text);

    const u = new SpeechSynthesisUtterance(chunk.text);
    u.rate = Math.max(0.1, Math.min(10, rate));
    u.pitch = Math.max(0, Math.min(2, pitch));
    u.volume = mutedRef.current ? 0 : 1;
    u.lang = 'en-US';
    const v = synth.getVoices().find((x) => x.name === voiceRef.current);
    if (v) u.voice = v;

    u.onend = () => {
      if (!playingRef.current) return;
      const next = chunkRef.current + 1;
      chunkRef.current = next; setCurrentChunk(next);
      setProgress(Math.round((next / chunksRef.current.length) * 100));
      speak(next);
    };
    u.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      if (playingRef.current) { const n = chunkRef.current + 1; chunkRef.current = n; setCurrentChunk(n); speak(n); }
    };
    synth.speak(u);
  }, []);

  // ── Ambient helpers ──
  const startAmbient = useCallback(() => {
    if (!ambientOnRef.current) return;
    if (!ambientRef.current) ambientRef.current = new AmbientEngine(presetRef.current);
    ambientRef.current.start(ambientGain(ambientVol));
  }, [ambientVol]);

  // Switch the background soundtrack live (crossfades if playing).
  const changePreset = useCallback((p: AmbientPreset) => {
    setPreset(p);
    presetRef.current = p;
    try { localStorage.setItem('reader:preset', p.id); } catch { /* */ }
    if (ambientRef.current && ambientOnRef.current) ambientRef.current.switchPreset(p);
  }, []);

  // ── Media Session (lock screen / keyboard media keys) ──
  const setupMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: author || 'Tushar Agrawal',
      album: 'tusharagrawal.in — Blog',
    });
  }, [title, author]);

  // ── Audio-file engine ──
  const ensureAudioEl = useCallback((): HTMLAudioElement | null => {
    if (!audioUrl) return null;
    if (audioElRef.current) return audioElRef.current;
    const a = new Audio(audioUrl);
    a.preload = 'metadata';
    a.playbackRate = speedRef.current;
    a.muted = mutedRef.current;
    a.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(a.duration)) setFileDur(Math.round(a.duration));
    });
    // Synced subtitles from the SRT generated alongside the narration
    if (captionsUrl && !cuesRef.current) {
      fetch(captionsUrl)
        .then((r) => (r.ok ? r.text() : Promise.reject()))
        .then((srt) => { cuesRef.current = parseSrt(srt); })
        .catch(() => { cuesRef.current = []; });
    }
    a.addEventListener('timeupdate', () => {
      const t = a.currentTime;
      setElapsed(Math.floor(t));
      if (a.duration) setProgress((t / a.duration) * 100);
      const cues = cuesRef.current;
      if (cues && cues.length) {
        // start from the cached index; rewind if user seeked backwards
        let i = cueIdxRef.current;
        if (i >= cues.length || cues[i].start > t) i = 0;
        while (i < cues.length - 1 && cues[i].end < t) i++;
        cueIdxRef.current = i;
        const cue = cues[i];
        setCurrentText(cue.start <= t && t <= cue.end + 0.3 ? cue.text : '');
      }
    });
    a.addEventListener('ended', () => {
      ambientRef.current?.stop(); ambientRef.current = null;
      setIsPlaying(false); setIsPaused(false); playingRef.current = false;
      setProgress(100); setElapsed(0); setCurrentText('');
      setEnded(true); // surfaces the "Up next" card
      a.currentTime = 0;
    });
    audioElRef.current = a;
    return a;
  }, [audioUrl, captionsUrl]);

  // ── Controls (branch: real audio file vs speech synthesis) ──
  const play = useCallback(() => {
    setEnded(false);
    if (hasFile) {
      const a = ensureAudioEl();
      if (!a) return;
      a.play().catch(() => {});
      if (ambientRef.current) {
        ambientRef.current.resume();
      } else {
        startAmbient();
      }
      setIsActive(true); setIsPlaying(true); setIsPaused(false); playingRef.current = true;
      setupMediaSession();
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (isPaused) {
      synth.resume();
      ambientRef.current?.resume();
      setIsPaused(false);
      return;
    }
    synth.cancel();
    setIsPlaying(true); setIsPaused(false); playingRef.current = true; setElapsed(0);
    setIsActive(true);
    startAmbient();
    setupMediaSession();
    speak(chunkRef.current);
  }, [hasFile, ensureAudioEl, isPaused, speak, startAmbient, setupMediaSession]);

  const pause = useCallback(() => {
    if (hasFile) {
      audioElRef.current?.pause();
    } else {
      window.speechSynthesis?.pause();
    }
    ambientRef.current?.suspend();
    setIsPaused(true);
  }, [hasFile]);

  const stop = useCallback(() => {
    if (hasFile && audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
    ambientRef.current?.stop(); ambientRef.current = null;
    setIsPlaying(false); setIsPaused(false); playingRef.current = false;
    setProgress(0); setCurrentChunk(0); chunkRef.current = 0;
    setElapsed(0); setCurrentText(''); setIsActive(false); setIsExpanded(false);
  }, [hasFile]);

  const skipFwd = useCallback(() => {
    if (hasFile && audioElRef.current) {
      const a = audioElRef.current;
      a.currentTime = Math.min(a.currentTime + 15, a.duration || a.currentTime + 15);
      return;
    }
    const n = Math.min(chunkRef.current + 3, chunksRef.current.length - 1);
    window.speechSynthesis?.cancel(); chunkRef.current = n; setCurrentChunk(n);
    setProgress(Math.round((n / chunksRef.current.length) * 100));
    if (playingRef.current) speak(n);
  }, [hasFile, speak]);

  const skipBack = useCallback(() => {
    if (hasFile && audioElRef.current) {
      const a = audioElRef.current;
      a.currentTime = Math.max(a.currentTime - 15, 0);
      return;
    }
    const n = Math.max(chunkRef.current - 3, 0);
    window.speechSynthesis?.cancel(); chunkRef.current = n; setCurrentChunk(n);
    setProgress(Math.round((n / chunksRef.current.length) * 100));
    if (playingRef.current) speak(n);
  }, [hasFile, speak]);

  // Media key handlers (Spotify-style hardware/lock-screen control)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !isActive) return;
    try {
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', skipBack);
      navigator.mediaSession.setActionHandler('nexttrack', skipFwd);
    } catch { /* handlers unsupported */ }
    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      } catch { /* noop */ }
    };
  }, [isActive, play, pause, skipBack, skipFwd]);

  const setSpeedVal = useCallback((v: number) => {
    const c = Math.max(0.25, Math.min(3, v));
    setSpeed(c); speedRef.current = c;
    try { localStorage.setItem('reader:speed', String(c)); } catch { /* */ }
    if (hasFile) {
      if (audioElRef.current) audioElRef.current.playbackRate = c;
      return;
    }
    if (playingRef.current) { window.speechSynthesis?.cancel(); speak(chunkRef.current); }
  }, [hasFile, speak]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current; setIsMuted(mutedRef.current);
    if (hasFile) {
      if (audioElRef.current) audioElRef.current.muted = mutedRef.current;
      return;
    }
    if (playingRef.current) { window.speechSynthesis?.cancel(); speak(chunkRef.current); }
  }, [hasFile, speak]);

  const toggleAmbient = useCallback(() => {
    const next = !ambientOnRef.current;
    ambientOnRef.current = next;
    setAmbientOn(next);
    try { localStorage.setItem('reader:ambient', next ? '1' : '0'); } catch { /* */ }
    if (next) {
      if (playingRef.current) startAmbient();
    } else {
      ambientRef.current?.stop();
      ambientRef.current = null;
    }
  }, [startAmbient]);

  const changeAmbientVol = useCallback((v: number) => {
    setAmbientVol(v);
    try { localStorage.setItem('reader:ambvol', String(v)); } catch { /* */ }
    ambientRef.current?.setVolume(ambientGain(v));
  }, []);

  const changeVoice = useCallback((name: string) => {
    setSelectedVoice(name); voiceRef.current = name;
    if (playingRef.current) { window.speechSynthesis?.cancel(); speak(chunkRef.current); }
  }, [speak]);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (hasFile) {
      const a = ensureAudioEl();
      if (a && Number.isFinite(a.duration) && a.duration > 0) {
        a.currentTime = ratio * a.duration;
        setProgress(ratio * 100);
      }
      return;
    }
    const t = Math.max(0, Math.min(Math.floor(ratio * chunksRef.current.length), chunksRef.current.length - 1));
    window.speechSynthesis?.cancel(); chunkRef.current = t; setCurrentChunk(t);
    setProgress(Math.round((t / chunksRef.current.length) * 100));
    if (playingRef.current) speak(t);
  }, [hasFile, ensureAudioEl, speak]);

  // ── Keyboard shortcuts (space, ←/→, ↑/↓ ambience) while a player is open ──
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); (isPlaying && !isPaused) ? pause() : play(); break;
        case 'ArrowRight': case 'l': e.preventDefault(); skipFwd(); break;
        case 'ArrowLeft': case 'j': e.preventDefault(); skipBack(); break;
        case 'ArrowUp': e.preventDefault(); changeAmbientVol(Math.min(100, ambientVol + 10)); break;
        case 'ArrowDown': e.preventDefault(); changeAmbientVol(Math.max(0, ambientVol - 10)); break;
        case 'm': toggleMute(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, isPlaying, isPaused, play, pause, skipFwd, skipBack, toggleMute, changeAmbientVol, ambientVol]);

  // ── Auto-start when arriving via "Up next" (?play=1) ──
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoPlay && hasFile && mounted && !autoStartedRef.current) {
      autoStartedRef.current = true;
      const t = setTimeout(() => play(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPlay, hasFile, mounted, play]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const dur = hasFile ? (fileDur || audioDuration || 0) : totalDuration();
  const adjDur = Math.ceil(dur / speed);
  const speedPresets = [0.75, 1, 1.25, 1.5, 2];
  const playingNow = isPlaying && !isPaused;
  const next = upNext && upNext.length ? upNext[0] : null;

  // With a pre-generated file the player works even without speechSynthesis.
  if (!isSupported && !hasFile) return null;

  const surface = { background: 'var(--surface)', border: '1px solid var(--border)' } as const;

  // ════════════════════════════════════
  // RENDER
  // ════════════════════════════════════

  return (
    <>
      {/* ── Inline trigger button ── */}
      <button
        onClick={() => { setIsActive(true); setIsExpanded(false); play(); }}
        className="group flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-300"
        style={{
          background: isActive ? 'var(--accent-subtle, rgba(224,165,38,0.12))' : 'var(--surface)',
          border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
          color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)' }}>
          <EqBars playing={isActive && playingNow} />
        </span>
        <span className="text-sm font-medium">
          {isActive ? (playingNow ? 'Playing' : 'Paused') : 'Listen to this article'}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.ceil(dur / 60)} min</span>
      </button>

      {/* ── Bottom player — portaled to <body>: ancestors with transforms
            (e.g. the article's entrance animation) would otherwise hijack
            position:fixed and pin the bar inside the article. ── */}
      {isActive && mounted && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-50" style={{ pointerEvents: 'none' }}>
          {isExpanded && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              style={{ pointerEvents: 'auto' }}
              onClick={() => setIsExpanded(false)}
            />
          )}

          <div
            className={`relative transition-all duration-300 ease-out ${isExpanded ? 'max-w-md mx-auto mb-4 px-4' : ''}`}
            style={{ pointerEvents: 'auto' }}
          >
            {/* ── EXPANDED: Spotify-style "now playing" card ── */}
            {isExpanded && (
              <div className="rounded-2xl shadow-2xl shadow-black/50 overflow-hidden" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-1">
                  <p className="clay-eyebrow">Now playing</p>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 rounded-full transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label="Collapse player"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Cover art */}
                <div className="flex justify-center px-5 pt-2 pb-4">
                  <CoverArt playing={playingNow} />
                </div>

                {/* Title / author */}
                <div className="px-5 text-center">
                  <h3 className="text-base font-semibold text-theme line-clamp-2">{title}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {author || 'Tushar Agrawal'} · {Math.ceil(dur / 60)} min listen{hasFile ? ' · HD voice' : ''}
                  </p>
                </div>

                {/* Synced subtitles — fixed height so the card never jumps */}
                <div className="px-5 pt-3 min-h-[3.5rem] flex items-center justify-center">
                  {currentText ? (
                    <p
                      key={currentText}
                      className="subtitle-line text-sm text-center leading-relaxed line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {currentText.replace(/\.\.\./g, '').trim()}
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {playingNow ? '…' : 'Press play to listen'}
                    </p>
                  )}
                </div>

                {/* Progress */}
                <div className="px-5 pt-3">
                  <div className="relative h-1.5 rounded-full cursor-pointer group/bar" style={{ background: 'var(--border)' }} onClick={seekTo}>
                    <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity"
                      style={{ left: `${progress}%`, marginLeft: '-6px', background: 'var(--text-primary)' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] mt-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                    <span>{fmt(elapsed)}</span>
                    <span>{hasFile ? 'HD narration' : `${currentChunk + 1}/${chunksRef.current.length}`}</span>
                    <span>{fmt(adjDur)}</span>
                  </div>
                </div>

                {/* Transport */}
                <div className="flex items-center justify-center gap-7 py-4">
                  <button onClick={skipBack} className="p-2 transition-colors active:scale-90 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} aria-label="Back">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={playingNow ? pause : play}
                    className="w-14 h-14 flex items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg"
                    style={{ background: 'var(--accent)' }}
                    aria-label={playingNow ? 'Pause' : 'Play'}
                  >
                    {playingNow
                      ? <Pause className="w-6 h-6" style={{ color: 'var(--background)' }} />
                      : <Play className="w-6 h-6 ml-0.5" style={{ color: 'var(--background)' }} />}
                  </button>
                  <button onClick={skipFwd} className="p-2 transition-colors active:scale-90 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} aria-label="Forward">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Up next — continuous listening */}
                {ended && next && (
                  <div className="px-5 pb-3">
                    <a
                      href={`/blog/${next.slug}?play=1`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:opacity-90"
                      style={{ background: 'var(--accent)', color: 'var(--background)' }}
                    >
                      <Play className="w-4 h-4 flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider opacity-80">Up next</span>
                        <span className="block text-sm font-medium truncate">{next.title}</span>
                      </span>
                    </a>
                  </div>
                )}

                {/* Speed pills */}
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-1 rounded-xl p-1.5" style={surface}>
                    {speedPresets.map((p) => (
                      <button
                        key={p}
                        onClick={() => setSpeedVal(p)}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                        style={speed === p
                          ? { background: 'var(--accent)', color: 'var(--background)' }
                          : { color: 'var(--text-secondary)' }}
                      >
                        {p}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ambience */}
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={surface}>
                    <button
                      onClick={toggleAmbient}
                      className="flex items-center gap-2 text-xs font-medium transition-colors"
                      style={{ color: ambientOn ? 'var(--accent)' : 'var(--text-muted)' }}
                      aria-pressed={ambientOn}
                    >
                      <Music className="w-4 h-4" />
                      Ambience
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={ambientVol}
                      onChange={(e) => changeAmbientVol(Number(e.target.value))}
                      disabled={!ambientOn}
                      className="flex-1 h-1 accent-[var(--accent)] disabled:opacity-30"
                      aria-label="Ambience volume"
                    />
                  </div>
                </div>

                {/* Soundtrack picker — different generative moods, Spotify-style */}
                <div className="px-5 pb-3">
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Soundtrack
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    {AMBIENT_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { if (!ambientOn) toggleAmbient(); changePreset(p); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all flex-shrink-0"
                        style={preset.id === p.id && ambientOn
                          ? { background: 'var(--accent)', color: 'var(--background)', fontWeight: 600 }
                          : { ...surface, color: 'var(--text-secondary)' }}
                        aria-pressed={preset.id === p.id}
                      >
                        <span aria-hidden="true">{p.emoji}</span>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice / mute / stop */}
                <div className="px-5 pb-5 flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-lg transition-colors"
                    style={isMuted ? { color: '#f87171', background: 'rgba(248,113,113,0.1)' } : { color: 'var(--text-muted)' }}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  {hasFile ? (
                    <span className="flex-1 text-xs rounded-lg px-3 py-2 truncate" style={{ ...surface, color: 'var(--text-secondary)' }}>
                      Studio neural voice
                    </span>
                  ) : voices.length > 1 && (
                    <select
                      value={selectedVoice}
                      onChange={(e) => changeVoice(e.target.value)}
                      className="flex-1 text-xs rounded-lg px-3 py-2 focus:outline-none truncate appearance-none"
                      style={{ ...surface, color: 'var(--text-secondary)' }}
                      aria-label="Narration voice"
                    >
                      {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                  )}
                  <button
                    onClick={stop}
                    className="p-2 rounded-lg transition-colors hover:text-red-400"
                    style={{ color: 'var(--text-muted)' }}
                    title="Stop"
                    aria-label="Stop"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── MINI PLAYER BAR ── */}
            {!isExpanded && (
              <div
                className="backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
                style={{ background: 'color-mix(in srgb, var(--background) 92%, transparent)', borderTop: '1px solid var(--border)' }}
              >
                <div className="h-0.5" style={{ background: 'var(--border)' }}>
                  <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
                </div>

                <div className="flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5">
                  <CoverArt playing={playingNow} size="sm" />

                  <button
                    onClick={playingNow ? pause : play}
                    className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 hover:scale-105 active:scale-95 transition-transform"
                    style={{ background: 'var(--accent)' }}
                    aria-label={playingNow ? 'Pause' : 'Play'}
                  >
                    {playingNow
                      ? <Pause className="w-4 h-4" style={{ color: 'var(--background)' }} />
                      : <Play className="w-4 h-4 ml-0.5" style={{ color: 'var(--background)' }} />}
                  </button>

                  <div className="flex-1 min-w-0 mx-1">
                    <p className="text-xs font-medium text-theme truncate">{title}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {playingNow && currentText
                        ? currentText.replace(/\.\.\./g, '').trim()
                        : `${fmt(elapsed)} / ${fmt(adjDur)} · ${speed}x${ambientOn ? ' · ♪' : ''}`}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-1">
                    <button onClick={skipBack} className="p-1.5 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }} aria-label="Back">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button onClick={skipFwd} className="p-1.5 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }} aria-label="Forward">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const idx = speedPresets.indexOf(speed);
                      setSpeedVal(speedPresets[(idx + 1) % speedPresets.length]);
                    }}
                    className="px-2 py-1 text-[10px] font-bold rounded-md transition-colors flex-shrink-0"
                    style={surface}
                  >
                    {speed}x
                  </button>

                  <button onClick={() => setIsExpanded(true)} className="p-1.5 hover:opacity-80 transition-opacity flex-shrink-0" style={{ color: 'var(--text-muted)' }} aria-label="Expand player">
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <button onClick={stop} className="p-1.5 hover:text-red-400 transition-colors flex-shrink-0" style={{ color: 'var(--text-muted)' }} aria-label="Close player">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-[env(safe-area-inset-bottom,0px)]" />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
