import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';
import { INK, DIM } from './theme';

const HUE_STEPS = 48;

function hslToHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// A real 2D color picker: drag anywhere in the square for
// saturation/lightness, drag the strip below for hue. Built with
// PanResponder (React Native's purpose-built drag API) rather than raw
// responder props, and measureInWindow for accurate page-coordinate
// mapping, since the simpler approach didn't reliably register drags.
export default function ColorWheelPicker({ onPick }) {
  const [hue, setHue] = useState(30);
  const [sat, setSat] = useState(0.75);
  const [lightY, setLightY] = useState(0.45); // 0 = top of square (light), 1 = bottom (dark)
  const [squareHeight, setSquareHeight] = useState(240);

  const squareWidth = useRef(240);
  const stripWidth = useRef(300);

  // Keep a margin off pure white/black at the extreme edges so the
  // thumb is never sitting on a fully-washed-out or fully-black pixel.
  const light = 0.92 - lightY * 0.85;
  const currentColor = hslToHex(hue, sat, light);
  const pureHueColor = hslToHex(hue, 1, 0.5);

  // locationX/locationY are relative to the view that received the
  // touch, so they stay correct no matter how far the page is scrolled.
  // The cached measureInWindow approach broke precisely because this
  // section sits far down a scrolling screen: the stored y was captured
  // at layout time and was stale by the time you actually touched it,
  // which pinned the thumb to the top of the square.
  function updateFromSquare(evt) {
    const { locationX, locationY } = evt.nativeEvent;
    const w = squareWidth.current || 1;
    const h = squareHeight || 1;
    setSat(Math.max(0, Math.min(1, locationX / w)));
    setLightY(Math.max(0, Math.min(1, locationY / h)));
  }

  // Same fix as the square above: locationX is relative to the strip
  // itself, so it stays correct regardless of scroll position. This
  // used to use pageX against a stripLayout.current.x cached once at
  // onLayout time, which went stale (and created a visible gap between
  // the finger and the selected hue) the moment the screen scrolled
  // after that initial measurement - exactly the same bug the square
  // already had fixed, just not yet applied here too.
  function updateFromHue(evt) {
    const { locationX } = evt.nativeEvent;
    const width = stripWidth.current || 1;
    const pct = Math.max(0, Math.min(1, locationX / width));
    setHue(Math.round(pct * 360));
  }

  const squarePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: updateFromSquare,
      onPanResponderMove: updateFromSquare,
    })
  ).current;

  const huePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: updateFromHue,
      onPanResponderMove: updateFromHue,
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={styles.previewRow}>
        <View style={[styles.previewSwatch, { backgroundColor: currentColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.previewLabel}>Selected color</Text>
          <Text style={styles.previewHex}>{currentColor}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => onPick(currentColor)}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[styles.satLightSquare, { height: squareHeight, backgroundColor: pureHueColor }]}
        onLayout={(e) => {
          squareWidth.current = e.nativeEvent.layout.width;
          setSquareHeight(e.nativeEvent.layout.width);
        }}
        {...squarePan.panHandlers}
      >
        <View pointerEvents="none" style={styles.gradientRow}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: '#fff', opacity: 1 - i / 19 }} />
          ))}
        </View>
        <View pointerEvents="none" style={styles.gradientCol}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: '#000', opacity: i / 19 }} />
          ))}
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.squareThumb,
            {
              left: `${sat * 100}%`,
              top: `${lightY * 100}%`,
              backgroundColor: currentColor,
            },
          ]}
        />
      </View>

      <Text style={styles.label}>Hue</Text>
      <View
        style={styles.hueStrip}
        onLayout={(e) => {
          stripWidth.current = e.nativeEvent.layout.width;
        }}
        {...huePan.panHandlers}
      >
        {Array.from({ length: HUE_STEPS }).map((_, i) => (
          <View
            key={i}
            style={{ flex: 1, height: '100%', backgroundColor: hslToHex((i / HUE_STEPS) * 360, 1, 0.5) }}
          />
        ))}
        <View pointerEvents="none" style={[styles.hueThumb, { left: `${(hue / 360) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  previewSwatch: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewLabel: { fontSize: 11, color: DIM, fontWeight: '600' },
  previewHex: { fontSize: 15, color: INK, fontWeight: '700', marginTop: 2 },
  addBtn: {
    backgroundColor: '#d9a441',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  satLightSquare: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  gradientRow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  gradientCol: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'column' },
  squareThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    marginTop: -11,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginBottom: 8 },
  hueStrip: { flexDirection: 'row', height: 36, borderRadius: 8, overflow: 'hidden', marginBottom: 6 },
  hueThumb: {
    position: 'absolute',
    top: -3,
    width: 6,
    height: 42,
    marginLeft: -3,
    borderRadius: 3,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#00000055',
  },
});

