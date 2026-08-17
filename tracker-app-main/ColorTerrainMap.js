import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { applyShoreBlending, getTileEdgeShading, TERRAIN } from './terrainGenerator';
import { TERRAIN_TEXTURE } from './terrainTiles';
import { TREE_SPRITE, TREE_HEIGHT, TREE_WIDTH } from './decor';

const EDGE_THICKNESS = 3;

function EdgeOverlay({ edges, tileSize }) {
  const has = edges.top || edges.bottom || edges.left || edges.right;
  if (!has) return null;
  return (
    <>
      {edges.top ? (
        <View
          style={[
            styles.edgeH,
            { top: 0, height: EDGE_THICKNESS, width: tileSize },
            edges.top === 'highlight' ? styles.edgeLight : styles.edgeDark,
          ]}
        />
      ) : null}
      {edges.bottom ? (
        <View
          style={[
            styles.edgeH,
            { bottom: 0, height: EDGE_THICKNESS, width: tileSize },
            edges.bottom === 'highlight' ? styles.edgeLight : styles.edgeDark,
          ]}
        />
      ) : null}
      {edges.left ? (
        <View
          style={[
            styles.edgeV,
            { left: 0, width: EDGE_THICKNESS, height: tileSize },
            edges.left === 'highlight' ? styles.edgeLight : styles.edgeDark,
          ]}
        />
      ) : null}
      {edges.right ? (
        <View
          style={[
            styles.edgeV,
            { right: 0, width: EDGE_THICKNESS, height: tileSize },
            edges.right === 'highlight' ? styles.edgeLight : styles.edgeDark,
          ]}
        />
      ) : null}
    </>
  );
}

// Renders a (possibly windowed) slice of the terrain grid — the camera
// system in RoadmapWorldMap.js passes in just the visible portion, not
// the whole world, so this never has to render more tiles than are
// actually on screen. Shore blending and edge shading are both computed
// on the slice using the ORIGINAL full-grid terrain values passed in
// (see rowOffset/colOffset), so edges at the seam of the visible window
// still know what's really next to them rather than treating the
// window's boundary as the world's boundary.
export default function ColorTerrainMap({ grid, tileSize = 24, style }) {
  const blended = applyShoreBlending(grid);

  return (
    <View style={[styles.grid, style]}>
      <View style={styles.baseLayer}>
        {blended.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((terrain, c) => {
              const edges = getTileEdgeShading(blended, r, c);
              return (
                <View key={c} style={{ width: tileSize, height: tileSize }}>
                  <Image
                    source={{ uri: TERRAIN_TEXTURE[terrain] }}
                    style={{ width: tileSize, height: tileSize }}
                  />
                  <EdgeOverlay edges={edges} tileSize={tileSize} />
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.overlayLayer} pointerEvents="none">
        {grid.map((row, r) =>
          row.map((terrain, c) => {
            if (terrain !== TERRAIN.FOREST) return null;
            const treeScale = tileSize / 24;
            const overhang = (TREE_HEIGHT - 24) * treeScale;
            return (
              <Image
                key={`${r}-${c}`}
                source={{ uri: TREE_SPRITE }}
                style={{
                  position: 'absolute',
                  left: c * tileSize,
                  top: r * tileSize - overhang,
                  width: TREE_WIDTH * treeScale,
                  height: TREE_HEIGHT * treeScale,
                }}
              />
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { position: 'relative' },
  baseLayer: { flexDirection: 'column' },
  row: { flexDirection: 'row' },
  overlayLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  edgeH: { position: 'absolute', left: 0 },
  edgeV: { position: 'absolute', top: 0 },
  edgeLight: { backgroundColor: 'rgba(255,255,255,0.28)' },
  edgeDark: { backgroundColor: 'rgba(0,0,0,0.30)' },
});
