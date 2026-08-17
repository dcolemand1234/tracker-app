import { COURSES } from './courses';

// Order corrected against current robotics roadmaps (checked 2026): every
// source puts Python + maths + Linux together first, linear algebra first
// within the maths, then ROS 2 and simulation early. Electronics and
// mechanical come later because robotics *software* is where the roles
// are — the earlier version had them ahead of ROS, which suits a hardware
// track and delays the skills that actually appear in job postings.
//
// A phase is a course plus a project. The course teaches, the project
// proves it. Phases without a course yet are marked so the roadmap is
// honest about what is built and what is coming.

export const ROBOTICS_PHASES = [
  {
    id: 'p_python',
    name: 'Python',
    icon: '🐍',
    pace: '2-3 months',
    blurb: 'The language robotics is written in.',
    course: 'python_basics',
    project: {
      name: 'Sensor log analyser',
      detail:
        'Read a file of numbers, filter out bad readings, compute average, min, max, and print a summary. Uses lists, loops, functions, and error handling together — everything the course covers, in one small program.',
    },
  },
  {
    id: 'p_math',
    name: 'Maths',
    icon: '📐',
    pace: '3-4 months',
    blurb: 'Fractions through calculus, aimed at robot motion.',
    course: 'math_core',
    project: {
      name: 'Rotate a point, by hand then in code',
      detail:
        'Work out a 90° and a 45° rotation on paper using the rotation matrix, then reproduce both in Python with numpy and check they agree. If they differ, you have found a real gap.',
    },
  },
  {
    id: 'p_linux',
    name: 'Linux & Git',
    icon: '🐧',
    pace: '3-4 weeks',
    blurb: 'The environment every robot runs in.',
    course: null,
    project: {
      name: 'Set up a working Ubuntu dev environment',
      detail:
        'Install Ubuntu, get comfortable in the terminal, set up SSH keys, and put a project on GitHub with meaningful commits and a branch you merge.',
    },
  },
  {
    id: 'p_ros',
    name: 'ROS 2',
    icon: '🤖',
    pace: '4-6 months',
    blurb: 'The framework professional robotics is built on.',
    course: null,
    project: {
      name: 'Multi-node robot package',
      detail:
        'Publisher, subscriber, a service, and a launch file that starts them together. The structure every real ROS project uses.',
    },
  },
  {
    id: 'p_sim',
    name: 'Simulation',
    icon: '🌐',
    pace: '2-3 months',
    blurb: 'Test without breaking hardware.',
    course: null,
    project: {
      name: 'URDF robot driving in Gazebo',
      detail:
        'Describe a differential-drive robot, spawn it with physics, add a simulated LiDAR, and drive it with teleop while watching the data in RViz.',
    },
  },
  {
    id: 'p_control',
    name: 'Control',
    icon: '🎛️',
    pace: '3-5 months',
    blurb: 'Making the robot do what you asked, precisely.',
    course: null,
    project: {
      name: 'Self-balancing robot',
      detail:
        'IMU, two wheels, and a PID loop holding it upright. The clearest possible demonstration that you understand feedback control.',
    },
  },
  {
    id: 'p_percep',
    name: 'Perception',
    icon: '👁️',
    pace: '3-5 months',
    blurb: 'Turning camera and LiDAR data into understanding.',
    course: null,
    project: {
      name: 'Vision-guided pick and place',
      detail:
        'A camera locates an object, converts its position into robot coordinates, and an arm picks it up. Combines vision, calibration, and kinematics.',
    },
  },
  {
    id: 'p_nav',
    name: 'Navigation',
    icon: '🗺️',
    pace: '3-5 months',
    blurb: 'Robots that decide where to go and get there.',
    course: null,
    project: {
      name: 'Autonomous mapping robot',
      detail:
        'Map an unknown room with SLAM, then navigate to a chosen point while avoiding obstacles that were not on the map.',
    },
  },
  {
    id: 'p_embedded',
    name: 'Electronics & Embedded',
    icon: '⚡',
    pace: '3-4 months',
    blurb: 'Where software meets moving parts.',
    course: null,
    project: {
      name: 'Line-following robot',
      detail:
        'Motors, driver, sensors, and a proportional control loop on a microcontroller. Hardware fundamentals in one build.',
    },
  },
  {
    id: 'p_career',
    name: 'Portfolio & Career',
    icon: '💼',
    pace: 'Ongoing',
    blurb: 'Turning capability into a job.',
    course: null,
    project: {
      name: 'One substantial documented project',
      detail:
        'One robot done properly and written up thoroughly beats five half-finished ones. Include the design decisions and what failed.',
    },
  },
];

export const ROBOTICS_GUIDE = {
  id: 'robotics',
  name: 'Robotics Engineering',
  icon: '🤖',
  tagline: 'From zero to employable, taught step by step',
  phases: ROBOTICS_PHASES,
};

// Overall position: the first phase whose course is not finished.
export function currentPhase(progress) {
  for (const ph of ROBOTICS_PHASES) {
    if (!ph.course) return ph;
    const c = COURSES[ph.course];
    if (!c) return ph;
    const p = (progress || {})[`course_${c.id}`] || {};
    if (c.lessons.some((l) => !(p[l.id] || {}).passed)) return ph;
  }
  return ROBOTICS_PHASES[ROBOTICS_PHASES.length - 1];
}

export function roadmapStats(progress) {
  let lessons = 0;
  let passed = 0;
  ROBOTICS_PHASES.forEach((ph) => {
    if (!ph.course || !COURSES[ph.course]) return;
    const c = COURSES[ph.course];
    const p = (progress || {})[`course_${c.id}`] || {};
    lessons += c.lessons.length;
    passed += c.lessons.filter((l) => (p[l.id] || {}).passed).length;
  });
  const projects = ROBOTICS_PHASES.filter(
    (ph) => ((progress || {})[ph.id] || {}).buildDone
  ).length;
  return {
    lessons,
    passed,
    pct: lessons ? Math.round((passed / lessons) * 100) : 0,
    projects,
    totalProjects: ROBOTICS_PHASES.length,
  };
}

