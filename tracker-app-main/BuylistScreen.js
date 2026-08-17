import React, { useState, useEffect } from 'react';
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
  Linking,
} from 'react-native';
import { pickCompressedImage } from './imagePicker';
import { fetchProductFromUrl } from './buylistImport';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

const CAT_COLORS = [
  '#7b6ca6',
  '#b8705c',
  '#5b7b8b',
  '#bc9440',
  '#249bad',
  '#4a90a4',
  '#8a6d3b',
  '#6b8e5a',
];

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

function ItemCard({ it, cat, onEdit }) {
  return (
    <View style={[styles.card, { borderColor: cat ? cat.color : BORDER }]}>
      <TouchableOpacity onPress={() => onEdit(it)}>
        {it.image ? (
          <Image source={{ uri: it.image }} style={styles.cardImg} />
        ) : (
          <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <Text style={styles.placeholderLetter}>
              {(it.title || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {it.title}
        </Text>
        {cat ? (
          <Text style={[styles.cardCat, { color: cat.color }]}>{cat.name}</Text>
        ) : null}
        {it.price ? <Text style={styles.cardPrice}>{it.price}</Text> : null}
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onEdit(it)}>
            <Text style={styles.actionLink}>Edit</Text>
          </TouchableOpacity>
          {it.url ? (
            <TouchableOpacity onPress={() => Linking.openURL(it.url)}>
              <Text style={styles.actionLink}>Visit ↗</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function BuylistScreen({
  buylist,
  setBuylist,
  buylistCategories,
  setBuylistCategories,
  initialFilter,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  useEffect(() => {
    if (initialFilter) setActiveFilter(initialFilter);
  }, [initialFilter]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillError, setAutoFillError] = useState('');

  async function autoFillFromLink() {
    const url = draft.url.trim();
    if (!url) {
      Alert.alert('Link required', 'Paste a product link first.');
      return;
    }
    setAutoFillLoading(true);
    setAutoFillError('');
    try {
      const product = await fetchProductFromUrl(url);
      setDraft((d) => ({
        ...d,
        title: product.title || d.title,
        image: product.image || d.image,
        price: product.price != null ? String(product.price) : d.price,
      }));
    } catch (e) {
      setAutoFillError(e && e.message ? e.message : 'Could not fetch that page.');
    } finally {
      setAutoFillLoading(false);
    }
  }

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catDraft, setCatDraft] = useState({ name: '', color: CAT_COLORS[0] });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [boardView, setBoardView] = useState('boards'); // 'boards' | 'list'

  function emptyDraft() {
    return { title: '', price: '', url: '', notes: '', categoryId: null, image: null };
  }

  const filtered =
    activeFilter === 'all'
      ? buylist
      : buylist.filter((it) => it.categoryId === activeFilter);
  const sorted = [...filtered].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

  // Simple two-column split for a Pinterest-style masonry look — cards
  // vary in height naturally (image + however much text each has), so
  // alternating into two independently-stacking columns is what gives
  // the staggered effect without needing a masonry layout library.
  const leftColumn = sorted.filter((_, i) => i % 2 === 0);
  const rightColumn = sorted.filter((_, i) => i % 2 === 1);

  const activeFilterLabel =
    activeFilter === 'all'
      ? 'All'
      : buylistCategories.find((c) => c.id === activeFilter)?.name || 'All';

  function openBoard(catId) {
    setActiveFilter(catId);
    setBoardView('list');
  }

  // Pinterest-style board tiles: "All Items" plus one per category, each
  // with a small preview collage of up to 4 items and a live count.
  const boards = [
    { id: 'all', name: 'All Items', color: GOLD },
    ...buylistCategories,
  ].map((c) => {
    const items =
      c.id === 'all' ? buylist : buylist.filter((it) => it.categoryId === c.id);
    return { ...c, items, count: items.length, preview: items.slice(0, 4) };
  });

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setDraft({
      title: item.title || '',
      price: item.price || '',
      url: item.url || '',
      notes: item.notes || '',
      categoryId: item.categoryId || null,
      image: item.image || null,
    });
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
    if (!draft.title.trim()) {
      Alert.alert('Title required', 'Give this item a title first.');
      return;
    }
    const item = {
      id: editingId || makeId('b'),
      title: draft.title.trim(),
      price: draft.price.trim(),
      url: draft.url.trim(),
      notes: draft.notes.trim(),
      categoryId: draft.categoryId,
      image: draft.image,
      addedAt: editingId
        ? buylist.find((b) => b.id === editingId)?.addedAt || Date.now()
        : Date.now(),
    };
    if (editingId) {
      setBuylist((prev) => prev.map((b) => (b.id === editingId ? item : b)));
    } else {
      setBuylist((prev) => [...prev, item]);
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
          setBuylist((prev) => prev.filter((b) => b.id !== editingId));
          setModalOpen(false);
        },
      },
    ]);
  }

  function saveCategory() {
    if (!catDraft.name.trim()) {
      Alert.alert('Name required', 'Give this category a name.');
      return;
    }
    setBuylistCategories((prev) => [
      ...prev,
      { id: makeId('bc'), name: catDraft.name.trim(), color: catDraft.color },
    ]);
    setCatDraft({ name: '', color: CAT_COLORS[0] });
  }

  function deleteCategory(catId) {
    const inUse = buylist.some((it) => it.categoryId === catId);
    const doDelete = () => {
      if (inUse) {
        setBuylist((prev) =>
          prev.map((it) => (it.categoryId === catId ? { ...it, categoryId: null } : it))
        );
      }
      setBuylistCategories((prev) => prev.filter((c) => c.id !== catId));
      if (activeFilter === catId) setActiveFilter('all');
    };
    if (inUse) {
      Alert.alert(
        'Category is in use',
        'Some items use this category. Remove it anyway? They will be left uncategorized.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: doDelete },
        ]
      );
    } else {
      doDelete();
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        {boardView === 'boards' ? (
          <>
            <Text style={shared.h1}>Buylist</Text>
            <Text style={[shared.tagline, { marginBottom: 16 }]}>
              Things you're thinking about buying
            </Text>
            <View style={styles.boardsGrid}>
              {boards.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.boardTile}
                  onPress={() => openBoard(b.id)}
                >
                  <View style={styles.boardCollage}>
                    {b.preview.length > 0 ? (
                      b.preview.map((it, i) => (
                        <View key={it.id} style={styles.boardCollageCell}>
                          {it.image ? (
                            <Image source={{ uri: it.image }} style={styles.boardCollageImg} />
                          ) : (
                            <View
                              style={[
                                styles.boardCollageImg,
                                styles.boardCollagePlaceholder,
                                { backgroundColor: b.color },
                              ]}
                            />
                          )}
                        </View>
                      ))
                    ) : (
                      <View style={[styles.boardCollageEmpty, { backgroundColor: b.color }]} />
                    )}
                  </View>
                  <Text style={styles.boardName} numberOfLines={1}>{b.name}</Text>
                  <Text style={styles.boardCount}>
                    {b.count} item{b.count === 1 ? '' : 's'}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.boardTile, styles.addBoardTile]}
                onPress={() => setCatModalOpen(true)}
              >
                <Text style={styles.addBoardPlus}>+</Text>
                <Text style={styles.boardName}>New Board</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => setBoardView('boards')}>
                <Text style={styles.backLink}>← Boards</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterSheetOpen(true)}>
                <Text style={styles.filterBtnText}>⚙️ {activeFilterLabel}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[shared.h1, { marginTop: 10 }]}>{activeFilterLabel}</Text>
            <View style={{ height: 16 }} />

            {sorted.length === 0 ? (
              <View style={shared.block}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
                  Nothing here
                </Text>
                <Text style={shared.tagline}>
                  {buylist.length
                    ? 'No items in this category yet.'
                    : "Tap + to add something you're thinking about buying."}
                </Text>
              </View>
            ) : (
              <View style={styles.masonryRow}>
                <View style={styles.masonryCol}>
                  {leftColumn.map((it) => (
                    <ItemCard
                      key={it.id}
                      it={it}
                      cat={buylistCategories.find((c) => c.id === it.categoryId)}
                      onEdit={openEdit}
                    />
                  ))}
                </View>
                <View style={styles.masonryCol}>
                  {rightColumn.map((it) => (
                    <ItemCard
                      key={it.id}
                      it={it}
                      cat={buylistCategories.find((c) => c.id === it.categoryId)}
                      onEdit={openEdit}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Filter sheet */}
      <Modal
        visible={filterSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterSheetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filter</Text>
            <TouchableOpacity
              style={styles.filterRow}
              onPress={() => {
                setActiveFilter('all');
                setFilterSheetOpen(false);
              }}
            >
              <Text style={[styles.filterRowText, activeFilter === 'all' && styles.filterRowTextSel]}>
                All
              </Text>
              {activeFilter === 'all' ? <Text style={styles.filterCheck}>✓</Text> : null}
            </TouchableOpacity>
            {buylistCategories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.filterRow}
                onPress={() => {
                  setActiveFilter(c.id);
                  setFilterSheetOpen(false);
                }}
              >
                <View style={styles.filterRowNameWrap}>
                  <View style={[styles.filterDot, { backgroundColor: c.color }]} />
                  <Text
                    style={[styles.filterRowText, activeFilter === c.id && styles.filterRowTextSel]}
                  >
                    {c.name}
                  </Text>
                </View>
                {activeFilter === c.id ? <Text style={styles.filterCheck}>✓</Text> : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.saveBtn, styles.saveBtnAlt]}
              onPress={() => {
                setFilterSheetOpen(false);
                setCatModalOpen(true);
              }}
            >
              <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>⚙️ Manage Categories</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setFilterSheetOpen(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add/Edit item modal */}
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

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={draft.title}
                onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
                placeholder="What is it?"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {buylistCategories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catChip,
                      draft.categoryId === c.id && { backgroundColor: c.color },
                    ]}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        categoryId: d.categoryId === c.id ? null : c.id,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        draft.categoryId === c.id && styles.catChipTextSel,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Price (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.price}
                onChangeText={(v) => setDraft((d) => ({ ...d, price: v }))}
                placeholder="$0.00"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Link (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.url}
                onChangeText={(v) => setDraft((d) => ({ ...d, url: v }))}
                placeholder="https://..."
                placeholderTextColor="#9aa5b1"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#232d3a', marginTop: 8 }]}
                onPress={autoFillFromLink}
                disabled={autoFillLoading}
              >
                <Text style={[styles.saveBtnText, { color: GOLD }]}>
                  {autoFillLoading ? 'Fetching...' : 'Auto-fill Title/Price/Photo from Link'}
                </Text>
              </TouchableOpacity>
              {autoFillError ? (
                <Text style={{ color: ROSE, fontSize: 12, marginTop: 8 }}>{autoFillError}</Text>
              ) : null}

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={draft.notes}
                onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#9aa5b1"
                multiline
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

      {/* Manage categories modal */}
      <Modal
        visible={catModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCatModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>Manage Categories</Text>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={catDraft.name}
                onChangeText={(v) => setCatDraft((d) => ({ ...d, name: v }))}
                placeholder="e.g. Board Games"
                placeholderTextColor="#9aa5b1"
              />
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {CAT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      catDraft.color === c && styles.colorDotSel,
                    ]}
                    onPress={() => setCatDraft((d) => ({ ...d, color: c }))}
                  />
                ))}
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCategory}>
                <Text style={styles.saveBtnText}>Add Category</Text>
              </TouchableOpacity>

              {buylistCategories.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.label}>Existing Categories</Text>
                  {buylistCategories.map((c) => (
                    <View key={c.id} style={styles.manageCatRow}>
                      <View style={styles.manageCatNameWrap}>
                        <View style={[styles.manageCatDot, { backgroundColor: c.color }]} />
                        <Text style={styles.manageCatName}>{c.name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteCategory(c.id)}>
                        <Text style={styles.manageCatRemove}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCatModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backLink: { color: GOLD, fontWeight: '700', fontSize: 15 },
  boardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  boardTile: { width: '48%', marginBottom: 18 },
  boardCollage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  boardCollageCell: { width: '50%', height: '50%' },
  boardCollageImg: { width: '100%', height: '100%' },
  boardCollagePlaceholder: { opacity: 0.35 },
  boardCollageEmpty: { width: '100%', height: '100%', opacity: 0.35 },
  boardName: { fontSize: 14, fontWeight: '700', color: INK, marginTop: 8 },
  boardCount: { fontSize: 12, color: DIM, marginTop: 1 },
  addBoardTile: { alignItems: 'center', justifyContent: 'center' },
  addBoardPlus: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: 'dashed',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 40,
    color: DIM,
    overflow: 'hidden',
  },
  filterBtn: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  filterBtnText: { fontSize: 13, color: INK, fontWeight: '600' },
  masonryRow: { flexDirection: 'row', gap: 10 },
  masonryCol: { flex: 1, gap: 10 },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardImg: { width: '100%', aspectRatio: 1, backgroundColor: '#232d3a' },
  cardImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderLetter: { fontSize: 32, fontWeight: '700', color: DIM },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: INK },
  cardCat: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  cardPrice: { fontSize: 13, color: DIM, marginTop: 2, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 14, marginTop: 8 },
  actionLink: { fontSize: 12, color: GOLD, fontWeight: '700' },
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
    maxHeight: '90%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12 },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterRowNameWrap: { flexDirection: 'row', alignItems: 'center' },
  filterDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  filterRowText: { fontSize: 15, color: INK },
  filterRowTextSel: { fontWeight: '700', color: GOLD },
  filterCheck: { color: GOLD, fontSize: 16, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap' },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#232d3a',
    marginRight: 8,
    marginBottom: 8,
  },
  catChipText: { fontSize: 13, color: INK },
  catChipTextSel: { color: '#fff', fontWeight: '600' },
  imgPreview: { width: '100%', height: 160, borderRadius: 12, marginBottom: 10 },
  imgBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  imgBtnText: { color: INK, fontSize: 14, fontWeight: '500' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    marginBottom: 10,
  },
  colorDotSel: { borderWidth: 3, borderColor: INK },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saveBtnAlt: { backgroundColor: CARD, borderWidth: 1, borderColor: GOLD },
  saveBtnTextAlt: { color: GOLD },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
  manageCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  manageCatNameWrap: { flexDirection: 'row', alignItems: 'center' },
  manageCatDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  manageCatName: { fontSize: 14, color: INK },
  manageCatRemove: { color: ROSE, fontSize: 13, fontWeight: '700' },
});

