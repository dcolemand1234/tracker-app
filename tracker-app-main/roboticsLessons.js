// Every step gets three things: a lesson to read, drills to practise
// (where a generator makes sense), and a test that decides whether the
// step counts as mastered. The test is what makes this a curriculum
// rather than a checklist — you cannot tick a step off by deciding you
// probably know it.
//
// Pass mark is deliberately high. These are foundations everything else
// stands on, and 60% understanding of linear algebra becomes 0%
// understanding of kinematics later.

export const PASS_MARK = 0.8;

export const LESSONS = {
  // ---------- Foundations ----------
  rf1: {
    title: 'Learn Python properly',
    summary:
      'Python is the entry language for robotics: ROS tooling, vision, and ML all use it. What matters is not syntax recall but being able to structure a program — split work into functions, model things as classes, and read an error trace back to its cause.',
    keyPoints: [
      ['Functions over repetition', 'If you have copied a block twice, it should be a function. Functions take arguments and return values; keeping them small and single-purpose is what makes larger programs debuggable.'],
      ['Classes model things', 'A class bundles data with the operations on it. A Robot class holding position and a move() method is easier to reason about than loose variables and functions.'],
      ['numpy is not optional', 'Robotics maths is array maths. numpy arrays support element-wise operations and matrix multiplication directly, and are dramatically faster than Python lists.'],
      ['Read the traceback bottom-up', 'The last line names the error; the lines above show the call path. Most beginners panic at the wall of text instead of reading the final line.'],
    ],
    worked: {
      title: 'Reading an error',
      body: 'IndexError: list index out of range on line 12 means you asked for an element that does not exist — usually looping to len(x) inclusive rather than exclusive, or an empty list you assumed had contents. Print len() before the access and the cause is usually immediate.',
    },
    test: [
      { q: 'You have copied the same 6 lines into three places. What should you do?', options: ['Leave it, it works', 'Extract it into a function', 'Make it a class', 'Add a comment'], correct: 1, why: 'Repeated code means three places to fix a bug. A function gives one.' },
      { q: 'Why use numpy arrays instead of Python lists for robotics maths?', options: ['They look nicer', 'Element-wise and matrix operations, and far faster', 'They use less memory only', 'They are required by Python'], correct: 1, why: 'numpy supports vector and matrix maths directly, which is exactly what kinematics and vision need.' },
      { q: 'Which line of a traceback names the actual error?', options: ['The first line', 'The last line', 'The middle', 'It varies randomly'], correct: 1, why: 'The last line gives the error type and message; the lines above trace how you got there.' },
      { q: 'What is the clearest sign you have not learned a concept yet?', options: ['You cannot write it from a blank file', 'You did not enjoy it', 'It took over an hour', 'You needed numpy'], correct: 0, why: 'Following along feels like learning. Reproducing it unaided is the actual test.' },
    ],
  },
  rf2: {
    title: 'Linear algebra',
    summary:
      'This is the mathematics of where things are and which way they point. A vector is a direction and magnitude; a matrix transforms vectors. Robot arms, camera projections, and coordinate frames are all matrix operations.',
    keyPoints: [
      ['Vectors are positions or directions', 'In robotics a 3-vector usually means a point in space or a direction. The dot product tells you how aligned two directions are; the cross product gives a perpendicular.'],
      ['Matrices transform', 'Multiplying a vector by a matrix rotates, scales, or shears it. A rotation matrix is a special matrix that changes direction without changing length.'],
      ['Order matters', 'Matrix multiplication is not commutative: AB ≠ BA. Rotating then translating gives a different result from translating then rotating — a very common robotics bug.'],
      ['Homogeneous transforms combine both', 'A 4×4 matrix packs rotation and translation together so a chain of joints becomes one multiplication. This is why arm kinematics is tractable at all.'],
    ],
    worked: {
      title: 'Rotating a point 90°',
      body: 'Rotating [3, 4] by 90° about the origin: x\' = x·cos90 − y·sin90 = 0 − 4 = −4, y\' = x·sin90 + y·cos90 = 3 + 0 = 3. Result [−4, 3]. Note the length is unchanged — 5 before, 5 after. Rotation preserves magnitude, which is a useful sanity check.',
    },
    test: [
      { q: 'Does AB equal BA for matrices?', options: ['Always', 'Never', 'Not in general', 'Only for rotations'], correct: 2, why: 'Matrix multiplication is not commutative. Rotate-then-translate differs from translate-then-rotate.' },
      { q: 'What does a rotation matrix preserve?', options: ['Direction', 'Magnitude', 'Position', 'Nothing'], correct: 1, why: 'Rotation changes direction but never length — a handy check that your matrix is correct.' },
      { q: 'Why are 4×4 homogeneous transforms used for robot arms?', options: ['They are faster', 'They combine rotation and translation in one matrix', 'They are easier to invert', 'Convention only'], correct: 1, why: 'Packing both means a chain of joints becomes a single chain of multiplications.' },
      { q: 'The dot product of two unit vectors is 0. What does that mean?', options: ['They are identical', 'They are perpendicular', 'They are opposite', 'One is zero'], correct: 1, why: 'Dot product is |a||b|cosθ. Zero means cosθ = 0, so θ = 90°.' },
    ],
  },
  rf3: {
    title: 'Calculus and physics',
    summary:
      'Derivatives are rates of change — position to velocity to acceleration. Control systems are built on this. Physics gives you torque and inertia, which decide whether a design can physically do what you want.',
    keyPoints: [
      ['Derivative = rate of change', 'The derivative of position is velocity; of velocity, acceleration. A PID controller\'s D term is literally a derivative of error.'],
      ['Integral = accumulation', 'The integral of velocity is distance travelled. A PID\'s I term accumulates error the same way.'],
      ['Torque is force times distance', 'τ = F × r. A motor lifting 2kg at 0.3m needs 2 × 9.81 × 0.3 ≈ 5.9 N·m, before friction and safety margin.'],
      ['Gearing trades speed for torque', 'A 5:1 reduction multiplies torque by 5 and divides speed by 5. Power stays roughly constant, minus losses.'],
    ],
    worked: {
      title: 'Sizing a motor',
      body: 'An arm must lift 1.5kg at 0.4m. τ = 1.5 × 9.81 × 0.4 = 5.89 N·m. Add 50% margin for friction, acceleration, and error: ~8.8 N·m. If your motor gives 2 N·m, you need at least a 5:1 reduction. Skipping the margin is why arms that "should" work sag.',
    },
    test: [
      { q: 'The D term in a PID controller corresponds to what mathematically?', options: ['An integral', 'A derivative of error', 'A constant', 'A square root'], correct: 1, why: 'D responds to how fast the error is changing — the derivative.' },
      { q: 'Lifting 2kg at 0.5m from the pivot needs roughly what torque?', options: ['1 N·m', '9.8 N·m', '4.9 N·m', '20 N·m'], correct: 1, why: 'τ = 2 × 9.81 × 0.5 = 9.81 N·m, before any safety margin.' },
      { q: 'A 4:1 gear reduction does what?', options: ['4× speed, 1/4 torque', '4× torque, 1/4 speed', '4× both', 'Neither'], correct: 1, why: 'Reduction multiplies torque and divides speed by the same ratio.' },
      { q: 'Why add a margin above calculated torque?', options: ['Convention', 'Friction, acceleration, and error are not in the static calculation', 'Motors are mislabelled', 'To use a bigger battery'], correct: 1, why: 'The static calculation ignores friction and the torque needed to accelerate the load.' },
    ],
  },
  rf4: {
    title: 'Linux and the command line',
    summary:
      'Robotics runs on Linux. ROS targets Ubuntu, robots run headless over SSH, and git is how any real project is managed. Slowness here taxes everything you do later.',
    keyPoints: [
      ['The filesystem is a tree', 'Everything hangs off /. Absolute paths start with /, relative paths start where you are. pwd, cd, ls, and tab-completion are the base loop.'],
      ['Permissions gate everything', 'Read, write, execute, for owner/group/other. Reaching for sudo whenever something fails hides the real problem and eventually breaks things.'],
      ['SSH is how you reach a robot', 'Most robots have no screen. You log in over the network, so being fluent without a GUI is not optional.'],
      ['git tracks history, not just backups', 'Branches let you try something without risking working code. Commit messages are notes to your future self.'],
    ],
    worked: {
      title: 'A normal session',
      body: 'ssh pi@192.168.1.50 to reach the robot, cd ~/ros2_ws, git pull to fetch changes, colcon build, then ros2 launch my_robot bringup.launch.py. Every step is terminal-only — which is exactly why fumbling the basics costs so much time.',
    },
    test: [
      { q: 'A command fails with permission denied. What is the best first response?', options: ['Retry with sudo immediately', 'Check who owns the file and what permissions it has', 'Reinstall', 'Reboot'], correct: 1, why: 'sudo can mask a real problem and create root-owned files that break things later.' },
      { q: 'Why does robotics work assume Ubuntu specifically?', options: ['It is fastest', 'ROS targets it first and tutorials assume it', 'It is the only Linux', 'Licensing'], correct: 1, why: 'ROS 2 is developed against Ubuntu LTS; other distros mean translating every instruction.' },
      { q: 'What is a git branch for?', options: ['Backup', 'Trying changes without risking working code', 'Sharing files', 'Compressing history'], correct: 1, why: 'Branches isolate work in progress so main stays functional.' },
      { q: 'How do you usually interact with a robot that has no screen?', options: ['Plug in a monitor', 'SSH over the network', 'USB only', 'Serial cable only'], correct: 1, why: 'SSH is the standard way to reach a headless machine.' },
    ],
  },

  // ---------- Electronics ----------
  re1: {
    title: 'Circuit fundamentals',
    summary:
      'Voltage pushes, current flows, resistance opposes. Ohm\'s law ties them together and explains most beginner circuit failures — including why connecting a motor to a microcontroller pin destroys the board.',
    keyPoints: [
      ['V = I × R', 'Know any two and you have the third. This single equation covers resistor sizing, current limiting, and most debugging.'],
      ['Series adds, parallel divides', 'Resistors in series sum. In parallel the total is less than the smallest. Series circuits share current; parallel branches share voltage.'],
      ['Pins have current limits', 'A microcontroller pin might supply 20–40mA. A small DC motor wants hundreds. Exceeding it destroys the pin or the chip.'],
      ['Floating pins read noise', 'An unconnected input picks up interference and reads randomly. Pull-up or pull-down resistors give it a defined resting state.'],
    ],
    worked: {
      title: 'LED resistor',
      body: '5V supply, LED with 2V forward voltage, target 20mA. The resistor must drop 5 − 2 = 3V at 0.02A. R = 3 / 0.02 = 150Ω. Use the next standard value up (there is no 150 in some kits — 220Ω is safe, slightly dimmer).',
    },
    test: [
      { q: '12V across a 100Ω resistor. What current flows?', options: ['1.2A', '0.12A', '12A', '0.012A'], correct: 1, why: 'I = V/R = 12/100 = 0.12A.' },
      { q: 'Why can you not drive a motor directly from a microcontroller pin?', options: ['Wrong voltage', 'The motor draws far more current than the pin can supply', 'Motors need AC', 'You can'], correct: 1, why: 'Pins supply tens of milliamps; motors draw hundreds or more. The pin fails.' },
      { q: 'What does a pull-down resistor do?', options: ['Limits current to an LED', 'Gives a floating input a defined low state', 'Increases voltage', 'Protects against reverse polarity'], correct: 1, why: 'Without it, an unconnected input floats and reads unpredictably.' },
      { q: 'Two 100Ω resistors in series total what?', options: ['50Ω', '100Ω', '200Ω', '0Ω'], correct: 2, why: 'Series resistances add.' },
    ],
  },
  re2: {
    title: 'Components',
    summary:
      'Each component solves one problem. Knowing which to reach for — and which failure each prevents — is most of practical electronics.',
    keyPoints: [
      ['Transistors switch big things with small signals', 'A microcontroller pin controls the transistor gate; the transistor carries the real load current. This is how small logic drives motors and lamps.'],
      ['H-bridges reverse motors', 'Four switches let current flow either way through a motor, giving forward and reverse. Driver ICs like the L298N or TB6612 package this.'],
      ['Flyback diodes protect against inductive kick', 'When a motor or relay coil switches off, its collapsing magnetic field produces a large reverse voltage spike that destroys transistors. A diode gives it a safe path.'],
      ['Regulators fix supply voltage', 'A battery sags as it drains. A regulator holds a steady output so logic keeps working — but drops the excess as heat.'],
    ],
    worked: {
      title: 'Why a motor kills a transistor',
      body: 'The motor is an inductor. Current through an inductor cannot stop instantly, so when the transistor switches off the coil generates a voltage spike, sometimes hundreds of volts, in reverse. A flyback diode across the motor conducts that spike harmlessly back around the coil. Without one the transistor fails, often after working fine for a while.',
    },
    test: [
      { q: 'What is a flyback diode for?', options: ['Rectifying AC', 'Safely dissipating the reverse spike from an inductive load', 'Limiting LED current', 'Boosting voltage'], correct: 1, why: 'Motors and relays generate a reverse spike when switched off, which destroys switching transistors.' },
      { q: 'An H-bridge lets you do what?', options: ['Increase torque', 'Run a motor in both directions', 'Measure current', 'Regulate voltage'], correct: 1, why: 'It routes current either way through the motor.' },
      { q: 'What role does a transistor play in a motor circuit?', options: ['Storing charge', 'Switching load current under control of a small signal', 'Reducing resistance', 'Filtering noise'], correct: 1, why: 'Small signal in, large current switched — that is the point of it.' },
      { q: 'Your circuit works on USB but fails on a draining battery. Likely fix?', options: ['Bigger resistor', 'Voltage regulator', 'More capacitors on the signal line', 'Shorter wires'], correct: 1, why: 'Battery voltage sags as it drains; a regulator holds the supply steady.' },
    ],
  },
  re3: {
    title: 'Measuring and debugging',
    summary:
      'A multimeter converts invisible problems into numbers. Debugging electronics without one is guessing, and guessing is slow and expensive.',
    keyPoints: [
      ['Voltage is measured across, current through', 'Voltage probes go in parallel with a component. Current requires breaking the circuit and putting the meter in series — getting this backwards blows the meter fuse.'],
      ['Continuity finds breaks', 'The beep mode tells you whether two points are actually connected. It finds broken wires and cold solder joints in seconds.'],
      ['Test batteries under load', 'A tired battery reads near full voltage with nothing connected and collapses under load. Measure while the circuit is running.'],
      ['Divide and conquer', 'Measure at the midpoint of a suspect section. Whichever half is wrong contains the fault; repeat. This finds a fault in a few measurements rather than dozens.'],
    ],
    worked: {
      title: 'Nothing works',
      body: 'Check the supply at the board first — is 5V actually present? Then check continuity from supply to the component. Then check the signal pin voltage while the code runs. Three measurements usually localise it, versus rewiring everything hopefully.',
    },
    test: [
      { q: 'How do you measure current with a multimeter?', options: ['In parallel with the component', 'In series, breaking the circuit', 'Across the battery', 'With continuity mode'], correct: 1, why: 'Current must flow through the meter, so it goes in series. In parallel it shorts the circuit and blows the fuse.' },
      { q: 'A battery reads 9V unloaded but the circuit fails when running. What do you suspect?', options: ['Wrong resistor', 'The battery collapses under load', 'Short circuit', 'Bad code'], correct: 1, why: 'Voltage under load is the meaningful reading; a depleted battery holds up until asked for current.' },
      { q: 'Fastest way to find a broken wire?', options: ['Voltage mode', 'Continuity mode', 'Current mode', 'Resistance across the battery'], correct: 1, why: 'Continuity beeps when connected, so a silent probe pinpoints the break.' },
      { q: 'What does divide-and-conquer debugging mean?', options: ['Replace parts one by one', 'Measure at the midpoint and halve the search each time', 'Rebuild the circuit', 'Ask someone else'], correct: 1, why: 'Halving the suspect region each measurement finds faults in a handful of steps.' },
    ],
  },
  re4: {
    title: 'Soldering',
    summary:
      'Breadboards are for prototypes. Anything that moves needs soldered joints, because vibration works jumper wires loose and produces intermittent faults that are miserable to trace.',
    keyPoints: [
      ['Heat the joint, not the solder', 'Touch the iron to both the pad and the lead, then feed solder to the joint. Solder melted on the iron and dripped on makes a cold joint.'],
      ['A good joint is shiny and concave', 'It wets both surfaces and flows smoothly. A dull, blobby, or ball-shaped joint is cold and will fail.'],
      ['Cold joints fail intermittently', 'They look connected and conduct sometimes. This is the hardest kind of fault to find, which is why joint quality matters more than speed.'],
      ['Flux makes solder flow', 'It cleans oxidation so solder wets the metal. Most solder has a flux core; extra flux helps on stubborn joints.'],
    ],
    worked: {
      title: 'Checking your work',
      body: 'After soldering headers, put the meter in continuity mode and test from each pin to its pad, then between adjacent pins to check for bridges. Two minutes here saves hours of chasing a fault that turns out to be a solder bridge you could have seen.',
    },
    test: [
      { q: 'What makes a cold solder joint dangerous?', options: ['It never conducts', 'It looks fine and fails intermittently', 'It overheats', 'It corrodes fast'], correct: 1, why: 'Intermittent faults are far harder to diagnose than outright breaks.' },
      { q: 'Correct soldering technique is to:', options: ['Melt solder on the iron and apply it', 'Heat the pad and lead, then feed solder to the joint', 'Heat the solder first', 'Use maximum temperature'], correct: 1, why: 'The joint must be hot enough for solder to wet it, or you get a cold joint.' },
      { q: 'A good joint looks:', options: ['Dull and rounded', 'Shiny and concave', 'Ball-shaped', 'Grey and cracked'], correct: 1, why: 'Shiny and concave means the solder wetted both surfaces properly.' },
      { q: 'What does flux do?', options: ['Adds strength', 'Cleans oxidation so solder flows', 'Cools the joint', 'Insulates'], correct: 1, why: 'Oxidation stops solder wetting; flux removes it.' },
    ],
  },

  // ---------- Microcontrollers ----------
  rm1: {
    title: 'Arduino and embedded C++',
    summary:
      'Embedded code has no operating system, little memory, and timing that matters. The habits that work on a desktop — blocking waits, unlimited allocation — break robots.',
    keyPoints: [
      ['setup() runs once, loop() forever', 'Everything is a state machine inside loop(). Anything that blocks stops the whole robot.'],
      ['delay() blocks everything', 'During delay(500) nothing else runs: no sensor reads, no motor updates. Use millis() to check whether enough time has passed instead.'],
      ['PWM fakes analog output', 'Digital pins switch fast between on and off; the duty cycle sets the average. This is how motor speed and LED brightness are controlled.'],
      ['Interrupts handle urgent events', 'An encoder tick cannot wait for the loop to come round. Interrupt handlers must be extremely short — set a flag and return.'],
    ],
    worked: {
      title: 'Non-blocking timing',
      body: 'Instead of delay(1000), store unsigned long last = 0; then in loop(): if (millis() - last >= 1000) { last = millis(); doThing(); }. The loop keeps running, so sensors and motors stay responsive while the timed task still fires once a second.',
    },
    test: [
      { q: 'Why avoid delay() in a robot control loop?', options: ['It is inaccurate', 'It blocks the processor so nothing else runs', 'It uses memory', 'It only works once'], correct: 1, why: 'A blocked loop cannot read sensors or update motors — a balancing robot would fall.' },
      { q: 'What does PWM actually do?', options: ['Outputs a true analog voltage', 'Switches on and off fast so the average approximates analog', 'Changes frequency', 'Amplifies'], correct: 1, why: 'Duty cycle sets the average; the pin is still fully on or fully off.' },
      { q: 'What belongs inside an interrupt handler?', options: ['As little as possible — set a flag and return', 'The main logic', 'Serial printing', 'delay()'], correct: 0, why: 'Interrupts block other execution; long handlers cause missed events and instability.' },
      { q: 'millis() is used to:', options: ['Pause execution', 'Check elapsed time without blocking', 'Measure voltage', 'Set PWM'], correct: 1, why: 'Comparing millis() against a stored timestamp gives timing without stopping the loop.' },
    ],
  },
  rm2: {
    title: 'Sensors',
    summary:
      'A robot only knows what it senses, and every real sensor is noisy, drifts, and lies at the edges of its range. Understanding failure modes matters as much as understanding readings.',
    keyPoints: [
      ['Every reading has noise', 'Consecutive readings of a still scene differ. Averaging several samples or applying a moving-average filter gives a usable value.'],
      ['I2C and SPI carry real sensors', 'Analog pins are for simple sensors. IMUs, distance sensors, and displays use digital buses — I2C for many devices on two wires, SPI for speed.'],
      ['Know the usable range', 'An ultrasonic sensor might be reliable from 5cm to 2m and nonsense outside it. Test and document the real range rather than trusting the datasheet maximum.'],
      ['Calibrate before trusting', 'An IMU has bias; a distance sensor has offset. Measure known values, record the correction, and apply it.'],
    ],
    worked: {
      title: 'Simple moving average',
      body: 'Keep the last 5 readings in an array. Each new reading replaces the oldest; report the mean. This smooths spikes at the cost of a little lag — a good default before reaching for anything more sophisticated.',
    },
    test: [
      { q: 'Why filter sensor readings?', options: ['To save memory', 'Real sensors are noisy and single readings mislead', 'To increase range', 'It is required by I2C'], correct: 1, why: 'Unfiltered noise propagates into control output and makes robots twitch.' },
      { q: 'Which bus lets many devices share two wires?', options: ['SPI', 'I2C', 'UART', 'PWM'], correct: 1, why: 'I2C addresses multiple devices on shared clock and data lines.' },
      { q: 'What is sensor calibration?', options: ['Setting the sample rate', 'Measuring known values and correcting for offset or bias', 'Cleaning the sensor', 'Raising the voltage'], correct: 1, why: 'Raw output rarely maps exactly to reality; calibration establishes the mapping.' },
      { q: 'A distance sensor reads nonsense below 4cm. What should you do?', options: ['Ignore it', 'Document the usable range and design around it', 'Increase voltage', 'Replace it'], correct: 1, why: 'Every sensor has a valid range; designing within it is normal engineering.' },
    ],
  },
  rm3: {
    title: 'Actuators and motor control',
    summary:
      'DC motors spin fast with little torque, servos hold a commanded angle, steppers move in precise increments. Choosing the wrong one is a design error no code will fix.',
    keyPoints: [
      ['DC motors need gearing', 'Raw DC motors spin fast with low torque. A gearbox trades that for usable torque at sensible speed.'],
      ['Servos take position commands', 'You send an angle and the internal controller holds it. Limited range, but no feedback code needed on your side.'],
      ['Steppers move in known steps', 'Good for precision without encoders, but they lose position silently if overloaded — nothing tells you it happened.'],
      ['Encoders close the loop', 'Without feedback you command speed and hope. An encoder measures actual rotation so you can correct the difference.'],
    ],
    worked: {
      title: 'Commanded vs actual',
      body: 'Set PWM to 50% and the motor may run at 40% of top speed unloaded and 20% on carpet. With an encoder you measure actual RPM and raise PWM until it matches the target. That correction loop is the difference between a robot that drives straight and one that veers.',
    },
    test: [
      { q: 'You need a joint to hold a specific angle with minimal code. Best choice?', options: ['DC motor', 'Servo', 'Stepper', 'Solenoid'], correct: 1, why: 'A servo has an internal position controller — you command an angle and it holds it.' },
      { q: 'What is the risk of a stepper motor being overloaded?', options: ['It burns out', 'It loses steps silently and position becomes wrong', 'It reverses', 'It speeds up'], correct: 1, why: 'Missed steps are not reported, so open-loop position drifts without warning.' },
      { q: 'Why add an encoder to a DC motor?', options: ['More torque', 'To measure actual rotation and close the control loop', 'To reduce current', 'To reverse it'], correct: 1, why: 'Feedback lets you correct the gap between commanded and actual motion.' },
      { q: 'A robot veers left despite equal PWM to both motors. Most likely fix?', options: ['Bigger battery', 'Closed-loop speed control with encoders', 'Stronger motors', 'Heavier chassis'], correct: 1, why: 'Motors differ slightly; feedback corrects for the mismatch.' },
    ],
  },
  rm4: {
    title: 'Build the line follower',
    summary:
      'Your first real robot. It will not work first time, and the debugging is the actual lesson — every later project fails in the same ways.',
    keyPoints: [
      ['Test subsystems separately', 'Motors alone, then sensors alone, then together. Wiring everything at once means a single fault is impossible to isolate.'],
      ['Read, decide, act', 'The control loop is always this shape. Keep the three stages visibly separate in your code and debugging gets far easier.'],
      ['Proportional beats on/off', 'Full-left/full-right steering oscillates badly. Steering in proportion to how far off-line you are is far smoother — this is the P in PID.'],
      ['Tune on the real track', 'Surface, lighting, and battery level all change behaviour. Log what you changed and what happened rather than adjusting at random.'],
    ],
    worked: {
      title: 'Proportional steering',
      body: 'With a sensor array, compute error as the offset of the line from centre. Then leftSpeed = base + k×error, rightSpeed = base − k×error. Small k understeers and drifts off; large k oscillates. Tuning k is your first real control problem.',
    },
    test: [
      { q: 'Why test subsystems before combining them?', options: ['It is faster', 'A single fault in a fully-wired robot is very hard to isolate', 'It uses less power', 'To save parts'], correct: 1, why: 'Isolating faults is the whole game; combining first destroys that ability.' },
      { q: 'Bang-bang (full left / full right) steering produces what?', options: ['Smooth tracking', 'Oscillation', 'Faster laps', 'Lower current'], correct: 1, why: 'Without proportional response the robot constantly overcorrects.' },
      { q: 'In proportional steering, what does the gain k control?', options: ['Top speed', 'How strongly the robot reacts to being off-line', 'Sensor sensitivity', 'Battery use'], correct: 1, why: 'k scales correction against error; too small drifts, too large oscillates.' },
      { q: 'Your robot works at full battery and fails at half. Why?', options: ['Code bug', 'Motor speed drops with voltage, changing the tuning', 'Sensors fail', 'Memory leak'], correct: 1, why: 'Control tuning is sensitive to actual motor response, which changes with supply voltage.' },
    ],
  },

  // ---------- Mechanical ----------
  rd1: {
    title: 'CAD',
    summary:
      'Designing a part that actually fits is what separates breadboard hobbyists from people who build machines. Tolerance is the concept beginners miss.',
    keyPoints: [
      ['Sketch then constrain', 'Draw roughly, then apply dimensions and constraints until the sketch is fully defined. Under-constrained sketches shift unpredictably when edited.'],
      ['Design parametrically', 'Drive dimensions from named parameters. Changing one value updates the model instead of forcing a redraw.'],
      ['Tolerance is mandatory', 'A 3mm hole will not accept a 3mm bolt. Add clearance — typically 0.2–0.4mm for 3D printed parts.'],
      ['Measure the real part', 'Datasheet dimensions and reality differ. Calipers on the actual component beat assumptions.'],
    ],
    worked: {
      title: 'Bolt clearance',
      body: 'For an M3 bolt through a printed bracket, model the hole at 3.2–3.4mm. Printers over-extrude slightly and holes come out undersized, so a nominal 3mm hole typically prints at about 2.8mm — too tight, and drilling out a printed part often cracks it.',
    },
    test: [
      { q: 'What hole diameter for an M3 bolt in a 3D printed part?', options: ['2.8mm', '3.0mm exactly', '3.2–3.4mm', '4mm'], correct: 2, why: 'Clearance accounts for print tolerance; an exact 3mm hole prints undersized.' },
      { q: 'Why fully constrain a CAD sketch?', options: ['It renders faster', 'Under-constrained geometry shifts unpredictably when edited', 'It is required to export', 'Smaller file size'], correct: 1, why: 'Unconstrained sketches move when you change something else nearby.' },
      { q: 'What is parametric design?', options: ['Designing in millimetres', 'Driving dimensions from named values so changes propagate', 'Using assemblies', 'Designing for printing'], correct: 1, why: 'Change the parameter, the model updates — no redrawing.' },
      { q: 'Best source for a component dimension?', options: ['Datasheet only', 'Measure the actual part with calipers', 'Estimate', 'Online forum'], correct: 1, why: 'Real parts vary from nominal; measuring avoids a failed print.' },
    ],
  },
  rd2: {
    title: '3D printing and fabrication',
    summary:
      'Printing turns designs into parts you can hold, which changes how you design. Orientation and layer adhesion decide whether a part survives real use.',
    keyPoints: [
      ['Parts are weak along layer lines', 'Prints are strong within a layer and weak between layers. Orient so load runs across layers, not along the split between them.'],
      ['Infill has diminishing returns', 'Beyond about 40% adds weight and time for little strength. Perimeter count often matters more.'],
      ['Supports cost surface quality', 'Overhangs beyond roughly 45° need support, which leaves marks. Designing to avoid overhangs beats supporting them.'],
      ['Know when not to print', 'Shafts, bearings, and fasteners should be bought. Print brackets and housings, not precision or high-load parts.'],
    ],
    worked: {
      title: 'Orientation matters',
      body: 'A printed hook loaded downward: printed lying flat, the load pulls across layers and it holds well. Printed standing up, the same load pulls the layers apart and it snaps at a fraction of the force. Same geometry, same material, very different part.',
    },
    test: [
      { q: 'A printed bracket snaps cleanly along a flat plane. Most likely cause?', options: ['Bad material', 'Loaded along layer lines', 'Too much infill', 'Printed too slowly'], correct: 1, why: 'Layer adhesion is the weak axis; a clean planar break is the signature.' },
      { q: 'Raising infill from 40% to 90% mainly costs what?', options: ['Nothing', 'Time and weight for little strength gain', 'Accuracy', 'Surface finish'], correct: 1, why: 'Strength gains flatten out; perimeters contribute more.' },
      { q: 'Which should you buy rather than print?', options: ['A sensor bracket', 'A motor mount', 'A drive shaft', 'A cable clip'], correct: 2, why: 'Shafts need strength and precision beyond what printing provides.' },
      { q: 'Overhangs beyond roughly 45° require what?', options: ['Higher temperature', 'Support material', 'More infill', 'Slower cooling'], correct: 1, why: 'Beyond that angle each layer has too little beneath it to bond to.' },
    ],
  },
  rd3: {
    title: 'Mechanisms and power transmission',
    summary:
      'Gears, belts, and linkages convert motion. This is where the torque calculations from Foundations become physical parts that either work or sag.',
    keyPoints: [
      ['Gear ratio trades torque for speed', 'A 5:1 reduction gives 5× torque at 1/5 speed. Power is conserved minus friction losses.'],
      ['Backlash ruins precision', 'Gear teeth need clearance, so reversing direction loses a little motion. It compounds through a gear train and shows up as position error.'],
      ['Belts are quiet and forgiving', 'They tolerate misalignment and absorb shock, but stretch and slip. Gears are precise but noisy and demand alignment.'],
      ['Specify from the load', 'Calculate required torque, add margin, then choose motor and ratio. Choosing a motor first and hoping is how arms end up unable to lift themselves.'],
    ],
    worked: {
      title: 'Picking a ratio',
      body: 'Arm must lift 1kg at 0.3m: τ = 1 × 9.81 × 0.3 = 2.94 N·m. With 50% margin, 4.4 N·m. Your motor gives 0.5 N·m at 200 RPM. Required ratio = 4.4 / 0.5 ≈ 9:1. Output speed becomes 200/9 ≈ 22 RPM — check that is fast enough before committing.',
    },
    test: [
      { q: 'A 6:1 reduction on a 0.4 N·m motor gives roughly what output torque?', options: ['0.07 N·m', '2.4 N·m', '6 N·m', '0.4 N·m'], correct: 1, why: '0.4 × 6 = 2.4 N·m, before friction losses.' },
      { q: 'What is backlash?', options: ['Belt stretch', 'Lost motion when reversing direction due to tooth clearance', 'Motor stall', 'Gear wear'], correct: 1, why: 'Clearance between teeth means direction changes lose a little motion.' },
      { q: 'Belts compared with gears are:', options: ['More precise', 'More tolerant of misalignment but prone to stretch', 'Always stronger', 'Silent and backlash-free'], correct: 1, why: 'Belts forgive alignment and absorb shock; gears are more precise.' },
      { q: 'Correct order for specifying a drive?', options: ['Pick motor, then see what it lifts', 'Calculate load torque, add margin, then choose motor and ratio', 'Pick ratio first', 'Buy the biggest motor'], correct: 1, why: 'Requirements drive the choice; guessing produces under-specified mechanisms.' },
    ],
  },

  // ---------- Control ----------
  rc1: {
    title: 'Feedback control and PID',
    summary:
      'PID is the workhorse of robotics control. Each term responds to a different aspect of error, and knowing which is which is most of tuning.',
    keyPoints: [
      ['P responds to current error', 'Output proportional to how far off you are. Alone it leaves steady-state error and can oscillate if too high.'],
      ['I removes steady-state error', 'Accumulates error over time, so a persistent small offset builds until corrected. Too much causes overshoot and windup.'],
      ['D damps the approach', 'Responds to how fast error is changing, resisting rapid approach. Reduces overshoot but amplifies sensor noise.'],
      ['Tune methodically', 'Raise P until it oscillates, back off, add D to damp, then add I only if steady-state error remains. Random adjustment gives results you cannot reproduce.'],
    ],
    worked: {
      title: 'Diagnosing by symptom',
      body: 'Stops short and stays there → needs I. Overshoots and oscillates around target → needs more D or less P. Slow to respond at all → needs more P. Oscillates wildly and grows → P far too high. The symptom names the term.',
    },
    test: [
      { q: 'Robot settles 3cm short of target and stays there. Which term?', options: ['More P', 'Add I', 'More D', 'Less D'], correct: 1, why: 'Persistent offset is steady-state error, which the integral term eliminates.' },
      { q: 'System overshoots and rings around the setpoint. Best first change?', options: ['Increase I', 'Increase D', 'Increase P', 'Increase setpoint'], correct: 1, why: 'D resists rapid change and damps the overshoot.' },
      { q: 'What is integral windup?', options: ['Gears binding', 'Accumulated error growing large during saturation, causing big overshoot', 'Noise amplification', 'Sensor drift'], correct: 1, why: 'When output saturates, error keeps accumulating and the response overshoots badly on release.' },
      { q: 'Which term amplifies sensor noise most?', options: ['P', 'I', 'D', 'None'], correct: 2, why: 'D differentiates, and noisy signals have large instantaneous rates of change.' },
    ],
  },
  rc2: {
    title: 'Kinematics',
    summary:
      'Forward kinematics: given joint angles, where is the end effector? Inverse: given a target, what angles get you there? This is the linear algebra from Foundations doing real work.',
    keyPoints: [
      ['Forward is straightforward', 'Chain the transforms of each joint together. Always one answer, computed directly.'],
      ['Inverse is the hard direction', 'There may be several solutions, or none if the target is out of reach. Choosing between valid solutions is part of the problem.'],
      ['Workspace has limits', 'The reachable region is bounded by link lengths and joint limits. A target outside it has no solution at all.'],
      ['Singularities lose control', 'At certain configurations — a fully extended arm, for example — the arm loses a degree of freedom and inverse solutions blow up.'],
    ],
    worked: {
      title: 'Two-link arm',
      body: 'Links L1 and L2 at angles θ1 and θ2. Forward: x = L1·cos(θ1) + L2·cos(θ1+θ2), y = L1·sin(θ1) + L2·sin(θ1+θ2). Inverse uses the law of cosines and typically yields two solutions — elbow-up and elbow-down — both geometrically valid.',
    },
    test: [
      { q: 'Inverse kinematics may have how many solutions?', options: ['Always exactly one', 'Zero, one, or several', 'Always two', 'Infinite always'], correct: 1, why: 'Out-of-reach targets have none; many configurations admit multiple valid answers.' },
      { q: 'What is a singularity?', options: ['A joint limit', 'A configuration where the arm loses a degree of freedom and solutions blow up', 'A sensor fault', 'A single solution'], correct: 1, why: 'Near singularities small end-effector moves demand enormous joint velocities.' },
      { q: 'Elbow-up and elbow-down for a 2-link arm are:', options: ['Errors', 'Two valid inverse solutions for the same target', 'Singularities', 'Workspace limits'], correct: 1, why: 'Both place the end effector at the target; you choose based on obstacles or joint limits.' },
      { q: 'Forward kinematics is computed by:', options: ['Solving simultaneous equations', 'Chaining joint transforms together', 'Trial and error', 'Inverting a matrix'], correct: 1, why: 'Each joint contributes a transform; multiplying them gives the end pose directly.' },
    ],
  },
  rc3: {
    title: 'State estimation',
    summary:
      'Sensors are noisy and each has a characteristic failure. Fusing several imperfect readings gives a better estimate than any one alone.',
    keyPoints: [
      ['Accelerometers are noisy but stable', 'They sense gravity so give an absolute angle reference, but vibration corrupts short-term readings.'],
      ['Gyros are smooth but drift', 'Excellent instantaneous rotation rate, but integrating it accumulates error that grows without bound.'],
      ['Complementary filters fuse both', 'Trust the gyro short-term and the accelerometer long-term: angle = 0.98×(angle + gyro×dt) + 0.02×accelAngle.'],
      ['Kalman filters do it optimally', 'They model uncertainty explicitly and weight sources accordingly. More powerful, considerably more complex, and rarely needed first.'],
    ],
    worked: {
      title: 'Why fuse at all',
      body: 'Use only the accelerometer and your balancing robot jitters with every vibration. Use only the gyro and it holds steady for ten seconds then slowly tips as drift accumulates. Combined, the gyro handles fast motion and the accelerometer quietly corrects the drift.',
    },
    test: [
      { q: 'Main weakness of using a gyroscope alone for angle?', options: ['Too noisy', 'Integration drift accumulates over time', 'Too slow', 'Needs calibration'], correct: 1, why: 'Small rate errors integrate into an unbounded angle error.' },
      { q: 'Main weakness of an accelerometer alone for angle?', options: ['Drifts', 'Vibration and linear acceleration corrupt it', 'Too slow to update', 'Needs I2C'], correct: 1, why: 'It cannot distinguish gravity from other acceleration, so movement corrupts the reading.' },
      { q: 'A complementary filter works by:', options: ['Averaging equally', 'Trusting gyro short-term and accelerometer long-term', 'Discarding outliers', 'Low-pass filtering both'], correct: 1, why: 'Each sensor covers the other\'s weakness across different timescales.' },
      { q: 'When should you reach for a Kalman filter?', options: ['Always first', 'When a complementary filter is genuinely insufficient', 'Never', 'Only for GPS'], correct: 1, why: 'Start simple; the added complexity is only worth it when the simpler approach fails.' },
    ],
  },

  // ---------- ROS ----------
  rr1: {
    title: 'ROS 2 fundamentals',
    summary:
      'ROS structures robot software as separate processes communicating over a message bus, so parts can be developed, tested, and replaced independently.',
    keyPoints: [
      ['Nodes are independent processes', 'One node per concern — camera driver, planner, motor controller. A crash in one does not take down the rest.'],
      ['Topics are one-way streams', 'Publishers send, subscribers receive, neither knows the other exists. Right for continuous data like sensor readings.'],
      ['Services are request-response', 'Blocking call and reply, for quick queries. Wrong for anything slow — it blocks the caller.'],
      ['Actions are long tasks', 'Goal, feedback, result, and the ability to cancel. Right for navigation or manipulation that takes seconds or minutes.'],
    ],
    worked: {
      title: 'Choosing the mechanism',
      body: 'Streaming laser scans → topic. Asking "what is the battery percentage" → service. "Drive to the kitchen" → action, because it takes time, you want progress updates, and you may need to cancel it. Picking wrongly makes systems that block or cannot be interrupted.',
    },
    test: [
      { q: 'Continuous sensor data should use:', options: ['A service', 'A topic', 'An action', 'A parameter'], correct: 1, why: 'Topics are for streams with decoupled publishers and subscribers.' },
      { q: '"Navigate to a goal" is best implemented as:', options: ['A topic', 'A service', 'An action', 'A parameter'], correct: 2, why: 'It is long-running, needs feedback, and must be cancellable — exactly what actions provide.' },
      { q: 'Why split a robot into many nodes?', options: ['Runs faster', 'Independent development, testing, and failure isolation', 'Uses less memory', 'ROS requires it'], correct: 1, why: 'Modularity is the point; one node crashing does not kill the system.' },
      { q: 'Should you learn ROS 1 or ROS 2 now?', options: ['ROS 1', 'ROS 2', 'Both equally', 'Neither'], correct: 1, why: 'ROS 1 is end-of-life; all current development targets ROS 2.' },
    ],
  },
  rr2: {
    title: 'Simulation with Gazebo',
    summary:
      'Simulation lets you test without breaking hardware or waiting on parts, and is where most real development happens.',
    keyPoints: [
      ['URDF describes the robot', 'Links are rigid bodies, joints connect them. Get the frames and inertias right or the physics behaves strangely.'],
      ['Simulated sensors publish real topics', 'A Gazebo LiDAR publishes the same message type as hardware, so code moves across unchanged.'],
      ['RViz visualises, Gazebo simulates', 'A common confusion: Gazebo runs physics, RViz only displays what the robot believes. RViz can look perfect while the robot is lost.'],
      ['The sim-to-real gap is always there', 'Friction, latency, and sensor noise never match exactly. Simulation proves logic, not tuning.'],
    ],
    worked: {
      title: 'What transfers and what does not',
      body: 'Node structure, message flow, and planning logic transfer almost unchanged. Control gains rarely do — simulated friction is idealised, so a PID tuned in Gazebo usually needs retuning on hardware. Expect that rather than treating it as failure.',
    },
    test: [
      { q: 'What is the difference between Gazebo and RViz?', options: ['None', 'Gazebo simulates physics; RViz visualises robot state', 'RViz is newer', 'Gazebo is only for arms'], correct: 1, why: 'RViz shows what the robot believes, which can be wrong while looking fine.' },
      { q: 'A URDF defines:', options: ['Control gains', 'Robot links, joints, and geometry', 'Network config', 'Sensor drivers'], correct: 1, why: 'It is the structural description used by both simulation and tf.' },
      { q: 'What usually does NOT transfer from sim to hardware?', options: ['Node structure', 'Message types', 'Control tuning', 'Launch files'], correct: 2, why: 'Idealised simulated dynamics mean gains almost always need retuning.' },
      { q: 'Why do simulated sensors publish standard message types?', options: ['Convention', 'So the same code runs against sim and hardware unchanged', 'Speed', 'To save memory'], correct: 1, why: 'Identical interfaces are what make sim-to-real transfer practical.' },
    ],
  },
  rr3: {
    title: 'tf2 and coordinate frames',
    summary:
      'Every robot juggles many frames — world, base, each sensor, the gripper. tf2 tracks the transforms between them over time, and frame confusion is among the most common sources of subtle bugs.',
    keyPoints: [
      ['Standard frames have meanings', 'map is the fixed world frame, odom drifts but is smooth, base_link is the robot body. Mixing them produces jumpy or drifting behaviour.'],
      ['Transforms are timestamped', 'Where the sensor was matters as much as where it is. tf2 can look up a transform at the time a measurement was taken.'],
      ['The tree must be connected', 'Every frame needs a path to every other. A missing link is the most common tf error and stops lookups entirely.'],
      ['Static versus dynamic', 'A bolted-on camera is a static transform published once. A moving joint is dynamic and republished continuously.'],
    ],
    worked: {
      title: 'odom vs map',
      body: 'odom→base_link comes from wheel encoders: smooth but drifts over time. map→odom is the correction SLAM applies. Together they give a position that is both smooth and globally correct. Using odom alone drifts; using map alone jumps whenever localisation corrects.',
    },
    test: [
      { q: 'Which frame is smooth but drifts?', options: ['map', 'odom', 'base_link', 'laser'], correct: 1, why: 'odom comes from dead reckoning: continuous but accumulating error.' },
      { q: 'Why are transforms timestamped?', options: ['Debugging only', 'Sensor data must be transformed using the pose at the time of measurement', 'Logging', 'They are not'], correct: 1, why: 'A moving robot means the transform now differs from the transform when the reading was taken.' },
      { q: 'A tf lookup fails with "frame does not exist". Likely cause?', options: ['Wrong units', 'A missing link leaves the tree disconnected', 'Too many nodes', 'Clock skew only'], correct: 1, why: 'Every frame needs a published path to the others.' },
      { q: 'A fixed camera bracket should be published as:', options: ['Dynamic transform', 'Static transform', 'A topic', 'A service'], correct: 1, why: 'It never changes, so it is published once as static.' },
    ],
  },

  // ---------- Perception ----------
  rp1: {
    title: 'Computer vision with OpenCV',
    summary:
      'Classical image processing solves more real robotics problems than people expect, runs fast on limited hardware, and needs no training data.',
    keyPoints: [
      ['HSV beats RGB for colour', 'Hue separates colour from brightness, so a red object stays red as lighting changes. RGB thresholds break the moment light shifts.'],
      ['Threshold then find contours', 'Isolate pixels of interest, then extract connected regions. Contour area and centroid give position and rough size.'],
      ['Blur before detecting edges', 'Noise creates false edges. A Gaussian blur first makes edge detection far more reliable.'],
      ['Try classical before learning', 'If colour or shape identifies your object, classical CV is faster, more predictable, and needs no dataset.'],
    ],
    worked: {
      title: 'Tracking a coloured ball',
      body: 'Convert to HSV, threshold for the hue range, apply morphological open to remove specks, find contours, take the largest by area, compute its centroid. That is a complete tracker in about ten lines, running comfortably at full frame rate on a Raspberry Pi.',
    },
    test: [
      { q: 'Why convert to HSV before colour thresholding?', options: ['Faster', 'Hue separates colour from brightness so it survives lighting changes', 'Uses less memory', 'Required by OpenCV'], correct: 1, why: 'RGB thresholds fail as illumination changes; hue is far more stable.' },
      { q: 'Why blur before edge detection?', options: ['Sharpens edges', 'Noise produces false edges', 'Speeds it up', 'Improves colour'], correct: 1, why: 'Edge detectors respond to sharp changes, and noise is full of them.' },
      { q: 'You can identify your object purely by colour. Best approach?', options: ['Train a neural network', 'Classical HSV thresholding', 'Depth camera', 'Manual labelling'], correct: 1, why: 'Classical CV is faster, predictable, and needs no training data.' },
      { q: 'What does a contour centroid give you?', options: ['Object colour', 'Its position in the image', 'Its distance', 'Its mass'], correct: 1, why: 'The centroid is the pixel-space centre of the detected region.' },
    ],
  },
  rp2: {
    title: 'Camera calibration and 3D geometry',
    summary:
      'Pixels are not metres. Calibration gives the mapping between image and world, and without it vision cannot guide a real arm.',
    keyPoints: [
      ['Intrinsics describe the camera', 'Focal length and principal point define how 3D projects to 2D. Obtained by photographing a checkerboard from many angles.'],
      ['Lenses distort', 'Straight lines bow, especially at the edges with wide lenses. Calibration measures this so you can undistort.'],
      ['One camera cannot see depth', 'A single image gives a ray, not a point. Depth needs stereo, a depth sensor, or a known object size.'],
      ['Hand-eye calibration links camera to robot', 'Knowing where something is in camera coordinates is useless until you know where the camera sits relative to the robot base.'],
    ],
    worked: {
      title: 'Why hardcoded offsets fail',
      body: 'People measure the camera-to-arm offset with a ruler and hardcode it. It works on that desk until something is bumped, then every pick misses and nothing in the code changed. Proper hand-eye calibration is repeatable and recoverable.',
    },
    test: [
      { q: 'What do camera intrinsics describe?', options: ['Where the camera is mounted', 'How 3D points project into image pixels', 'Exposure', 'Frame rate'], correct: 1, why: 'Focal length and principal point define the projection.' },
      { q: 'Can a single ordinary camera measure depth from one image?', options: ['Yes always', 'No — it gives a ray, not a point', 'Only outdoors', 'Only with autofocus'], correct: 1, why: 'Depth needs stereo, a depth sensor, or known object size.' },
      { q: 'Hand-eye calibration establishes:', options: ['Lens distortion', 'The transform between camera frame and robot frame', 'Colour balance', 'Focal length'], correct: 1, why: 'Without it, camera detections cannot be converted into robot coordinates.' },
      { q: 'Straight lines bow outward near image edges. What is this?', options: ['Motion blur', 'Lens distortion', 'Bad focus', 'Sensor fault'], correct: 1, why: 'Radial distortion, measured during calibration and corrected afterwards.' },
    ],
  },
  rp3: {
    title: 'Depth sensing and point clouds',
    summary:
      'LiDAR and depth cameras give geometry directly. Point cloud processing underpins navigation, mapping, and manipulation.',
    keyPoints: [
      ['A point cloud is a set of 3D points', 'Hundreds of thousands per frame. Processing all of them in real time is usually impossible, so reduce first.'],
      ['Downsample before anything else', 'Voxel filtering keeps one point per small cube. Ten-fold reduction with little information lost.'],
      ['Plane segmentation finds surfaces', 'RANSAC fits the dominant plane — the floor or table — so you can remove it and leave the objects.'],
      ['Clustering separates objects', 'With the plane removed, grouping nearby points by proximity gives individual objects.'],
    ],
    worked: {
      title: 'Finding objects on a table',
      body: 'Voxel downsample to reduce the cloud, remove statistical outliers, RANSAC-fit the table plane and remove those points, then Euclidean-cluster what remains. Each cluster is an object with a computable centroid — which is exactly what your arm needs.',
    },
    test: [
      { q: 'First step when processing a large point cloud in real time?', options: ['Cluster it', 'Downsample it', 'Fit planes', 'Colour it'], correct: 1, why: 'Full-resolution clouds collapse your loop rate; voxel filtering comes first.' },
      { q: 'RANSAC plane fitting is typically used to:', options: ['Find objects directly', 'Identify and remove the dominant surface like a table', 'Smooth noise', 'Calibrate'], correct: 1, why: 'Removing the plane leaves the objects sitting on it.' },
      { q: 'After removing the plane, how do you separate objects?', options: ['Threshold by colour', 'Cluster points by proximity', 'Downsample again', 'Fit more planes'], correct: 1, why: 'Euclidean clustering groups nearby points into distinct objects.' },
      { q: 'What does voxel filtering do?', options: ['Removes outliers', 'Keeps one representative point per small cube', 'Adds colour', 'Fits surfaces'], correct: 1, why: 'It reduces density uniformly while preserving structure.' },
    ],
  },

  // ---------- Navigation ----------
  ra1: {
    title: 'SLAM',
    summary:
      'Simultaneous Localisation and Mapping: building a map while working out where you are in it. Chicken-and-egg, and one of the genuinely elegant problems in robotics.',
    keyPoints: [
      ['Occupancy grids represent maps', 'The world becomes cells marked free, occupied, or unknown. Simple, memory-efficient, and enough for 2D navigation.'],
      ['Odometry drifts', 'Wheel encoders accumulate error from slip and uneven surfaces. Over a long loop the estimate can be metres off.'],
      ['Scan matching corrects drift', 'Aligning the current laser scan against the map corrects the estimate continuously.'],
      ['Loop closure fixes the big errors', 'Recognising a previously visited place lets the whole map be corrected at once. This is why maps suddenly snap into alignment.'],
    ],
    worked: {
      title: 'Why bad odometry breaks SLAM',
      body: 'SLAM uses odometry as its starting guess before scan matching refines it. If wheel encoders are badly calibrated the initial guess is so wrong that matching fails or locks onto the wrong alignment. Fix odometry first — SLAM cannot rescue it.',
    },
    test: [
      { q: 'What does loop closure do?', options: ['Ends the mapping session', 'Recognises a revisited place and corrects accumulated drift', 'Closes doors on the map', 'Stops the robot'], correct: 1, why: 'It provides a global constraint that corrects the whole map at once.' },
      { q: 'Why does odometry drift?', options: ['Sensor noise only', 'Wheel slip and surface variation accumulate error', 'Bad code', 'Low battery'], correct: 1, why: 'Dead reckoning integrates small errors without bound.' },
      { q: 'An occupancy grid marks cells as:', options: ['Colour values', 'Free, occupied, or unknown', 'Height', 'Distance'], correct: 1, why: 'That three-state representation is enough for 2D planning.' },
      { q: 'SLAM produces a poor map. What should you check first?', options: ['LiDAR brand', 'Odometry calibration', 'Map resolution', 'CPU speed'], correct: 1, why: 'Scan matching starts from odometry; if that is wrong, matching fails.' },
    ],
  },
  ra2: {
    title: 'Path planning',
    summary:
      'Given a map and a goal, find a route. Global planners handle the overall path; local planners handle what appears along the way.',
    keyPoints: [
      ['Global plans the whole route', 'A* or Dijkstra over the known map produces a path from start to goal, recomputed occasionally.'],
      ['Local avoids what appears', 'Running at high rate, it follows the global path while dodging obstacles the map does not contain — like people.'],
      ['Costmaps encode danger', 'Cells near obstacles cost more, so paths naturally keep clearance instead of scraping walls.'],
      ['Inflation radius prevents clipping', 'Obstacles are inflated by roughly the robot radius so a planner treating the robot as a point still produces collision-free paths.'],
    ],
    worked: {
      title: 'Why the robot clips corners',
      body: 'The planner treats the robot as a point. If inflation radius is smaller than the robot\'s actual half-width, the planned path passes close enough to a corner that the body collides even though the centre point is technically clear. Raising inflation to at least the robot radius fixes it.',
    },
    test: [
      { q: 'A person steps in front of the robot. Which planner responds?', options: ['Global', 'Local', 'Neither', 'Both equally'], correct: 1, why: 'Local planners run fast against live sensor data; global replans far less often.' },
      { q: 'What does inflation radius do?', options: ['Makes the map bigger', 'Expands obstacles so a point-robot plan stays collision-free', 'Increases speed', 'Improves resolution'], correct: 1, why: 'It accounts for the robot having physical width.' },
      { q: 'Robot clips corners despite a valid plan. Likely cause?', options: ['Bad LiDAR', 'Inflation radius smaller than the robot', 'Slow CPU', 'Wrong goal'], correct: 1, why: 'The centre point clears while the body does not.' },
      { q: 'A* is used as:', options: ['A local planner', 'A global planner', 'A filter', 'A controller'], correct: 1, why: 'It searches the known map for a complete route.' },
    ],
  },
  ra3: {
    title: 'Behaviour and decision making',
    summary:
      'Above navigation sits the logic deciding what to do at all. State machines and behaviour trees are how this is structured professionally.',
    keyPoints: [
      ['State machines are simple and rigid', 'Clear states and transitions. Easy to reason about, but transition count explodes as behaviours multiply.'],
      ['Behaviour trees compose better', 'Reusable subtrees with sequence and fallback nodes. Adding behaviour rarely means rewriting existing logic — which is why industry prefers them at scale.'],
      ['Recovery is most of the work', 'Real robots fail constantly. Every step needs an answer for what happens when it does not succeed.'],
      ['Timeouts are essential', 'A step that can hang forever will. Bound every action so the system can recover instead of freezing.'],
    ],
    worked: {
      title: 'Fetch, with failure handled',
      body: 'Navigate to object → detect → grasp → return. Each can fail. Detection fails: re-scan from a different angle, then give up after three tries. Grasp fails: reposition and retry twice. Navigation fails: clear the costmap, back up, replan. That recovery logic is bulkier than the happy path, and that is normal.',
    },
    test: [
      { q: 'Why does industry prefer behaviour trees over state machines at scale?', options: ['Faster', 'Reusable and composable — adding behaviour does not require rewriting', 'Easier to draw', 'Less memory'], correct: 1, why: 'State machine transitions grow combinatorially; trees compose.' },
      { q: 'What proportion of real robot logic is failure handling?', options: ['Almost none', 'A small fraction', 'Often most of it', 'None if coded well'], correct: 2, why: 'The happy path is short; handling everything that goes wrong is the bulk of the work.' },
      { q: 'Why bound every action with a timeout?', options: ['Saves power', 'An unbounded step can hang the whole system', 'Improves accuracy', 'Required by ROS'], correct: 1, why: 'Without timeouts a stuck action freezes everything above it.' },
      { q: 'Grasp fails on the first attempt. Best design?', options: ['Abort the task', 'Retry with repositioning, then give up after a limit', 'Retry forever', 'Ignore and continue'], correct: 1, why: 'Bounded retries recover from transient failure without looping forever.' },
    ],
  },

  // ---------- Career ----------
  rk1: {
    title: 'Document as you go',
    summary:
      'Reconstructing a project months later is miserable and the interesting detail is already gone. Documentation written during the build costs almost nothing at the time.',
    keyPoints: [
      ['Photograph every stage', 'Wiring you can no longer see once assembled is exactly what you will need to reference later.'],
      ['Log failures, not just successes', 'What broke and how you fixed it is the most valuable content — it demonstrates engineering judgement.'],
      ['READMEs should enable rebuilding', 'Parts list, wiring, setup, how to run. If a stranger cannot rebuild it, the documentation is incomplete.'],
      ['Commit meaningfully', '"Fix bug" tells your future self nothing. "Fix encoder overflow at high RPM" tells them everything.'],
    ],
    worked: {
      title: 'What reviewers actually read',
      body: 'An engineer looking at your repo skims the README, looks at one photo, and reads a couple of commit messages. If those three show a working system and clear thinking, they look deeper. If the README is one line, they move on regardless of code quality.',
    },
    test: [
      { q: 'Most valuable thing to record during a build?', options: ['Final photos only', 'What failed and how you fixed it', 'Parts cost', 'Hours spent'], correct: 1, why: 'Failure and recovery demonstrate judgement, which is what employers assess.' },
      { q: 'A good README lets a reader do what?', options: ['Understand the idea', 'Rebuild the project unaided', 'See photos', 'Contact you'], correct: 1, why: 'Reproducibility is the standard; anything less is incomplete.' },
      { q: 'Why write documentation during rather than after?', options: ['Easier to type', 'Afterwards it never happens and details are forgotten', 'Version control needs it', 'It looks better'], correct: 1, why: 'The interesting failures are already forgotten by the end.' },
      { q: 'Which commit message is useful?', options: ['"Update"', '"Fix bug"', '"Fix encoder overflow above 300 RPM"', '"asdf"'], correct: 2, why: 'Specific messages let you find when and why something changed.' },
    ],
  },
  rk2: {
    title: 'Build depth in one specialisation',
    summary:
      'Robotics is too broad to be excellent at all of it. Employers hire for a specialism with general competence around it.',
    keyPoints: [
      ['Broad-but-shallow is hard to hire', 'Someone who has touched everything and mastered nothing does not map to a role.'],
      ['Pick from what you enjoyed', 'Depth requires years. Choose the area you actually want to keep reading about.'],
      ['Read and reimplement papers', 'Reproducing a published result proves you can work from primary sources — a strong signal.'],
      ['Know the tradeoffs', 'Depth shows through discussing why one approach over another, not through listing tools.'],
    ],
    worked: {
      title: 'What depth sounds like',
      body: 'Shallow: "I used SLAM in a project." Deep: "I used slam_toolbox because I needed lifelong mapping; Cartographer gave better loop closure but the tuning cost more than the accuracy was worth for a room-scale robot." The second answer cannot be faked.',
    },
    test: [
      { q: 'Why is broad-but-shallow the hardest profile to hire?', options: ['Too expensive', 'It does not map to a specific role', 'Lacks qualifications', 'Poor communication'], correct: 1, why: 'Teams hire for a defined need; general familiarity does not fill it.' },
      { q: 'Best basis for choosing a specialism?', options: ['Highest salary', 'The area you enjoyed most and will keep studying', 'Easiest', 'Most job postings'], correct: 1, why: 'Depth takes years; genuine interest is what sustains it.' },
      { q: 'What demonstrates depth in an interview?', options: ['Listing tools used', 'Discussing tradeoffs between approaches and why you chose one', 'Number of projects', 'Certificates'], correct: 1, why: 'Tradeoff reasoning cannot be memorised from a tutorial.' },
      { q: 'Why reimplement a paper?', options: ['To publish', 'It proves you can work from primary sources', 'For the maths', 'Required for jobs'], correct: 1, why: 'Most engineers cannot; demonstrating it is a strong differentiator.' },
    ],
  },
  rk3: {
    title: 'Getting into the field',
    summary:
      'Robotics hiring weights demonstrated ability heavily. A strong portfolio can outweigh a non-traditional background — but only if people see it.',
    keyPoints: [
      ['Portfolio over credentials', 'A working robot with a clear write-up carries real weight. Nobody asks about your degree once the video plays.'],
      ['Open source is visible experience', 'ROS packages welcome contributors. Merged pull requests are public, verifiable collaboration.'],
      ['Competitions compress learning', 'A deadline and other teams to compare against expose weaknesses far faster than solo work.'],
      ['Apply before you feel ready', 'Nobody feels qualified. Waiting for confidence usually means waiting years longer than necessary.'],
    ],
    worked: {
      title: 'What a strong application looks like',
      body: 'A GitHub with three finished projects, one written up thoroughly with a video of it working, plus a couple of merged PRs to a ROS package. That says "this person builds working systems and collaborates" more convincingly than any list of courses completed.',
    },
    test: [
      { q: 'What most strongly demonstrates robotics ability to employers?', options: ['Course certificates', 'A working documented project with video', 'Years of study', 'Reading list'], correct: 1, why: 'Robotics is judged on built systems; a video of one working is hard to argue with.' },
      { q: 'Why contribute to open-source robotics projects?', options: ['Free software', 'Public, verifiable evidence of collaboration', 'To learn git', 'Required for jobs'], correct: 1, why: 'Merged PRs are visible proof you work with other people\'s code.' },
      { q: 'When should you start applying?', options: ['After mastering everything', 'Before you feel ready', 'After a degree', 'After ten projects'], correct: 1, why: 'Readiness rarely arrives; the portfolio does the talking.' },
      { q: 'One thorough project versus five half-finished ones?', options: ['Five is better', 'One thorough is better', 'Equal', 'Depends on the language'], correct: 1, why: 'Finishing and documenting demonstrates far more than starting repeatedly.' },
    ],
  },
};

