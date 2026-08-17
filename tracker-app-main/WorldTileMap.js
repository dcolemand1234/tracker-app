import React from 'react';
import { View, StyleSheet } from 'react-native';
import SpriteTile from './SpriteTile';

// ============================================================================
// SETUP — one-time, a few minutes:
//
// 1. From your Pipoya RPG World Tileset zip, pick ONE size folder (32x32,
//    40x40, or 48x48 — bigger tiles = fewer tiles fit on screen at once,
//    32x32 is a reasonable default for a phone screen) and copy its
//    pipo-map001.png into your project at exactly this path:
//
//      assets/tiles/pipo-map001.png
//
// 2. Open that PNG in any image viewer (even your phone's gallery) and
//    note the tile size you chose (32, 40, or 48) below.
//
// 3. Figure out the real tile indices: tiles are numbered left-to-right,
//    top-to-bottom starting at 0 — index = (row * SHEET_COLS) + col.
//    Count columns across the top of the sheet to get SHEET_COLS, count
//    rows down to get SHEET_ROWS. Then click on (or measure the pixel
//    position of) the grass tile you want, the path tile, etc., convert
//    to row/col, and fill in the indices below. This is the one part I
//    can't do for you without seeing the actual artwork.
// ============================================================================

const TILE_SIZE = 32; // must match the folder you copied (32/40/48)
const SHEET_COLS = 8; // confirmed from the sheet's pixel dimensions
const SHEET_ROWS = 17; // confirmed from the sheet's pixel dimensions
const TILESET = require('./assets/tiles/pipo-map001.png');

// Placeholder indices — these WILL be wrong until you look at your own
// sheet and correct them per the instructions above. Everything else in
// this file works regardless of what these numbers are; only the visual
// terrain assignment depends on getting them right.
const TILE = {
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  TREE: 3,
};

// A simple example layout — same rough shape as the procedural map
// (grass field, a path down the left side, a pond lower-right). Replace
// with your own layout once the tile indices above are correct, or
// generate a bigger grid programmatically the same way.
const G = TILE.GRASS, P = TILE.PATH, W = TILE.WATER, T = TILE.TREE;
export const EXAMPLE_TILEMAP = [
  [T, P, G, G, G, G, G, G, G, T, G, G],
  [T, P, G, G, G, G, G, G, G, G, T, G],
  [G, P, G, G, T, G, G, G, G, G, G, G],
  [G, P, P, G, G, G, G, G, G, G, G, G],
  [G, G, P, G, G, G, G, G, G, G, G, G],
  [G, T, P, G, G, G, G, G, G, W, W, G],
  [G, G, P, G, G, G, G, G, W, W, W, W],
  [G, G, P, P, G, G, G, G, W, W, W, W],
  [G, G, G, P, G, G, G, G, G, W, W, G],
  [G, G, G, P, P, G, G, G, G, G, G, G],
];

export function tileMapPixelSize(tilemap) {
  return {
    width: (tilemap[0] ? tilemap[0].length : 0) * TILE_SIZE,
    height: tilemap.length * TILE_SIZE,
  };
}

export { TILE_SIZE };

export default function WorldTileMap({ tilemap = EXAMPLE_TILEMAP, style }) {
  return (
    <View style={[styles.grid, style]}>
      {tilemap.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((index, c) => (
            <SpriteTile
              key={c}
              sheet={TILESET}
              index={index}
              sheetCols={SHEET_COLS}
              sheetRows={SHEET_ROWS}
              tileSize={TILE_SIZE}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'column' },
  row: { flexDirection: 'row' },
});
