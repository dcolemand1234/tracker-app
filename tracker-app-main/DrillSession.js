import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import { makeQuestion, checkAnswer, drillLevelCount, drillStageAt } from './drillEngine';

const ADVANCE_AFTER = 4; // correct in a row to move up
const DROP_AFTER = 3; // wrong in a row to move down

// Difficulty follows performance rather than a fixed schedule: four right
// in a row moves you up, three wrong drops you back. That keeps the work
// at the edge of what you can do, which is where practice actually pays.
export default function DrillSession({ drill, saved, onSave, onExit }) {
  const maxStage = drillLevelCount(drill) - 1;
  const [stage, setStage] = useState(Math.min(saved?.stage || 0, maxStage));
  const [question, setQuestion] = useState(() => makeQuestion(drill, Math.min(saved?.stage || 0, maxStage)));
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(0);
  const [missStreak, setMissStreak] = useState(0);
  const [sessionRight, setSessionRight] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const best = saved?.bestStage || 0;

  useEffect(() => {
    if (onSave) {
      onSave({
        stage,
        bestStage: Math.max(best, stage),
        totalAnswered: (saved?.totalAnswered || 0) + sessionTotal,
        totalCorrect: (saved?.totalCorrect || 0) + sessionRight,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, sessionTotal]);

  function nextQuestion(atStage) {
    setQuestion(makeQuestion(drill, atStage));
    setInput('');
    setResult(null);
    setShowHint(false);
  }

  function submit(choiceIndex) {
    if (result) return;
    const correct = question.isQuiz
      ? choiceIndex === question.correct
      : checkAnswer(question, input);

    setSessionTotal((n) => n + 1);
    if (correct) setSessionRight((n) => n + 1);
    setResult({ correct, chosen: choiceIndex });

    if (correct) {
      const s = streak + 1;
      setStreak(s);
      setMissStreak(0);
      if (s >= ADVANCE_AFTER && stage < maxStage) {
        setStage(stage + 1);
        setStreak(0);
      }
    } else {
      const m = missStreak + 1;
      setMissStreak(m);
      setStreak(0);
      if (m >= DROP_AFTER && stage > 0) {
        setStage(stage - 1);
        setMissStreak(0);
      }
    }
  }

  function advance() {
    nextQuestion(stage);
  }

  const stageInfo = drillStageAt(drill, stage);
  const pct = maxStage > 0 ? Math.round((stage / maxStage) * 100) : 100;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
        <Text style={styles.exitText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.drillName}>{drill.name}</Text>
        <Text style={styles.stageName}>{question.stageName || stageInfo.level.name}</Text>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.barMeta}>
          Stage {stage + 1} of {maxStage + 1}
          {sessionTotal > 0 ? `  ·  ${sessionRight}/${sessionTotal} this session` : ''}
          {streak > 0 ? `  ·  🔥 ${streak}` : ''}
        </Text>

        <View style={styles.qCard}>
          <Text style={styles.question}>{question.question || question.q}</Text>
        </View>

        {question.isQuiz ? (
          <View>
            {question.options.map((opt, i) => {
              const chosen = result && result.chosen === i;
              const isRight = result && i === question.correct;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.option,
                    isRight && styles.optionRight,
                    chosen && !isRight && styles.optionWrong,
                  ]}
                  onPress={() => submit(i)}
                  disabled={!!result}
                >
                  <Text
                    style={[
                      styles.optionText,
                      (isRight || chosen) && styles.optionTextOn,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Your answer"
              placeholderTextColor="#9aa5b1"
              editable={!result}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => submit()}
            />
            {!result ? (
              <TouchableOpacity style={styles.checkBtn} onPress={() => submit()}>
                <Text style={styles.checkBtnText}>Check</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        {question.hint && !result ? (
          showHint ? (
            <Text style={styles.hintText}>{question.hint}</Text>
          ) : (
            <TouchableOpacity onPress={() => setShowHint(true)}>
              <Text style={styles.hintLink}>Show hint</Text>
            </TouchableOpacity>
          )
        ) : null}

        {result ? (
          <View style={[styles.feedback, result.correct ? styles.fbRight : styles.fbWrong]}>
            <Text style={[styles.fbTitle, result.correct ? styles.fbTitleRight : styles.fbTitleWrong]}>
              {result.correct ? 'Correct' : 'Not quite'}
            </Text>
            {!result.correct ? (
              <Text style={styles.fbAnswer}>
                Answer: {question.isQuiz ? question.options[question.correct] : String(question.answer)}
              </Text>
            ) : null}
            {question.why ? <Text style={styles.fbWhy}>{question.why}</Text> : null}
            {!result.correct && question.hint ? (
              <Text style={styles.fbWhy}>{question.hint}</Text>
            ) : null}
            <TouchableOpacity style={styles.nextBtn} onPress={advance}>
              <Text style={styles.nextBtnText}>Next question</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  scroll: { padding: 18, paddingTop: 60, paddingBottom: 40 },
  exitBtn: {
    position: 'absolute', top: 44, right: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  exitText: { color: '#fff', fontSize: 18 },
  drillName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  stageName: { color: GOLD, fontSize: 13, fontWeight: '700', marginTop: 4 },
  barTrack: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', marginTop: 12,
  },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: GOLD },
  barMeta: { color: DIM, fontSize: 11, marginTop: 7, fontWeight: '600' },
  qCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 20, marginTop: 20, marginBottom: 16,
  },
  question: { color: INK, fontSize: 19, fontWeight: '600', lineHeight: 28 },
  input: {
    backgroundColor: '#232d3a', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 14, fontSize: 18, color: INK, textAlign: 'center',
  },
  checkBtn: {
    backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 12,
  },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  option: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 8,
  },
  optionRight: { borderColor: '#4f9e5c', backgroundColor: 'rgba(79,158,92,0.15)' },
  optionWrong: { borderColor: ROSE, backgroundColor: 'rgba(234,90,95,0.12)' },
  optionText: { color: INK, fontSize: 15, lineHeight: 21 },
  optionTextOn: { fontWeight: '700' },
  hintLink: { color: GOLD, fontSize: 13, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  hintText: { color: DIM, fontSize: 13, marginTop: 14, lineHeight: 19, textAlign: 'center' },
  feedback: { borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1 },
  fbRight: { borderColor: '#4f9e5c', backgroundColor: 'rgba(79,158,92,0.12)' },
  fbWrong: { borderColor: ROSE, backgroundColor: 'rgba(234,90,95,0.10)' },
  fbTitle: { fontSize: 15, fontWeight: '800' },
  fbTitleRight: { color: '#4f9e5c' },
  fbTitleWrong: { color: ROSE },
  fbAnswer: { color: INK, fontSize: 15, fontWeight: '700', marginTop: 6 },
  fbWhy: { color: '#c3ccd6', fontSize: 13, lineHeight: 20, marginTop: 8 },
  nextBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 14,
  },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

