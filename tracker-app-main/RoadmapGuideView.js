import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import { Image } from 'react-native';
import { pickCompressedImage } from './imagePicker';
import { Modal } from 'react-native';
import DrillSession from './DrillSession';
import { DRILLS, drillLevelCount } from './drillEngine';
import { LessonView, TestView } from './LessonView';
import { LESSONS } from './roboticsLessons';
import CoursePlayer from './CoursePlayer';
import { COURSES } from './pythonCourse';

// Generic renderer for any roadmap guide — this is the layout the
// farming guide used, now reusable for every roadmap.
export default function RoadmapGuideView({ guide, progress: farmingProgress, setProgress: setFarmingProgress, onBack }) {
  // Build photos are keyed by phase id inside the same progress object,
  // so they ride along with notes and check-offs and need no extra state.
  async function attachBuildPhoto(phaseId) {
    const uri = await pickCompressedImage();
    if (!uri) return;
    setFarmingProgress((prev) => {
      const cur = (prev || {})[phaseId] || {};
      return { ...(prev || {}), [phaseId]: { ...cur, photo: uri } };
    });
  }

  function removeBuildPhoto(phaseId) {
    setFarmingProgress((prev) => {
      const cur = { ...((prev || {})[phaseId] || {}) };
      delete cur.photo;
      return { ...(prev || {}), [phaseId]: cur };
    });
  }

  function toggleBuildDone(phaseId) {
    setFarmingProgress((prev) => {
      const cur = (prev || {})[phaseId] || {};
      return { ...(prev || {}), [phaseId]: { ...cur, buildDone: !cur.buildDone } };
    });
  }

  const FARMING_PHASES = guide.phases;
  const [openPhase, setOpenPhase] = useState('foundation');
  const [openStep, setOpenStep] = useState(null);
  const [activeDrillId, setActiveDrillId] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [activeTestId, setActiveTestId] = useState(null);
  const [activeCourseId, setActiveCourseId] = useState(null);

  const progress = farmingProgress || {};

  function isDone(stepId) {
    return !!(progress[stepId] && progress[stepId].done);
  }

  function toggleStep(stepId) {
    setFarmingProgress((prev) => {
      const cur = (prev || {})[stepId] || {};
      return { ...(prev || {}), [stepId]: { ...cur, done: !cur.done } };
    });
  }

  function setNote(stepId, note) {
    setFarmingProgress((prev) => {
      const cur = (prev || {})[stepId] || {};
      return { ...(prev || {}), [stepId]: { ...cur, note } };
    });
  }

  const totalSteps = FARMING_PHASES.reduce((n, p) => n + p.steps.length, 0);
  const doneSteps = FARMING_PHASES.reduce(
    (n, p) => n + p.steps.filter((st) => isDone(st.id)).length,
    0
  );
  const overallPct = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0;

  // The first unfinished step, so there's always an obvious "you are here".
  let nextStep = null;
  let nextPhase = null;
  for (const phase of FARMING_PHASES) {
    const found = phase.steps.find((st) => !isDone(st.id));
    if (found) {
      nextStep = found;
      nextPhase = phase;
      break;
    }
  }

  return (
    <ScrollView contentContainerStyle={shared.container}>
      <TouchableOpacity onPress={onBack} style={styles.backLink}>
        <Text style={styles.backLinkText}>‹ All Roadmaps</Text>
      </TouchableOpacity>
      <Text style={shared.h1}>{guide.name}</Text>
      <Text style={shared.tagline}>{guide.tagline}</Text>

      <View style={shared.block}>
        <View style={styles.overallRow}>
          <Text style={styles.overallLabel}>Overall progress</Text>
          <Text style={styles.overallPct}>{overallPct}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${overallPct}%` }]} />
        </View>
        <Text style={styles.overallMeta}>
          {doneSteps} of {totalSteps} steps done
        </Text>
      </View>

      {nextStep ? (
        <TouchableOpacity
          style={styles.nextCard}
          onPress={() => {
            setOpenPhase(nextPhase.id);
            setOpenStep(nextStep.id);
          }}
        >
          <Text style={styles.nextLabel}>YOU ARE HERE</Text>
          <Text style={styles.nextTitle}>{nextStep.title}</Text>
          <Text style={styles.nextPhase}>
            {nextPhase.icon} {nextPhase.name}
          </Text>
        </TouchableOpacity>
      ) : null}

      {FARMING_PHASES.map((phase) => {
        const phaseDone = phase.steps.filter((st) => isDone(st.id)).length;
        const expanded = openPhase === phase.id;
        const phasePct = Math.round((phaseDone / phase.steps.length) * 100);
        return (
          <View key={phase.id} style={shared.block}>
            <TouchableOpacity
              style={styles.phaseHead}
              onPress={() => setOpenPhase(expanded ? null : phase.id)}
            >
              <Text style={styles.phaseIcon}>{phase.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.phaseName}>{phase.name}</Text>
                <Text style={styles.phaseBlurb}>{phase.blurb}</Text>
              </View>
              <Text style={styles.phaseCount}>
                {phaseDone}/{phase.steps.length}
              </Text>
              <Text style={styles.phaseChevron}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            <View style={styles.phaseBarTrack}>
              <View style={[styles.phaseBarFill, { width: `${phasePct}%` }]} />
            </View>

            {expanded && phase.project ? (
              <View style={styles.projectCard}>
                <Text style={styles.projectLabel}>BUILD THIS</Text>
                <Text style={styles.projectName}>{phase.project.name}</Text>
                <Text style={styles.projectDetail}>{phase.project.detail}</Text>

                {phase.parts && phase.parts.length ? (
                  <>
                    <Text style={styles.partsLabel}>What you need</Text>
                    {phase.parts.map((pt, pi) => (
                      <Text key={pi} style={styles.partItem}>
                        • {pt}
                      </Text>
                    ))}
                  </>
                ) : null}

                {(progress[phase.id] || {}).photo ? (
                  <>
                    <Image
                      source={{ uri: progress[phase.id].photo }}
                      style={styles.buildPhoto}
                      resizeMode="cover"
                    />
                    <TouchableOpacity onPress={() => removeBuildPhoto(phase.id)}>
                      <Text style={styles.photoRemove}>Remove photo</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.photoBtn}
                    onPress={() => attachBuildPhoto(phase.id)}
                  >
                    <Text style={styles.photoBtnText}>📷 Add a photo of your build</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.buildBtn,
                    (progress[phase.id] || {}).buildDone && styles.buildBtnDone,
                  ]}
                  onPress={() => toggleBuildDone(phase.id)}
                >
                  <Text
                    style={[
                      styles.buildBtnText,
                      (progress[phase.id] || {}).buildDone && styles.buildBtnTextDone,
                    ]}
                  >
                    {(progress[phase.id] || {}).buildDone ? '✓ Build complete' : 'Mark build complete'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {expanded && phase.pace ? (
              <Text style={styles.paceLine}>Typical pace: {phase.pace}</Text>
            ) : null}

            {expanded
              ? phase.steps.map((st, i) => {
                  const done = isDone(st.id);
                  const stepOpen = openStep === st.id;
                  return (
                    <View key={st.id} style={styles.stepWrap}>
                      <View style={styles.stepHead}>
                        <TouchableOpacity onPress={() => toggleStep(st.id)}>
                          <View style={[styles.checkbox, done && styles.checkboxDone]}>
                            {done ? <Text style={styles.checkMark}>✓</Text> : null}
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() => setOpenStep(stepOpen ? null : st.id)}
                        >
                          <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>
                            {i + 1}. {st.title}
                          </Text>
                          {!stepOpen ? (
                            <Text style={styles.stepPeek} numberOfLines={2}>
                              {st.detail}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      </View>

                      {stepOpen ? (
                        <View style={styles.stepBody}>
                          <Text style={styles.stepDetail}>{st.detail}</Text>

                          <Text style={styles.sectionLabel}>Do this</Text>
                          {st.actions.map((a, ai) => (
                            <View key={ai} style={styles.actionRow}>
                              <Text style={styles.actionNum}>{ai + 1}</Text>
                              <Text style={styles.actionText}>{a}</Text>
                            </View>
                          ))}

                          <View style={styles.watchBox}>
                            <Text style={styles.watchLabel}>⚠ Watch out</Text>
                            <Text style={styles.watchText}>{st.watchOut}</Text>
                          </View>

                          <View style={styles.doneBox}>
                            <Text style={styles.doneLabel}>✓ Done when</Text>
                            <Text style={styles.doneText}>{st.doneWhen}</Text>
                          </View>

                          {st.course && COURSES[st.course] ? (
                            (() => {
                              const c = COURSES[st.course];
                              const cp = progress[`course_${st.course}`] || {};
                              const passed = c.lessons.filter((l) => (cp[l.id] || {}).passed).length;
                              return (
                                <TouchableOpacity
                                  style={styles.courseCard}
                                  onPress={() => setActiveCourseId(st.course)}
                                >
                                  <Text style={styles.courseLabel}>FULL COURSE</Text>
                                  <Text style={styles.courseName}>{c.name}</Text>
                                  <Text style={styles.courseBlurb}>{c.blurb}</Text>
                                  <View style={styles.courseBarTrack}>
                                    <View
                                      style={[
                                        styles.courseBarFill,
                                        { width: `${Math.round((passed / c.lessons.length) * 100)}%` },
                                      ]}
                                    />
                                  </View>
                                  <Text style={styles.courseMeta}>
                                    {passed} of {c.lessons.length} lessons passed
                                  </Text>
                                  <Text style={styles.courseGo}>Open course →</Text>
                                </TouchableOpacity>
                              );
                            })()
                          ) : null}

                          {LESSONS[st.id] ? (
                            (() => {
                              const sp = progress[st.id] || {};
                              return (
                                <>
                                  <View style={styles.learnRow}>
                                    <TouchableOpacity
                                      style={[styles.learnBtn, sp.lessonRead && styles.learnBtnDone]}
                                      onPress={() => setActiveLessonId(st.id)}
                                    >
                                      <Text
                                        style={[
                                          styles.learnBtnText,
                                          sp.lessonRead && styles.learnBtnTextDone,
                                        ]}
                                      >
                                        {sp.lessonRead ? '✓ Lesson' : '📘 Learn'}
                                      </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={[styles.testBtn, sp.testPassed && styles.testBtnDone]}
                                      onPress={() => setActiveTestId(st.id)}
                                    >
                                      <Text
                                        style={[
                                          styles.testBtnText,
                                          sp.testPassed && styles.testBtnTextDone,
                                        ]}
                                      >
                                        {sp.testPassed
                                          ? `✓ Passed ${sp.testScore}%`
                                          : sp.testScore != null
                                          ? `Retake (${sp.testScore}%)`
                                          : '🎓 Take test'}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                </>
                              );
                            })()
                          ) : null}

                          {st.drill && DRILLS[st.drill] ? (
                            (() => {
                              const d = DRILLS[st.drill];
                              const prog = (progress[`drill_${st.drill}`] || {});
                              const stages = drillLevelCount(d);
                              const reached = (prog.bestStage || 0) + 1;
                              const acc =
                                prog.totalAnswered > 0
                                  ? Math.round((prog.totalCorrect / prog.totalAnswered) * 100)
                                  : null;
                              return (
                                <TouchableOpacity
                                  style={styles.drillCard}
                                  onPress={() => setActiveDrillId(st.drill)}
                                >
                                  <Text style={styles.drillLabel}>PRACTICE</Text>
                                  <Text style={styles.drillName}>{d.name}</Text>
                                  <View style={styles.drillBarTrack}>
                                    <View
                                      style={[
                                        styles.drillBarFill,
                                        { width: `${Math.round((reached / stages) * 100)}%` },
                                      ]}
                                    />
                                  </View>
                                  <Text style={styles.drillMeta}>
                                    Reached stage {reached} of {stages}
                                    {acc !== null ? `  ·  ${acc}% accuracy` : ''}
                                    {prog.totalAnswered ? `  ·  ${prog.totalAnswered} answered` : ''}
                                  </Text>
                                  <Text style={styles.drillGo}>Start practising →</Text>
                                </TouchableOpacity>
                              );
                            })()
                          ) : null}

                          <Text style={styles.sectionLabel}>Your notes</Text>
                          <TextInput
                            style={styles.noteInput}
                            value={(progress[st.id] && progress[st.id].note) || ''}
                            onChangeText={(v) => setNote(st.id, v)}
                            placeholder="Quotes, phone numbers, what you found out..."
                            placeholderTextColor="#9aa5b1"
                            multiline
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                })
              : null}
          </View>
        );
      })}

      <Modal
        visible={!!activeCourseId}
        animationType="slide"
        onRequestClose={() => setActiveCourseId(null)}
      >
        {activeCourseId && COURSES[activeCourseId] ? (
          <CoursePlayer
            course={COURSES[activeCourseId]}
            progress={farmingProgress ? farmingProgress[`course_${activeCourseId}`] : null}
            setProgress={(updater) =>
              setFarmingProgress((prev) => {
                const key = `course_${activeCourseId}`;
                const cur = (prev || {})[key] || {};
                const next = typeof updater === 'function' ? updater(cur) : updater;
                return { ...(prev || {}), [key]: next };
              })
            }
            onExit={() => setActiveCourseId(null)}
          />
        ) : null}
      </Modal>

      <Modal
        visible={!!activeLessonId}
        animationType="slide"
        onRequestClose={() => setActiveLessonId(null)}
      >
        {activeLessonId && LESSONS[activeLessonId] ? (
          <LessonView
            lesson={LESSONS[activeLessonId]}
            onDone={() => {
              setFarmingProgress((prev) => {
                const cur = (prev || {})[activeLessonId] || {};
                return { ...(prev || {}), [activeLessonId]: { ...cur, lessonRead: true } };
              });
              setActiveLessonId(null);
            }}
            onExit={() => setActiveLessonId(null)}
          />
        ) : null}
      </Modal>

      <Modal
        visible={!!activeTestId}
        animationType="slide"
        onRequestClose={() => setActiveTestId(null)}
      >
        {activeTestId && LESSONS[activeTestId] ? (
          <TestView
            lesson={LESSONS[activeTestId]}
            onResult={(res) =>
              setFarmingProgress((prev) => {
                const cur = (prev || {})[activeTestId] || {};
                return {
                  ...(prev || {}),
                  [activeTestId]: {
                    ...cur,
                    testScore: res.score,
                    // Passing marks the step done: mastery is demonstrated,
                    // not self-declared. A later worse retake never revokes it.
                    testPassed: cur.testPassed || res.passed,
                    done: cur.done || res.passed,
                  },
                };
              })
            }
            onExit={() => setActiveTestId(null)}
          />
        ) : null}
      </Modal>

      <Modal
        visible={!!activeDrillId}
        animationType="slide"
        onRequestClose={() => setActiveDrillId(null)}
      >
        {activeDrillId && DRILLS[activeDrillId] ? (
          <DrillSession
            drill={DRILLS[activeDrillId]}
            saved={farmingProgress ? farmingProgress[`drill_${activeDrillId}`] : null}
            onSave={(data) =>
              setFarmingProgress((prev) => ({
                ...(prev || {}),
                [`drill_${activeDrillId}`]: data,
              }))
            }
            onExit={() => setActiveDrillId(null)}
          />
        ) : null}
      </Modal>

      <View style={shared.block}>
        <Text style={styles.disclaimer}>
          This is a general framework, not local advice. Zoning, licensing,
          animal welfare rules, water rights, and what you can legally sell
          vary a great deal by country, state, and county — confirm anything
          regulatory with your local agricultural authority or extension
          office before committing money to it.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backLink: { paddingVertical: 6, marginBottom: 4 },
  backLinkText: { color: GOLD, fontSize: 14, fontWeight: '700' },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overallLabel: { color: DIM, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  overallPct: { color: GOLD, fontSize: 18, fontWeight: '800' },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0c1117',
    overflow: 'hidden',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#05070a',
  },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: GOLD },
  overallMeta: { color: DIM, fontSize: 12, marginTop: 8 },

  nextCard: {
    backgroundColor: 'rgba(217,164,65,0.14)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD,
    padding: 14,
    marginBottom: 16,
  },
  nextLabel: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  nextTitle: { color: INK, fontSize: 16, fontWeight: '700', marginTop: 4 },
  nextPhase: { color: DIM, fontSize: 12, marginTop: 2 },

  phaseHead: { flexDirection: 'row', alignItems: 'center' },
  phaseIcon: { fontSize: 22, marginRight: 12 },
  phaseName: { color: INK, fontSize: 16, fontWeight: '700' },
  phaseBlurb: { color: DIM, fontSize: 12, marginTop: 2 },
  phaseCount: { color: GOLD, fontSize: 13, fontWeight: '700', marginHorizontal: 10 },
  phaseChevron: { color: DIM, fontSize: 12 },
  phaseBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0c1117',
    overflow: 'hidden',
    marginTop: 10,
  },
  phaseBarFill: { height: '100%', borderRadius: 2, backgroundColor: GOLD },

  courseCard: {
    backgroundColor: 'rgba(120,200,140,0.12)',
    borderWidth: 1, borderColor: '#4f9e5c', borderRadius: 12,
    padding: 14, marginTop: 16,
  },
  courseLabel: { color: '#4f9e5c', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  courseName: { color: INK, fontSize: 16, fontWeight: '800', marginTop: 4 },
  courseBlurb: { color: DIM, fontSize: 12, lineHeight: 18, marginTop: 4 },
  courseBarTrack: {
    height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden', marginTop: 10,
  },
  courseBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#4f9e5c' },
  courseMeta: { color: DIM, fontSize: 11, marginTop: 7 },
  courseGo: { color: '#4f9e5c', fontSize: 13, fontWeight: '800', marginTop: 10 },
  learnRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  learnBtn: {
    flex: 1, borderWidth: 1, borderColor: '#5ab4e6', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  learnBtnDone: { backgroundColor: 'rgba(90,180,230,0.18)' },
  learnBtnText: { color: '#5ab4e6', fontSize: 13, fontWeight: '800' },
  learnBtnTextDone: { color: '#9fd4f0' },
  testBtn: {
    flex: 1, borderWidth: 1, borderColor: '#4f9e5c', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  testBtnDone: { backgroundColor: 'rgba(79,158,92,0.2)' },
  testBtnText: { color: '#4f9e5c', fontSize: 13, fontWeight: '800' },
  testBtnTextDone: { color: '#7fc98d' },
  drillCard: {
    backgroundColor: 'rgba(217,164,65,0.12)',
    borderWidth: 1, borderColor: GOLD, borderRadius: 12,
    padding: 14, marginTop: 16,
  },
  drillLabel: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  drillName: { color: INK, fontSize: 15, fontWeight: '800', marginTop: 4 },
  drillBarTrack: {
    height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden', marginTop: 10,
  },
  drillBarFill: { height: '100%', borderRadius: 3, backgroundColor: GOLD },
  drillMeta: { color: DIM, fontSize: 11, marginTop: 7 },
  drillGo: { color: GOLD, fontSize: 13, fontWeight: '800', marginTop: 10 },
  projectCard: {
    backgroundColor: 'rgba(90,180,230,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(90,180,230,0.5)',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  projectLabel: { color: '#5ab4e6', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  projectName: { color: INK, fontSize: 16, fontWeight: '800', marginTop: 4 },
  projectDetail: { color: '#c3ccd6', fontSize: 13, lineHeight: 20, marginTop: 6 },
  partsLabel: {
    color: DIM, fontSize: 11, fontWeight: '800',
    textTransform: 'uppercase', marginTop: 14, marginBottom: 6,
  },
  partItem: { color: '#c3ccd6', fontSize: 13, lineHeight: 20 },
  buildPhoto: { width: '100%', height: 180, borderRadius: 10, marginTop: 12 },
  photoRemove: { color: ROSE, fontSize: 12, fontWeight: '600', marginTop: 8 },
  photoBtn: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 12,
  },
  photoBtnText: { color: '#5ab4e6', fontSize: 12, fontWeight: '700' },
  buildBtn: {
    borderWidth: 1, borderColor: '#5ab4e6', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 10,
  },
  buildBtnDone: { backgroundColor: '#5ab4e6' },
  buildBtnText: { color: '#5ab4e6', fontSize: 13, fontWeight: '800' },
  buildBtnTextDone: { color: '#fff' },
  paceLine: { color: DIM, fontSize: 11, fontWeight: '600', marginTop: 12, fontStyle: 'italic' },
  stepWrap: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12, marginTop: 12 },
  stepHead: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: GOLD,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: GOLD },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepTitle: { color: INK, fontSize: 15, fontWeight: '600' },
  stepTitleDone: { color: DIM, textDecorationLine: 'line-through' },
  stepPeek: { color: DIM, fontSize: 12, marginTop: 3, lineHeight: 17 },
  stepBody: { marginTop: 12, marginLeft: 32 },
  stepDetail: { color: '#c3ccd6', fontSize: 14, lineHeight: 21 },

  sectionLabel: {
    color: DIM,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  actionNum: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    width: 18,
    marginTop: 1,
  },
  actionText: { flex: 1, color: INK, fontSize: 14, lineHeight: 20 },

  watchBox: {
    backgroundColor: 'rgba(234,90,95,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: ROSE,
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
  },
  watchLabel: { color: ROSE, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  watchText: { color: '#d6c2c4', fontSize: 13, lineHeight: 19 },

  doneBox: {
    backgroundColor: 'rgba(79,158,92,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#4f9e5c',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  doneLabel: { color: '#4f9e5c', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  doneText: { color: '#c2d0c4', fontSize: 13, lineHeight: 19 },

  noteInput: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: INK,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  disclaimer: { color: DIM, fontSize: 12, lineHeight: 19 },
});

