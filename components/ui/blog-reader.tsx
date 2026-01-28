'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Headphones,
  Volume2,
  VolumeX,
  Minus,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────

interface BlogReaderProps {
  title: string;
  content: string;
  description: string;
  author?: string;
}

type ChunkType = 'intro' | 'heading' | 'text' | 'data' | 'diagram' | 'transition' | 'conclusion';

interface SpeechChunk {
  text: string;
  type: ChunkType;
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

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

export function BlogReader({ title, content, description, author }: BlogReaderProps) {
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

  // ── Refs ──
  const chunksRef = useRef<SpeechChunk[]>([]);
  const chunkRef = useRef(0);
  const speedRef = useRef(1);
  const mutedRef = useRef(false);
  const voiceRef = useRef('');
  const playingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, []);

  // ── Timer ──
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, isPaused]);

  // ── Speech engine ──
  const speak = useCallback((idx: number) => {
    if (idx >= chunksRef.current.length) {
      setIsPlaying(false); setIsPaused(false); setProgress(100);
      playingRef.current = false; setElapsed(0); setCurrentChunk(0);
      chunkRef.current = 0; setCurrentText(''); return;
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

  // ── Controls ──
  const play = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (isPaused) { synth.resume(); setIsPaused(false); return; }
    synth.cancel();
    setIsPlaying(true); setIsPaused(false); playingRef.current = true; setElapsed(0);
    setIsActive(true);
    speak(chunkRef.current);
  }, [isPaused, speak]);

  const pause = useCallback(() => { window.speechSynthesis?.pause(); setIsPaused(true); }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false); setIsPaused(false); playingRef.current = false;
    setProgress(0); setCurrentChunk(0); chunkRef.current = 0;
    setElapsed(0); setCurrentText(''); setIsActive(false); setIsExpanded(false);
  }, []);

  const skipFwd = useCallback(() => {
    const n = Math.min(chunkRef.current + 3, chunksRef.current.length - 1);
    window.speechSynthesis?.cancel(); chunkRef.current = n; setCurrentChunk(n);
    setProgress(Math.round((n / chunksRef.current.length) * 100));
    if (playingRef.current) speak(n);
  }, [speak]);

  const skipBack = useCallback(() => {
    const n = Math.max(chunkRef.current - 3, 0);
    window.speechSynthesis?.cancel(); chunkRef.current = n; setCurrentChunk(n);
    setProgress(Math.round((n / chunksRef.current.length) * 100));
    if (playingRef.current) speak(n);
  }, [speak]);

  const setSpeedVal = useCallback((v: number) => {
    const c = Math.max(0.25, Math.min(3, v));
    setSpeed(c); speedRef.current = c;
    if (playingRef.current) { window.speechSynthesis?.cancel(); speak(chunkRef.current); }
  }, [speak]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current; setIsMuted(mutedRef.current);
    if (playingRef.current) { window.speechSynthesis?.cancel(); speak(chunkRef.current); }
  }, [speak]);

  const changeVoice = useCallback((name: string) => {
    setSelectedVoice(name); voiceRef.current = name;
    if (playingRef.current) { window.speechSynthesis?.cancel(); speak(chunkRef.current); }
  }, [speak]);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = Math.max(0, Math.min(Math.floor(ratio * chunksRef.current.length), chunksRef.current.length - 1));
    window.speechSynthesis?.cancel(); chunkRef.current = t; setCurrentChunk(t);
    setProgress(Math.round((t / chunksRef.current.length) * 100));
    if (playingRef.current) speak(t);
  }, [speak]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const dur = totalDuration();
  const adjDur = Math.ceil(dur / speed);
  const presets = [0.5, 0.75, 1, 1.25, 1.5, 2];

  if (!isSupported) return null;

  // ════════════════════════════════════
  // RENDER
  // ════════════════════════════════════

  return (
    <>
      {/* ── Inline trigger button ── */}
      <button
        onClick={() => { setIsActive(true); setIsExpanded(false); play(); }}
        className={`group flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-300 border ${
          isActive
            ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
            : 'bg-neutral-900/60 border-neutral-700/50 hover:border-blue-500/40 hover:bg-blue-500/5 text-gray-300 hover:text-white'
        }`}
      >
        <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
          isActive ? 'bg-blue-500/20' : 'bg-neutral-800 group-hover:bg-blue-500/20'
        }`}>
          {isActive && isPlaying && !isPaused ? (
            <div className="flex items-center gap-0.5">
              <span className="w-0.5 h-3 bg-blue-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
              <span className="w-0.5 h-4 bg-blue-400 rounded-full animate-[pulse_0.8s_ease-in-out_0.2s_infinite]" />
              <span className="w-0.5 h-2.5 bg-blue-400 rounded-full animate-[pulse_0.8s_ease-in-out_0.4s_infinite]" />
            </div>
          ) : (
            <Headphones className="w-4 h-4" />
          )}
        </div>
        <span className="text-sm font-medium">
          {isActive ? (isPlaying ? (isPaused ? 'Paused' : 'Playing') : 'Listen') : 'Listen'}
        </span>
        <span className="text-xs text-gray-500">{Math.ceil(dur / 60)} min</span>
      </button>

      {/* ── Bottom player (portal-style fixed) ── */}
      {isActive && (
        <div className="fixed inset-x-0 bottom-0 z-50" style={{ pointerEvents: 'none' }}>
          {/* Backdrop for expanded panel */}
          {isExpanded && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              style={{ pointerEvents: 'auto' }}
              onClick={() => setIsExpanded(false)}
            />
          )}

          <div
            className={`relative transition-all duration-300 ease-out ${
              isExpanded ? 'max-w-lg mx-auto mb-4 px-4' : ''
            }`}
            style={{ pointerEvents: 'auto' }}
          >
            {/* ── EXPANDED PANEL ── */}
            {isExpanded && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {author ? `${author} · ` : ''}{Math.ceil(dur / 60)} min listen
                    </p>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 text-gray-500 hover:text-white hover:bg-neutral-800 rounded-full transition-colors flex-shrink-0"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Live text */}
                {currentText && (
                  <div className="px-5 pb-3">
                    <p className="text-xs text-gray-500 italic line-clamp-2 leading-relaxed">
                      &ldquo;{currentText.replace(/\.\.\./g, '').trim().slice(0, 120)}
                      {currentText.length > 120 ? '...' : ''}&rdquo;
                    </p>
                  </div>
                )}

                {/* Progress */}
                <div className="px-5">
                  <div
                    className="relative h-1.5 bg-neutral-800 rounded-full cursor-pointer group/bar"
                    onClick={seekTo}
                  >
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity"
                      style={{ left: `${progress}%`, marginLeft: '-6px' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1.5 font-mono">
                    <span>{fmt(elapsed)}</span>
                    <span>{currentChunk + 1}/{chunksRef.current.length}</span>
                    <span>{fmt(adjDur)}</span>
                  </div>
                </div>

                {/* Main controls */}
                <div className="flex items-center justify-center gap-6 py-5">
                  <button onClick={skipBack} className="p-2 text-gray-400 hover:text-white transition-colors active:scale-90">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  {!isPlaying || isPaused ? (
                    <button onClick={play} className="w-14 h-14 flex items-center justify-center bg-white rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg">
                      <Play className="w-6 h-6 text-black ml-0.5" />
                    </button>
                  ) : (
                    <button onClick={pause} className="w-14 h-14 flex items-center justify-center bg-white rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg">
                      <Pause className="w-6 h-6 text-black" />
                    </button>
                  )}
                  <button onClick={skipFwd} className="p-2 text-gray-400 hover:text-white transition-colors active:scale-90">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Speed */}
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-2 bg-neutral-900 rounded-xl p-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold w-10">Speed</span>
                    <div className="flex items-center gap-1 flex-1">
                      <button onClick={() => setSpeedVal(Math.round((speed - 0.25) * 100) / 100)} className="p-1 text-gray-500 hover:text-white rounded transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      {presets.map((p) => (
                        <button
                          key={p}
                          onClick={() => setSpeedVal(p)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            speed === p
                              ? 'bg-white text-black shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-neutral-800'
                          }`}
                        >
                          {p}x
                        </button>
                      ))}
                      <button onClick={() => setSpeedVal(Math.round((speed + 0.25) * 100) / 100)} className="p-1 text-gray-500 hover:text-white rounded transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Voice & Volume */}
                <div className="px-5 pb-5 flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                      isMuted ? 'text-red-400 bg-red-500/10' : 'text-gray-500 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  {voices.length > 1 && (
                    <select
                      value={selectedVoice}
                      onChange={(e) => changeVoice(e.target.value)}
                      className="flex-1 bg-neutral-900 border border-neutral-800 text-gray-400 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-700 truncate appearance-none"
                    >
                      {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                  )}
                  <button onClick={stop} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0" title="Stop">
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── MINI PLAYER BAR ── */}
            {!isExpanded && (
              <div className="bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
                {/* Thin progress line */}
                <div className="h-0.5 bg-neutral-800">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
                  {/* Play/Pause */}
                  {!isPlaying || isPaused ? (
                    <button onClick={play} className="w-9 h-9 flex items-center justify-center bg-white rounded-full flex-shrink-0 hover:scale-105 active:scale-95 transition-transform">
                      <Play className="w-4 h-4 text-black ml-0.5" />
                    </button>
                  ) : (
                    <button onClick={pause} className="w-9 h-9 flex items-center justify-center bg-white rounded-full flex-shrink-0 hover:scale-105 active:scale-95 transition-transform">
                      <Pause className="w-4 h-4 text-black" />
                    </button>
                  )}

                  {/* Title & progress text */}
                  <div className="flex-1 min-w-0 mx-1 sm:mx-2">
                    <p className="text-xs font-medium text-white truncate">{title}</p>
                    <p className="text-[10px] text-gray-500">
                      {fmt(elapsed)} / {fmt(adjDur)} · {speed}x
                    </p>
                  </div>

                  {/* Skip buttons - hidden on very small screens */}
                  <div className="hidden sm:flex items-center gap-1">
                    <button onClick={skipBack} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button onClick={skipFwd} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Speed badge */}
                  <button
                    onClick={() => {
                      const idx = presets.indexOf(speed);
                      setSpeedVal(presets[(idx + 1) % presets.length]);
                    }}
                    className="px-2 py-1 text-[10px] font-bold text-gray-400 bg-neutral-800 rounded-md hover:text-white hover:bg-neutral-700 transition-colors flex-shrink-0"
                  >
                    {speed}x
                  </button>

                  {/* Expand */}
                  <button onClick={() => setIsExpanded(true)} className="p-1.5 text-gray-500 hover:text-white transition-colors flex-shrink-0">
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  {/* Close */}
                  <button onClick={stop} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* iPhone safe area */}
                <div className="h-[env(safe-area-inset-bottom,0px)]" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spacer to prevent content from hiding behind mini player */}
      {isActive && !isExpanded && <div className="h-16" />}
    </>
  );
}
