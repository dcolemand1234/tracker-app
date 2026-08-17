import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GOLD, INK, DIM, CARD, BORDER } from './theme';
import ChessBoard from './ChessBoard';

// A speech-bubble instruction from a simple original coach avatar (an
// emoji in a colored circle, not any specific illustrated character),
// used both on the pre-start screen and layered over the board itself.
function CoachBubble({ text }) {
  return (
    <View style={styles.coachRow}>
      <View style={styles.coachAvatar}>
        <Text style={styles.coachEmoji}>🧑‍🏫</Text>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </View>
  );
}

// Wraps the existing ChessBoard (already handles legality, learn/play
// modes, and the per-piece teaching text) with a lesson intro and a
// move-count gate, instead of the old "watch a video" habit flow.
//
// Honest scope note: this checks that you made SOME legal moves with
// the relevant piece, not that you found one specific correct puzzle
// solution — a real move-validation "did you find the right answer"
// engine is a bigger follow-up, not something faked here.
export default function ChessLessonSession({ lesson, onComplete, onExit }) {
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [hintOn, setHintOn] = useState(false);

  const ready = started && moveCount >= lesson.moveThreshold;
  const challengeNum = Math.min(moveCount + 1, Math.max(lesson.moveThreshold, 1));
  const challengeTotal = Math.max(lesson.moveThreshold, 1);
  const progressPct =
    lesson.moveThreshold > 0 ? Math.min(100, (moveCount / lesson.moveThreshold) * 100) : 100;

  if (!started) {
    return (
      <View style={styles.wrap}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 20 + insets.bottom }]}>
          <Text style={styles.icon}>{lesson.icon}</Text>
          <Text style={styles.title}>{lesson.title}</Text>
          <CoachBubble text={lesson.intro} />
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
          <TouchableOpacity style={styles.startBtn} onPress={() => setStarted(true)}>
            <Text style={styles.startBtnText}>▶ Start</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exitLink} onPress={onExit}>
            <Text style={styles.exitLinkText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.sessionHeader, { paddingTop: insets.top + 12 }]}>
        <CoachBubble text={lesson.task} />
        {!ready ? (
          <View style={styles.objectiveRow}>
            <View style={styles.objectiveCheckbox} />
            <Text style={styles.objectiveText}>
              {lesson.moveThreshold > 0 ? 'Your move' : 'Read, then continue'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.boardArea}>
        <ChessBoard
          onSessionDone={() => {
            setMoveCount((c) => c + 1);
            setHintOn(false);
          }}
          onExit={onExit}
          showHint={hintOn}
          hintPieceType={lesson.piece}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: 20 + insets.bottom }]}>
        {lesson.moveThreshold > 0 && !ready ? (
          <>
            <View style={styles.challengeRow}>
              <Text style={styles.challengeLabel}>
                Challenge {challengeNum}/{challengeTotal}
              </Text>
              <Text style={styles.challengeIcon}>{lesson.icon}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <TouchableOpacity style={styles.hintBtn} onPress={() => setHintOn((h) => !h)}>
              <Text style={styles.hintBtnText}>💡 {hintOn ? 'Hide Hint' : 'Hint'}</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {ready ? (
          <>
            <TouchableOpacity style={styles.masterBtn} onPress={onComplete}>
              <Text style={styles.masterBtnText}>✓ Continue to next lesson</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exitLink} onPress={onExit}>
              <Text style={styles.exitLinkText}>Exit — still counts today's practice</Text>
            </TouchableOpacity>
          </>
        ) : lesson.moveThreshold === 0 ? (
          <TouchableOpacity style={styles.masterBtn} onPress={onComplete}>
            <Text style={styles.masterBtnText}>✓ Continue to next lesson</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  scroll: { padding: 20, paddingTop: 56, alignItems: 'center' },
  icon: { fontSize: 44, marginBottom: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 20 },

  coachRow: { flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'stretch' },
  coachAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#3a5a78',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  coachEmoji: { fontSize: 26 },
  bubble: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, borderTopLeftRadius: 4,
    padding: 14,
  },
  bubbleText: { color: '#1a2029', fontSize: 14, lineHeight: 20, fontWeight: '600' },

  sessionHeader: { paddingHorizontal: 16, paddingBottom: 12 },
  objectiveRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10, marginLeft: 62,
  },
  objectiveCheckbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: GOLD, marginRight: 8,
  },
  objectiveText: { color: INK, fontSize: 13, fontWeight: '700' },

  boardArea: { flex: 1 },

  footer: {
    borderTopWidth: 1, borderTopColor: BORDER, padding: 20, backgroundColor: '#0d141c',
  },
  startBtn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  startBtnText: { color: '#1a1200', fontSize: 16, fontWeight: '800' },
  exitLink: { paddingVertical: 14, alignItems: 'center' },
  exitLinkText: { color: DIM, fontSize: 13, fontWeight: '700' },

  challengeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  challengeLabel: { color: INK, fontSize: 13, fontWeight: '800' },
  challengeIcon: { fontSize: 16 },
  progressTrack: {
    height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#4fb894' },
  hintBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  hintBtnText: { color: GOLD, fontSize: 13, fontWeight: '700' },

  masterBtn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  masterBtnText: { color: '#1a1200', fontSize: 15, fontWeight: '800' },
});
