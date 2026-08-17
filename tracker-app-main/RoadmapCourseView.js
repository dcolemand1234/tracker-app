import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import { pickCompressedImage } from './imagePicker';
import { COURSES, courseProgressFor, nextLessonFor } from './courses';
import { ROBOTICS_PHASES, currentPhase, roadmapStats } from './roboticsRoadmap';
import CoursePlayer from './CoursePlayer';

// The roadmap is a sequence of courses. Opening it drops you straight
// back where you stopped rather than making you hunt for your place —
// that was the point of building it as a curriculum rather than a list.
export default function RoadmapCourseView({ guide, progress, setProgress, onBack }) {
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [openPhaseId, setOpenPhaseId] = useState(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [trackOpenId, setTrackOpenId] = useState(null); // per-phase tracker, not the global modal

  const prog = progress || {};
  const stats = roadmapStats(prog);
  const here = currentPhase(prog);
  const hereCourse = here.course ? COURSES[here.course] : null;
  const hereLesson = hereCourse ? nextLessonFor(hereCourse, prog) : null;

  function saveCourse(courseId, updater) {
    setProgress((prev) => {
      const key = `course_${courseId}`;
      const cur = (prev || {})[key] || {};
      const next = typeof updater === 'function' ? updater(cur) : updater;
      return { ...(prev || {}), [key]: next };
    });
  }

  function togglePhaseFlag(phaseId, flag) {
    setProgress((prev) => {
      const cur = (prev || {})[phaseId] || {};
      return { ...(prev || {}), [phaseId]: { ...cur, [flag]: !cur[flag] } };
    });
  }

  async function attachPhotoTo(phaseId) {
    const uri = await pickCompressedImage();
    if (!uri) return;
    setProgress((prev) => {
      const cur = (prev || {})[phaseId] || {};
      return { ...(prev || {}), [phaseId]: { ...cur, photo: uri } };
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <TouchableOpacity onPress={onBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>‹ All Roadmaps</Text>
        </TouchableOpacity>

        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={shared.h1}>{guide.name}</Text>
            <Text style={shared.tagline}>{guide.tagline}</Text>
          </View>
          <TouchableOpacity style={styles.progBtn} onPress={() => setProgressOpen(true)}>
            <Text style={styles.progBtnText}>📊 Progress</Text>
          </TouchableOpacity>
        </View>

        {/* Resume card — the main entry point */}
        <TouchableOpacity
          style={styles.resumeCard}
          onPress={() => {
            if (here.course) setActiveCourseId(here.course);
            else setOpenPhaseId(here.id);
          }}
        >
          <Text style={styles.resumeLabel}>CONTINUE WHERE YOU LEFT OFF</Text>
          <Text style={styles.resumePhase}>
            {here.icon} {here.name}
          </Text>
          <Text style={styles.resumeLesson}>
            {hereLesson
              ? hereLesson.title
              : here.course
              ? 'Course complete — start the project'
              : 'Course coming soon — the project is ready now'}
          </Text>
          <View style={styles.resumeGo}>
            <Text style={styles.resumeGoText}>
              {hereLesson ? 'Continue lesson →' : 'Open phase →'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.overallBarTrack}>
          <View style={[styles.overallBarFill, { width: `${stats.pct}%` }]} />
        </View>
        <Text style={styles.overallMeta}>
          {stats.passed} of {stats.lessons} lessons · {stats.projects} of{' '}
          {stats.totalProjects} projects built
        </Text>

        {ROBOTICS_PHASES.map((ph, i) => {
          const course = ph.course ? COURSES[ph.course] : null;
          const cp = course ? courseProgressFor(course, prog) : null;
          const nextL = course ? nextLessonFor(course, prog) : null;
          const nextDay =
            course && course.days && nextL
              ? course.days.find((d) => d.id === nextL.id)
              : null;
          const pd = prog[ph.id] || {};
          const expanded = openPhaseId === ph.id;
          const isHere = ph.id === here.id;
          return (
            <View key={ph.id} style={[styles.phase, isHere && styles.phaseHere]}>
              <TouchableOpacity
                style={styles.phaseHead}
                onPress={() => setOpenPhaseId(expanded ? null : ph.id)}
              >
                <Text style={styles.phaseIcon}>{ph.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.phaseName}>
                    {i + 1}. {ph.name}
                  </Text>
                  <Text style={styles.phaseBlurb}>{ph.blurb}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {cp ? (
                    <Text style={[styles.phasePct, cp.pct === 100 && styles.phaseDone]}>
                      {cp.pct}%
                    </Text>
                  ) : (
                    <Text style={styles.phaseSoon}>soon</Text>
                  )}
                  <Text style={styles.phasePace}>{ph.pace}</Text>
                </View>
              </TouchableOpacity>

              {cp ? (
                <View style={styles.phaseBarTrack}>
                  <View style={[styles.phaseBarFill, { width: `${cp.pct}%` }]} />
                </View>
              ) : null}

              {expanded ? (
                <View style={styles.phaseBody}>
                  {course ? (
                    <TouchableOpacity
                      style={styles.courseBtn}
                      onPress={() => setActiveCourseId(ph.course)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.courseBtnText}>
                        📚 {course.name} —{' '}
                        {course.days
                          ? nextDay
                            ? `Day ${nextDay.day} of ${cp.total}`
                            : `${cp.passed}/${cp.total} days complete`
                          : `${cp.passed}/${cp.total} lessons`}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.soonNote}>
                      The course for this phase is not written yet. The project
                      below is still worth starting once you reach it.
                    </Text>
                  )}

                  {course ? (
                    <TouchableOpacity
                      style={styles.trackBtn}
                      onPress={() =>
                        setTrackOpenId(trackOpenId === ph.id ? null : ph.id)
                      }
                      activeOpacity={0.75}
                    >
                      <Text style={styles.trackBtnText}>
                        📈 {trackOpenId === ph.id ? 'Hide' : 'Track'} progress
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {course && trackOpenId === ph.id ? (
                    <View style={styles.trackList}>
                      {course.lessons.map((l) => {
                        const lp = (prog[`course_${course.id}`] || {})[l.id] || {};
                        const d = course.days
                          ? course.days.find((x) => x.id === l.id)
                          : null;
                        return (
                          <View key={l.id} style={styles.lessonRow}>
                            <Text style={styles.lessonMark}>
                              {lp.passed ? '✓' : lp.score != null ? '·' : '○'}
                            </Text>
                            <Text
                              style={[
                                styles.lessonName,
                                lp.passed && styles.lessonNameDone,
                              ]}
                            >
                              {d ? `Day ${d.day}: ${l.title}` : l.title}
                            </Text>
                            {lp.score != null ? (
                              <Text
                                style={[styles.lessonScore, lp.passed && styles.phaseDone]}
                              >
                                {lp.score}%
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                      {course.days && course.days.length > course.lessons.length ? (
                        <Text style={styles.trackMoreNote}>
                          {course.days.length - course.lessons.length} more days planned,
                          not written yet
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {(() => {
                    // Locked until every lesson in the course is passed. If
                    // there's no course yet, the project stays open — nothing
                    // to gate it on.
                    const locked = !!(course && cp.passed < cp.total);
                    const remaining = course ? cp.total - cp.passed : 0;

                    return (
                      <TouchableOpacity
                        style={[styles.projectCard, locked && styles.projectCardLocked]}
                        activeOpacity={locked ? 0.75 : 1}
                        disabled={!locked}
                        onPress={() => {
                          if (locked) setActiveCourseId(ph.course);
                        }}
                      >
                        <View style={styles.projectHeadRow}>
                          <Text style={styles.projectLabel}>PROJECT</Text>
                          {locked ? <Text style={styles.lockIcon}>🔒</Text> : null}
                        </View>
                        <Text
                          style={[styles.projectName, locked && styles.projectNameLocked]}
                        >
                          {ph.project.name}
                        </Text>
                        <Text
                          style={[
                            styles.projectDetail,
                            locked && styles.projectDetailLocked,
                          ]}
                        >
                          {ph.project.detail}
                        </Text>

                        {locked ? (
                          <View style={styles.lockedNote}>
                            <Text style={styles.lockedNoteText}>
                              Complete {remaining} more lesson{remaining === 1 ? '' : 's'}{' '}
                              to unlock this project →
                            </Text>
                          </View>
                        ) : (
                          <>
                            {pd.photo ? (
                              <>
                                <Image
                                  source={{ uri: pd.photo }}
                                  style={styles.buildPhoto}
                                />
                                <TouchableOpacity onPress={() => attachPhotoTo(ph.id)}>
                                  <Text style={styles.photoLink}>Change photo</Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              <TouchableOpacity
                                style={styles.photoBtn}
                                onPress={() => attachPhotoTo(ph.id)}
                              >
                                <Text style={styles.photoBtnText}>
                                  📷 Add a photo of your build
                                </Text>
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              style={[
                                styles.buildBtn,
                                pd.buildDone && styles.buildBtnDone,
                              ]}
                              onPress={() => togglePhaseFlag(ph.id, 'buildDone')}
                            >
                              <Text
                                style={[
                                  styles.buildBtnText,
                                  pd.buildDone && styles.buildBtnTextDone,
                                ]}
                              >
                                {pd.buildDone ? '✓ Project built' : 'Mark project built'}
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Course player */}
      <Modal
        visible={!!activeCourseId}
        animationType="slide"
        onRequestClose={() => setActiveCourseId(null)}
      >
        {activeCourseId && COURSES[activeCourseId] ? (
          <CoursePlayer
            course={COURSES[activeCourseId]}
            progress={prog[`course_${activeCourseId}`]}
            setProgress={(u) => saveCourse(activeCourseId, u)}
            onExit={() => setActiveCourseId(null)}
          />
        ) : null}
      </Modal>

      {/* Progress report */}
      <Modal
        visible={progressOpen}
        animationType="slide"
        onRequestClose={() => setProgressOpen(false)}
      >
        <View style={styles.progWrap}>
          <TouchableOpacity style={styles.exitBtn} onPress={() => setProgressOpen(false)}>
            <Text style={styles.exitText}>✕</Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.progScroll}>
            <Text style={styles.progKicker}>PROGRESS</Text>
            <Text style={styles.progTitle}>{guide.name}</Text>

            <View style={styles.bigStatRow}>
              <View style={styles.bigStat}>
                <Text style={styles.bigStatNum}>{stats.pct}%</Text>
                <Text style={styles.bigStatLabel}>lessons passed</Text>
              </View>
              <View style={styles.bigStat}>
                <Text style={styles.bigStatNum}>{stats.projects}</Text>
                <Text style={styles.bigStatLabel}>projects built</Text>
              </View>
            </View>

            <Text style={styles.progSection}>By phase</Text>
            {ROBOTICS_PHASES.map((ph) => {
              const course = ph.course ? COURSES[ph.course] : null;
              const cp = course ? courseProgressFor(course, prog) : null;
              const pd = prog[ph.id] || {};
              return (
                <View key={ph.id} style={styles.progRow}>
                  <Text style={styles.progIcon}>{ph.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.progName}>{ph.name}</Text>
                    <Text style={styles.progDetail}>
                      {cp ? `${cp.passed}/${cp.total} lessons` : 'course coming'}
                      {pd.buildDone ? ' · project built' : ''}
                    </Text>
                  </View>
                  <Text style={[styles.progPct, cp && cp.pct === 100 && styles.phaseDone]}>
                    {cp ? `${cp.pct}%` : '—'}
                  </Text>
                </View>
              );
            })}

            {/* Per-lesson detail for courses that exist */}
            {ROBOTICS_PHASES.filter((ph) => ph.course && COURSES[ph.course]).map((ph) => {
              const course = COURSES[ph.course];
              const cprog = prog[`course_${course.id}`] || {};
              return (
                <View key={ph.id}>
                  <Text style={styles.progSection}>{course.name}</Text>
                  {course.lessons.map((l) => {
                    const lp = cprog[l.id] || {};
                    return (
                      <View key={l.id} style={styles.lessonRow}>
                        <Text style={styles.lessonMark}>
                          {lp.passed ? '✓' : lp.score != null ? '·' : '○'}
                        </Text>
                        <Text
                          style={[styles.lessonName, lp.passed && styles.lessonNameDone]}
                        >
                          {l.title}
                        </Text>
                        {lp.score != null ? (
                          <Text style={[styles.lessonScore, lp.passed && styles.phaseDone]}>
                            {lp.score}%
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { paddingVertical: 6, marginBottom: 4 },
  backLinkText: { color: GOLD, fontSize: 14, fontWeight: '700' },
  headRow: { flexDirection: 'row', alignItems: 'flex-start' },
  progBtn: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4,
  },
  progBtnText: { color: INK, fontSize: 12, fontWeight: '700' },
  resumeCard: {
    backgroundColor: 'rgba(217,164,65,0.14)',
    borderWidth: 1, borderColor: GOLD, borderRadius: 14,
    padding: 16, marginTop: 16,
  },
  resumeLabel: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  resumePhase: { color: INK, fontSize: 20, fontWeight: '800', marginTop: 6 },
  resumeLesson: { color: '#c3ccd6', fontSize: 14, marginTop: 3 },
  resumeGo: { marginTop: 12 },
  resumeGoText: { color: GOLD, fontSize: 14, fontWeight: '800' },
  overallBarTrack: {
    height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginTop: 18,
  },
  overallBarFill: { height: '100%', borderRadius: 4, backgroundColor: GOLD },
  overallMeta: { color: DIM, fontSize: 12, marginTop: 7, marginBottom: 6 },
  phase: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginTop: 10,
  },
  phaseHere: { borderColor: GOLD },
  phaseHead: { flexDirection: 'row', alignItems: 'center' },
  phaseIcon: { fontSize: 22, marginRight: 12 },
  phaseName: { color: INK, fontSize: 15, fontWeight: '700' },
  phaseBlurb: { color: DIM, fontSize: 12, marginTop: 2 },
  phasePct: { color: GOLD, fontSize: 14, fontWeight: '800' },
  phaseDone: { color: '#4f9e5c' },
  phaseSoon: { color: DIM, fontSize: 11, fontWeight: '700' },
  phasePace: { color: DIM, fontSize: 10, marginTop: 2 },
  phaseBarTrack: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginTop: 10,
  },
  phaseBarFill: { height: '100%', borderRadius: 2, backgroundColor: GOLD },
  phaseBody: { marginTop: 14 },
  courseBtn: {
    backgroundColor: 'rgba(120,200,140,0.14)',
    borderWidth: 1, borderColor: '#4f9e5c', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  courseBtnText: { color: '#4f9e5c', fontSize: 13, fontWeight: '800' },
  soonNote: { color: DIM, fontSize: 12, lineHeight: 18 },
  trackBtn: {
    backgroundColor: 'rgba(217,164,65,0.12)',
    borderWidth: 1, borderColor: 'rgba(217,164,65,0.5)', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 8,
  },
  trackBtnText: { color: GOLD, fontSize: 12, fontWeight: '800' },
  trackList: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingTop: 2, marginTop: 8,
  },
  trackMoreNote: { color: DIM, fontSize: 11, paddingVertical: 10, textAlign: 'center' },
  projectCard: {
    backgroundColor: 'rgba(90,180,230,0.10)',
    borderWidth: 1, borderColor: 'rgba(90,180,230,0.5)',
    borderRadius: 12, padding: 14, marginTop: 12,
  },
  projectCardLocked: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: BORDER,
  },
  projectHeadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  lockIcon: { fontSize: 13 },
  projectLabel: { color: '#5ab4e6', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  projectName: { color: INK, fontSize: 15, fontWeight: '800', marginTop: 4 },
  projectNameLocked: { color: DIM },
  projectDetail: { color: '#c3ccd6', fontSize: 13, lineHeight: 20, marginTop: 6 },
  projectDetailLocked: { color: DIM },
  lockedNote: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', marginTop: 12,
  },
  lockedNoteText: { color: DIM, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  buildPhoto: { width: '100%', height: 170, borderRadius: 10, marginTop: 12 },
  photoLink: { color: DIM, fontSize: 12, marginTop: 8 },
  photoBtn: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 12,
  },
  photoBtnText: { color: '#5ab4e6', fontSize: 12, fontWeight: '700' },
  buildBtn: {
    borderWidth: 1, borderColor: '#5ab4e6', borderRadius: 10,
    paddingVertical: 11, alignItems: 'center', marginTop: 10,
  },
  buildBtnDone: { backgroundColor: '#5ab4e6' },
  buildBtnText: { color: '#5ab4e6', fontSize: 13, fontWeight: '800' },
  buildBtnTextDone: { color: '#fff' },
  progWrap: { flex: 1, backgroundColor: '#0d141c' },
  progScroll: { padding: 20, paddingTop: 60, paddingBottom: 50 },
  exitBtn: {
    position: 'absolute', top: 44, right: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  exitText: { color: '#fff', fontSize: 18 },
  progKicker: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  progTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  bigStatRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  bigStat: {
    flex: 1, backgroundColor: CARD, borderRadius: 12, borderWidth: 1,
    borderColor: BORDER, padding: 16, alignItems: 'center',
  },
  bigStatNum: { color: GOLD, fontSize: 30, fontWeight: '800' },
  bigStatLabel: { color: DIM, fontSize: 11, marginTop: 3 },
  progSection: {
    color: DIM, fontSize: 11, fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 26, marginBottom: 8,
  },
  progRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  progIcon: { fontSize: 18, width: 30 },
  progName: { color: INK, fontSize: 14, fontWeight: '700' },
  progDetail: { color: DIM, fontSize: 11, marginTop: 2 },
  progPct: { color: GOLD, fontSize: 14, fontWeight: '800' },
  lessonRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 7,
  },
  lessonMark: { color: GOLD, fontSize: 13, width: 22, fontWeight: '800' },
  lessonName: { flex: 1, color: INK, fontSize: 13 },
  lessonNameDone: { color: DIM },
  lessonScore: { color: DIM, fontSize: 12, fontWeight: '700' },
});
