'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Headphones,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────

interface BlogReaderProps {
  title: string;
  author?: string;
  /** Pre-generated studio neural narration MP3. The player renders nothing
   *  without it — there is no browser speech-synthesis fallback. */
  audioUrl?: string;
  audioDuration?: number;
  /** SRT file with sentence-level cues, displayed as synced subtitles. */
  captionsUrl?: string;
  /** Other narrated posts, for "Up next" continuous listening. */
  upNext?: { slug: string; title: string }[];
  /** Auto-start playback on mount (set when arriving via ?play=1). */
  autoPlay?: boolean;
}

// ─────────────────────────────────────
// SRT subtitle parsing
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
  const dim = size === 'lg' ? 'w-32 h-32 sm:w-40 sm:h-40' : 'w-10 h-10';
  return (
    <div
      className={`${dim} rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0`}
      style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #b45309 80%)' }}
    >
      <Headphones className={size === 'lg' ? 'w-12 h-12 text-white/85' : 'w-5 h-5 text-white/85'} />
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

export function BlogReader({ title, author, audioUrl, audioDuration, captionsUrl, upNext, autoPlay }: BlogReaderProps) {
  // ── State ──
  const [isActive, setIsActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [fileDur, setFileDur] = useState(audioDuration || 0);
  const [mounted, setMounted] = useState(false);
  const [ended, setEnded] = useState(false);

  // ── Refs ──
  const speedRef = useRef(1);
  const playingRef = useRef(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const cuesRef = useRef<SubtitleCue[] | null>(null);
  const cueIdxRef = useRef(0);

  // Portal target exists only client-side; localStorage can't seed useState
  // without an SSR hydration mismatch — both must wait for mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const sv = localStorage.getItem('reader:speed');
      if (sv) {
        const n = Number(sv);
         
        setSpeed(n);
        speedRef.current = n;
      }
    } catch { /* private mode */ }
  }, []);

  // Keep page content clear of the fixed mini bar.
  useEffect(() => {
    if (isActive) {
      document.body.style.paddingBottom = '84px';
      return () => { document.body.style.paddingBottom = ''; };
    }
  }, [isActive]);

  // Lock page scroll behind the expanded sheet so it scrolls internally.
  useEffect(() => {
    if (isExpanded) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isExpanded]);

  // ── Cleanup ──
  useEffect(() => () => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
      audioElRef.current = null;
    }
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

  // ── Audio engine ──
  const ensureAudioEl = useCallback((): HTMLAudioElement | null => {
    if (!audioUrl) return null;
    if (audioElRef.current) return audioElRef.current;
    const a = new Audio(audioUrl);
    a.preload = 'metadata';
    a.playbackRate = speedRef.current;
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
        // Keep the nearest sentence on screen (no flicker to blank in the
        // small gaps between cues).
        setCurrentText(cues[i].text);
      }
    });
    a.addEventListener('ended', () => {
      setIsPlaying(false); setIsPaused(false); playingRef.current = false;
      setProgress(100); setElapsed(0); setCurrentText('');
      setEnded(true); // surfaces the "Up next" card
      a.currentTime = 0;
    });
    audioElRef.current = a;
    return a;
  }, [audioUrl, captionsUrl]);

  // ── Controls ──
  const play = useCallback(() => {
    setEnded(false);
    const a = ensureAudioEl();
    if (!a) return;
    a.play().catch(() => {});
    setIsActive(true); setIsPlaying(true); setIsPaused(false); playingRef.current = true;
    setupMediaSession();
  }, [ensureAudioEl, setupMediaSession]);

  const pause = useCallback(() => {
    audioElRef.current?.pause();
    setIsPaused(true);
  }, []);

  const stop = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    setIsPlaying(false); setIsPaused(false); playingRef.current = false;
    setProgress(0); setElapsed(0); setCurrentText('');
    setIsActive(false); setIsExpanded(false); setEnded(false);
  }, []);

  const skipFwd = useCallback(() => {
    const a = audioElRef.current;
    if (!a) return;
    a.currentTime = Math.min(a.currentTime + 15, a.duration || a.currentTime + 15);
  }, []);

  const skipBack = useCallback(() => {
    const a = audioElRef.current;
    if (!a) return;
    a.currentTime = Math.max(a.currentTime - 15, 0);
  }, []);

  // Media key handlers (hardware/lock-screen control)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !isActive) return;
    try {
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('seekbackward', skipBack);
      navigator.mediaSession.setActionHandler('seekforward', skipFwd);
    } catch { /* handlers unsupported */ }
    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      } catch { /* noop */ }
    };
  }, [isActive, play, pause, skipBack, skipFwd]);

  const setSpeedVal = useCallback((v: number) => {
    const c = Math.max(0.25, Math.min(3, v));
    setSpeed(c); speedRef.current = c;
    try { localStorage.setItem('reader:speed', String(c)); } catch { /* */ }
    if (audioElRef.current) audioElRef.current.playbackRate = c;
  }, []);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const a = ensureAudioEl();
    if (a && Number.isFinite(a.duration) && a.duration > 0) {
      a.currentTime = ratio * a.duration;
      setProgress(ratio * 100);
    }
  }, [ensureAudioEl]);

  // ── Keyboard shortcuts while the player is open ──
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      switch (e.key) {
        case ' ': case 'k': {
          e.preventDefault();
          if (isPlaying && !isPaused) pause(); else play();
          break;
        }
        case 'ArrowRight': case 'l': e.preventDefault(); skipFwd(); break;
        case 'ArrowLeft': case 'j': e.preventDefault(); skipBack(); break;
        case 'Escape': if (isExpanded) setIsExpanded(false); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, isExpanded, isPlaying, isPaused, play, pause, skipFwd, skipBack]);

  // ── Auto-start when arriving via "Up next" (?play=1) ──
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoPlay && audioUrl && mounted && !autoStartedRef.current) {
      autoStartedRef.current = true;
      const t = setTimeout(() => play(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPlay, audioUrl, mounted, play]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const dur = fileDur || audioDuration || 0;
  const speedPresets = [0.75, 1, 1.25, 1.5, 2];
  const playingNow = isPlaying && !isPaused;
  const next = upNext && upNext.length ? upNext[0] : null;

  // Studio narration only — no file, no player.
  if (!audioUrl) return null;

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

          <div className="relative" style={{ pointerEvents: 'auto' }}>
            {/* ── EXPANDED: bottom sheet (mobile) / floating card (desktop) ── */}
            {isExpanded && (
              <div className="w-full sm:max-w-md sm:mx-auto sm:px-4 sm:mb-4">
                <div
                  className="rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/50 overflow-y-auto overscroll-contain max-h-[85dvh]"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                >
                  {/* Grab handle + header */}
                  <div
                    className="sticky top-0 z-10 pb-1"
                    style={{ background: 'var(--background)' }}
                  >
                    <button
                      className="block mx-auto mt-2.5 mb-1 h-1.5 w-10 rounded-full"
                      style={{ background: 'var(--border)' }}
                      onClick={() => setIsExpanded(false)}
                      aria-label="Collapse player"
                    />
                    <div className="flex items-center justify-between pl-5 pr-3">
                      <p className="clay-eyebrow">Now playing</p>
                      <div className="flex items-center">
                        <button
                          onClick={() => setIsExpanded(false)}
                          className="p-2.5 rounded-full transition-colors hover:opacity-80"
                          style={{ color: 'var(--text-muted)' }}
                          aria-label="Collapse player"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                        <button
                          onClick={stop}
                          className="p-2.5 rounded-full transition-colors hover:text-red-400"
                          style={{ color: 'var(--text-muted)' }}
                          aria-label="Close player"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cover art */}
                  <div className="flex justify-center px-5 pt-2 pb-4">
                    <CoverArt playing={playingNow} />
                  </div>

                  {/* Title / author */}
                  <div className="px-5 text-center">
                    <h3 className="text-base font-semibold text-theme line-clamp-2">{title}</h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {author || 'Tushar Agrawal'} · {Math.ceil(dur / 60)} min · Studio voice
                    </p>
                  </div>

                  {/* Synced subtitles — fixed height so the card never jumps */}
                  <div className="px-6 pt-3 min-h-[4.5rem] flex items-center justify-center">
                    {currentText ? (
                      <p
                        key={currentText}
                        className="subtitle-line text-center font-medium leading-snug line-clamp-3"
                        style={{ color: 'var(--text-primary)', fontSize: '1rem' }}
                      >
                        {currentText}
                      </p>
                    ) : (
                      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {playingNow ? '♪' : 'Press play to listen'}
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
                      <span>{fmt(dur)}</span>
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="flex items-center justify-center gap-7 py-4">
                    <button onClick={skipBack} className="p-2 transition-colors active:scale-90 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} aria-label="Back 15 seconds">
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
                    <button onClick={skipFwd} className="p-2 transition-colors active:scale-90 hover:opacity-80" style={{ color: 'var(--text-secondary)' }} aria-label="Forward 15 seconds">
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
                  <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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

                  <button
                    onClick={() => setIsExpanded(true)}
                    className="flex-1 min-w-0 mx-1 text-left"
                    aria-label="Expand player"
                  >
                    <p className="text-xs font-medium text-theme truncate">{title}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {playingNow && currentText
                        ? currentText
                        : `${fmt(elapsed)} / ${fmt(dur)} · ${speed}x · Studio voice`}
                    </p>
                  </button>

                  <div className="hidden sm:flex items-center gap-1">
                    <button onClick={skipBack} className="p-1.5 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }} aria-label="Back 15 seconds">
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button onClick={skipFwd} className="p-1.5 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }} aria-label="Forward 15 seconds">
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

                  <button onClick={() => setIsExpanded(true)} className="p-2 hover:opacity-80 transition-opacity flex-shrink-0" style={{ color: 'var(--text-muted)' }} aria-label="Expand player">
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <button onClick={stop} className="p-2 hover:text-red-400 transition-colors flex-shrink-0" style={{ color: 'var(--text-muted)' }} aria-label="Close player">
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
