import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pickCompressedImage } from './imagePicker';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

const PRESERVE_CATEGORIES = ['Jam', 'Pickle', 'Sauce', 'Dried', 'Frozen', 'Fermented', 'Other'];
const GARDEN_STATUSES = [
  { id: 'growing', label: 'Growing', color: '#4fb894' },
  { id: 'ready', label: 'Ready to Harvest', color: '#e0a94b' },
  { id: 'harvested', label: 'Harvested', color: '#8a9a4b' },
];

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function emptyGardenDraft() {
  return { name: '', plantedDate: todayISO(), expectedHarvestDate: '', status: 'growing', notes: '', image: null };
}
function emptyPreserveDraft() {
  return {
    name: '',
    category: PRESERVE_CATEGORIES[0],
    datePreserved: todayISO(),
    jarCount: '',
    expiryDate: '',
    sourceGardenId: null,
    notes: '',
    image: null,
  };
}

export default function HomesteadScreen({ gardenItems, setGardenItems, preservedItems, setPreservedItems }) {
  const garden = gardenItems || [];
  const preserves = preservedItems || [];
  const [view, setView] = useState('garden'); // 'garden' | 'preserving'

  // --- Garden state ---
  const [gardenModalOpen, setGardenModalOpen] = useState(false);
  const [editingGardenId, setEditingGardenId] = useState(null);
  const [gardenDraft, setGardenDraft] = useState(emptyGardenDraft());
  const [showPlantedPicker, setShowPlantedPicker] = useState(false);
  const [showHarvestPicker, setShowHarvestPicker] = useState(false);

  function openAddGarden() {
    setEditingGardenId(null);
    setGardenDraft(emptyGardenDraft());
    setGardenModalOpen(true);
  }
  function openEditGarden(g) {
    setEditingGardenId(g.id);
    setGardenDraft({
      name: g.name || '',
      plantedDate: g.plantedDate || todayISO(),
      expectedHarvestDate: g.expectedHarvestDate || '',
      status: g.status || 'growing',
      notes: g.notes || '',
      image: g.image || null,
    });
    setGardenModalOpen(true);
  }
  async function pickGardenImage() {
    const result = await pickCompressedImage();
    if (result.error === 'permission') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    if (result.uri) setGardenDraft((d) => ({ ...d, image: result.uri }));
  }
  function saveGarden() {
    const name = gardenDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', "What's growing?");
      return;
    }
    if (editingGardenId) {
      setGardenItems((prev) => prev.map((g) => (g.id === editingGardenId ? { ...g, ...gardenDraft, name } : g)));
    } else {
      setGardenItems((prev) => [...(prev || []), { id: makeId('gd'), ...gardenDraft, name, addedAt: Date.now() }]);
    }
    setGardenModalOpen(false);
  }
  function deleteGarden(id, name) {
    Alert.alert('Remove this plant?', `Remove "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setGardenItems((prev) => prev.filter((g) => g.id !== id)) },
    ]);
  }
  function cycleGardenStatus(g) {
    const idx = GARDEN_STATUSES.findIndex((s) => s.id === g.status);
    const next = GARDEN_STATUSES[(idx + 1) % GARDEN_STATUSES.length];
    setGardenItems((prev) => prev.map((x) => (x.id === g.id ? { ...x, status: next.id } : x)));
  }

  // --- Preserving state ---
  const [preserveModalOpen, setPreserveModalOpen] = useState(false);
  const [editingPreserveId, setEditingPreserveId] = useState(null);
  const [preserveDraft, setPreserveDraft] = useState(emptyPreserveDraft());
  const [showPreservedPicker, setShowPreservedPicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);

  function openAddPreserve() {
    setEditingPreserveId(null);
    setPreserveDraft(emptyPreserveDraft());
    setPreserveModalOpen(true);
  }
  function openEditPreserve(p) {
    setEditingPreserveId(p.id);
    setPreserveDraft({
      name: p.name || '',
      category: p.category || PRESERVE_CATEGORIES[0],
      datePreserved: p.datePreserved || todayISO(),
      jarCount: p.jarCount ? String(p.jarCount) : '',
      expiryDate: p.expiryDate || '',
      sourceGardenId: p.sourceGardenId || null,
      notes: p.notes || '',
      image: p.image || null,
    });
    setPreserveModalOpen(true);
  }
  async function pickPreserveImage() {
    const result = await pickCompressedImage();
    if (result.error === 'permission') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    if (result.uri) setPreserveDraft((d) => ({ ...d, image: result.uri }));
  }
  function savePreserve() {
    const name = preserveDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'What did you make?');
      return;
    }
    const payload = { ...preserveDraft, name, jarCount: Number(preserveDraft.jarCount) || 0 };
    if (editingPreserveId) {
      setPreservedItems((prev) => prev.map((p) => (p.id === editingPreserveId ? { ...p, ...payload } : p)));
    } else {
      setPreservedItems((prev) => [...(prev || []), { id: makeId('pr'), ...payload, addedAt: Date.now() }]);
    }
    setPreserveModalOpen(false);
  }
  function deletePreserve(id, name) {
    Alert.alert('Remove this batch?', `Remove "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPreservedItems((prev) => prev.filter((p) => p.id !== id)) },
    ]);
  }

  const harvestedGardenItems = garden.filter((g) => g.status === 'harvested' || g.status === 'ready');
  const sourceGardenItem = preserveDraft.sourceGardenId
    ? garden.find((g) => g.id === preserveDraft.sourceGardenId)
    : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTabBtn, view === 'garden' && styles.subTabBtnSel]}
          onPress={() => setView('garden')}
        >
          <Text style={[styles.subTabText, view === 'garden' && styles.subTabTextSel]}>🌱 Garden</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabBtn, view === 'preserving' && styles.subTabBtnSel]}
          onPress={() => setView('preserving')}
        >
          <Text style={[styles.subTabText, view === 'preserving' && styles.subTabTextSel]}>🫙 Preserving</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={shared.container}>
        {view === 'garden' ? (
          garden.length === 0 ? (
            <View style={shared.block}>
              <Text style={shared.tagline}>Nothing planted yet. Tap + to add what's growing.</Text>
            </View>
          ) : (
            garden.map((g) => {
              const statusInfo = GARDEN_STATUSES.find((s) => s.id === g.status) || GARDEN_STATUSES[0];
              const daysToHarvest = g.status === 'growing' ? daysUntil(g.expectedHarvestDate) : null;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.card}
                  onPress={() => openEditGarden(g)}
                  onLongPress={() => deleteGarden(g.id, g.name)}
                >
                  {g.image ? (
                    <Image source={{ uri: g.image }} style={styles.cardImg} />
                  ) : (
                    <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
                      <Text style={{ fontSize: 24 }}>🌱</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardName}>{g.name}</Text>
                    <TouchableOpacity onPress={() => cycleGardenStatus(g)}>
                      <Text style={[styles.statusBadge, { color: statusInfo.color }]}>● {statusInfo.label}</Text>
                    </TouchableOpacity>
                    {g.expectedHarvestDate ? (
                      <Text style={styles.cardMeta}>
                        Expected harvest: {formatDate(g.expectedHarvestDate)}
                        {daysToHarvest != null ? ` (${daysToHarvest >= 0 ? `${daysToHarvest}d` : 'overdue'})` : ''}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )
        ) : preserves.length === 0 ? (
          <View style={shared.block}>
            <Text style={shared.tagline}>Nothing preserved yet. Tap + to log your first batch.</Text>
          </View>
        ) : (
          preserves.map((p) => {
            const daysLeft = daysUntil(p.expiryDate);
            const source = p.sourceGardenId ? garden.find((g) => g.id === p.sourceGardenId) : null;
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => openEditPreserve(p)}
                onLongPress={() => deletePreserve(p.id, p.name)}
              >
                {p.image ? (
                  <Image source={{ uri: p.image }} style={styles.cardImg} />
                ) : (
                  <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
                    <Text style={{ fontSize: 24 }}>🫙</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardName}>{p.name}</Text>
                  <Text style={styles.cardMeta}>
                    {p.category} · {p.jarCount || 0} jar{p.jarCount === 1 ? '' : 's'} · {formatDate(p.datePreserved)}
                  </Text>
                  {source ? <Text style={styles.cardMeta}>🌱 From: {source.name}</Text> : null}
                  {p.expiryDate ? (
                    <Text
                      style={[
                        styles.cardMeta,
                        daysLeft != null && daysLeft <= 30 ? { color: ROSE } : null,
                      ]}
                    >
                      {daysLeft != null && daysLeft < 0
                        ? 'Expired'
                        : `Best by ${formatDate(p.expiryDate)}${daysLeft != null ? ` (${daysLeft}d)` : ''}`}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={view === 'garden' ? openAddGarden : openAddPreserve}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Garden add/edit modal */}
      <Modal visible={gardenModalOpen} animationType="slide" transparent onRequestClose={() => setGardenModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{editingGardenId ? 'Edit Plant' : 'Add Plant'}</Text>

              <TouchableOpacity style={styles.photoBtn} onPress={pickGardenImage}>
                {gardenDraft.image ? (
                  <Image source={{ uri: gardenDraft.image }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoBtnText}>Add Photo</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={gardenDraft.name}
                onChangeText={(v) => setGardenDraft((d) => ({ ...d, name: v }))}
                placeholder="Tomatoes, Basil, Zucchini..."
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Status</Text>
              <View style={styles.chipRow}>
                {GARDEN_STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, gardenDraft.status === s.id && styles.chipSel]}
                    onPress={() => setGardenDraft((d) => ({ ...d, status: s.id }))}
                  >
                    <Text style={[styles.chipText, gardenDraft.status === s.id && styles.chipTextSel]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Planted</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowPlantedPicker(true)}>
                <Text style={{ color: INK }}>{formatDate(gardenDraft.plantedDate) || 'Select a date'}</Text>
              </TouchableOpacity>
              {showPlantedPicker ? (
                <DateTimePicker
                  value={new Date((gardenDraft.plantedDate || todayISO()) + 'T00:00:00')}
                  mode="date"
                  onChange={(e, d) => {
                    setShowPlantedPicker(false);
                    if (e.type !== 'dismissed' && d) {
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setGardenDraft((prev) => ({ ...prev, plantedDate: iso }));
                    }
                  }}
                />
              ) : null}

              <Text style={styles.label}>Expected Harvest (optional)</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowHarvestPicker(true)}>
                <Text style={{ color: gardenDraft.expectedHarvestDate ? INK : '#9aa5b1' }}>
                  {formatDate(gardenDraft.expectedHarvestDate) || 'Select a date'}
                </Text>
              </TouchableOpacity>
              {showHarvestPicker ? (
                <DateTimePicker
                  value={new Date((gardenDraft.expectedHarvestDate || todayISO()) + 'T00:00:00')}
                  mode="date"
                  onChange={(e, d) => {
                    setShowHarvestPicker(false);
                    if (e.type !== 'dismissed' && d) {
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setGardenDraft((prev) => ({ ...prev, expectedHarvestDate: iso }));
                    }
                  }}
                />
              ) : null}

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={gardenDraft.notes}
                onChangeText={(v) => setGardenDraft((d) => ({ ...d, notes: v }))}
                placeholder="Variety, spacing, care notes..."
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveGarden}>
                <Text style={styles.saveBtnText}>{editingGardenId ? 'Save Changes' : 'Add Plant'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setGardenModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Preserving add/edit modal */}
      <Modal visible={preserveModalOpen} animationType="slide" transparent onRequestClose={() => setPreserveModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{editingPreserveId ? 'Edit Batch' : 'Add Batch'}</Text>

              <TouchableOpacity style={styles.photoBtn} onPress={pickPreserveImage}>
                {preserveDraft.image ? (
                  <Image source={{ uri: preserveDraft.image }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoBtnText}>Add Photo</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={preserveDraft.name}
                onChangeText={(v) => setPreserveDraft((d) => ({ ...d, name: v }))}
                placeholder="Tomato Sauce, Dill Pickles..."
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.chipRow}>
                {PRESERVE_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, preserveDraft.category === c && styles.chipSel]}
                    onPress={() => setPreserveDraft((d) => ({ ...d, category: c }))}
                  >
                    <Text style={[styles.chipText, preserveDraft.category === c && styles.chipTextSel]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {harvestedGardenItems.length > 0 ? (
                <>
                  <Text style={styles.label}>Made From (optional)</Text>
                  <TouchableOpacity style={styles.input} onPress={() => setSourcePickerOpen(true)}>
                    <Text style={{ color: sourceGardenItem ? INK : '#9aa5b1' }}>
                      {sourceGardenItem ? `🌱 ${sourceGardenItem.name}` : 'Link to a garden harvest'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <Text style={styles.label}>Jars Made</Text>
              <TextInput
                style={styles.input}
                value={preserveDraft.jarCount}
                onChangeText={(v) => setPreserveDraft((d) => ({ ...d, jarCount: v.replace(/[^0-9]/g, '') }))}
                placeholder="0"
                placeholderTextColor="#9aa5b1"
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Date Preserved</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowPreservedPicker(true)}>
                <Text style={{ color: INK }}>{formatDate(preserveDraft.datePreserved) || 'Select a date'}</Text>
              </TouchableOpacity>
              {showPreservedPicker ? (
                <DateTimePicker
                  value={new Date((preserveDraft.datePreserved || todayISO()) + 'T00:00:00')}
                  mode="date"
                  onChange={(e, d) => {
                    setShowPreservedPicker(false);
                    if (e.type !== 'dismissed' && d) {
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setPreserveDraft((prev) => ({ ...prev, datePreserved: iso }));
                    }
                  }}
                />
              ) : null}

              <Text style={styles.label}>Best By / Expiry (optional)</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowExpiryPicker(true)}>
                <Text style={{ color: preserveDraft.expiryDate ? INK : '#9aa5b1' }}>
                  {formatDate(preserveDraft.expiryDate) || 'Select a date'}
                </Text>
              </TouchableOpacity>
              {showExpiryPicker ? (
                <DateTimePicker
                  value={new Date((preserveDraft.expiryDate || todayISO()) + 'T00:00:00')}
                  mode="date"
                  onChange={(e, d) => {
                    setShowExpiryPicker(false);
                    if (e.type !== 'dismissed' && d) {
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setPreserveDraft((prev) => ({ ...prev, expiryDate: iso }));
                    }
                  }}
                />
              ) : null}

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={preserveDraft.notes}
                onChangeText={(v) => setPreserveDraft((d) => ({ ...d, notes: v }))}
                placeholder="Recipe tweaks, canning method, results..."
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={savePreserve}>
                <Text style={styles.saveBtnText}>{editingPreserveId ? 'Save Changes' : 'Add Batch'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPreserveModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Source garden item picker */}
      <Modal visible={sourcePickerOpen} animationType="slide" transparent onRequestClose={() => setSourcePickerOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Link to a Harvest</Text>
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => {
                setPreserveDraft((d) => ({ ...d, sourceGardenId: null }));
                setSourcePickerOpen(false);
              }}
            >
              <Text style={{ color: DIM, fontSize: 14 }}>None</Text>
            </TouchableOpacity>
            {harvestedGardenItems.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.pickerRow}
                onPress={() => {
                  setPreserveDraft((d) => ({ ...d, sourceGardenId: g.id }));
                  setSourcePickerOpen(false);
                }}
              >
                <Text style={{ color: INK, fontSize: 14 }}>🌱 {g.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSourcePickerOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  subTabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  subTabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#1f1a15', borderWidth: 1, borderColor: BORDER,
  },
  subTabBtnSel: { backgroundColor: GOLD, borderColor: GOLD },
  subTabText: { color: DIM, fontSize: 13, fontWeight: '600' },
  subTabTextSel: { color: '#1c1206', fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: CARD,
    borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: BORDER,
  },
  cardImg: { width: 60, height: 60, borderRadius: 10 },
  cardImgPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1512' },
  cardName: { color: INK, fontSize: 16, fontWeight: '700' },
  cardMeta: { color: DIM, fontSize: 12, marginTop: 2 },
  statusBadge: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  fabText: { color: '#1c1206', fontSize: 30, fontWeight: '700', marginTop: -2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0c0a08', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  sheetTitle: { color: INK, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  label: { color: DIM, fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: '#1f1a15', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: INK, borderWidth: 1, borderColor: BORDER,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    backgroundColor: '#1f1a15', borderWidth: 1, borderColor: BORDER,
  },
  chipSel: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: DIM, fontSize: 13 },
  chipTextSel: { color: '#1c1206', fontWeight: '700' },
  photoBtn: {
    borderWidth: 1, borderColor: 'rgba(217,164,65,0.4)', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 6, overflow: 'hidden',
  },
  photoBtnText: { color: GOLD, fontSize: 14, fontWeight: '600' },
  photoPreview: { width: '100%', height: 140, borderRadius: 10 },
  saveBtn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: '#1c1206', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: DIM, fontSize: 14 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
});
