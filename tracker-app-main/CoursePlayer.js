import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Linking } from 'react-native';
import { GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import { LEVELS } from './pythonCurriculum';
import LessonVideo from './LessonVideo';

const PASS_MARK = 0.75;

// Navigation is deliberately one part per screen. Each part is a single
// idea with a check at the end, and completing it is recorded on its own.
// The previous version put a whole lesson on one scrolling page, which
// made it impossible to tell what you had actually finished.

function CodeBlock({ code }) {
  return (
    <View style={styles.codeWrap}>
      <Text style={styles.code}>{code}</Text>
    </View>
  );
}

// Worked maths steps are not code and should not look like it — no
// monospace, no terminal-green-on-black. This is the "show your working"
// box: warm paper tone, generous line height, plain type.
function StepsBlock({ steps }) {
  return (
    <View style={styles.stepsWrap}>
      <Text style={styles.steps}>{steps}</Text>
    </View>
  );
}

export default function CoursePlayer({ course, progress, setProgress, onExit }) {
  const [lessonId, setLessonId] = useState(null);
  const [partIndex, setPartIndex] = useState(null); // null = lesson contents
  const [choice, setChoice] = useState(null);
  const [testMode, setTestMode] = useState(false);
  const [projectMode, setProjectMode] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const prog = progress || {};
  const lesson = course.lessons.find((l) => l.id === lessonId);

  // The outline was hardcoded to Python's 100 days, so every course
  // rendered Python's contents — including maths. A course now supplies
  // its own `days` outline; anything without one falls back to listing
  // its actual lessons.
  const days =
    course.days ||
    course.lessons.map((l, i) => ({
      day: i + 1,
      id: l.id,
      level: l.level || 'beginner',
      title: l.title,
      project: l.project ? l.project.name : null,
      built: true,
    }));

  function lessonParts(l) {
    return l.parts || [];
  }
  function partsDone(l) {
    const lp = (prog[l.id] || {}).parts || {};
    return lessonParts(l).filter((p) => lp[p.id]).length;
  }
  function lessonComplete(l) {
    const lp = prog[l.id] || {};
    const parts = lessonParts(l);
    // Both conditions on purpose. Earlier versions of this app wrote a
    // `passed` flag under the same lesson ids with a different shape, so
    // checking `passed` alone showed lessons as complete that had never
    // been opened. Requiring every part to be ticked as well makes stale
    // data incapable of faking completion.
    if (!lp.passed) return false;
    if (!parts.length) return true;
    const done = lp.parts || {};
    return parts.every((p) => done[p.id]);
  }

  // The next day that actually has content, so finishing a lesson can
  // hand you straight to the following one instead of dumping you back
  // in a 100-row list to find your place again.
  function nextBuiltAfter(id) {
    const i = days.findIndex((x) => x.id === id);
    for (let j = i + 1; j < days.length; j++) {
      const cand = course.lessons.find((l) => l.id === days[j].id);
      if (cand) return cand;
    }
    return null;
  }

  function save(lId, patch) {
    setProgress((prev) => {
      const cur = (prev || {})[lId] || {};
      return { ...(prev || {}), [lId]: { ...cur, ...patch } };
    });
  }

  function markPartDone(lId, partId) {
    setProgress((prev) => {
      const cur = (prev || {})[lId] || {};
      return {
        ...(prev || {}),
        [lId]: { ...cur, parts: { ...(cur.parts || {}), [partId]: true } },
      };
    });
  }

  // ---------- course contents ----------
  if (!lesson) {
    const passedCount = course.lessons.filter(lessonComplete).length;
    const pct = Math.round((passedCount / days.length) * 100);
    return (
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>COURSE</Text>
          <Text style={styles.title}>{course.name}</Text>
          <Text style={styles.blurb}>{course.blurb}</Text>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.barMeta}>
            {passedCount} of {days.length} lessons complete
          </Text>

          {days.map((d, i) => {
            const built = course.lessons.find((l) => l.id === d.id);
            const lp = prog[d.id] || {};
            const parts = built ? lessonParts(built) : [];
            const done = parts.filter((p) => (lp.parts || {})[p.id]).length;
            const complete = built ? lessonComplete(built) : false;
            const lvl = LEVELS[d.level] || LEVELS.beginner;
            const prevDay = i === 0 ? null : days[i - 1];
            const prevBuilt = prevDay ? course.lessons.find((l) => l.id === prevDay.id) : null;
            const locked = prevBuilt ? !lessonComplete(prevBuilt) : false;
            const showLevel =
              !!course.days && (i === 0 || days[i - 1].level !== d.level);
            return (
              <View key={d.id}>
                {showLevel ? (
                  <Text style={[styles.levelHead, { color: lvl.color }]}>
                    {lvl.label.toUpperCase()}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.lessonRow, (!built || locked) && styles.dim]}
                  disabled={!built || locked}
                  onPress={() => {
                    setLessonId(d.id);
                    setPartIndex(null);
                    setTestMode(false);
                    setProjectMode(false);
                  }}
                >
                  <Text style={styles.lessonNum}>
                    {complete ? '✓' : !built ? '·' : locked ? '🔒' : d.day}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lessonTitle, (!built || locked) && styles.dimText]}>
                      {course.days ? `Day ${d.day}: ` : ''}{d.title}
                    </Text>
                    {d.project ? (
                      <Text style={styles.lessonGoal}>🛠 {d.project}</Text>
                    ) : null}
                    {built && parts.length ? (
                      <Text style={styles.lessonSub}>
                        {done}/{parts.length} sections
                        {lp.score != null ? ` · test ${lp.score}%` : ''}
                      </Text>
                    ) : !built ? (
                      <Text style={styles.comingSoon}>content coming</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  const parts = lessonParts(lesson);
  const lp = (prog[lesson.id] || {}).parts || {};
  const doneCount = parts.filter((p) => lp[p.id]).length;
  const allPartsDone = parts.length > 0 && doneCount === parts.length;
  // Sections stay locked until the video segment has been watched.
  const videoLocked = !!lesson.video && !(prog[lesson.id] || {}).videoWatched;

  // ---------- lesson contents (list of parts) ----------
  if (partIndex === null && !testMode) {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => setLessonId(null)}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>LESSON {course.lessons.indexOf(lesson) + 1}</Text>
          <Text style={styles.title}>{lesson.title}</Text>
          <Text style={styles.blurb}>{lesson.goal}</Text>
          {lesson.time ? <Text style={styles.timeNote}>{lesson.time}</Text> : null}

          {/* Video first: watch the overview, then work the sections. */}
          {lesson.video ? (
            <LessonVideo
              video={lesson.video}
              watched={!!(prog[lesson.id] || {}).videoWatched}
              onWatched={() => save(lesson.id, { videoWatched: true })}
            />
          ) : null}

          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${parts.length ? (doneCount / parts.length) * 100 : 0}%` },
              ]}
            />
          </View>
          <Text style={styles.barMeta}>
            {doneCount} of {parts.length} sections
            {(prog[lesson.id] || {}).projectDone ? ' · project done' : ''}
            {(prog[lesson.id] || {}).score != null
              ? ` · test ${(prog[lesson.id] || {}).score}%`
              : ''}
          </Text>

          {lesson.video && !(prog[lesson.id] || {}).videoWatched ? (
            <Text style={styles.gateNote}>
              Watch the video to unlock the sections below.
            </Text>
          ) : null}

          {parts.map((p, i) => {
            const done = !!lp[p.id];
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.partRow, videoLocked && styles.dim]}
                disabled={videoLocked}
                onPress={() => {
                  setPartIndex(i);
                  setChoice(null);
                }}
              >
                <Text style={[styles.partMark, done && styles.partMarkDone]}>
                  {done ? '✓' : '○'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partTitle, done && styles.dimText]}>
                    {course.lessons.indexOf(lesson) + 1}.{i + 1}  {p.title}
                  </Text>

                </View>
                {p.minutes ? <Text style={styles.partMins}>{p.minutes}m</Text> : null}
              </TouchableOpacity>
            );
          })}

          {lesson.project ? (
            <TouchableOpacity
              style={[styles.projectRow, !allPartsDone && styles.dim]}
              disabled={!allPartsDone}
              onPress={() => setProjectMode(true)}
            >
              <Text style={styles.projectMark}>
                {(prog[lesson.id] || {}).projectDone ? '✓' : '🛠'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.projectTitle}>Project: {lesson.project.name}</Text>
                <Text style={styles.projectNote}>
                  {allPartsDone ? 'Build it, then check your understanding' : 'Unlocks after the sections'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, !allPartsDone && styles.btnOff]}
            disabled={!allPartsDone}
            onPress={() => {
              setTestMode(true);
              setAnswers({});
              setSubmitted(false);
            }}
          >
            <Text style={styles.primaryBtnText}>
              {allPartsDone
                ? 'Take the lesson test'
                : `Finish all ${parts.length} sections to unlock the test`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ---------- a single part ----------
  if (partIndex !== null) {
    const part = parts[partIndex];
    const answered = choice !== null;
    const correct = answered && choice === part.check.correct;
    const alreadyDone = !!lp[part.id];

    return (
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => setPartIndex(null)}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>
            SECTION {course.lessons.indexOf(lesson) + 1}.{partIndex + 1} OF{' '}
            {course.lessons.indexOf(lesson) + 1}.{parts.length}
          </Text>
          <Text style={styles.partHeading}>{part.title}</Text>

          <Text style={styles.body}>{part.body}</Text>
          {part.code ? <CodeBlock code={part.code} /> : null}
          {part.steps ? <StepsBlock steps={part.steps} /> : null}

          <View style={styles.checkBox}>
            <Text style={styles.checkLabel}>QUICK CHECK</Text>
            <Text style={styles.checkQ}>{part.check.q}</Text>
            {part.check.options.map((opt, oi) => {
              const chosen = choice === oi;
              const isRight = answered && oi === part.check.correct;
              const isWrong = answered && chosen && oi !== part.check.correct;
              return (
                <TouchableOpacity
                  key={oi}
                  style={[
                    styles.option,
                    isRight && styles.optionRight,
                    isWrong && styles.optionWrong,
                  ]}
                  disabled={answered}
                  onPress={() => {
                    setChoice(oi);
                    if (oi === part.check.correct) markPartDone(lesson.id, part.id);
                  }}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}

            {answered ? (
              <Text style={[styles.why, correct ? styles.whyOk : styles.whyNo]}>
                {correct ? '' : 'Not quite. '}
                {part.check.why}
              </Text>
            ) : null}
          </View>

          {answered || alreadyDone ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                if (!correct && !alreadyDone) {
                  // Let them try again rather than passing on a wrong answer.
                  setChoice(null);
                  return;
                }
                if (partIndex < parts.length - 1) {
                  setPartIndex(partIndex + 1);
                  setChoice(null);
                } else {
                  setPartIndex(null);
                }
              }}
            >
              <Text style={styles.primaryBtnText}>
                {!correct && !alreadyDone
                  ? 'Try again'
                  : partIndex < parts.length - 1
                  ? `Next: ${parts[partIndex + 1].title} →`
                  : 'Back to lesson'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ---------- project ----------
  if (projectMode && lesson.project) {
    const pj = lesson.project;
    const answered = choice !== null;
    const right = answered && choice === pj.check.correct;
    return (
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => setProjectMode(false)}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>PROJECT</Text>
          <Text style={styles.title}>{pj.name}</Text>
          <Text style={styles.body}>{pj.brief}</Text>
          {pj.starter ? <CodeBlock code={pj.starter} /> : null}
          {pj.steps ? <StepsBlock steps={pj.steps} /> : null}
          {pj.stretch ? (
            <View style={styles.stretchBox}>
              <Text style={styles.stretchLabel}>STRETCH</Text>
              <Text style={styles.stretchText}>{pj.stretch}</Text>
            </View>
          ) : null}

          <View style={styles.checkBox}>
            <Text style={styles.checkLabel}>CHECK YOUR BUILD</Text>
            <Text style={styles.checkQ}>{pj.check.q}</Text>
            {pj.check.options.map((opt, oi) => {
              const chosen = choice === oi;
              const isRight = answered && oi === pj.check.correct;
              const isWrong = answered && chosen && oi !== pj.check.correct;
              return (
                <TouchableOpacity
                  key={oi}
                  style={[styles.option, isRight && styles.optionRight, isWrong && styles.optionWrong]}
                  disabled={answered}
                  onPress={() => {
                    setChoice(oi);
                    if (oi === pj.check.correct) save(lesson.id, { projectDone: true });
                  }}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
            {answered ? (
              <Text style={[styles.why, right ? styles.whyOk : styles.whyNo]}>
                {right ? '' : 'Not quite. '}
                {pj.check.why}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              if (answered && !right) { setChoice(null); return; }
              setProjectMode(false);
              setChoice(null);
            }}
          >
            <Text style={styles.primaryBtnText}>
              {answered && !right ? 'Try again' : 'Back to lesson'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ---------- lesson test ----------
  const qs = lesson.test || [];
  const gotRight = qs.filter((q, i) => answers[i] === q.correct).length;
  const score = qs.length ? gotRight / qs.length : 0;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.exitBtn} onPress={() => setTestMode(false)}>
        <Text style={styles.exitText}>✕</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>LESSON TEST</Text>
        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.blurb}>
          {qs.length} questions · {Math.round(PASS_MARK * 100)}% to pass
        </Text>

        {qs.map((q, qi) => (
          <View key={qi} style={styles.qBlock}>
            <Text style={styles.qText}>
              {qi + 1}. {q.q}
            </Text>
            {q.options.map((opt, oi) => {
              const chosen = answers[qi] === oi;
              const right = submitted && oi === q.correct;
              const wrong = submitted && chosen && oi !== q.correct;
              return (
                <TouchableOpacity
                  key={oi}
                  style={[
                    styles.option,
                    chosen && !submitted && styles.optionChosen,
                    right && styles.optionRight,
                    wrong && styles.optionWrong,
                  ]}
                  disabled={submitted}
                  onPress={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
            {submitted && answers[qi] !== q.correct ? (
              <Text style={[styles.why, styles.whyNo]}>{q.why}</Text>
            ) : null}
          </View>
        ))}

        {!submitted ? (
          <TouchableOpacity
            style={[styles.primaryBtn, Object.keys(answers).length < qs.length && styles.btnOff]}
            disabled={Object.keys(answers).length < qs.length}
            onPress={() => {
              setSubmitted(true);
              save(lesson.id, {
                score: Math.round(score * 100),
                passed: (prog[lesson.id] || {}).passed || score >= PASS_MARK,
              });
            }}
          >
            <Text style={styles.primaryBtnText}>
              {Object.keys(answers).length < qs.length
                ? `${Object.keys(answers).length}/${qs.length} answered`
                : 'Submit'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.result,
              score >= PASS_MARK ? styles.resultPass : styles.resultFail,
            ]}
          >
            <Text
              style={[
                styles.resultScore,
                score >= PASS_MARK ? styles.whyOk : styles.whyNo,
              ]}
            >
              {Math.round(score * 100)}%
            </Text>
            <Text style={styles.resultBody}>
              {score >= PASS_MARK
                ? 'Passed. Next lesson unlocked.'
                : `You need ${Math.round(PASS_MARK * 100)}%. Read the explanations and retake — unlimited attempts, no penalty.`}
            </Text>
            {score >= PASS_MARK ? (
              (() => {
                const nxt = nextBuiltAfter(lesson.id);
                return (
                  <>
                    <TouchableOpacity
                      style={styles.nextLessonBtn}
                      onPress={() => {
                        setTestMode(false);
                        setAnswers({});
                        setSubmitted(false);
                        if (nxt) {
                          setLessonId(nxt.id);
                          setPartIndex(null);
                          setProjectMode(false);
                          setChoice(null);
                        } else {
                          setLessonId(null);
                        }
                      }}
                    >
                      <Text style={styles.nextLessonText}>
                        {nxt ? `Start Day ${nxt.day}: ${nxt.title} →` : 'Back to course'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => {
                        setTestMode(false);
                        setLessonId(null);
                      }}
                    >
                      <Text style={styles.secondaryBtnText}>Back to all days</Text>
                    </TouchableOpacity>
                  </>
                );
              })()
            ) : (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
              >
                <Text style={styles.secondaryBtnText}>Retake</Text>
              </TouchableOpacity>
            )}
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
  blurb: { color: '#c3ccd6', fontSize: 14, lineHeight: 21, marginTop: 8 },
  timeNote: { color: DIM, fontSize: 12, fontWeight: '600', marginTop: 6 },
  barTrack: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', marginTop: 16,
  },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: GOLD },
  barMeta: { color: DIM, fontSize: 12, marginTop: 7, marginBottom: 6 },
  lessonRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginTop: 8,
  },
  dim: { opacity: 0.45 },
  dimText: { color: DIM },
  lessonNum: { color: GOLD, fontSize: 15, fontWeight: '800', width: 28 },
  lessonTitle: { color: INK, fontSize: 15, fontWeight: '700' },
  lessonGoal: { color: DIM, fontSize: 12, marginTop: 3, lineHeight: 17 },
  lessonSub: { color: GOLD, fontSize: 11, fontWeight: '700', marginTop: 4 },
  comingSoon: { color: DIM, fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  levelHead: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1.2,
    marginTop: 22, marginBottom: 4,
  },
  lessonCount: { color: DIM, fontSize: 12, fontWeight: '700' },
  partRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    padding: 13, marginTop: 8,
  },
  partMark: { color: DIM, fontSize: 15, width: 26, fontWeight: '800' },
  partMarkDone: { color: '#4f9e5c' },
  partTitle: { color: INK, fontSize: 14, fontWeight: '600' },

  partMins: { color: DIM, fontSize: 11, fontWeight: '700' },
  partHeading: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  gateNote: { color: DIM, fontSize: 12, fontStyle: 'italic', marginTop: 14 },
  body: { color: '#c3ccd6', fontSize: 15, lineHeight: 24, marginTop: 14 },
  codeWrap: {
    backgroundColor: '#070b10', borderRadius: 10, borderWidth: 1,
    borderColor: '#1c2733', padding: 14, marginTop: 14,
  },
  code: { color: '#a8e6b0', fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
  stepsWrap: {
    backgroundColor: 'rgba(217,164,65,0.07)', borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(217,164,65,0.28)', padding: 16, marginTop: 14,
  },
  steps: { color: '#e8ddc7', fontSize: 16, lineHeight: 28 },
  checkBox: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginTop: 24,
  },
  checkLabel: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  checkQ: { color: INK, fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 10, lineHeight: 22 },
  option: {
    backgroundColor: '#1a222c', borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    padding: 12, marginBottom: 7,
  },
  optionChosen: { borderColor: GOLD, backgroundColor: 'rgba(217,164,65,0.12)' },
  optionRight: { borderColor: '#4f9e5c', backgroundColor: 'rgba(79,158,92,0.15)' },
  optionWrong: { borderColor: ROSE, backgroundColor: 'rgba(234,90,95,0.12)' },
  optionText: { color: INK, fontSize: 14, lineHeight: 20 },
  why: { fontSize: 13, lineHeight: 20, marginTop: 8 },
  whyOk: { color: '#4f9e5c' },
  whyNo: { color: '#e2b4b6' },
  primaryBtn: {
    backgroundColor: GOLD, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 24,
  },
  btnOff: { opacity: 0.4 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 26, marginTop: 16,
  },
  secondaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  qBlock: { marginTop: 24 },
  videoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(234,90,95,0.10)', borderWidth: 1, borderColor: 'rgba(234,90,95,0.5)',
    borderRadius: 10, padding: 13, marginTop: 18,
  },
  videoTitle: { color: INK, fontSize: 14, fontWeight: '700' },
  videoNote: { color: DIM, fontSize: 11, marginTop: 3, lineHeight: 16 },
  projectRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(90,180,230,0.10)', borderWidth: 1, borderColor: 'rgba(90,180,230,0.5)',
    borderRadius: 10, padding: 13, marginTop: 10,
  },
  projectMark: { fontSize: 16, width: 28 },
  projectTitle: { color: INK, fontSize: 14, fontWeight: '700' },
  projectNote: { color: DIM, fontSize: 11, marginTop: 3 },
  stretchBox: {
    backgroundColor: 'rgba(217,164,65,0.10)', borderLeftWidth: 3, borderLeftColor: GOLD,
    borderRadius: 8, padding: 13, marginTop: 16,
  },
  stretchLabel: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  stretchText: { color: '#c3ccd6', fontSize: 13, lineHeight: 20, marginTop: 5 },
  qText: { color: INK, fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 10 },
  result: { borderRadius: 14, borderWidth: 1, padding: 20, marginTop: 26, alignItems: 'center' },
  resultPass: { borderColor: '#4f9e5c', backgroundColor: 'rgba(79,158,92,0.12)' },
  resultFail: { borderColor: ROSE, backgroundColor: 'rgba(234,90,95,0.10)' },
  resultScore: { fontSize: 40, fontWeight: '800' },
  nextLessonBtn: {
    backgroundColor: GOLD, borderRadius: 10, paddingVertical: 13,
    paddingHorizontal: 22, marginTop: 16,
  },
  nextLessonText: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  resultBody: { color: '#c3ccd6', fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: 'center' },
});

