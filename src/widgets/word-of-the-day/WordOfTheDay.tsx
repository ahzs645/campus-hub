'use client';

import { useState, useEffect, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import WordOfTheDayOptions from './WordOfTheDayOptions';

interface WordOfTheDayConfig {
  category?: 'all' | 'academic' | 'literary' | 'scientific' | 'philosophical';
  refreshMode?: 'daily' | 'hourly' | 'cycle';
  cycleInterval?: number;
}

interface WordEntry {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  origin: string;
}

const WORDS: Record<string, WordEntry[]> = {
  academic: [
    { word: 'Ephemeral', pronunciation: '/ɪˈfɛm.ər.əl/', partOfSpeech: 'adj.', definition: 'Lasting for a very short time', example: 'The ephemeral beauty of cherry blossoms.', origin: 'Greek ephēmeros "lasting a day"' },
    { word: 'Ubiquitous', pronunciation: '/juːˈbɪk.wɪ.təs/', partOfSpeech: 'adj.', definition: 'Present, appearing, or found everywhere', example: 'Smartphones have become ubiquitous.', origin: 'Latin ubique "everywhere"' },
    { word: 'Paradigm', pronunciation: '/ˈpær.ə.daɪm/', partOfSpeech: 'n.', definition: 'A typical example or pattern of something', example: 'A paradigm shift in scientific thinking.', origin: 'Greek paradeigma "pattern"' },
    { word: 'Pragmatic', pronunciation: '/præɡˈmæt.ɪk/', partOfSpeech: 'adj.', definition: 'Dealing with things sensibly and realistically', example: 'A pragmatic approach to problem-solving.', origin: 'Greek pragmatikos "fit for business"' },
    { word: 'Elucidate', pronunciation: '/ɪˈluː.sɪ.deɪt/', partOfSpeech: 'v.', definition: 'To make something clear; explain', example: 'The professor elucidated the complex theorem.', origin: 'Latin elucidare "make light"' },
    { word: 'Cognizant', pronunciation: '/ˈkɒɡ.nɪ.zənt/', partOfSpeech: 'adj.', definition: 'Having knowledge or awareness', example: 'Be cognizant of the risks involved.', origin: 'Latin cognoscere "get to know"' },
    { word: 'Salient', pronunciation: '/ˈseɪ.li.ənt/', partOfSpeech: 'adj.', definition: 'Most noticeable or important', example: 'The salient points of the argument.', origin: 'Latin salire "to leap"' },
    { word: 'Ameliorate', pronunciation: '/əˈmiː.li.ə.reɪt/', partOfSpeech: 'v.', definition: 'To make something bad, better', example: 'Steps to ameliorate working conditions.', origin: 'Latin melior "better"' },
    { word: 'Dichotomy', pronunciation: '/daɪˈkɒt.ə.mi/', partOfSpeech: 'n.', definition: 'A division into two contrasting things', example: 'The dichotomy between theory and practice.', origin: 'Greek dikhotomia "cutting in two"' },
    { word: 'Esoteric', pronunciation: '/ˌes.əˈter.ɪk/', partOfSpeech: 'adj.', definition: 'Intended for a small number of people with specialized knowledge', example: 'Esoteric philosophical debates.', origin: 'Greek esōterikos "inner"' },
  ],
  literary: [
    { word: 'Mellifluous', pronunciation: '/meˈlɪf.lu.əs/', partOfSpeech: 'adj.', definition: 'Sweet-sounding; pleasant to hear', example: 'Her mellifluous voice filled the hall.', origin: 'Latin mel "honey" + fluere "to flow"' },
    { word: 'Serendipity', pronunciation: '/ˌser.ənˈdɪp.ɪ.ti/', partOfSpeech: 'n.', definition: 'The occurrence of happy events by chance', example: 'Finding the book was pure serendipity.', origin: 'Coined by Horace Walpole, 1754' },
    { word: 'Eloquent', pronunciation: '/ˈel.ə.kwənt/', partOfSpeech: 'adj.', definition: 'Fluent or persuasive in speaking or writing', example: 'An eloquent defense of human rights.', origin: 'Latin eloquens "speaking out"' },
    { word: 'Quixotic', pronunciation: '/kwɪkˈsɒt.ɪk/', partOfSpeech: 'adj.', definition: 'Exceedingly idealistic; unrealistic', example: 'His quixotic quest to end all poverty.', origin: 'From Don Quixote by Cervantes' },
    { word: 'Petrichor', pronunciation: '/ˈpet.rɪ.kɔːr/', partOfSpeech: 'n.', definition: 'The earthy scent produced when rain falls on dry soil', example: 'The petrichor after the storm was heavenly.', origin: 'Greek petra "stone" + ichor "ethereal fluid"' },
    { word: 'Sonder', pronunciation: '/ˈsɒn.dər/', partOfSpeech: 'n.', definition: 'The realization that each passerby has a life as vivid as your own', example: 'Standing in the crowd, she felt sonder.', origin: 'Coined by John Koenig, 2012' },
    { word: 'Limerence', pronunciation: '/ˈlɪm.ər.əns/', partOfSpeech: 'n.', definition: 'The state of being infatuated with another person', example: 'His limerence was obvious to everyone.', origin: 'Coined by Dorothy Tennov, 1979' },
    { word: 'Ineffable', pronunciation: '/ɪˈnef.ə.bəl/', partOfSpeech: 'adj.', definition: 'Too great or extreme to be described in words', example: 'An ineffable sense of wonder.', origin: 'Latin ineffabilis "unutterable"' },
    { word: 'Halcyon', pronunciation: '/ˈhæl.si.ən/', partOfSpeech: 'adj.', definition: 'Denoting a period of time that was idyllically happy and peaceful', example: 'The halcyon days of childhood.', origin: 'Greek alkyon "kingfisher"' },
    { word: 'Gossamer', pronunciation: '/ˈɡɒs.ə.mər/', partOfSpeech: 'adj.', definition: 'Extremely light, delicate, or tenuous', example: 'Gossamer threads of spider silk.', origin: 'Middle English "goose summer"' },
  ],
  scientific: [
    { word: 'Entropy', pronunciation: '/ˈen.trə.pi/', partOfSpeech: 'n.', definition: 'A measure of disorder or randomness in a system', example: 'The entropy of the universe always increases.', origin: 'Greek entropia "turning toward"' },
    { word: 'Symbiosis', pronunciation: '/ˌsɪm.baɪˈoʊ.sɪs/', partOfSpeech: 'n.', definition: 'Close interaction between two different organisms', example: 'Clownfish and anemones live in symbiosis.', origin: 'Greek symbiōsis "living together"' },
    { word: 'Luminescent', pronunciation: '/ˌluː.mɪˈnes.ənt/', partOfSpeech: 'adj.', definition: 'Emitting light not caused by heat', example: 'Luminescent plankton lit up the waves.', origin: 'Latin lumen "light"' },
    { word: 'Catalyst', pronunciation: '/ˈkæt.əl.ɪst/', partOfSpeech: 'n.', definition: 'Something that causes an important change or event', example: 'The discovery was a catalyst for change.', origin: 'Greek katalysis "dissolution"' },
    { word: 'Nebulous', pronunciation: '/ˈneb.jə.ləs/', partOfSpeech: 'adj.', definition: 'Vague, unclear, or hazy in form', example: 'His nebulous plans for the future.', origin: 'Latin nebula "mist, cloud"' },
    { word: 'Synthesis', pronunciation: '/ˈsɪn.θə.sɪs/', partOfSpeech: 'n.', definition: 'The combination of ideas into a complex whole', example: 'A synthesis of Eastern and Western thought.', origin: 'Greek synthesis "putting together"' },
    { word: 'Axiom', pronunciation: '/ˈæk.si.əm/', partOfSpeech: 'n.', definition: 'A statement accepted as true as the basis for argument', example: 'The axiom that all people are created equal.', origin: 'Greek axiōma "that which is thought worthy"' },
    { word: 'Empirical', pronunciation: '/ɪmˈpɪr.ɪ.kəl/', partOfSpeech: 'adj.', definition: 'Based on observation or experience rather than theory', example: 'Empirical evidence supports the hypothesis.', origin: 'Greek empeirikos "experienced"' },
    { word: 'Quantum', pronunciation: '/ˈkwɒn.təm/', partOfSpeech: 'n.', definition: 'The minimum amount of any physical entity', example: 'A quantum leap in computing power.', origin: 'Latin quantum "how much"' },
    { word: 'Resonance', pronunciation: '/ˈrez.ən.əns/', partOfSpeech: 'n.', definition: 'The quality of being deep, full, and reverberating', example: 'The idea had emotional resonance.', origin: 'Latin resonantia "echo"' },
  ],
  philosophical: [
    { word: 'Existential', pronunciation: '/ˌeɡ.zɪˈsten.ʃəl/', partOfSpeech: 'adj.', definition: 'Relating to human existence and experience', example: 'An existential crisis about purpose.', origin: 'Latin existentia "existence"' },
    { word: 'Zeitgeist', pronunciation: '/ˈtsaɪt.ɡaɪst/', partOfSpeech: 'n.', definition: 'The defining spirit or mood of a particular era', example: 'Social media captures the zeitgeist.', origin: 'German Zeit "time" + Geist "spirit"' },
    { word: 'Nihilism', pronunciation: '/ˈnaɪ.ɪ.lɪ.zəm/', partOfSpeech: 'n.', definition: 'The rejection of all moral and religious principles', example: 'Nietzsche warned against nihilism.', origin: 'Latin nihil "nothing"' },
    { word: 'Solipsism', pronunciation: '/ˈsɒl.ɪp.sɪ.zəm/', partOfSpeech: 'n.', definition: 'The view that the self is all that can be known to exist', example: 'Philosophical solipsism is hard to refute.', origin: 'Latin solus "alone" + ipse "self"' },
    { word: 'Catharsis', pronunciation: '/kəˈθɑːr.sɪs/', partOfSpeech: 'n.', definition: 'The process of releasing strong or repressed emotions', example: 'Writing was a form of catharsis.', origin: 'Greek katharsis "purification"' },
    { word: 'Sublime', pronunciation: '/səˈblaɪm/', partOfSpeech: 'adj.', definition: 'Of outstanding spiritual or intellectual worth', example: 'The sublime beauty of the mountains.', origin: 'Latin sublimis "uplifted, exalted"' },
    { word: 'Dogma', pronunciation: '/ˈdɒɡ.mə/', partOfSpeech: 'n.', definition: 'A principle laid down as authoritative and not to be questioned', example: 'Challenging the dogma of the institution.', origin: 'Greek dogma "opinion, decree"' },
    { word: 'Ethos', pronunciation: '/ˈiː.θɒs/', partOfSpeech: 'n.', definition: 'The characteristic spirit of a culture or community', example: 'The ethos of open-source software.', origin: 'Greek ēthos "character, custom"' },
    { word: 'Paradox', pronunciation: '/ˈpær.ə.dɒks/', partOfSpeech: 'n.', definition: 'A seemingly contradictory statement that may be true', example: 'The paradox of choice — more is less.', origin: 'Greek paradoxon "contrary to expectation"' },
    { word: 'Transcend', pronunciation: '/trænˈsend/', partOfSpeech: 'v.', definition: 'To go beyond the limits of; surpass', example: 'Music transcends language barriers.', origin: 'Latin transcendere "climb over"' },
  ],
};

function getAllWords(): WordEntry[] {
  return Object.values(WORDS).flat();
}

function getWordIndex(pool: WordEntry[], mode: string, cycleInterval: number): number {
  const now = new Date();
  if (mode === 'daily') {
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return dayOfYear % pool.length;
  }
  if (mode === 'hourly') {
    const hoursSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60));
    return hoursSinceEpoch % pool.length;
  }
  // cycle mode uses interval
  const periodsSinceEpoch = Math.floor(now.getTime() / (cycleInterval * 1000));
  return periodsSinceEpoch % pool.length;
}

