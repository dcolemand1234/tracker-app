// Ported from the seedable Perlin-noise generator (PseudoRandom + Perlin
// classes, same algorithm and structure) into pure JS with no <canvas>
// dependency, since React Native doesn't have one natively. Instead of
// writing pixels to an ImageData buffer, this computes ONE noise value
// per grid tile (not per pixel), which is what makes it fast enough to
// run on a phone — a few hundred tile lookups instead of hundreds of
// thousands of pixel calculations.
//
// Same water/sand/grass/forest/mountain/snow banding logic as the
// original tool, just returning terrain-type constants per tile instead
// of RGB pixel colors, so the result can drive whichever renderer you
// want (colored blocks, or tile indices into a real tileset once you've
// got one wired up).

class PseudoRandom {
  constructor(seed) {
    this.seed = this.hashString(seed.toString());
  }
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
  next() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}

class PerlinNoise {
  constructor(prng) {
    this.prng = prng;
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    ];
    this.p = [];
    for (let i = 0; i < 256; i++) this.p[i] = Math.floor(this.prng.next() * 256);
    this.perm = [];
    for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
  }
  dot(g, x, y) { return g[0] * x + g[1] * y; }
  mix(a, b, t) { return (1 - t) * a + t * b; }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y, AA = this.perm[A], AB = this.perm[A + 1];
    const B = this.perm[X + 1] + Y, BA = this.perm[B], BB = this.perm[B + 1];
    return this.mix(
      this.mix(this.dot(this.grad3[AA % 12], x, y), this.dot(this.grad3[BA % 12], x - 1, y), u),
      this.mix(this.dot(this.grad3[AB % 12], x, y - 1), this.dot(this.grad3[BB % 12], x - 1, y - 1), u),
      v
    );
  }
}

export const TERRAIN = {
  DEEP_WATER: 'deep_water',
  WATER: 'water',
  SAND: 'sand',
  GRASS: 'grass',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  SNOW: 'snow',
  PATH: 'path',
};

// Same color values as the original tool's canvas fill colors, kept
// here so a colored-block renderer can use them directly without
// needing a real tileset at all.
export const TERRAIN_COLOR = {
  [TERRAIN.DEEP_WATER]: '#14286e',
  [TERRAIN.WATER]: '#1e3cb4',
  [TERRAIN.SAND]: '#d2c882',
  [TERRAIN.GRASS]: '#32a032',
  [TERRAIN.FOREST]: '#226422',
  [TERRAIN.MOUNTAIN]: '#646464',
  [TERRAIN.SNOW]: '#dcdcdc',
  [TERRAIN.PATH]: '#c2a25a',
};

function terrainForNoise(noiseVal, waterLevel) {
  if (noiseVal < waterLevel) {
    return noiseVal < waterLevel * 0.5 ? TERRAIN.DEEP_WATER : TERRAIN.WATER;
  }
  if (noiseVal < waterLevel + 0.05) return TERRAIN.SAND;
  if (noiseVal < 0.6) return TERRAIN.GRASS;
  if (noiseVal < 0.8) return TERRAIN.FOREST;
  return noiseVal > 0.9 ? TERRAIN.SNOW : TERRAIN.MOUNTAIN;
}

// Returns a 2D array (rows of terrain-type strings), same shape as the
// EXAMPLE_TILEMAP grid elsewhere in this game, so it's a drop-in
// alternative to the hand-drawn example layout.
export function generateTerrainGrid({
  seed = 'habits',
  cols = 20,
  rows = 15,
  scale = 6,
  waterLevel = 0.35,
  roughness = 4,
} = {}) {
  const prng = new PseudoRandom(seed);
  const perlin = new PerlinNoise(prng);
  const grid = [];

  for (let row = 0; row < rows; row++) {
    const line = [];
    for (let col = 0; col < cols; col++) {
      let noiseVal = 0;
      let frequency = 1;
      let amplitude = 1;
      let maxVal = 0;
      for (let o = 0; o < roughness; o++) {
        noiseVal += perlin.noise((col / scale) * frequency, (row / scale) * frequency) * amplitude;
        maxVal += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      noiseVal = noiseVal / maxVal + 0.5;
      line.push(terrainForNoise(noiseVal, waterLevel));
    }
    grid.push(line);
  }
  return grid;
}

// Whether a tile is safe to stand/walk on — used to keep the hero and
// quest markers off water, mountains, and forest (a tree sprite is
// drawn on every forest tile, so treating forest as walkable meant you
// could walk straight through trees - forest tiles are terrain you
// route around now, same as water or a mountain wall).
export function isWalkable(terrain) {
  return terrain === TERRAIN.GRASS || terrain === TERRAIN.SAND || terrain === TERRAIN.PATH;
}

// A* pathfinding that carves a walkable dirt trail from `from` to `to`,
// writing TERRAIN.PATH into the grid along the route (mutates a copy,
// returns it). This is what turns the world from "random noise you
// wander" into "a real trail connecting spawn to a landmark" - the crossing
// cost heavily penalizes water/mountain (so the trail bends around a lake
// or a peak when it reasonably can) but doesn't forbid it outright (so a
// destination surrounded by forest/mountain is still reachable - the trail
// just cuts through and overwrites those tiles with path instead of
// pretending they're impassable).
const CROSS_COST = {
  [TERRAIN.GRASS]: 1,
  [TERRAIN.SAND]: 1,
  [TERRAIN.PATH]: 0.5, // reusing an existing path segment is nearly free - encourages trails to merge
  [TERRAIN.FOREST]: 3,
  [TERRAIN.SNOW]: 4,
  [TERRAIN.MOUNTAIN]: 8,
  [TERRAIN.WATER]: 14,
  [TERRAIN.DEEP_WATER]: 22,
};

function carveSinglePath(grid, from, to) {
  const rows = grid.length;
  const cols = grid[0].length;
  const key = (r, c) => r * cols + c;
  const startKey = key(from.row, from.col);
  const goalKey = key(to.row, to.col);

  const gScore = new Map([[startKey, 0]]);
  const cameFrom = new Map();
  const open = new Map([[startKey, from]]); // simple open set, fine at this grid size (60x60)

  const heuristic = (r, c) => Math.abs(r - to.row) + Math.abs(c - to.col);

  const fScore = new Map([[startKey, heuristic(from.row, from.col)]]);

  while (open.size > 0) {
    let currentKey = null;
    let currentBest = Infinity;
    for (const [k] of open) {
      const f = fScore.get(k) ?? Infinity;
      if (f < currentBest) {
        currentBest = f;
        currentKey = k;
      }
    }
    if (currentKey === null) break;
    if (currentKey === goalKey) break;

    const current = open.get(currentKey);
    open.delete(currentKey);

    const neighbors = [
      [current.row - 1, current.col],
      [current.row + 1, current.col],
      [current.row, current.col - 1],
      [current.row, current.col + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const nKey = key(nr, nc);
      const stepCost = CROSS_COST[grid[nr][nc]] ?? 2;
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + stepCost;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + heuristic(nr, nc));
        if (!open.has(nKey)) open.set(nKey, { row: nr, col: nc });
      }
    }
  }

  // Walk the chain back from goal to start, marking every cell as PATH
  // (except the exact destination tile itself, which stays whatever it
  // was so a boss/quest marker still renders on its intended terrain).
  let walkKey = goalKey;
  const visited = new Set();
  while (cameFrom.has(walkKey) && !visited.has(walkKey)) {
    visited.add(walkKey);
    const r = Math.floor(walkKey / cols);
    const c = walkKey % cols;
    if (!(r === to.row && c === to.col) && !(r === from.row && c === from.col)) {
      grid[r][c] = TERRAIN.PATH;
    }
    walkKey = cameFrom.get(walkKey);
  }
}

