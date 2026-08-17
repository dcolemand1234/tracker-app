import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { GOLD, INK, DIM, CARD, BORDER } from './theme';

// Bodyweight-only programs. Each block is either rep-based (you tap when
// you finish the set) or time-based (counts itself down), followed by a
// rest period. Names match the seeded exercise library so completed
// sessions log against real exercises.
// Bodyweight-only programs. Each block is either rep-based (you tap when
// you finish the set) or time-based (counts itself down), followed by a
// rest period. Names match the seeded exercise library so completed
// sessions log against real exercises.
//
// A real difficulty ladder now, not a single template on repeat — push-ups,
// squats, and planks interleaved so no one movement pattern gets stale,
// climbing from "just get the habit started" to a genuine combined finisher.
// Advance to the next level after REPS_TO_ADVANCE completions at the
// current one, mirroring how the meditation streak levels work.
export const REPS_TO_ADVANCE = 3;

export const WORKOUT_TEMPLATES = [
  {
    id: 'level_0',
    name: 'Push-ups',
    subtitle: 'Level 1 - just get the habit started',
    rounds: 1,
    restBetweenRounds: 0,
    blocks: [
      {
        name: 'Knee Push-ups',
        mode: 'reps',
        target: 5,
        rest: 0,
        cue:
          'Hands under shoulders, body straight from knees to head. Lower until your chest is a fist off the floor, then press up. Slow and controlled beats fast and sloppy - 5 clean reps is the whole session.',
      },
    ],
  },
  {
    id: 'level_1',
    name: 'Squats',
    subtitle: 'Level 2 - the second movement pattern',
    rounds: 1,
    restBetweenRounds: 0,
    blocks: [
      {
        name: 'Bodyweight Squats',
        mode: 'reps',
        target: 10,
        rest: 0,
        cue:
          'Feet shoulder-width apart, toes slightly out. Sit your hips back and down like reaching for a chair, chest up, knees tracking over your toes. Go as low as feels controlled, then drive back up through your heels.',
      },
    ],
  },
  {
    id: 'level_2',
    name: 'Push-ups',
    subtitle: 'Level 3 - off the knees',
    rounds: 1,
    restBetweenRounds: 0,
    blocks: [
      {
        name: 'Push-ups',
        mode: 'reps',
        target: 5,
        rest: 0,
        cue:
          'Same form as the knee version, but from your toes now. Keep your body in one straight line - a sagging hip or a raised butt both mean the core has stopped doing its job. Fewer perfect reps beats more sloppy ones.',
      },
    ],
  },
  {
    id: 'level_3',
    name: 'Plank',
    subtitle: 'Level 4 - core stability',
    rounds: 1,
    restBetweenRounds: 0,
    blocks: [
      {
        name: 'Plank Hold',
        mode: 'time',
        seconds: 20,
        rest: 0,
        cue:
          'Forearms on the floor, elbows under shoulders, body one straight line from head to heels. Squeeze your glutes and brace your abs like you are about to be poked in the stomach. Do not let your hips sag or pike up.',
      },
    ],
  },
  {
    id: 'level_4',
    name: 'Push-ups + Squats',
    subtitle: 'Level 5 - combining the two',
    rounds: 1,
    restBetweenRounds: 30,
    blocks: [
      {
        name: 'Push-ups',
        mode: 'reps',
        target: 8,
        rest: 20,
        cue: 'Same form as before, just more of them. Break it into two sets in your head if you need to - 8 clean reps matters more than 8 fast ones.',
      },
      {
        name: 'Bodyweight Squats',
        mode: 'reps',
        target: 15,
        rest: 0,
        cue: 'Same squat form, higher rep count. Keep the pace steady rather than rushing the last few.',
      },
    ],
  },
  {
    id: 'level_5',
    name: 'Wide Push-ups',
    subtitle: 'Level 6 - a wider hand position shifts the load',
    rounds: 1,
    restBetweenRounds: 0,
    blocks: [
      {
        name: 'Wide Push-ups',
        mode: 'reps',
        target: 8,
        rest: 0,
        cue:
          'Hands set out past shoulder width instead of directly under them. This puts more emphasis on the chest and less on the triceps - expect it to feel different even at the same rep count as a standard push-up.',
      },
    ],
  },
  {
    id: 'level_6',
    name: 'Plank',
    subtitle: 'Level 7 - twice as long as level 4',
    rounds: 1,
    restBetweenRounds: 0,
    blocks: [
      {
        name: 'Plank Hold',
        mode: 'time',
        seconds: 40,
        rest: 0,
        cue: 'Same plank form. The last 10 seconds are where it actually trains anything - resist the urge to let your hips drop as fatigue sets in.',
      },
    ],
  },
  {
    id: 'level_7',
    name: 'Push-ups + Squats',
    subtitle: 'Level 8 - higher volume',
    rounds: 1,
    restBetweenRounds: 30,
    blocks: [
      {
        name: 'Push-ups',
        mode: 'reps',
        target: 12,
        rest: 25,
        cue: 'Same standard push-up form. If form breaks down before 12, that is useful information - the rep where it breaks down is the one worth paying attention to.',
      },
      {
        name: 'Bodyweight Squats',
        mode: 'reps',
        target: 20,
        rest: 0,
        cue: 'Same squat form, still. Depth and control matter more than speed at any rep count.',
      },
    ],
  },
  {
    id: 'level_8',
    name: 'Diamond Push-ups',
    subtitle: 'Level 9 - triceps take over most of the load',
    rounds: 1,
    restBetweenRounds: 0,
    blocks: [
      {
        name: 'Diamond Push-ups',
        mode: 'reps',
        target: 8,
        rest: 0,
        cue:
          'Hands together under your chest, thumbs and index fingers touching to form a diamond shape. This shifts most of the work onto the triceps - expect it to feel noticeably harder than a standard push-up at the same rep count.',
      },
    ],
  },
  {
    id: 'level_9',
    name: 'Combined Finisher',
    subtitle: 'Level 10 - the top of this ladder',
    rounds: 1,
    restBetweenRounds: 0,
    blocks: [
      {
        name: 'Push-ups',
        mode: 'reps',
        target: 15,
        rest: 20,
        cue: 'Standard push-up form, highest rep count on the ladder. Split it mentally into three sets of 5 if that helps.',
      },
      {
        name: 'Bodyweight Squats',
        mode: 'reps',
        target: 25,
        rest: 20,
        cue: 'Standard squat form, highest rep count on the ladder.',
      },
      {
        name: 'Plank Hold',
        mode: 'time',
        seconds: 60,
        rest: 0,
        cue: 'A full minute to finish. Same form as every plank before this - the only thing that changed is how tired you already are going into it.',
      },
    ],
  },
];

