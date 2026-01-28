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
} from 'lucide-react';

interface BlogReaderProps {
  title: string;
  content: string;
  description: string;
}

// ── Chunk types for prosody control ──
type ChunkType =
  | 'intro'
  | 'heading'
  | 'text'
  | 'data'
  | 'diagram'
  | 'transition'
  | 'conclusion';

interface SpeechChunk {
  text: string;
  type: ChunkType;
}

// ── Helpers ──

// Detect if a line is mostly ASCII art / box drawing
const isAsciiArtLine = (line: string): boolean => {
  const artChars = line.replace(/\s/g, '').replace(/[a-zA-Z0-9.,;:!?'"()]/g, '');
  return artChars.length > line.trim().length * 0.5 && line.trim().length > 3;
};

// Detect if a code block is actual programming code
const isProgrammingCode = (block: string): boolean => {
  const codePatterns =
    /\b(import|export|function|const|let|var|class|def|return|if|else|for|while|try|catch|async|await|from|require|module|print|console|=>|===|!==|\{|\}|;$)/m;
  const lines = block.split('\n').filter((l) => l.trim());
  const codeLines = lines.filter((l) => codePatterns.test(l));
  return codeLines.length > lines.length * 0.3;
};

// Detect if a code block is a data table
const isDataTable = (block: string): boolean => {
  const lines = block.split('\n').filter((l) => l.trim());
  const tableLines = lines.filter(
    (l) => (l.includes('│') || l.includes('|')) && l.split(/[│|]/).length >= 3
  );
  return tableLines.length > lines.length * 0.3;
};

// Detect if a code block is a diagram
const isDiagram = (block: string): boolean => {
  const lines = block.split('\n').filter((l) => l.trim());
  const artLines = lines.filter((l) => isAsciiArtLine(l));
  return artLines.length > lines.length * 0.35;
};

// Detect if a code block has readable stats/data (not a diagram, not code)
const isStatsBlock = (block: string): boolean => {
  const lines = block.split('\n').filter((l) => l.trim());
  const dataLines = lines.filter(
    (l) => /[\d₹$€%]/.test(l) && !isAsciiArtLine(l)
  );
  return dataLines.length > lines.length * 0.25;
};

// Extract a title from the first meaningful line of a code block
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

// Parse a markdown-style table (with │ or |) into natural speech
const parseTableToSpeech = (block: string): string => {
  const lines = block.split('\n').filter((l) => l.trim());
  const title = extractBlockTitle(block);

  // Find header row and data rows
  const tableLines = lines.filter(
    (l) =>
      (l.includes('│') || l.includes('|')) &&
      !l.match(/^[─\-│|┼+\s]+$/) &&
      l.split(/[│|]/).filter((c) => c.trim()).length >= 2
  );

  if (tableLines.length < 2) {
    // Not enough rows for a real table, extract readable text
    return extractReadableText(block);
  }

  const parseRow = (line: string): string[] =>
    line
      .split(/[│|]/)
      .map((c) => c.trim())
      .filter((c) => c && !c.match(/^[-─┼+\s]+$/));

  const headers = parseRow(tableLines[0]);
  const rows = tableLines.slice(1).map(parseRow);

  let speech = title ? `Here's a comparison of ${title}. ` : 'Let me share some data with you. ';

  // Read key rows naturally
  const maxRows = Math.min(rows.length, 8); // Don't read too many rows
  for (let i = 0; i < maxRows; i++) {
    const row = rows[i];
    if (row.length >= 2) {
      const rowLabel = row[0];
      const values = row.slice(1);
      if (headers.length > 1) {
        const parts = values
          .map((v, j) => {
            const header = headers[j + 1] || '';
            return header ? `${header} is ${v}` : v;
          })
          .join(', and ');
        speech += `For ${rowLabel}, ${parts}. `;
      } else {
        speech += `${rowLabel}: ${values.join(', ')}. `;
      }
    }
  }
  if (rows.length > maxRows) {
    speech += `And ${rows.length - maxRows} more entries. `;
  }

  return speech;
};

// Extract readable text from a code block (stats, numbers, etc.)
const extractReadableText = (block: string): string => {
  const lines = block.split('\n').filter((l) => l.trim());
  const title = extractBlockTitle(block);
  const readable: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip separator lines and pure art lines
    if (trimmed.match(/^[=\-─_*+│|┼┌┐└┘├┤┬┴]+$/)) continue;
    if (isAsciiArtLine(trimmed)) continue;
    // Skip very short lines
    if (trimmed.length < 4) continue;

    // Clean up bullets and markers
    let cleaned = trimmed
      .replace(/^[•●○◦▸▹→►]\s*/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/[█░▒▓▄▀]+\s*/, '')
      .replace(/[│|]/g, ': ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (cleaned.length > 3 && /[a-zA-Z0-9]/.test(cleaned)) {
      readable.push(cleaned);
    }
  }

  let speech = title ? `${title}. ` : '';
  speech += readable.join('. ') + '. ';
  return speech;
};

// ── Main content-to-speech processor ──
function processContentForSpeech(
  title: string,
  description: string,
  markdownContent: string
): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];

  // Intro
  chunks.push({
    text: `You're listening to: ${title}. ... ${description}. ... Let's get started.`,
    type: 'intro',
  });

  // Process content block by block
  const lines = markdownContent.split('\n');
  let i = 0;
  let currentText = '';
  let listItems: string[] = [];
  let listIsNumbered = false;
  const headingVariants = [
    'Now, let\'s talk about',
    'Moving on to',
    'Next up:',
    'Let\'s explore',
    'Now let\'s look at',
    'Here\'s the section on',
  ];
  let headingIndex = 0;

  const flushText = () => {
    if (currentText.trim().length > 10) {
      // Split long text blocks into sentence-level chunks
      const sentences = currentText.trim().match(/[^.!?]+[.!?]+/g) || [currentText.trim()];
      let group = '';
      for (const sentence of sentences) {
        if ((group + sentence).length > 350) {
          if (group.trim()) chunks.push({ text: group.trim(), type: 'text' });
          group = sentence;
        } else {
          group += ' ' + sentence;
        }
      }
      if (group.trim()) chunks.push({ text: group.trim(), type: 'text' });
    }
    currentText = '';
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    const connectors = listIsNumbered
      ? listItems.map((item, idx) => `Number ${idx + 1}: ${item}`)
      : listItems.length <= 3
        ? listItems.map((item, idx) =>
            idx === 0 ? `First, ${item}` : idx === listItems.length - 1 ? `And finally, ${item}` : `Next, ${item}`
          )
        : listItems.map((item, idx) =>
            idx === 0
              ? `First, ${item}`
              : idx === listItems.length - 1
                ? `And lastly, ${item}`
                : `${item}`
          );
    chunks.push({ text: connectors.join('. ') + '.', type: 'text' });
    listItems = [];
    listIsNumbered = false;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Code fence block ──
    if (trimmed.startsWith('```')) {
      flushText();
      flushList();

      // Collect entire code block
      const blockLines: string[] = [];
      i++; // skip opening ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        blockLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```

      const block = blockLines.join('\n');

      if (isProgrammingCode(block)) {
        // Skip code — user said skip code explanations
        continue;
      } else if (isDataTable(block)) {
        chunks.push({ text: parseTableToSpeech(block), type: 'data' });
      } else if (isDiagram(block)) {
        const blockTitle = extractBlockTitle(block);
        if (blockTitle) {
          chunks.push({
            text: `There's a diagram here illustrating: ${blockTitle}. I'll skip over the visual, but the key concept is shown in the surrounding text.`,
            type: 'diagram',
          });
        }
        // Also extract any readable text from the diagram
        const readable = extractReadableText(block);
        if (readable.trim().length > 20) {
          chunks.push({ text: readable, type: 'data' });
        }
      } else if (isStatsBlock(block)) {
        chunks.push({ text: extractReadableText(block), type: 'data' });
      } else {
        // Generic block — try to extract anything readable
        const readable = extractReadableText(block);
        if (readable.trim().length > 20) {
          chunks.push({ text: readable, type: 'data' });
        }
      }
      continue;
    }

    // ── Horizontal rule ──
    if (trimmed.match(/^[-*_]{3,}$/)) {
      flushText();
      flushList();
      // Natural pause — empty transition chunk
      chunks.push({ text: '...', type: 'transition' });
      i++;
      continue;
    }

    // ── Headers ──
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushText();
      flushList();
      const level = headerMatch[1].length;
      const headerText = headerMatch[2]
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');

      if (level <= 2) {
        const variant = headingVariants[headingIndex % headingVariants.length];
        headingIndex++;
        chunks.push({
          text: `... ${variant} ${headerText}.`,
          type: 'heading',
        });
      } else {
        chunks.push({ text: `${headerText}.`, type: 'heading' });
      }
      i++;
      continue;
    }

    // ── Bullet list item ──
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      flushText();
      if (listIsNumbered) flushList();
      listIsNumbered = false;
      let itemText = bulletMatch[1]
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
      listItems.push(itemText);
      i++;
      continue;
    }

    // ── Numbered list item ──
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      flushText();
      if (!listIsNumbered && listItems.length > 0) flushList();
      listIsNumbered = true;
      let itemText = numberedMatch[2]
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
      listItems.push(itemText);
      i++;
      continue;
    }

    // ── Empty line ──
    if (!trimmed) {
      flushList();
      // Keep accumulating text with natural breaks
      if (currentText.trim()) {
        currentText += ' ';
      }
      i++;
      continue;
    }

    // ── Regular text ──
    flushList();
    let cleaned = trimmed
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    if (cleaned.length > 0) {
      currentText += (currentText ? ' ' : '') + cleaned;
    }
    i++;
  }

  // Flush remaining
  flushText();
  flushList();

  // Conclusion
  chunks.push({
    text: "... And that's the end of this article. Thanks for listening!",
    type: 'conclusion',
  });

  // Filter out empty/tiny chunks
  return chunks.filter((c) => c.text.replace(/\.\.\./g, '').trim().length > 2);
}

