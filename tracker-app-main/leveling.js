export function xpForLevel(level) {
  return level * 100;
}

// Applies an XP delta to a { level, xp } value, rolling levels up/down as
// needed, and returns the new value. Also returns how many levels were
// gained (0 if none) so callers can react to level-ups (bonus points, etc).
export function applyXPDelta(current, delta) {
  let lvl = current.level;
  let xp = current.xp + delta;
  let levelsGained = 0;
  while (xp >= xpForLevel(lvl)) {
    xp -= xpForLevel(lvl);
    lvl += 1;
    levelsGained += 1;
  }
  while (xp < 0 && lvl > 1) {
    lvl -= 1;
    xp += xpForLevel(lvl);
  }
  if (xp < 0) xp = 0;
  return { level: lvl, xp, levelsGained };
}

// Resets Level, XP, every Stat, and the Rewards economy back to zero —
// shared so Roadmaps and Settings both trigger the exact same reset.
// Cards/Goals/Tasks/Habits are untouched.
export function resetRoadmapProgress(setters) {
  const { setLevel, setStats, setRewardPoints, setRewardHistory, setHero } = setters;
  setLevel({ level: 1, xp: 0 });
  setStats((prev) => prev.map((s) => ({ ...s, level: 1, xp: 0 })));
  setRewardPoints(0);
  setRewardHistory([]);
  if (setHero) {
    setHero({ weaponTier: 0, armorTier: 0, energy: 0, minionsDefeated: 0 });
  }
}

