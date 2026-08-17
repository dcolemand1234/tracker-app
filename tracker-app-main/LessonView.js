import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import { PASS_MARK } from './roboticsLessons';

// Reading view. Deliberately plain: summary, the handful of ideas that
// actually matter, and one worked example. Long lessons do not get read.
export function LessonView({ lesson, onDone, onExit }) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
        <Text style={styles.exitText}>✕</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>LESSON</Text>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.summary}>{lesson.summary}</Text>

        {lesson.keyPoints.map(([heading, body], i) => (
          <View key={i} style={styles.point}>
            <Text style={styles.pointNum}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pointHead}>{heading}</Text>
              <Text style={styles.pointBody}>{body}</Text>
            </View>
          </View>
        ))}

        {lesson.worked ? (
          <View style={styles.worked}>
            <Text style={styles.workedLabel}>WORKED EXAMPLE</Text>
            <Text style={styles.workedTitle}>{lesson.worked.title}</Text>
            <Text style={styles.workedBody}>{lesson.worked.body}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={onDone}>
          <Text style={styles.primaryBtnText}>Mark as read</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Graded test. All questions in one pass, scored at the end, with the
// explanation shown for anything missed — a wrong answer you never see
// explained teaches nothing.
export function TestView({ lesson, onResult, onExit }) {
  const questions = lesson.test;
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.filter((q, i) => answers[i] === q.correct).length;
  const score = questions.length ? correctCount / questions.length : 0;
  const passed = score >= PASS_MARK;

  function submit() {
    setSubmitted(true);
    if (onResult) {
      onResult({
        score: Math.round(score * 100),
        passed,
        takenAt: Date.now(),
      });
    }
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
        <Text style={styles.exitText}>✕</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>TEST</Text>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.summary}>
          {questions.length} questions. {Math.round(PASS_MARK * 100)}% to pass and mark this
          step mastered.
        </Text>

        {questions.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <View key={qi} style={styles.qBlock}>
              <Text style={styles.qText}>
                {qi + 1}. {q.q}
              </Text>
              {q.options.map((opt, oi) => {
                const isChosen = chosen === oi;
                const isRight = submitted && oi === q.correct;
                const isWrongChoice = submitted && isChosen && oi !== q.correct;
                return (
                  <TouchableOpacity
                    key={oi}
                    style={[
                      styles.option,
                      isChosen && !submitted && styles.optionChosen,
                      isRight && styles.optionRight,
                      isWrongChoice && styles.optionWrong,
                    ]}
                    disabled={submitted}
                    onPress={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  >
                    <Text style={styles.optionText}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
              {submitted && chosen !== q.correct ? (
                <Text style={styles.why}>{q.why}</Text>
              ) : null}
            </View>
          );
        })}

        {!submitted ? (
          <TouchableOpacity
            style={[styles.primaryBtn, answeredCount < questions.length && styles.btnOff]}
            disabled={answeredCount < questions.length}
            onPress={submit}
          >
            <Text style={styles.primaryBtnText}>
              {answeredCount < questions.length
                ? `${answeredCount}/${questions.length} answered`
                : 'Submit test'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.resultBox, passed ? styles.resultPass : styles.resultFail]}>
            <Text style={[styles.resultScore, passed ? styles.passText : styles.failText]}>
              {Math.round(score * 100)}%
            </Text>
            <Text style={[styles.resultLabel, passed ? styles.passText : styles.failText]}>
              {passed ? 'Passed — step mastered' : 'Not passed yet'}
            </Text>
            <Text style={styles.resultBody}>
              {passed
                ? 'Solid. The explanations above are worth a read for anything you missed.'
                : `You need ${Math.round(PASS_MARK * 100)}%. Read the explanations, revisit the lesson, and retake it — retakes are unlimited and there is no penalty.`}
            </Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onExit}>
              <Text style={styles.secondaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 50 },
  exitBtn: {
    position: 'absolute', top: 44, right: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  exitText: { color: '#fff', fontSize: 18 },
  kicker: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  summary: { color: '#c3ccd6', fontSize: 15, lineHeight: 23, marginTop: 12 },
  point: { flexDirection: 'row', marginTop: 20 },
  pointNum: {
    color: GOLD, fontSize: 13, fontWeight: '800', width: 22, marginTop: 2,
  },
  pointHead: { color: INK, fontSize: 15, fontWeight: '700' },
  pointBody: { color: '#c3ccd6', fontSize: 14, lineHeight: 21, marginTop: 4 },
  worked: {
    backgroundColor: 'rgba(90,180,230,0.10)',
    borderWidth: 1, borderColor: 'rgba(90,180,230,0.5)',
    borderRadius: 12, padding: 14, marginTop: 24,
  },
  workedLabel: { color: '#5ab4e6', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  workedTitle: { color: INK, fontSize: 15, fontWeight: '800', marginTop: 4 },
  workedBody: { color: '#c3ccd6', fontSize: 14, lineHeight: 21, marginTop: 6 },
  primaryBtn: {
    backgroundColor: GOLD, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 28,
  },
  btnOff: { opacity: 0.4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  qBlock: { marginTop: 26 },
  qText: { color: INK, fontSize: 16, fontWeight: '700', lineHeight: 23, marginBottom: 10 },
  option: {
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    padding: 13, marginBottom: 7,
  },
  optionChosen: { borderColor: GOLD, backgroundColor: 'rgba(217,164,65,0.12)' },
  optionRight: { borderColor: '#4f9e5c', backgroundColor: 'rgba(79,158,92,0.15)' },
  optionWrong: { borderColor: ROSE, backgroundColor: 'rgba(234,90,95,0.12)' },
  optionText: { color: INK, fontSize: 14, lineHeight: 20 },
  why: { color: '#c3ccd6', fontSize: 13, lineHeight: 19, marginTop: 6, fontStyle: 'italic' },
  resultBox: { borderRadius: 14, borderWidth: 1, padding: 20, marginTop: 28, alignItems: 'center' },
  resultPass: { borderColor: '#4f9e5c', backgroundColor: 'rgba(79,158,92,0.12)' },
  resultFail: { borderColor: ROSE, backgroundColor: 'rgba(234,90,95,0.10)' },
  resultScore: { fontSize: 42, fontWeight: '800' },
  resultLabel: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  passText: { color: '#4f9e5c' },
  failText: { color: ROSE },
  resultBody: { color: '#c3ccd6', fontSize: 13, lineHeight: 20, marginTop: 10, textAlign: 'center' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 30, marginTop: 16,
  },
  secondaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

