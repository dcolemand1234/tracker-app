import React from 'react';
import { View, Image } from 'react-native';

// Renders one tile out of a sprite-sheet PNG using the standard RN
// "clipped offset" trick, since there's no built-in image-cropping API:
// a small fixed-size box with overflow hidden, containing the FULL
// sheet image rendered at its native pixel size and pushed left/up by
// exactly the tile's pixel offset, so only that one tile peeks through.
//
// Keeping tiles at native size (no runtime scaling) avoids RN's fiddly
// transform-origin behavior entirely — Pipoya's pack conveniently ships
// pre-made 32x32/40x40/48x48 versions, so pick whichever folder matches
// the size you actually want on screen instead of scaling in code.
//
// `sheet` = a require('./path/to/tileset.png') asset — a real image
// file you place in your own project (see WorldTileMap.js for the
// expected path and folder layout).
export default function SpriteTile({ sheet, index, sheetCols, sheetRows, tileSize, style }) {
  const col = index % sheetCols;
  const row = Math.floor(index / sheetCols);
  return (
    <View style={[{ width: tileSize, height: tileSize, overflow: 'hidden' }, style]}>
      <Image
        source={sheet}
        style={{
          position: 'absolute',
          left: -col * tileSize,
          top: -row * tileSize,
          width: sheetCols * tileSize,
          height: sheetRows * tileSize,
        }}
      />
    </View>
  );
}
