import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { GOLD, INK, DIM, CARD, BORDER } from './theme';

function fmt(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
}

// Steps come from the routine builder. A step with a minutes value gets
// a countdown; one without just waits for you to tap Next. Deliberately
// simpler than the workout runner — a skincare routine doesn't need
// rest periods or rounds, it needs "what's next, am I done".
export default function SelfCareSession({ routine, onComplete, onExit }) {
  const steps = (routine.steps || []).filter((st) => (st.text || '').trim());
  const [phase, setPhase] = useState(steps.length ? 'intro' : 'empty');
  const [index, setIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const tickRef = useRef(null);
  const finishedRef = useRef([]);

  const step = steps[index];
  const stepSeconds = step && step.minutes ? Number(step.minutes) * 60 : 0;
  const isLast = index >= steps.length - 1;

  useEffect(() => {
    if (phase !== 'step' || !stepSeconds) return;
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [phase, index, stepSeconds]);

  function start() {
    setIndex(0);
    setTimeLeft(steps[0] && steps[0].minutes ? Number(steps[0].minutes) * 60 : 0);
    setPhase('step');
  }

  function next() {
    clearInterval(tickRef.current);
    // Track the specific steps finished so the habit can show what
    // actually got done, not merely that a session ran.
    const doneId = step && (step.id || String(index));
    const nextCompleted = completedIds.includes(doneId)
      ? completedIds
      : [...completedIds, doneId];
    setCompletedIds(nextCompleted);
    if (isLast) {
      setPhase('done');
      finishedRef.current = nextCompleted;
      return;
    }
    const ni = index + 1;
    setIndex(ni);
    setTimeLeft(steps[ni].minutes ? Number(steps[ni].minutes) * 60 : 0);
  }

  function back() {
    if (index === 0) return;
    clearInterval(tickRef.current);
    const pi = index - 1;
    setIndex(pi);
    setTimeLeft(steps[pi].minutes ? Number(steps[pi].minutes) * 60 : 0);
  }

  useEffect(() => {
    if (phase === 'done') onComplete(finishedRef.current || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
        <Text style={styles.exitBtnText}>✕</Text>
      </TouchableOpacity>

      {phase === 'empty' && (
        <View style={styles.center}>
          <Text style={styles.title}>{routine.name}</Text>
          <Text style={styles.subtitle}>
            This routine has no steps yet. Long-press it in Habits and add some
            to turn it into a guided session.
          </Text>
          <TouchableOpacity style={styles.bigBtn} onPress={() => onComplete([])}>
            <Text style={styles.bigBtnText}>Mark Done Anyway</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'intro' && (
        <ScrollView contentContainerStyle={styles.introScroll}>
          <Text style={styles.title}>{routine.name}</Text>
          <Text style={styles.subtitle}>
            {steps.length} step{steps.length === 1 ? '' : 's'}
          </Text>
          {steps.map((st, i) => (
            <View key={st.id || i} style={styles.previewRow}>
              <Text style={styles.previewNum}>{i + 1}</Text>
              <Text style={styles.previewName}>{st.text}</Text>
              {st.minutes ? <Text style={styles.previewMin}>{st.minutes}m</Text> : null}
            </View>
          ))}
          <TouchableOpacity style={styles.bigBtn} onPress={start}>
            <Text style={styles.bigBtnText}>Start</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {phase === 'step' && step && (
        <View style={styles.center}>
          <Text style={styles.phaseLabel}>
            Step {index + 1} of {steps.length}
          </Text>
          <Text style={styles.stepName}>{step.text}</Text>
          {stepSeconds ? <Text style={styles.timer}>{fmt(timeLeft)}</Text> : null}

          <TouchableOpacity style={styles.bigBtn} onPress={next}>
            <Text style={styles.bigBtnText}>{isLast ? 'Finish' : 'Next Step'}</Text>
          </TouchableOpacity>
          {index > 0 ? (
            <TouchableOpacity style={styles.backBtn} onPress={back}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.title}>Done ✨</Text>
          <Text style={styles.subtitle}>
            {routine.name} complete - {completedIds.length} of {steps.length} step
            {steps.length === 1 ? '' : 's'} done.
          </Text>
          <TouchableOpacity style={styles.bigBtn} onPress={onExit}>
            <Text style={styles.bigBtnText}>Close</Text>
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
  subtitle: { color: DIM, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  previewNum: { color: GOLD, fontWeight: '800', fontSize: 13, width: 20 },
  previewName: { color: INK, fontSize: 15, fontWeight: '600', flex: 1 },
  previewMin: { color: GOLD, fontSize: 13, fontWeight: '700' },
  phaseLabel: { color: DIM, fontSize: 13, fontWeight: '700', marginBottom: 14, letterSpacing: 0.5 },
  stepName: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  timer: { color: '#fff', fontSize: 64, fontWeight: '800', marginBottom: 8 },
  bigBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 36,
    marginTop: 24,
    alignSelf: 'center',
  },
  bigBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backBtn: { paddingVertical: 12, marginTop: 6 },
  backBtnText: { color: DIM, fontSize: 14 },
});

