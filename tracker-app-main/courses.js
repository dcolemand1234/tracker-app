import { PYTHON_COURSE } from './pythonCourse';
import { MATH_COURSE } from './mathCourse';

// One place every course is registered. A roadmap phase names a course
// id; this maps it to the content.
export const COURSES = {
  python_basics: PYTHON_COURSE,
  math_core: MATH_COURSE,
};

export function courseProgressFor(course, progress) {
  const p = (progress || {})[`course_${course.id}`] || {};
  const passed = course.lessons.filter((l) => (p[l.id] || {}).passed).length;
  // Total is the full curriculum length (e.g. all 100 Python days), not just
  // how many lessons have been written so far. Otherwise finishing the 2
  // lessons that exist would read as 100% on a course that is 2% built.
  const total = course.days ? course.days.length : course.lessons.length;
  return { passed, total, pct: Math.round((passed / total) * 100) };
}

// The first lesson not yet passed — what "continue" should open.
export function nextLessonFor(course, progress) {
  const p = (progress || {})[`course_${course.id}`] || {};
  return course.lessons.find((l) => !(p[l.id] || {}).passed) || null;
}

