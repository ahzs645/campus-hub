'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import FlashcardOptions from './FlashcardOptions';

interface FlashcardConfig {
  language?: 'spanish' | 'french' | 'german' | 'japanese';
  mode?: 'cycle' | 'daily';
  flipInterval?: number;
  cycleInterval?: number;
}

interface WordEntry {
  foreign: string;
  english: string;
}

const WORD_DATA: Record<string, WordEntry[]> = {
  spanish: [
    { foreign: 'Casa', english: 'House' },
    { foreign: 'Perro', english: 'Dog' },
    { foreign: 'Gato', english: 'Cat' },
    { foreign: 'Agua', english: 'Water' },
    { foreign: 'Sol', english: 'Sun' },
    { foreign: 'Luna', english: 'Moon' },
    { foreign: 'Amor', english: 'Love' },
    { foreign: 'Libro', english: 'Book' },
    { foreign: 'Tiempo', english: 'Time' },
    { foreign: 'Fuego', english: 'Fire' },
    { foreign: 'Tierra', english: 'Earth' },
    { foreign: 'Cielo', english: 'Sky' },
    { foreign: 'Noche', english: 'Night' },
    { foreign: 'Flor', english: 'Flower' },
    { foreign: 'Arbol', english: 'Tree' },
    { foreign: 'Mar', english: 'Sea' },
    { foreign: 'Piedra', english: 'Stone' },
    { foreign: 'Viento', english: 'Wind' },
    { foreign: 'Estrella', english: 'Star' },
    { foreign: 'Mundo', english: 'World' },
    { foreign: 'Comida', english: 'Food' },
    { foreign: 'Puerta', english: 'Door' },
    { foreign: 'Camino', english: 'Road' },
    { foreign: 'Luz', english: 'Light' },
    { foreign: 'Sombra', english: 'Shadow' },
    { foreign: 'Amigo', english: 'Friend' },
    { foreign: 'Vida', english: 'Life' },
    { foreign: 'Muerte', english: 'Death' },
    { foreign: 'Rio', english: 'River' },
    { foreign: 'Montaña', english: 'Mountain' },
  ],
  french: [
    { foreign: 'Maison', english: 'House' },
    { foreign: 'Chien', english: 'Dog' },
    { foreign: 'Chat', english: 'Cat' },
    { foreign: 'Eau', english: 'Water' },
    { foreign: 'Soleil', english: 'Sun' },
    { foreign: 'Lune', english: 'Moon' },
    { foreign: 'Amour', english: 'Love' },
    { foreign: 'Livre', english: 'Book' },
    { foreign: 'Temps', english: 'Time' },
    { foreign: 'Feu', english: 'Fire' },
    { foreign: 'Terre', english: 'Earth' },
    { foreign: 'Ciel', english: 'Sky' },
    { foreign: 'Nuit', english: 'Night' },
    { foreign: 'Fleur', english: 'Flower' },
    { foreign: 'Arbre', english: 'Tree' },
    { foreign: 'Mer', english: 'Sea' },
    { foreign: 'Pierre', english: 'Stone' },
    { foreign: 'Vent', english: 'Wind' },
    { foreign: 'Etoile', english: 'Star' },
    { foreign: 'Monde', english: 'World' },
    { foreign: 'Nourriture', english: 'Food' },
    { foreign: 'Porte', english: 'Door' },
    { foreign: 'Chemin', english: 'Road' },
    { foreign: 'Lumiere', english: 'Light' },
    { foreign: 'Ombre', english: 'Shadow' },
    { foreign: 'Ami', english: 'Friend' },
    { foreign: 'Vie', english: 'Life' },
    { foreign: 'Mort', english: 'Death' },
    { foreign: 'Riviere', english: 'River' },
    { foreign: 'Montagne', english: 'Mountain' },
  ],
  german: [
    { foreign: 'Haus', english: 'House' },
    { foreign: 'Hund', english: 'Dog' },
    { foreign: 'Katze', english: 'Cat' },
    { foreign: 'Wasser', english: 'Water' },
    { foreign: 'Sonne', english: 'Sun' },
    { foreign: 'Mond', english: 'Moon' },
    { foreign: 'Liebe', english: 'Love' },
    { foreign: 'Buch', english: 'Book' },
    { foreign: 'Zeit', english: 'Time' },
    { foreign: 'Feuer', english: 'Fire' },
    { foreign: 'Erde', english: 'Earth' },
    { foreign: 'Himmel', english: 'Sky' },
    { foreign: 'Nacht', english: 'Night' },
    { foreign: 'Blume', english: 'Flower' },
    { foreign: 'Baum', english: 'Tree' },
    { foreign: 'Meer', english: 'Sea' },
    { foreign: 'Stein', english: 'Stone' },
    { foreign: 'Wind', english: 'Wind' },
    { foreign: 'Stern', english: 'Star' },
    { foreign: 'Welt', english: 'World' },
    { foreign: 'Essen', english: 'Food' },
    { foreign: 'Tur', english: 'Door' },
    { foreign: 'Weg', english: 'Road' },
    { foreign: 'Licht', english: 'Light' },
    { foreign: 'Schatten', english: 'Shadow' },
    { foreign: 'Freund', english: 'Friend' },
    { foreign: 'Leben', english: 'Life' },
    { foreign: 'Tod', english: 'Death' },
    { foreign: 'Fluss', english: 'River' },
    { foreign: 'Berg', english: 'Mountain' },
  ],
  japanese: [
    { foreign: '家 (いえ)', english: 'House' },
    { foreign: '犬 (いぬ)', english: 'Dog' },
    { foreign: '猫 (ねこ)', english: 'Cat' },
    { foreign: '水 (みず)', english: 'Water' },
    { foreign: '太陽 (たいよう)', english: 'Sun' },
    { foreign: '月 (つき)', english: 'Moon' },
    { foreign: '愛 (あい)', english: 'Love' },
    { foreign: '本 (ほん)', english: 'Book' },
    { foreign: '時間 (じかん)', english: 'Time' },
    { foreign: '火 (ひ)', english: 'Fire' },
    { foreign: '地球 (ちきゅう)', english: 'Earth' },
    { foreign: '空 (そら)', english: 'Sky' },
    { foreign: '夜 (よる)', english: 'Night' },
    { foreign: '花 (はな)', english: 'Flower' },
    { foreign: '木 (き)', english: 'Tree' },
    { foreign: '海 (うみ)', english: 'Sea' },
    { foreign: '石 (いし)', english: 'Stone' },
    { foreign: '風 (かぜ)', english: 'Wind' },
    { foreign: '星 (ほし)', english: 'Star' },
    { foreign: '世界 (せかい)', english: 'World' },
    { foreign: '食べ物 (たべもの)', english: 'Food' },
    { foreign: '扉 (とびら)', english: 'Door' },
    { foreign: '道 (みち)', english: 'Road' },
    { foreign: '光 (ひかり)', english: 'Light' },
    { foreign: '影 (かげ)', english: 'Shadow' },
    { foreign: '友達 (ともだち)', english: 'Friend' },
    { foreign: '命 (いのち)', english: 'Life' },
    { foreign: '死 (し)', english: 'Death' },
    { foreign: '川 (かわ)', english: 'River' },
    { foreign: '山 (やま)', english: 'Mountain' },
  ],
};