// Carves a trail from `from` to every point in `destinations`, mutating
// and returning the same grid (deep-copy it first if you need the
// original). Safe to call with an empty/undefined destinations list.
export function carvePaths(grid, from, destinations) {
  const out = grid.map((row) => row.slice());
  (destinations || []).forEach((dest) => carveSinglePath(out, from, dest));
  return out;
}

// Carves ONE continuous trail through every point in `points`, in order
// (point[0] -> point[1] -> point[2] -> ...), rather than separate spokes
// radiating out from a single hub. Use this when you want the map to
// read as "follow this one road past several stops" instead of "several
// unrelated roads all starting at the same place."
export function carveChain(grid, points) {
  const out = grid.map((row) => row.slice());
  for (let i = 0; i < points.length - 1; i++) {
    carveSinglePath(out, points[i], points[i + 1]);
  }
  return out;
}

// The actual auto-tiling step: takes the raw terrain grid and returns a
// second grid of the same shape where any SAND tile that touches WATER
// or DEEP_WATER (including diagonally) becomes 'shore' instead — a
// foam-edged variant — so coastlines read as a blended transition
// instead of a hard color-block edge. This is the same basic mechanic
// real tile-based RPG maps use (auto-tile edge/corner variants), just
// simplified to one shore variant rather than a full 47-tile edge set.
export function applyShoreBlending(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const out = grid.map((row) => row.slice());

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== TERRAIN.SAND) continue;
      let touchesWater = false;
      for (let dr = -1; dr <= 1 && !touchesWater; dr++) {
        for (let dc = -1; dc <= 1 && !touchesWater; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const neighbor = grid[nr][nc];
          if (neighbor === TERRAIN.WATER || neighbor === TERRAIN.DEEP_WATER) touchesWater = true;
        }
      }
      if (touchesWater) out[r][c] = 'shore';
    }
  }
  return out;
}

// Rough relative height per terrain type, used only to decide where to
// draw an edge shading strip — water sits lowest, mountains/snow
// highest. This is what makes edges appear ONLY at real elevation
// changes (water meeting land, land meeting mountain) instead of on
// every tile boundary regardless of what's actually there.
const ELEVATION = {
  [TERRAIN.DEEP_WATER]: 0,
  [TERRAIN.WATER]: 0.3,
  shore: 0.7,
  [TERRAIN.SAND]: 0.8,
  [TERRAIN.GRASS]: 1,
  [TERRAIN.FOREST]: 1.1,
  [TERRAIN.MOUNTAIN]: 2,
  [TERRAIN.SNOW]: 2.2,
};

// For one tile at (r, c), returns which of its 4 edges border a tile at
// a different elevation, and in which direction (higher/lower) — used
// to draw a highlight on the side facing a lower neighbor and a shadow
// on the side facing a higher one, so elevation changes read as an
// actual step rather than a flat color swap. Same-elevation neighbors
// (the common case — most of a grass field, most of open water) get no
// edge decoration at all, which is what keeps large same-terrain areas
// looking continuous instead of gridded.
export function getTileEdgeShading(grid, r, c) {
  const rows = grid.length;
  const cols = grid[0].length;
  const here = ELEVATION[grid[r][c]] ?? 1;
  const edges = {};
  const dirs = [
    ['top', -1, 0],
    ['bottom', 1, 0],
    ['left', 0, -1],
    ['right', 0, 1],
  ];
  for (const [side, dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const there = ELEVATION[grid[nr][nc]] ?? 1;
    if (there < here - 0.05) edges[side] = 'highlight'; // this tile is the higher one on this side
    else if (there > here + 0.05) edges[side] = 'shadow'; // this tile is the lower one on this side
  }
  return edges;
}
