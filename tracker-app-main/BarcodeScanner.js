import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GOLD, INK, DIM } from './theme';

// Wraps expo-camera's scanner. Permission is requested here, on the
// first tap of the scan button, rather than at app launch — asking in
// context makes it obvious why the camera is needed.
export default function BarcodeScanner({ onScanned, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.body}>
          Tracker uses the camera only to read barcodes when you scan an item
          into your inventory. Nothing is recorded or uploaded.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={onClose}>
          <Text style={styles.linkText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={
          locked
            ? undefined
            : ({ data }) => {
                // Lock immediately: the camera fires this continuously
                // while a barcode is in frame, which would otherwise
                // trigger dozens of lookups for one scan.
                setLocked(true);
                onScanned(data);
              }
        }
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Point at the barcode</Text>
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#0d141c',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  body: { color: DIM, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 22 },
  btn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 30 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  linkBtn: { paddingVertical: 14 },
  linkText: { color: DIM, fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '75%',
    height: 170,
    borderWidth: 3,
    borderColor: GOLD,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  hint: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 18 },
  closeBtn: {
    position: 'absolute',
    top: 46,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 20 },
});

