// ============================================================================
// SETUP:
//
// From the craftpix cyberpunk characters zip, copy whichever character
// folder(s) you want into your project at:
//
//   assets/characters/Biker/Biker_idle.png
//   assets/characters/Biker/Biker_run.png
//   ...etc, same filenames as in the zip
//
//   assets/characters/Punk/Punk_idle.png
//   assets/characters/Cyborg/Cyborg_idle.png
//   ...same pattern
//
// Only copy the animations you'll actually use — no need to bring over
// all 12 per character if you only need idle/run/attack1 for now.
// ============================================================================
//
// Frame counts below are VERIFIED for Biker (checked each file's actual
// pixel width ÷ 48px frame height, not guessed). Punk and Cyborg use the
// same file-naming convention in this pack and are very likely identical
// frame counts, but weren't individually checked — if an animation looks
// like it's skipping or freezing partway through for Punk/Cyborg, that
// specific one's frame count differs and needs a quick check: open the
// file, note its pixel width, divide by 48.

export const CHARACTERS = {
  Biker: {
    idle: { file: require('./assets/characters/Biker/Biker_idle.png'), frames: 4 },
    run: { file: require('./assets/characters/Biker/Biker_run.png'), frames: 6 },
    attack1: { file: require('./assets/characters/Biker/Biker_attack1.png'), frames: 6 },
    attack2: { file: require('./assets/characters/Biker/Biker_attack2.png'), frames: 8 },
    attack3: { file: require('./assets/characters/Biker/Biker_attack3.png'), frames: 8 },
    climb: { file: require('./assets/characters/Biker/Biker_climb.png'), frames: 6 },
    death: { file: require('./assets/characters/Biker/Biker_death.png'), frames: 6 },
    doublejump: { file: require('./assets/characters/Biker/Biker_doublejump.png'), frames: 6 },
    hurt: { file: require('./assets/characters/Biker/Biker_hurt.png'), frames: 2 },
    jump: { file: require('./assets/characters/Biker/Biker_jump.png'), frames: 4 },
    punch: { file: require('./assets/characters/Biker/Biker_punch.png'), frames: 6 },
    run_attack: { file: require('./assets/characters/Biker/Biker_run_attack.png'), frames: 6 },
  },
  // Punk and Cyborg: uncomment and adjust once you've copied their files
  // in (frame counts are the Biker ones as a starting guess, per the
  // note above — verify against the actual file widths if anything
  // looks off).
  //
  // Punk: {
  //   idle: { file: require('./assets/characters/Punk/Punk_idle.png'), frames: 4 },
  //   run: { file: require('./assets/characters/Punk/Punk_run.png'), frames: 6 },
  //   attack1: { file: require('./assets/characters/Punk/Punk_attack1.png'), frames: 6 },
  // },
  // Cyborg: {
  //   idle: { file: require('./assets/characters/Cyborg/Cyborg_idle.png'), frames: 4 },
  //   run: { file: require('./assets/characters/Cyborg/Cyborg_run.png'), frames: 6 },
  //   attack1: { file: require('./assets/characters/Cyborg/Cyborg_attack1.png'), frames: 6 },
  // },
};

export const FRAME_SIZE = 48;
