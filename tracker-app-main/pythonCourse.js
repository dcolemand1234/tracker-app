import { PY_LESSON_1 } from './pyLesson1';
import { PY_LESSON_2 } from './pyLesson2';
import { PY_LESSON_3 } from './pyLesson3';
import { PYTHON_DAYS } from './pythonCurriculum';

export const PYTHON_COURSE = {
  days: PYTHON_DAYS,
  id: 'python_basics',
  name: 'Python for Robotics',
  blurb: 'From nothing to writing the kind of Python robotics actually uses.',
  lessons: [
    PY_LESSON_1,
    PY_LESSON_2,
    PY_LESSON_3,
  ],
};
