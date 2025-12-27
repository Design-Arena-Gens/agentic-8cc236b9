'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Repeat
} from 'lucide-react';
import lessons from './lessons.json';

type Lesson = {
  e: string;
  m: string;
};

type SpeechController = {
  speakEnglish: (text: string, onComplete?: () => void) => void;
  speakMyanmar: (text: string, onComplete?: () => void) => void;
  cancelAll: () => void;
};

function createSpeechController(): SpeechController {
  if (typeof window === 'undefined') {
    return {
      speakEnglish: (_, onComplete) => onComplete?.(),
      speakMyanmar: (_, onComplete) => onComplete?.(),
      cancelAll: () => {
        /* noop */
      }
    };
  }

  const synth = window.speechSynthesis;
  const audio = new Audio();
  let currentVoice: SpeechSynthesisVoice | null = null;

  const selectVoice = () => {
    const voices = synth.getVoices();
    currentVoice =
      voices.find((candidate) => candidate.lang === 'en-US') ??
      voices.find((candidate) => candidate.lang.startsWith('en')) ??
      voices.at(0) ??
      null;
  };

  selectVoice();
  synth.onvoiceschanged = selectVoice;

  const speakEnglish = (text: string, onComplete?: () => void) => {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    if (currentVoice) {
      utterance.voice = currentVoice;
    }
    if (onComplete) {
      utterance.onend = onComplete;
      utterance.onerror = onComplete;
    }
    synth.speak(utterance);
  };

  const speakMyanmar = (text: string, onComplete?: () => void) => {
    synth.cancel();
    audio.pause();
    audio.currentTime = 0;
    audio.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=my&client=tw-ob`;
    audio.onended = () => {
      onComplete?.();
    };
    audio.onerror = () => {
      onComplete?.();
    };
    void audio.play().catch(() => {
      onComplete?.();
    });
  };

  const cancelAll = () => {
    synth.cancel();
    audio.pause();
    audio.currentTime = 0;
  };

  return { speakEnglish, speakMyanmar, cancelAll };
}

const lessonsData: Lesson[] = lessons;

export default function Page() {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCurrent, setRepeatCurrent] = useState(false);
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const controllerRef = useRef<SpeechController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createSpeechController();
  }

  const totalLessons = lessonsData.length;

  const nextIndex = useCallback(
    (currentIndex: number) => (currentIndex + 1) % totalLessons,
    [totalLessons]
  );

  const playLesson = useCallback(
    (lessonIndex: number) => {
      const lesson = lessonsData[lessonIndex];
      if (!lesson) {
        return;
      }

      setStage(1);
      controllerRef.current?.speakEnglish(lesson.e, () => {
        window.setTimeout(() => {
          setStage(2);
          controllerRef.current?.speakMyanmar(lesson.m, () => {
            window.setTimeout(() => {
              setStage(0);
              if (repeatCurrent) {
                playLesson(lessonIndex);
              } else if (isPlaying) {
                setIndex((current) => nextIndex(current));
              }
            }, 700);
          });
        }, 400);
      });
    },
    [isPlaying, repeatCurrent, nextIndex]
  );

  useEffect(() => {
    if (isPlaying) {
      playLesson(index);
    } else {
      controllerRef.current?.cancelAll();
      setStage(0);
    }
  }, [index, isPlaying, playLesson]);

  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      controller?.cancelAll();
    };
  }, []);

  const { e: englishText, m: myanmarText } = lessonsData[index] ?? {
    e: '',
    m: ''
  };

  const statusLabel = useMemo(() => {
    if (stage === 1) {
      return 'Speaking English';
    }
    if (stage === 2) {
      return 'Speaking Myanmar';
    }
    return 'Idle';
  }, [stage]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2.5rem',
        padding: '2rem'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
          English ⇄ Myanmar
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '1rem' }}>{statusLabel}</p>
      </div>

      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <button
          aria-label="Previous phrase"
          onClick={() =>
            setIndex((current) => (current - 1 + totalLessons) % totalLessons)
          }
        >
          <ChevronLeft />
        </button>
        <button
          aria-label={isPlaying ? 'Pause playback' : 'Play phrases'}
          onClick={() => setIsPlaying((current) => !current)}
          style={{
            background: isPlaying ? '#dc2626' : '#2563eb'
          }}
        >
          {isPlaying ? <Pause /> : <Play />}
        </button>
        <button
          aria-label="Next phrase"
          onClick={() => setIndex((current) => nextIndex(current))}
        >
          <ChevronRight />
        </button>
      </section>

      <section style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '2rem',
            color: stage === 1 ? '#6366f1' : '#e5e7eb',
            marginBottom: '0.75rem'
          }}
        >
          {englishText}
        </div>
        <div
          style={{
            fontSize: '1.5rem',
            color: stage === 2 ? '#10b981' : '#9ca3af'
          }}
        >
          {myanmarText}
        </div>
      </section>

      <section style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => setRepeatCurrent((current) => !current)}
          style={{
            background: repeatCurrent ? '#059669' : '#111827'
          }}
        >
          <Repeat />
          {repeatCurrent ? 'REPEAT' : 'AUTO'}
        </button>
      </section>
    </main>
  );
}
