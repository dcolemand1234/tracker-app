import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

const PERMANENT_TILES = [
  { id: 'recipes', name: 'Recipes', icon: '🍛', color: '#b8705c' },
  { id: 'dating', name: 'Dating', icon: '💕', color: '#b85c8f' },
  { id: 'traveling', name: 'Traveling', icon: '✈️', color: '#4a7ba6' },
  { id: 'inventory', name: 'Inventory', icon: '📦', color: '#8a9a4b' },
  { id: 'restaurants', name: 'Restaurants', icon: '🍽️', color: '#c2685a' },
];

const ICON_CHOICES = ['📌','📖','🎓','🏠','🚗','⚕️','📄','🔧','🌱','🎁','📷','🎵','🧳','💼','🗂️'];
const COLOR_CHOICES = ['#b8705c','#3f8f82','#bc9440','#7b6ca6','#5b7b8b','#4a7ba6','#8a9a4b','#c2685a'];

function makeId() {
  return 'ic' + Date.now() + Math.random().toString(36).slice(2, 8);
}

export default function InformationScreen({
  infoCategories,
  setInfoCategories,
  onNavigate,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', icon: ICON_CHOICES[0], color: COLOR_CHOICES[0] });
  const [placeholderOpen, setPlaceholderOpen] = useState(null);

  function saveCategory() {
    const name = draft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this category a name.');
      return;
    }
    setInfoCategories((prev) => [
      ...prev,
      { id: makeId(), name, icon: draft.icon, color: draft.color },
    ]);
    setDraft({ name: '', icon: ICON_CHOICES[0], color: COLOR_CHOICES[0] });
    setModalOpen(false);
  }

  function handleTilePress(id) {
    if (id === 'recipes') return onNavigate('recipes');
    if (id === 'dating') return onNavigate('places', 'dating');
    if (id === 'traveling') return onNavigate('travel');
    if (id === 'inventory') return onNavigate('inventory');
    if (id === 'restaurants') return onNavigate('restaurants');
    // Custom categories don't have content screens yet — matches the
    // web app's own behavior (they're stubs there too).
    setPlaceholderOpen(id);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Information</Text>
        <Text style={shared.tagline}>Recipes, places, and body — all in one spot</Text>

        <View style={styles.grid}>
          {PERMANENT_TILES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tile, { backgroundColor: t.color }]}
              onPress={() => handleTilePress(t.id)}
            >
              <Text style={styles.tileIcon}>{t.icon}</Text>
              <Text style={styles.tileName}>{t.name}</Text>
            </TouchableOpacity>
          ))}
          {infoCategories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.tile, { backgroundColor: c.color }]}
              onPress={() => handleTilePress(c.id)}
            >
              <Text style={styles.tileIcon}>{c.icon}</Text>
              <Text style={styles.tileName}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Category</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
              placeholder="e.g. Home Maintenance"
              placeholderTextColor="#9aa5b1"
            />
            <Text style={styles.label}>Icon</Text>
            <View style={styles.rowWrap}>
              {ICON_CHOICES.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconBtn, draft.icon === ic && styles.iconBtnSel]}
                  onPress={() => setDraft((d) => ({ ...d, icon: ic }))}
                >
                  <Text style={{ fontSize: 18 }}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Color</Text>
            <View style={styles.rowWrap}>
              {COLOR_CHOICES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    draft.color === c && styles.colorDotSel,
                  ]}
                  onPress={() => setDraft((d) => ({ ...d, color: c }))}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveCategory}>
              <Text style={styles.saveBtnText}>Add Category</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!placeholderOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPlaceholderOpen(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {infoCategories.find((c) => c.id === placeholderOpen)?.name}
            </Text>
            <Text style={shared.tagline}>
              Custom categories don't have content screens built yet.
            </Text>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setPlaceholderOpen(null)}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48%',
    aspectRatio: 1.4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tileIcon: { fontSize: 30, marginBottom: 6 },
  tileName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  addTile: {
    width: '48%',
    aspectRatio: 1.4,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  addTileText: { color: DIM, fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#232d3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  iconBtnSel: { backgroundColor: '#332a13', borderWidth: 2, borderColor: GOLD },
  colorDot: { width: 34, height: 34, borderRadius: 17, marginRight: 10, marginBottom: 10 },
  colorDotSel: { borderWidth: 3, borderColor: INK },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: DIM, fontSize: 14 },
});