const LANGUAGE_LABELS: Record<string, string> = {
  spanish: 'Spanish',
  french: 'French',
  german: 'German',
  japanese: 'Japanese',
};

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function Flashcard({ config }: WidgetComponentProps) {
  const cfg = config as FlashcardConfig | undefined;
  const language = cfg?.language ?? 'spanish';
  const mode = cfg?.mode ?? 'cycle';
  const flipInterval = cfg?.flipInterval ?? 5;
  const cycleInterval = cfg?.cycleInterval ?? 12;

  const words = WORD_DATA[language] ?? WORD_DATA.spanish;

  const [cardIndex, setCardIndex] = useState(() => {
    if (mode === 'daily') {
      return getDayOfYear() % words.length;
    }
    return Math.floor(Math.random() * words.length);
  });
  const [isFlipped, setIsFlipped] = useState(false);

  const currentWord = words[cardIndex % words.length];

  const { containerRef, scale } = useFitScale(200, 200);

  useEffect(() => {
    if (mode === 'daily') {
      const dayIndex = getDayOfYear() % words.length;
      setCardIndex(dayIndex);
    }
  }, [mode, words.length]);

  useEffect(() => {
    const flipTimer = setInterval(() => {
      setIsFlipped((prev) => !prev);
    }, flipInterval * 1000);

    return () => clearInterval(flipTimer);
  }, [flipInterval]);

  useEffect(() => {
    if (mode !== 'cycle') return;

    const cycleTimer = setInterval(() => {
      setIsFlipped(false);
      setTimeout(() => {
        setCardIndex((prev) => {
          let next = prev;
          while (next === prev && words.length > 1) {
            next = Math.floor(Math.random() * words.length);
          }
          return next;
        });
      }, 400);
    }, cycleInterval * 1000);

    return () => clearInterval(cycleTimer);
  }, [mode, cycleInterval, words.length]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: '#1B1B1D', borderRadius: 22 }}
    >
      <div
        style={{
          width: 200,
          height: 200,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative flex items-center justify-center"
      >
        {/* Gold accent circle */}
        <div
          className="absolute -top-2 -left-2 w-10 h-10 rounded-full opacity-20"
          style={{ backgroundColor: '#FFD700' }}
        />

        {/* Language label */}
        <div
          className="absolute top-2 left-0 right-0 text-center"
          style={{
            color: '#D81921',
            fontFamily: 'monospace',
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
          }}
        >
          {LANGUAGE_LABELS[language] ?? language}
        </div>

        {/* Card flip container */}
        <div
          className="w-[170px] h-[120px] mt-4"
          style={{ perspective: '600px' }}
        >
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front - foreign word */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-3"
              style={{
                backfaceVisibility: 'hidden',
                backgroundColor: '#2A2A2D',
                borderRadius: 16,
                border: '1px solid #3A3A3D',
              }}
            >
              <span
                className="text-xl font-bold text-center leading-tight"
                style={{ color: '#FDFBFF' }}
              >
                {currentWord.foreign}
              </span>
              <div className="w-10 h-px my-2" style={{ backgroundColor: '#FFD700' }} />
              <span
                style={{
                  color: '#5E5E62',
                  fontFamily: 'monospace',
                  fontSize: '0.55rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                TAP TO REVEAL
              </span>
            </div>

            {/* Back - english translation */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-3"
              style={{
                backfaceVisibility: 'hidden',
                backgroundColor: '#2A2A2D',
                borderRadius: 16,
                border: '1px solid #FFD700',
                transform: 'rotateY(180deg)',
              }}
            >
              <span
                className="text-lg font-bold text-center leading-tight"
                style={{ color: '#FFD700' }}
              >
                {currentWord.english}
              </span>
              <div className="w-10 h-px my-2" style={{ backgroundColor: '#3A3A3D' }} />
              <span
                style={{
                  color: '#5E5E62',
                  fontFamily: 'monospace',
                  fontSize: '0.55rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                }}
              >
                TRANSLATION
              </span>
            </div>
          </div>
        </div>

        {/* Mode indicator */}
        <div
          className="absolute bottom-2 left-0 right-0 text-center"
          style={{
            color: '#5E5E62',
            fontFamily: 'monospace',
            fontSize: '0.55rem',
            letterSpacing: '0.1em',
          }}
        >
          {mode === 'daily' ? 'WORD OF THE DAY' : `${String(((cardIndex % words.length) + 1)).padStart(2, '0')}/${String(words.length).padStart(2, '0')}`}
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'flashcard',
  name: 'Flashcard',
  description: 'Auto-cycling vocabulary flashcards',
  icon: 'languages',
  minW: 2,
  minH: 2,
  defaultW: 2,
  defaultH: 2,
  component: Flashcard,
  OptionsComponent: FlashcardOptions,
  defaultProps: {
    language: 'spanish',
    mode: 'cycle',
    flipInterval: 5,
    cycleInterval: 12,
  },
});