export const WORKOUT_MAX_LEVEL = WORKOUT_TEMPLATES.length - 1;

export function workoutLevelSpec(levelIndex) {
  const n = Math.max(0, Math.min(WORKOUT_MAX_LEVEL, levelIndex || 0));
  return {
    level: n,
    template: WORKOUT_TEMPLATES[n],
    isMax: n >= WORKOUT_MAX_LEVEL,
  };
}

const READY_SECONDS = 5;

function fmt(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
}

// Phases: intro -> ready -> work -> rest -> roundRest -> done
export default function GuidedWorkoutSession({ template, onComplete, onExit }) {
  const [phase, setPhase] = useState('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [blockIndex, setBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [repsDone, setRepsDone] = useState(0);
  const entriesRef = useRef([]);
  const tickRef = useRef(null);

  const blocks = template.blocks;
  const block = blocks[blockIndex];
  const isLastBlock = blockIndex >= blocks.length - 1;
  const isLastRound = roundIndex >= template.rounds - 1;

  const isTimedPhase =
    phase === 'ready' ||
    phase === 'rest' ||
    phase === 'roundRest' ||
    (phase === 'work' && block && block.mode === 'time');

  // One shared countdown driver for every timed phase, so there is only
  // ever a single interval alive and no chance of two timers racing.
  useEffect(() => {
    if (!isTimedPhase) return;
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, blockIndex, roundIndex, isTimedPhase]);

  // Advancing lives in its own effect rather than inside the setTimeLeft
  // updater above: calling a phase transition from within a state
  // updater is the same anti-pattern that crashed the video player, so
  // the clock only ever decrements and this reacts to it hitting zero.
  useEffect(() => {
    if (!isTimedPhase || timeLeft !== 0) return;
    advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isTimedPhase]);

  function startSession() {
    entriesRef.current = [];
    setRoundIndex(0);
    setBlockIndex(0);
    setTimeLeft(READY_SECONDS);
    setPhase('ready');
  }

  function beginBlock(bi) {
    const b = blocks[bi];
    setBlockIndex(bi);
    setRepsDone(b.mode === 'reps' ? b.target : 0);
    setTimeLeft(b.mode === 'time' ? b.seconds : 0);
    setPhase('work');
  }

  // Called when the current phase's clock runs out.
  function advance() {
    if (phase === 'ready') {
      beginBlock(0);
      return;
    }
    if (phase === 'work') {
      recordBlock(block.mode === 'time' ? block.seconds : repsDone);
      setTimeLeft(block.rest);
      setPhase('rest');
      return;
    }
    if (phase === 'rest') {
      if (!isLastBlock) {
        beginBlock(blockIndex + 1);
      } else if (!isLastRound) {
        setTimeLeft(template.restBetweenRounds);
        setPhase('roundRest');
      } else {
        setPhase('done');
      }
      return;
    }
    if (phase === 'roundRest') {
      setRoundIndex((r) => r + 1);
      beginBlock(0);
    }
  }

  function recordBlock(value) {
    entriesRef.current = [
      ...entriesRef.current,
      {
        name: block.name,
        mode: block.mode,
        value,
        round: roundIndex + 1,
      },
    ];
  }

  // Rep sets finish on your tap rather than a timer.
  function finishRepSet() {
    clearInterval(tickRef.current);
    recordBlock(repsDone);
    setTimeLeft(block.rest);
    setPhase('rest');
  }

  function skipRest() {
    clearInterval(tickRef.current);
    if (phase === 'rest') {
      if (!isLastBlock) beginBlock(blockIndex + 1);
      else if (!isLastRound) {
        setTimeLeft(template.restBetweenRounds);
        setPhase('roundRest');
      } else setPhase('done');
    } else if (phase === 'roundRest') {
      setRoundIndex((r) => r + 1);
      beginBlock(0);
    }
  }

  useEffect(() => {
    if (phase === 'done') {
      onComplete({
        templateName: template.name,
        rounds: template.rounds,
        entries: entriesRef.current,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const nextUp =
    phase === 'rest'
      ? isLastBlock
        ? isLastRound
          ? 'Finish'
          : `Round ${roundIndex + 2}`
        : blocks[blockIndex + 1].name
      : null;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
        <Text style={styles.exitBtnText}>✕</Text>
      </TouchableOpacity>

      {phase === 'intro' && (
        <ScrollView contentContainerStyle={styles.introScroll}>
          <Text style={styles.title}>{template.name}</Text>
          <Text style={styles.subtitle}>
            {template.rounds} rounds • {blocks.length} exercises • no equipment
          </Text>
          {blocks.map((b, i) => (
            <View key={i} style={styles.previewRow}>
              <Text style={styles.previewName}>{b.name}</Text>
              <Text style={styles.previewTarget}>
                {b.mode === 'time' ? `${b.seconds}s` : `${b.target} reps`}
              </Text>
            </View>
          ))}
          <TouchableOpacity style={styles.bigBtn} onPress={startSession}>
            <Text style={styles.bigBtnText}>Start</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {phase === 'ready' && (
        <View style={styles.center}>
          <Text style={styles.phaseLabel}>Get ready</Text>
          <Text style={styles.bigTimer}>{timeLeft}</Text>
          <Text style={styles.upNext}>First up: {blocks[0].name}</Text>
        </View>
      )}

      {phase === 'work' && (
        <View style={styles.center}>
          <Text style={styles.phaseLabel}>
            Round {roundIndex + 1} of {template.rounds} • Exercise {blockIndex + 1} of {blocks.length}
          </Text>
          <Text style={styles.exerciseName}>{block.name}</Text>

          {block.mode === 'time' ? (
            <Text style={styles.bigTimer}>{fmt(timeLeft)}</Text>
          ) : (
            <>
              <Text style={styles.bigTimer}>{repsDone}</Text>
              <View style={styles.repRow}>
                <TouchableOpacity
                  style={styles.repBtn}
                  onPress={() => setRepsDone((r) => Math.max(0, r - 1))}
                >
                  <Text style={styles.repBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.repTarget}>target {block.target}</Text>
                <TouchableOpacity style={styles.repBtn} onPress={() => setRepsDone((r) => r + 1)}>
                  <Text style={styles.repBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={styles.cue}>{block.cue}</Text>

          {block.mode === 'reps' ? (
            <TouchableOpacity style={styles.bigBtn} onPress={finishRepSet}>
              <Text style={styles.bigBtnText}>Set Done</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {(phase === 'rest' || phase === 'roundRest') && (
        <View style={styles.center}>
          <Text style={styles.phaseLabel}>
            {phase === 'roundRest' ? 'Round complete — rest' : 'Rest'}
          </Text>
          <Text style={styles.bigTimer}>{fmt(timeLeft)}</Text>
          {nextUp ? <Text style={styles.upNext}>Next: {nextUp}</Text> : null}
          {phase === 'roundRest' ? (
            <Text style={styles.upNext}>Next: Round {roundIndex + 2}</Text>
          ) : null}
          <TouchableOpacity style={[styles.bigBtn, styles.bigBtnAlt]} onPress={skipRest}>
            <Text style={[styles.bigBtnText, styles.bigBtnTextAlt]}>Skip Rest</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.title}>Session complete 💪</Text>
          <Text style={styles.subtitle}>
            {template.rounds} rounds of {template.name} logged.
          </Text>
          <TouchableOpacity style={styles.bigBtn} onPress={onExit}>
            <Text style={styles.bigBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  exitBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitBtnText: { color: '#fff', fontSize: 18 },
  introScroll: { padding: 24, paddingTop: 90 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: DIM, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  previewName: { color: INK, fontSize: 15, fontWeight: '600', flex: 1 },
  previewTarget: { color: GOLD, fontSize: 14, fontWeight: '700' },
  phaseLabel: {
    color: DIM,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  bigTimer: { color: '#fff', fontSize: 76, fontWeight: '800', marginBottom: 8 },
  repRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 6 },
  repBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repBtnText: { color: INK, fontSize: 26, fontWeight: '700' },
  repTarget: { color: DIM, fontSize: 13, fontWeight: '600', minWidth: 80, textAlign: 'center' },
  cue: { color: '#c9d0d8', fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 12 },
  upNext: { color: GOLD, fontSize: 15, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  bigBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 36,
    marginTop: 24,
    alignSelf: 'center',
  },
  bigBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  bigBtnAlt: { backgroundColor: 'transparent', borderWidth: 1, borderColor: GOLD },
  bigBtnTextAlt: { color: GOLD },
});