export default function WordOfTheDay({ config, theme }: WidgetComponentProps) {
  const cfg = config as WordOfTheDayConfig | undefined;
  const category = cfg?.category ?? 'all';
  const refreshMode = cfg?.refreshMode ?? 'daily';
  const cycleInterval = cfg?.cycleInterval ?? 30;

  const pool = useMemo(() => {
    if (category === 'all') return getAllWords();
    return WORDS[category] ?? getAllWords();
  }, [category]);

  const [wordIndex, setWordIndex] = useState(() => getWordIndex(pool, refreshMode, cycleInterval));
  const [showDetails, setShowDetails] = useState(false);

  const { containerRef, scale } = useFitScale(320, 280);

  // Refresh word based on mode
  useEffect(() => {
    const update = () => setWordIndex(getWordIndex(pool, refreshMode, cycleInterval));
    update();

    let intervalMs: number;
    if (refreshMode === 'daily') intervalMs = 60 * 60 * 1000; // check every hour
    else if (refreshMode === 'hourly') intervalMs = 60 * 1000; // check every minute
    else intervalMs = cycleInterval * 1000;

    const timer = setInterval(update, intervalMs);
    return () => clearInterval(timer);
  }, [pool, refreshMode, cycleInterval]);

  // Toggle details reveal in cycle mode
  useEffect(() => {
    if (refreshMode !== 'cycle') {
      setShowDetails(true);
      return;
    }
    setShowDetails(false);
    const revealTimer = setTimeout(() => setShowDetails(true), 2000);
    return () => clearTimeout(revealTimer);
  }, [wordIndex, refreshMode]);

  const word = pool[wordIndex % pool.length];

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: '#111113', borderRadius: 22 }}
    >
      <div
        style={{
          width: 320,
          height: 280,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="flex flex-col px-6 py-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <span
            style={{
              color: theme.accent,
              fontFamily: 'monospace',
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}
          >
            {refreshMode === 'daily' ? 'Word of the Day' : refreshMode === 'hourly' ? 'Word of the Hour' : 'Word Spotlight'}
          </span>
          <span
            style={{
              color: '#5E5E62',
              fontFamily: 'monospace',
              fontSize: '0.5rem',
              letterSpacing: '0.1em',
            }}
          >
            {category !== 'all' ? category.toUpperCase() : ''}
          </span>
        </div>

        {/* Divider */}
        <div className="w-full h-px mb-4" style={{ backgroundColor: theme.accent, opacity: 0.3 }} />

        {/* Word */}
        <div className="mb-1">
          <span
            className="text-3xl font-bold leading-tight"
            style={{ color: '#FDFBFF' }}
          >
            {word.word}
          </span>
        </div>

        {/* Pronunciation & part of speech */}
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: '#8E8E93', fontSize: '0.75rem', fontStyle: 'italic' }}>
            {word.pronunciation}
          </span>
          <span
            style={{
              color: theme.accent,
              fontSize: '0.65rem',
              fontWeight: 600,
              backgroundColor: `${theme.accent}20`,
              padding: '1px 6px',
              borderRadius: 4,
            }}
          >
            {word.partOfSpeech}
          </span>
        </div>

        {/* Definition */}
        <div
          className="text-sm leading-snug mb-3 transition-opacity duration-700"
          style={{
            color: '#DDDDE1',
            opacity: showDetails ? 1 : 0,
          }}
        >
          {word.definition}
        </div>

        {/* Example */}
        <div
          className="text-xs italic leading-snug mb-3 transition-opacity duration-700 delay-300"
          style={{
            color: '#8E8E93',
            opacity: showDetails ? 1 : 0,
            borderLeft: `2px solid ${theme.accent}40`,
            paddingLeft: 8,
          }}
        >
          &ldquo;{word.example}&rdquo;
        </div>

        {/* Origin */}
        <div className="mt-auto">
          <span
            className="transition-opacity duration-700 delay-500"
            style={{
              color: '#5E5E62',
              fontFamily: 'monospace',
              fontSize: '0.55rem',
              letterSpacing: '0.05em',
              opacity: showDetails ? 1 : 0,
            }}
          >
            Origin: {word.origin}
          </span>
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'word-of-the-day',
  name: 'Word of the Day',
  description: 'Daily vocabulary with definitions, examples, and etymology',
  icon: 'sparkles',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: WordOfTheDay,
  OptionsComponent: WordOfTheDayOptions,
  defaultProps: {
    category: 'all',
    refreshMode: 'daily',
    cycleInterval: 30,
  },
});