// ── Voice quality ranking ──
function rankVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  // Premium/Enhanced voices (macOS, iOS)
  if (name.includes('premium')) score += 100;
  if (name.includes('enhanced')) score += 80;
  if (name.includes('natural')) score += 70;

  // Good known voices
  if (name.includes('samantha') && name.includes('enhanced')) score += 90;
  if (name.includes('karen') && name.includes('premium')) score += 95;
  if (name.includes('daniel') && name.includes('enhanced')) score += 85;
  if (name.includes('zoe') && name.includes('premium')) score += 92;
  if (name.includes('fiona') && name.includes('enhanced')) score += 83;

  // Google voices (Chrome)
  if (name.includes('google us english')) score += 60;
  if (name.includes('google uk english')) score += 62;

  // Microsoft voices (Edge)
  if (name.includes('microsoft') && name.includes('online')) score += 65;
  if (name.includes('microsoft')) score += 40;

  // Basic named voices without enhancement are lower priority
  if (name.includes('samantha') && !name.includes('enhanced')) score += 30;
  if (name.includes('alex')) score += 25;
  if (name.includes('daniel') && !name.includes('enhanced')) score += 25;

  // Prefer US/UK English
  if (voice.lang === 'en-US') score += 10;
  if (voice.lang === 'en-GB') score += 8;
  if (voice.lang === 'en-AU') score += 5;

  return score;
}

