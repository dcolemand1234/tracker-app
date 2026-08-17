import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GOLD, INK, DIM, CARD, BORDER } from './theme';
import LessonVideo from './LessonVideo';

const PRACTICE_SECONDS = 5 * 60;

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

// Nothing starts automatically. You read the steps, press Start when
// you're ready, then get 5 minutes of practice time before you can move
// on. Both ways out — marking it mastered, or just exiting — count
// today's habit as done, since either way the practice happened. Only
// "mastered" advances the technique itself and unlocks the next one.
export default function CardistryPracticeSession({ technique, onMastered, onExit }) {
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PRACTICE_SECONDS);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!started) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [started]);

  const ready = started && secondsLeft === 0;

  return (
    <View style={styles.wrap}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 20 + insets.bottom }]}
      >
        <Text style={styles.title}>{technique.name}</Text>
        {technique.note ? <Text style={styles.note}>{technique.note}</Text> : null}

        {technique.video ? (
          <LessonVideo
            video={technique.video}
            watched={false}
            onWatched={() => {}}
            autoplay={started}
            locked
          />
        ) : null}

        {(technique.steps || []).map((st, si) => (
          <View key={si} style={styles.stepRow}>
            <Text style={styles.stepNum}>{si + 1}</Text>
            <Text style={styles.stepText}>{st}</Text>
          </View>
        ))}

        {!started ? (
          <TouchableOpacity style={styles.startBtn} onPress={() => setStarted(true)}>
            <Text style={styles.startBtnText}>▶ Start 5-minute Practice</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {started ? (
        <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
          {!ready ? (
            <Text style={styles.bigTimer}>{fmt(secondsLeft)}</Text>
          ) : (
            <>
              <TouchableOpacity style={styles.masterBtn} onPress={onMastered}>
                <Text style={styles.masterBtnText}>✓ I've got this — Mark Mastered</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                <Text style={styles.exitBtnText}>Exit — still counts today's practice</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  scroll: { padding: 20, paddingTop: 56 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  note: { color: DIM, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 10 },
  stepRow: { flexDirection: 'row', marginTop: 14 },
  stepNum: {
    color: GOLD, fontSize: 13, fontWeight: '800', width: 22,
  },
  stepText: { color: '#c3ccd6', fontSize: 14, lineHeight: 21, flex: 1 },
  startBtn: {
    backgroundColor: GOLD, borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', marginTop: 28,
  },
  startBtnText: { color: '#1a1200', fontSize: 16, fontWeight: '800' },
  footer: {
    borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 18, paddingHorizontal: 20,
    backgroundColor: '#0d141c', alignItems: 'center',
  },
  bigTimer: { color: GOLD, fontSize: 56, fontWeight: '800', letterSpacing: 1 },
  masterBtn: {
    backgroundColor: GOLD, borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    width: '100%',
  },
  masterBtnText: { color: '#1a1200', fontSize: 15, fontWeight: '800' },
  exitBtn: { paddingVertical: 14, alignItems: 'center' },
  exitBtnText: { color: DIM, fontSize: 13, fontWeight: '700' },
});
