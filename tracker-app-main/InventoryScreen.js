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
import { pickCompressedImage } from './imagePicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import BarcodeScanner from './BarcodeScanner';
import { lookupBarcode, estimateShelfLifeDays, addDaysISO, spoilStatus } from './barcodeLookup';

const INV_CATEGORIES = [
  'Seasonings',
  'Meats',
  'Pantry',
  'Produce',
  'Dairy',
  'Other',
];

function todayDateKey() {
  const dt = new Date();
  // Local date, not UTC - see habitUtils.localDateKey.
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function makeId() {
  return 'inv' + Date.now() + Math.random().toString(36).slice(2, 8);
}

function latestInventoryPrice(item) {
  const h = (item && item.priceHistory) || [];
  return h.length ? Number(h[h.length - 1].price) || 0 : 0;
}

// Same real Worker used from the Recipes screen's ingredient-linking
// flow - this is the OTHER place a new inventory item gets created, and
// it deserves the same price lookup, not a second one that could drift
// out of sync with it.

export default function InventoryScreen({ inventory, setInventory, bodyInventory, setBodyInventory }) {
  const [selfCareOpen, setSelfCareOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [selfCareName, setSelfCareName] = useState('');
  const [selfCareAmount, setSelfCareAmount] = useState('');

  function addSelfCareItem() {
    const name = selfCareName.trim();
    if (!name) return;
    setBodyInventory((prev) => [
      ...prev,
      { id: 'sci' + Date.now() + Math.random().toString(36).slice(2, 8), name, amount: selfCareAmount.trim(), notes: '', image: null },
    ]);
    setSelfCareName('');
    setSelfCareAmount('');
  }

  function removeSelfCareItem(item) {
    Alert.alert('Remove this item?', item.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setBodyInventory((prev) => prev.filter((x) => x.id !== item.id)),
      },
    ]);
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    category: 'Pantry',
    amount: '',
    qty: '',
    expDate: '',
    image: null,
  });
  const [itemPrice, setItemPrice] = useState('');

  // A scan fills the form rather than saving straight away — coverage
  // is imperfect and you should always get a chance to correct it.
  // The rest of the app (the "Expiring Soon" list on Calendar, the
  // days-left badge here) already parses expDate as YYYY-MM-DD, so the
  // picker below still writes that same format - just via a real native
  // date picker instead of hand-typed text.
  function formatDateForStorage(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDateForDisplay(iso) {
    if (!iso) return 'Select a date';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function handleScanned(code) {
    setScanBusy(true);
    const result = await lookupBarcode(code);
    setScanOpen(false);
    setScanBusy(false);
    setEditingId(null);
    if (result.found) {
      setDraft({
        name: result.name,
        category: result.category,
        amount: result.amount || '',
        qty: '1',
        expDate: addDaysISO(result.shelfLifeDays),
        // Product shot from the database, so a scanned item is
        // recognisable in the list without photographing it.
        image: result.image || null,
      });
      if (!result.image) {
        // Distinguishes "this product has no photo in the database" from
        // "the app failed to attach one" — otherwise both look the same.
        Alert.alert(
          'No photo available',
          "Found \"" + result.name + '\" but the database has no photo for it. Everything else is filled in - you can add your own photo in the form.'
        );
      }
    } else {
      setDraft({
        name: '',
        category: 'Pantry',
        amount: '',
        qty: '1',
        expDate: '',
        image: null,
      });
      Alert.alert(
        'Not in the database',
        result.error
          ? "Couldn't reach the product database. Enter the item manually."
          : "That barcode isn't in the open product database — common for loose produce and store brands. Enter the name yourself and it'll save normally."
      );
    }
    setModalOpen(true);
  }

  function openAdd() {
    setEditingId(null);
    setDraft({
      name: '',
      category: 'Pantry',
      amount: '',
      qty: '',
      expDate: '',
      image: null,
    });
    setItemPrice('');
    setKrogerResults(null);
    setKrogerError('');
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setDraft({
      name: item.name || '',
      category: item.category || 'Pantry',
      amount: item.amount || '',
      qty: item.qty != null ? String(item.qty) : '',
      expDate: item.expDate || '',
      image: item.image || null,
    });
    setItemPrice(String(latestInventoryPrice(item) || ''));
    setKrogerResults(null);
    setKrogerError('');
    setModalOpen(true);
  }

  async function pickImage() {
    const result = await pickCompressedImage();
    if (result.error === 'permission') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    if (result.uri) {
      setDraft((d) => ({ ...d, image: result.uri }));
    }
  }

  function saveItem() {
    if (!draft.name.trim()) {
      Alert.alert('Name required', 'Give this item a name first.');
      return;
    }
    const qtyNum = draft.qty.trim() === '' ? null : Number(draft.qty);
    const existing = editingId ? inventory.find((it) => it.id === editingId) : null;
    const priceHistory = existing ? existing.priceHistory || [] : [];
    const newPrice = Number(itemPrice) || 0;
    const currentLatest = existing ? latestInventoryPrice(existing) : 0;
    const updatedHistory =
      newPrice > 0 && newPrice !== currentLatest
        ? [...priceHistory, { price: newPrice, date: Date.now() }]
        : priceHistory;
    const item = {
      id: editingId || makeId(),
      name: draft.name.trim(),
      category: draft.category,
      amount: draft.amount.trim(),
      qty: qtyNum,
      expDate: draft.expDate.trim(),
      image: draft.image,
      priceHistory: updatedHistory,
    };
    if (editingId) {
      setInventory((prev) => prev.map((it) => (it.id === editingId ? item : it)));
    } else {
      setInventory((prev) => [...prev, item]);
    }
    setModalOpen(false);
  }

  function deleteItem() {
    Alert.alert('Delete item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setInventory((prev) => prev.filter((it) => it.id !== editingId));
          setModalOpen(false);
        },
      },
    ]);
  }

  const todayKey = todayDateKey();
  const grouped = INV_CATEGORIES.map((cat) => ({
    cat,
    items: inventory.filter((it) => it.category === cat),
  })).filter((g) => g.items.length);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Inventory</Text>
        <Text style={shared.tagline}>
          {inventory.length} item{inventory.length === 1 ? '' : 's'}
        </Text>

        <TouchableOpacity style={styles.scanBtn} onPress={() => setScanOpen(true)}>
          <Text style={styles.scanBtnText}>📷 Scan a barcode</Text>
        </TouchableOpacity>

        {(() => {
          const flagged = inventory
            .map((it) => ({ it, st: spoilStatus(it) }))
            .filter((x) => x.st && x.st.level !== 'ok')
            .sort((a, b) => a.st.days - b.st.days);
          if (!flagged.length) return null;
          return (
            <View style={[shared.block, styles.spoilBlock]}>
              <View style={shared.blockHead}>
                <Text style={shared.blockTitle}>Use These First</Text>
                <View style={shared.countBadge}>
                  <Text style={shared.countBadgeText}>{flagged.length}</Text>
                </View>
              </View>
              {flagged.map(({ it, st }) => (
                <TouchableOpacity key={it.id} style={shared.row} onPress={() => openEdit(it)}>
                  <View style={{ flex: 1 }}>
                    <Text style={shared.rowName}>{it.name}</Text>
                    <Text style={styles.spoilMeta}>{it.category}</Text>
                  </View>
                  <Text
                    style={[
                      styles.spoilTag,
                      st.level === 'expired' && styles.spoilExpired,
                      st.level === 'today' && styles.spoilToday,
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}

        {inventory.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              Nothing in your inventory
            </Text>
            <Text style={shared.tagline}>
              Add what you have on hand — seasonings, meats, pantry staples.
            </Text>
          </View>
        ) : (
          grouped.map(({ cat, items }) => (
            <View key={cat} style={shared.block}>
              <Text style={shared.catHead}>{cat}</Text>
              {items.map((it) => {
                let expBit = null;
                if (it.expDate) {
                  const daysLeft = Math.round(
                    (new Date(it.expDate + 'T00:00:00') -
                      new Date(todayKey + 'T00:00:00')) /
                      86400000
                  );
                  let color = DIM;
                  let label = `Exp ${it.expDate}`;
                  if (daysLeft < 0) {
                    color = ROSE;
                    label = 'Expired';
                  } else if (daysLeft === 0) {
                    color = ROSE;
                    label = 'Expires today';
                  } else if (daysLeft <= 3) {
                    color = GOLD;
                    label = `Expires in ${daysLeft}d`;
                  }
                  expBit = (
                    <Text style={{ fontSize: 11, color, marginTop: 2 }}>{label}</Text>
                  );
                }
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={shared.row}
                    onPress={() => openEdit(it)}
                  >
                    {it.image ? (
                      <Image source={{ uri: it.image }} style={shared.thumb44} />
                    ) : null}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontSize: 15, color: INK }}>{it.name}</Text>
                      {expBit}
                    </View>
                    {it.qty != null ? (
                      <Text style={shared.rowRight}>Qty {it.qty}</Text>
                    ) : it.amount ? (
                      <Text style={shared.rowRight}>{it.amount}</Text>
                    ) : null}
                    {(() => {
                      const st = spoilStatus(it);
                      return st && st.level === 'ok' ? (
                        <Text style={styles.spoilOk}>{st.label}</Text>
                      ) : null;
                    })()}
                    {false ? (
                      <Text style={shared.rowRight}>{it.amount}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}

        <View style={shared.block}>
          <TouchableOpacity
            style={styles.selfCareHead}
            onPress={() => setSelfCareOpen((v) => !v)}
          >
            <Text style={shared.blockTitle}>Self Care</Text>
            <Text style={styles.selfCareChevron}>
              {(bodyInventory || []).length} {selfCareOpen ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {selfCareOpen ? (
            <>
              {(bodyInventory || []).length === 0 ? (
                <Text style={shared.tagline}>
                  Nothing here yet — add shampoo, lotion, razors, whatever you
                  restock.
                </Text>
              ) : (
                (bodyInventory || []).map((it) => (
                  <TouchableOpacity
                    key={it.id}
                    style={shared.row}
                    onLongPress={() => removeSelfCareItem(it)}
                    delayLongPress={400}
                  >
                    <Text style={shared.rowName}>{it.name}</Text>
                    {it.amount ? <Text style={shared.rowRight}>{it.amount}</Text> : null}
                  </TouchableOpacity>
                ))
              )}
              <View style={styles.selfCareAddRow}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={selfCareName}
                  onChangeText={setSelfCareName}
                  placeholder="Item name"
                  placeholderTextColor="#9aa5b1"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={selfCareAmount}
                  onChangeText={setSelfCareAmount}
                  placeholder="Qty"
                  placeholderTextColor="#9aa5b1"
                />
                <TouchableOpacity style={styles.selfCareAddBtn} onPress={addSelfCareItem}>
                  <Text style={styles.selfCareAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.selfCareHint}>Long-press an item to remove it.</Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={scanOpen} animationType="slide" onRequestClose={() => setScanOpen(false)}>
        <BarcodeScanner onScanned={handleScanned} onClose={() => setScanOpen(false)} />
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingId ? 'Edit Item' : 'Add Item'}
              </Text>

              {draft.image ? (
                <Image source={{ uri: draft.image }} style={styles.imgPreview} />
              ) : null}
              <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                <Text style={styles.imgBtnText}>
                  {draft.image ? 'Change Photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={draft.name}
                onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
                placeholder="e.g. Milk"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {INV_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      draft.category === cat && styles.catChipSel,
                    ]}
                    onPress={() => setDraft((d) => ({ ...d, category: cat }))}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        draft.category === cat && styles.catChipTextSel,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Amount (optional, e.g. "half gallon")</Text>
              <TextInput
                style={styles.input}
                value={draft.amount}
                onChangeText={(v) => setDraft((d) => ({ ...d, amount: v }))}
                placeholder="Amount"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Quantity (optional, whole number)</Text>
              <TextInput
                style={styles.input}
                value={draft.qty}
                onChangeText={(v) => setDraft((d) => ({ ...d, qty: v }))}
                placeholder="e.g. 3"
                placeholderTextColor="#9aa5b1"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Expiration Date (optional)</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: draft.expDate ? INK : '#9aa5b1', fontSize: 15 }}>
                  {formatDateForDisplay(draft.expDate)}
                </Text>
              </TouchableOpacity>
              {draft.expDate ? (
                <TouchableOpacity
                  onPress={() => setDraft((d) => ({ ...d, expDate: '' }))}
                  style={{ marginTop: -8, marginBottom: 14 }}
                >
                  <Text style={{ color: DIM, fontSize: 12 }}>Clear date</Text>
                </TouchableOpacity>
              ) : null}
              {showDatePicker ? (
                <DateTimePicker
                  value={draft.expDate ? new Date(draft.expDate + 'T00:00:00') : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setDraft((d) => ({ ...d, expDate: formatDateForStorage(selectedDate) }));
                    }
                  }}
                />
              ) : null}

              <View style={{ height: 1, backgroundColor: BORDER, marginVertical: 16 }} />
              <Text style={{ color: DIM, fontSize: 12, marginBottom: 16 }}>
                Price checking has moved to Groceries - use that tab to look up real prices.
              </Text>

              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.input}
                value={itemPrice}
                onChangeText={(v) => setItemPrice(v.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Save Changes' : 'Add Item'}
                </Text>
              </TouchableOpacity>

              {editingId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteItem}>
                  <Text style={styles.deleteBtnText}>Delete Item</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '400', marginTop: -2 },
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
    maxHeight: '88%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  scanBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  spoilBlock: { borderWidth: 1, borderColor: ROSE },
  spoilMeta: { color: DIM, fontSize: 11, marginTop: 2 },
  spoilTag: { color: GOLD, fontSize: 12, fontWeight: '800' },
  spoilExpired: { color: ROSE },
  spoilToday: { color: ROSE },
  spoilOk: { color: DIM, fontSize: 11, marginLeft: 8 },
  selfCareHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selfCareChevron: { color: DIM, fontSize: 13, fontWeight: '700' },
  selfCareAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  selfCareAddBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selfCareAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  selfCareHint: { color: DIM, fontSize: 11, marginTop: 8 },
  input: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#232d3a',
    marginRight: 8,
    marginBottom: 8,
  },
  catChipSel: { backgroundColor: GOLD },
  catChipText: { fontSize: 13, color: INK },
  catChipTextSel: { color: '#fff', fontWeight: '600' },
  imgPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },
  imgBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  imgBtnText: { color: INK, fontSize: 14, fontWeight: '500' },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
});

