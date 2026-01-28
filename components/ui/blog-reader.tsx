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

  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const speedRef = useRef(1);
  const mutedRef = useRef(false);
  const voiceRef = useRef<string>('');
  const isPlayingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Strip markdown/formatting to get clean readable text
  const stripMarkdown = useCallback((markdown: string): string => {
    let text = markdown;
    // Remove code blocks entirely (not readable content)
    text = text.replace(/```[\s\S]*?```/g, '');
    // Remove inline code
    text = text.replace(/`([^`]+)`/g, '$1');
    // Remove image syntax
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
    // Remove links, keep text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remove header markers
    text = text.replace(/^#{1,6}\s+/gm, '');
    // Remove bold
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    // Remove italic
    text = text.replace(/\*(.*?)\*/g, '$1');
    // Remove bullet markers
    text = text.replace(/^[-*+]\s+/gm, '');
    // Remove numbered list markers
    text = text.replace(/^\d+\.\s+/gm, '');
    // Remove horizontal rules
    text = text.replace(/^[-*_]{3,}\s*$/gm, '');
    // Remove ASCII art lines (lines dominated by box-drawing or special chars)
    text = text.replace(/^[│┌┐└┘├┤┬┴┼─═║╔╗╚╝╠╣╦╩╬░▒▓█▄▀|+\-=_<>\/\\*#@~^`.:{}\[\]]{4,}.*$/gm, '');
    // Remove lines that are just pipes and dashes (markdown tables borders)
    text = text.replace(/^[|\s\-:]+$/gm, '');
    // Clean up excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }, []);

  // Split text into speakable chunks (browsers choke on very long utterances)
  const splitIntoChunks = useCallback((text: string): string[] => {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed || trimmed.length < 5) continue;

      // If paragraph is short enough, use as-is
      if (trimmed.length < 500) {
        chunks.push(trimmed);
      } else {
        // Split long paragraphs at sentence boundaries
        const sentences = trimmed.match(/[^.!?]+[.!?]+[\s]*/g) || [trimmed];
        let current = '';
        for (const sentence of sentences) {
          if ((current + sentence).length > 500) {
            if (current.trim()) chunks.push(current.trim());
            current = sentence;
          } else {
            current += sentence;
          }
        }
        if (current.trim()) chunks.push(current.trim());
      }
    }

    return chunks;
  }, []);

  // Estimated total duration in seconds
  const estimateDuration = useCallback(() => {
    const fullText = stripMarkdown(`${title}. ${description}. ${content}`);
    const wordCount = fullText.split(/\s+/).length;
    // Average speaking rate ~150 words per minute at 1x speed
    return Math.ceil((wordCount / 150) * 60);
  }, [title, description, content, stripMarkdown]);

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const englishVoices = availableVoices.filter(
        (v) => v.lang.startsWith('en')
      );
      setVoices(englishVoices);

      // Pick a good default voice
      if (englishVoices.length > 0 && !selectedVoice) {
        const preferred = englishVoices.find(
          (v) =>
            v.name.includes('Samantha') ||
            v.name.includes('Google US English') ||
            v.name.includes('Microsoft Zira') ||
            v.name.includes('English United States')
        );
        const defaultVoice = preferred || englishVoices[0];
        setSelectedVoice(defaultVoice.name);
        voiceRef.current = defaultVoice.name;
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [selectedVoice]);

  // Prepare chunks on mount
  useEffect(() => {
    const fullText = stripMarkdown(`${title}. ${description}. ${content}`);
    chunksRef.current = splitIntoChunks(fullText);
  }, [title, description, content, stripMarkdown, splitIntoChunks]);

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

  const speakChunk = useCallback(
    (index: number) => {
      if (index >= chunksRef.current.length) {
        // Finished all chunks
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(100);
        isPlayingRef.current = false;
        setElapsedTime(0);
        setCurrentChunk(0);
        currentChunkRef.current = 0;
        return;
      }

      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(chunksRef.current[index]);
      utterance.rate = speedRef.current;
      utterance.volume = mutedRef.current ? 0 : 1;
      utterance.lang = 'en-US';

      // Set voice
      const allVoices = synth.getVoices();
      const voice = allVoices.find((v) => v.name === voiceRef.current);
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        const nextIndex = currentChunkRef.current + 1;
        currentChunkRef.current = nextIndex;
        setCurrentChunk(nextIndex);
        setProgress(
          Math.round((nextIndex / chunksRef.current.length) * 100)
        );
        speakChunk(nextIndex);
      };

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.error('Speech error:', e.error);
        // Try next chunk on error
        if (isPlayingRef.current) {
          const nextIndex = currentChunkRef.current + 1;
          currentChunkRef.current = nextIndex;
          setCurrentChunk(nextIndex);
          speakChunk(nextIndex);
        }
      };

      synth.speak(utterance);
    },
    []
  );

  const handlePlay = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    // Start fresh
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

      // Restart current chunk with new speed
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

  // Compact button (collapsed state)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/60 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
      >
        <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
          <Headphones className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-left">
          <span className="text-sm font-medium text-white block leading-tight">
            Listen to Article
          </span>
          <span className="text-xs text-gray-400">
            ~{Math.ceil(totalDuration / 60)} min
          </span>
        </div>
      </button>
    );
  }

  // Expanded player
  return (
    <div className="bg-gradient-to-r from-neutral-900/80 to-neutral-900/60 border border-neutral-700/50 rounded-xl p-4 backdrop-blur-sm">
      {/* Top row: title + close */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 bg-blue-500/20 rounded-lg">
            <Headphones className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-white">Audio Reader</span>
          {isPlaying && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {isPaused ? 'Paused' : 'Playing'}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            handleStop();
            setIsOpen(false);
          }}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="relative h-1.5 bg-neutral-800 rounded-full cursor-pointer mb-3 group/progress"
        onClick={handleProgressClick}
      >
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
          style={{ left: `${progress}%`, marginLeft: '-6px' }}
        />
      </div>

      {/* Time display */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{formatTime(elapsedTime)}</span>
        <span>~{formatTime(adjustedDuration)}</span>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={handleSkipBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title="Skip back"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {!isPlaying || isPaused ? (
          <button
            onClick={handlePlay}
            className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-400 rounded-full transition-colors shadow-lg shadow-blue-500/25"
            title="Play"
          >
            <Play className="w-5 h-5 text-white ml-0.5" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-400 rounded-full transition-colors shadow-lg shadow-blue-500/25"
            title="Pause"
          >
            <Pause className="w-5 h-5 text-white" />
          </button>
        )}

        <button
          onClick={handleSkipForward}
          className="p-2 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title="Skip forward"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={handleStop}
          className="p-2 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title="Stop"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>

      {/* Speed control */}
      <div className="flex items-center justify-between mb-3 bg-neutral-800/50 rounded-lg p-2">
        <span className="text-xs text-gray-400 font-medium">Speed</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              handleSpeedChange(Math.round((speed - 0.25) * 100) / 100)
            }
            className="p-1 text-gray-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-0.5">
            {speedPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => handleSpeedChange(preset)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  speed === preset
                    ? 'bg-blue-500 text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-neutral-700'
                }`}
              >
                {preset}x
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              handleSpeedChange(Math.round((speed + 0.25) * 100) / 100)
            }
            className="p-1 text-gray-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Bottom row: volume + voice select */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleMuteToggle}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {voices.length > 1 && (
          <select
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="flex-1 bg-neutral-800 border border-neutral-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 truncate"
          >
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
