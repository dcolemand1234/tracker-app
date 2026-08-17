// ============================================================================
// PROOF OF CONCEPT v2 — dropped expo-three entirely. The expo doctor
// output confirmed it: expo-three (unmaintained ~2 years) was bundling
// its own ancient nested react@17/expo-asset@12/expo-font@14 alongside
// your project's real modern versions, which is exactly what causes a
// NoClassDefFoundError — two different native versions of the same
// module compiled into one build. Not fixable by pinning `three`'s
// version, since the problem was expo-three itself.
//
// This uses plain `three` + `expo-gl` directly, which is also the
// officially recommended modern pattern (react-three-fiber's own docs
// skip expo-three too now).
//
// Also simplified on purpose: NO texture loading in this version, only
// solid colors. That's a second, separate thing that can fail
// independently of the renderer itself, and after this many rounds of
// environment debugging, better to isolate one variable at a time
// rather than test two things at once.
//
// SETUP:
//   npm uninstall expo-three
//   npx expo install expo-gl expo-asset
//   eas build -p android --profile development
// ============================================================================

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';

export default function ThreeMapPOC() {
  const timeoutRef = useRef();

  async function onContextCreate(gl) {
    // three.js expects a DOM <canvas> with certain properties that
    // don't exist in expo-gl's raw context — this minimal stub is the
    // standard, widely-used workaround for that gap, not anything
    // specific to this project.
    const canvasShim = {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      clientHeight: gl.drawingBufferHeight,
    };

    const renderer = new THREE.WebGLRenderer({ canvas: canvasShim, context: gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d141c');

    // An angled orthographic camera — no perspective distortion (tiles
    // stay a consistent size regardless of distance), but viewed from
    // an angle so surfaces read as having depth. The real version of
    // what the earlier CSS-bevel version was faking.
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const viewSize = 6;
    const camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      100
    );
    camera.position.set(4, 5, 4);
    camera.lookAt(0, 0, 0);

    // Real lighting — an actual light direction casting real shading
    // based on surface angle, not a pre-baked highlight painted into a
    // texture.
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(3, 6, 2);
    scene.add(sun);

    // Solid green plane, no texture — isolating the renderer/camera/
    // lighting pipeline from texture loading, which is a separate
    // concern to verify once this part is confirmed working.
    const geometry = new THREE.PlaneGeometry(6, 6);
    const material = new THREE.MeshStandardMaterial({ color: 0x4a9a4a });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2; // lay it flat, facing up
    scene.add(plane);

    // A cube standing on the plane, proving an object WITH HEIGHT
    // renders correctly with real perspective/shading.
    const cubeGeo = new THREE.BoxGeometry(0.6, 1, 0.6);
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2a });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(0, 0.5, 0);
    scene.add(cube);

    function render() {
      timeoutRef.current = requestAnimationFrame(render);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    }
    render();
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        Three.js proof of concept v2 (no expo-three, no textures yet) — if
        you see a solid green ground plane with a brown cube standing on it,
        angled and lit, the core pipeline works.
      </Text>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  label: { color: '#e4e8ee', fontSize: 12, padding: 12, textAlign: 'center' },
  gl: { flex: 1 },
});