// ── Prosody settings per chunk type ──
function getProsody(type: ChunkType, baseRate: number): { rate: number; pitch: number } {
  switch (type) {
    case 'intro':
      return { rate: baseRate * 0.92, pitch: 1.08 };
    case 'heading':
      return { rate: baseRate * 0.88, pitch: 1.12 };
    case 'text':
      return { rate: baseRate, pitch: 1.0 };
    case 'data':
      return { rate: baseRate * 0.9, pitch: 0.97 };
    case 'diagram':
      return { rate: baseRate * 0.93, pitch: 1.02 };
    case 'transition':
      return { rate: baseRate * 0.7, pitch: 1.0 };
    case 'conclusion':
      return { rate: baseRate * 0.9, pitch: 1.06 };
    default:
      return { rate: baseRate, pitch: 1.0 };
  }
}

// ══════════════════════════════════════
// ── Component ──
// ══════════════════════════════════════

export function BlogReader({ title, content, description }: BlogReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isSupported, setIsSupported] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentText, setCurrentText] = useState('');

  const chunksRef = useRef<SpeechChunk[]>([]);
  const currentChunkRef = useRef(0);
  const speedRef = useRef(1);
  const mutedRef = useRef(false);
  const voiceRef = useRef<string>('');
  const isPlayingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estimated total duration in seconds
  const estimateDuration = useCallback(() => {
    const totalWords = chunksRef.current.reduce(
      (sum, chunk) => sum + chunk.text.split(/\s+/).length,
      0
    );
    return Math.ceil((totalWords / 155) * 60);
  }, []);

  // Load voices with quality ranking
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const englishVoices = availableVoices
        .filter((v) => v.lang.startsWith('en'))
        .sort((a, b) => rankVoice(b) - rankVoice(a));

      setVoices(englishVoices);

      if (englishVoices.length > 0 && !voiceRef.current) {
        const best = englishVoices[0];
        setSelectedVoice(best.name);
        voiceRef.current = best.name;
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Prepare speech chunks on mount
  useEffect(() => {
    chunksRef.current = processContentForSpeech(title, description, content);
  }, [title, description, content]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isPaused]);

  const speakChunk = useCallback((index: number) => {
    if (index >= chunksRef.current.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      isPlayingRef.current = false;
      setElapsedTime(0);
      setCurrentChunk(0);
      currentChunkRef.current = 0;
      setCurrentText('');
      return;
    }

    const synth = window.speechSynthesis;
    const chunk = chunksRef.current[index];
    const { rate, pitch } = getProsody(chunk.type, speedRef.current);

    setCurrentText(chunk.text);

    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.rate = Math.max(0.1, Math.min(10, rate));
    utterance.pitch = Math.max(0, Math.min(2, pitch));
    utterance.volume = mutedRef.current ? 0 : 1;
    utterance.lang = 'en-US';

    const allVoices = synth.getVoices();
    const voice = allVoices.find((v) => v.name === voiceRef.current);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (!isPlayingRef.current) return;
      const nextIndex = currentChunkRef.current + 1;
      currentChunkRef.current = nextIndex;
      setCurrentChunk(nextIndex);
      setProgress(Math.round((nextIndex / chunksRef.current.length) * 100));
      speakChunk(nextIndex);
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      if (isPlayingRef.current) {
        const nextIndex = currentChunkRef.current + 1;
        currentChunkRef.current = nextIndex;
        setCurrentChunk(nextIndex);
        speakChunk(nextIndex);
      }
    };

    synth.speak(utterance);
  }, []);

  const handlePlay = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    synth.cancel();
    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;
    setElapsedTime(0);

    const startIndex = currentChunkRef.current;
    setProgress(Math.round((startIndex / chunksRef.current.length) * 100));
    speakChunk(startIndex);
  }, [isPaused, speakChunk]);

  const handlePause = useCallback(() => {
    window.speechSynthesis?.pause();
    setIsPaused(true);
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    isPlayingRef.current = false;
    setProgress(0);
    setCurrentChunk(0);
    currentChunkRef.current = 0;
    setElapsedTime(0);
    setCurrentText('');
  }, []);

  const handleSkipForward = useCallback(() => {
    const nextIndex = Math.min(
      currentChunkRef.current + 3,
      chunksRef.current.length - 1
    );
    window.speechSynthesis?.cancel();
    currentChunkRef.current = nextIndex;
    setCurrentChunk(nextIndex);
    setProgress(Math.round((nextIndex / chunksRef.current.length) * 100));
    if (isPlayingRef.current) {
      speakChunk(nextIndex);
    }
  }, [speakChunk]);

  const handleSkipBack = useCallback(() => {
    const prevIndex = Math.max(currentChunkRef.current - 3, 0);
    window.speechSynthesis?.cancel();
    currentChunkRef.current = prevIndex;
    setCurrentChunk(prevIndex);
    setProgress(Math.round((prevIndex / chunksRef.current.length) * 100));
    if (isPlayingRef.current) {
      speakChunk(prevIndex);
    }
  }, [speakChunk]);

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      const clamped = Math.max(0.25, Math.min(3, newSpeed));
      setSpeed(clamped);
      speedRef.current = clamped;

      if (isPlayingRef.current) {
        window.speechSynthesis?.cancel();
        speakChunk(currentChunkRef.current);
      }
    },
    [speakChunk]
  );

  const handleMuteToggle = useCallback(() => {
    const newMuted = !mutedRef.current;
    setIsMuted(newMuted);
    mutedRef.current = newMuted;

    if (isPlayingRef.current) {
      window.speechSynthesis?.cancel();
      speakChunk(currentChunkRef.current);
    }
  }, [speakChunk]);

  const handleVoiceChange = useCallback(
    (voiceName: string) => {
      setSelectedVoice(voiceName);
      voiceRef.current = voiceName;

      if (isPlayingRef.current) {
        window.speechSynthesis?.cancel();
        speakChunk(currentChunkRef.current);
      }
    },
    [speakChunk]
  );

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const targetChunk = Math.floor(ratio * chunksRef.current.length);
      const clampedChunk = Math.max(
        0,
        Math.min(targetChunk, chunksRef.current.length - 1)
      );

      window.speechSynthesis?.cancel();
      currentChunkRef.current = clampedChunk;
      setCurrentChunk(clampedChunk);
      setProgress(Math.round((clampedChunk / chunksRef.current.length) * 100));

      if (isPlayingRef.current) {
        speakChunk(clampedChunk);
      }
    },
    [speakChunk]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalDuration = estimateDuration();
  const adjustedDuration = Math.ceil(totalDuration / speed);
  const speedPresets = [0.5, 0.75, 1, 1.25, 1.5, 2];

  if (!isSupported) return null;

  // ── Collapsed: compact button ──
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/60 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
      >
        <div className="flex items-center justify-center w-9 h-9 bg-blue-500/20 rounded-full group-hover:bg-blue-500/30 transition-colors">
          <Headphones className="w-4.5 h-4.5 text-blue-400" />
        </div>
        <div className="text-left">
          <span className="text-sm font-semibold text-white block leading-tight">
            Listen to this Article
          </span>
          <span className="text-xs text-gray-400">
            {Math.ceil(totalDuration / 60)} min · English · Natural voice
          </span>
        </div>
      </button>
    );
  }

  // ── Expanded player ──
  return (
    <div className="bg-gradient-to-br from-neutral-900/90 via-neutral-900/70 to-neutral-800/50 border border-neutral-700/50 rounded-2xl p-5 backdrop-blur-sm shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-full">
            <Headphones className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white block">Audio Reader</span>
            {isPlaying && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                {isPaused ? 'Paused' : 'Playing'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            handleStop();
            setIsOpen(false);
          }}
          className="p-1.5 text-gray-500 hover:text-white hover:bg-neutral-700/50 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Currently reading text */}
      {isPlaying && currentText && (
        <div className="mb-4 px-3 py-2.5 bg-neutral-800/40 border border-neutral-700/30 rounded-lg">
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed italic">
            &ldquo;{currentText.replace(/\.\.\./g, '').trim().slice(0, 150)}
            {currentText.length > 150 ? '...' : ''}&rdquo;
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="relative h-2 bg-neutral-800 rounded-full cursor-pointer mb-2 group/progress"
        onClick={handleProgressClick}
      >
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg shadow-black/30 opacity-0 group-hover/progress:opacity-100 transition-opacity"
          style={{ left: `${progress}%`, marginLeft: '-7px' }}
        />
      </div>

      {/* Time + progress */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>{formatTime(elapsedTime)}</span>
        <span className="text-gray-600">
          {currentChunk + 1} / {chunksRef.current.length} sections
        </span>
        <span>~{formatTime(adjustedDuration)}</span>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={handleSkipBack}
          className="p-2.5 text-gray-400 hover:text-white hover:bg-neutral-700/50 rounded-xl transition-colors"
          title="Skip back"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {!isPlaying || isPaused ? (
          <button
            onClick={handlePlay}
            className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-full transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
            title="Play"
          >
            <Play className="w-5 h-5 text-white ml-0.5" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-full transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
            title="Pause"
          >
            <Pause className="w-5 h-5 text-white" />
          </button>
        )}

        <button
          onClick={handleSkipForward}
          className="p-2.5 text-gray-400 hover:text-white hover:bg-neutral-700/50 rounded-xl transition-colors"
          title="Skip forward"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <button
          onClick={handleStop}
          className="p-2.5 text-gray-400 hover:text-white hover:bg-neutral-700/50 rounded-xl transition-colors"
          title="Stop & reset"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>

      {/* Speed control */}
      <div className="flex items-center justify-between mb-4 bg-neutral-800/40 rounded-xl px-3 py-2.5">
        <span className="text-xs text-gray-400 font-medium w-12">Speed</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSpeedChange(Math.round((speed - 0.25) * 100) / 100)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-neutral-700/60 rounded-lg transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1">
            {speedPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => handleSpeedChange(preset)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all font-medium ${
                  speed === preset
                    ? 'bg-blue-500/90 text-white shadow-sm shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-neutral-700/50'
                }`}
              >
                {preset}x
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSpeedChange(Math.round((speed + 0.25) * 100) / 100)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-neutral-700/60 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Voice & volume */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleMuteToggle}
          className={`p-2 rounded-lg transition-colors ${
            isMuted
              ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
              : 'text-gray-400 hover:text-white hover:bg-neutral-700/50'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {voices.length > 1 && (
          <select
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="flex-1 bg-neutral-800/60 border border-neutral-700/50 text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 truncate appearance-none cursor-pointer"
          >
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
