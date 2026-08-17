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
import { LinearGradient } from 'expo-linear-gradient';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import TrackerCard from './TrackerCard';

const EPISODIC_LABELS = ['anime', 'tv series', 'tv show', 'tv'];
const MANGA_LABELS = ['manga', 'comic', 'comics', 'manhwa', 'webtoon'];
const GAME_LABELS = ['game', 'games', 'video game', 'video games'];
const MOVIE_LABELS = ['movie', 'movies', 'film', 'films'];

function isEpisodicCategory(categories, catId) {
  if (catId === 'anime' || catId === 'tv_series') return true;
  const cat = categories.find((c) => c.id === catId);
  if (!cat) return false;
  return EPISODIC_LABELS.includes((cat.label || '').trim().toLowerCase());
}

// Manga (and similar) track progress by chapter instead of episode, and
// don't use the "Coming Soon" release-date flow the way a show or game does.
function isMangaCategory(categories, catId) {
  if (catId === 'manga') return true;
  const cat = categories.find((c) => c.id === catId);
  if (!cat) return false;
  return MANGA_LABELS.includes((cat.label || '').trim().toLowerCase());
}

// Games track progress by completion % instead of episode/chapter count.
// The id check alone used to be the only path (item.category === 'game'
// with no fallback at all) - if a user's actual "Games" category didn't
// happen to have that exact id (e.g. one made through "+ New Category",
// which assigns a random id), the % tracking silently never activated.
// This now matches the same permanent-id + label-fallback pattern as
// manga/anime above.
function isGameCategory(categories, catId) {
  if (catId === 'game') return true;
  const cat = categories.find((c) => c.id === catId);
  if (!cat) return false;
  return GAME_LABELS.includes((cat.label || '').trim().toLowerCase());
}

function catLabel(categories, id) {
  const c = categories.find((c) => c.id === id);
  return c ? c.label : 'Other';
}

function catColor(categories, id) {
  const c = categories.find((c) => c.id === id);
  return c ? c.color : '#8a8474';
}

function getYouTubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');
    if (host === 'youtu.be') return u.pathname.slice(1);
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2];
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
    }
  } catch (e) {}
  return null;
}

function formatReleaseDate(val) {
  if (!val) return '';
  const d = new Date(val + 'T00:00:00');
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

const CAT_COLORS = [
  '#b8705c',
  '#3f8f82',
  '#9a5c8f',
  '#4a7ba6',
  '#bc9440',
  '#5b7b8b',
  '#7b6ca6',
  '#6b8e5a',
];

export default function TrackerScreen({ items, setItems, categories, setCategories, initialFilter }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [hasAppliedDefault, setHasAppliedDefault] = useState(false);
  const [activeSub, setActiveSub] = useState('all'); // 'all' | 'coming_soon' | 'in_progress'
  useEffect(() => {
    if (initialFilter && initialFilter !== 'all') {
      setActiveFilter(initialFilter);
      setHasAppliedDefault(true);
      return;
    }
    // Only auto-default once, and only once categories have actually
    // loaded — a one-time initializer would lock in "all" forever if it
    // ran before categories were populated.
    if (!hasAppliedDefault && categories.length > 0) {
      const anime =
        categories.find((c) => c.id === 'anime') ||
        categories.find((c) => c.label.toLowerCase().includes('anime'));
      if (anime) setActiveFilter(anime.id);
      setHasAppliedDefault(true);
    }
  }, [initialFilter, categories, hasAppliedDefault]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState({ category: 'all', sub: 'all' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [epModalId, setEpModalId] = useState(null);

  function emptyDraft() {
    return {
      title: '',
      category: categories[0]?.id || '',
      notes: '',
      status: '',
      releaseDate: '',
      mediaUrl: '',
      epCurrent: '',
      epTotal: '',
      gamePercent: '',
      progressLabel: '',
      progressCurrent: '',
      progressTotal: '',
      wantToBuy: false,
      image: null,
    };
  }

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setDraft({
      title: item.title || '',
      category: item.category || categories[0]?.id || '',
      notes: item.notes || '',
      status: item.status || '',
      releaseDate: item.releaseDate || '',
      mediaUrl: item.mediaUrl || '',
      epCurrent: item.epCurrent ? String(item.epCurrent) : '',
      epTotal: item.epTotal ? String(item.epTotal) : '',
      gamePercent: item.gamePercent ? String(item.gamePercent) : '',
      progressLabel: item.progressLabel || '',
      progressCurrent: item.progressCurrent ? String(item.progressCurrent) : '',
      progressTotal: item.progressTotal ? String(item.progressTotal) : '',
      wantToBuy: !!item.wantToBuy,
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
      Alert.alert('Title required', 'Give this a title first.');
      return;
    }
    const isManga = isMangaCategory(categories, draft.category);
    const progressCurrent = Number(draft.progressCurrent) || 0;
    const progressTotal = Number(draft.progressTotal) || 0;
    // If trophy/mission progress is filled in, that's the source of
    // truth for the percentage - it overrides whatever's in the manual
    // % field, since typing 47/94 trophies is more precise than eyeballing
    // "50%". Games without clean counts just keep using the manual field.
    const calculatedPercent =
      progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : null;

    const item = {
      id: editingId || makeId('i'),
      title: draft.title.trim(),
      category: draft.category,
      notes: draft.notes.trim(),
      status: isManga ? '' : draft.status,
      releaseDate: !isManga && draft.status === 'coming_soon' ? draft.releaseDate.trim() : '',
      mediaUrl: draft.mediaUrl.trim(),
      epCurrent: Number(draft.epCurrent) || 0,
      epTotal: Number(draft.epTotal) || 0,
      gamePercent:
        calculatedPercent != null
          ? Math.max(0, Math.min(100, calculatedPercent))
          : Math.max(0, Math.min(100, Number(draft.gamePercent) || 0)),
      progressLabel: draft.progressLabel.trim(),
      progressCurrent,
      progressTotal,
      wantToBuy: isGameCategory(categories, draft.category) ? !!draft.wantToBuy : false,
      image: draft.image,
      updatedAt: Date.now(),
    };
    if (editingId) {
      setItems((prev) => prev.map((it) => (it.id === editingId ? item : it)));
    } else {
      setItems((prev) => [...prev, item]);
    }
    setModalOpen(false);
  }

  function deleteItem() {
    Alert.alert('Delete this?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setItems((prev) => prev.filter((it) => it.id !== editingId));
          setModalOpen(false);
        },
      },
    ]);
  }

  // Manga / Anime / TV Series / Games are meant to be permanent categories
  // with guaranteed unique behavior (chapter tracking, episode tracking,
  // completion % tracking) the same way "Coming Soon" is always available
  // regardless of user data - not something that only works if the user
  // happens to have created a category with exactly the right id. On
  // load, seed any of these four that aren't already represented (by
  // fixed id OR by an existing category whose label already matches one
  // of the recognized names above) - this never duplicates a category
  // the user already made, it only fills in ones that are missing
  // entirely, so the type can never be silently lost again.
  useEffect(() => {
    const hasType = (fixedId, labelList) =>
      categories.some(
        (c) => c.id === fixedId || labelList.includes((c.label || '').trim().toLowerCase())
      );
    const missing = [];
    if (!hasType('manga', MANGA_LABELS)) {
      missing.push({ id: 'manga', label: 'Manga', color: CAT_COLORS[0] });
    }
    if (!hasType('anime', EPISODIC_LABELS)) {
      missing.push({ id: 'anime', label: 'Anime', color: CAT_COLORS[1] });
    }
    if (!hasType('tv_series', EPISODIC_LABELS)) {
      missing.push({ id: 'tv_series', label: 'TV Series', color: CAT_COLORS[2] });
    }
    if (!hasType('game', GAME_LABELS)) {
      missing.push({ id: 'game', label: 'Games', color: CAT_COLORS[3] });
    }
    if (!hasType('movie', MOVIE_LABELS)) {
      missing.push({ id: 'movie', label: 'Movies', color: CAT_COLORS[4] });
    }
    if (missing.length > 0) {
      setCategories((prev) => [...prev, ...missing]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On load, auto-clear "Coming Soon" for anything whose release date
  // has already passed — matches the web app's checkComingSoonReleases().
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const anyChanged = items.some(
      (i) =>
        i.status === 'coming_soon' &&
        i.releaseDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(i.releaseDate) &&
        i.releaseDate <= todayStr
    );
    if (anyChanged) {
      setItems((prev) =>
        prev.map((i) =>
          i.status === 'coming_soon' &&
          i.releaseDate &&
          /^\d{4}-\d{2}-\d{2}$/.test(i.releaseDate) &&
          i.releaseDate <= todayStr
            ? { ...i, status: '' }
            : i
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function promptItemCompletion(item) {
    setTimeout(() => {
      Alert.alert(
        'Nice!',
        `You finished "${item.title}"! Remove it from your tracker?`,
        [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              setItems((prev) => prev.filter((it) => it.id !== item.id));
            },
          },
        ]
      );
    }, 250);
  }

  function adjustEpisode(item, delta) {
    const wasComplete =
      item.epTotal > 0 && (Number(item.epCurrent) || 0) >= item.epTotal;
    let next = (Number(item.epCurrent) || 0) + delta;
    if (next < 0) next = 0;
    if (item.epTotal > 0 && next > item.epTotal) next = item.epTotal;
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, epCurrent: next } : it))
    );
    if (!wasComplete && item.epTotal > 0 && next >= item.epTotal) {
      promptItemCompletion({ ...item, epCurrent: next });
    }
  }

  function adjustGamePercent(item, delta) {
    const wasComplete = (Number(item.gamePercent) || 0) >= 100;
    let next = (Number(item.gamePercent) || 0) + delta;
    next = Math.max(0, Math.min(100, next));
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, gamePercent: next } : it))
    );
    if (!wasComplete && next >= 100) {
      promptItemCompletion({ ...item, gamePercent: next });
    }
  }

  const counts = {};
  items.forEach((i) => {
    counts[i.category] = (counts[i.category] || 0) + 1;
  });
  const comingSoonCount = items.filter((i) => i.status === 'coming_soon').length;

  let filtered = items.filter((i) => {
    if (activeFilter !== 'all' && activeFilter !== 'coming_soon' && i.category !== activeFilter) {
      return false;
    }
    if (activeFilter === 'coming_soon' && i.status !== 'coming_soon') return false;
    if (activeSub === 'coming_soon' && i.status !== 'coming_soon') return false;
    if (activeSub === 'in_progress') {
      const isGame = isGameCategory(categories, i.category);
      if (isGame) {
        if (!(i.gamePercent > 0 && i.gamePercent < 100)) return false;
      } else {
        if (!(i.epTotal > 0 && i.epCurrent > 0 && i.epCurrent < i.epTotal)) return false;
      }
    }
    return true;
  });
  if (search.trim()) {
    const t = search.trim().toLowerCase();
    filtered = filtered.filter((i) => i.title.toLowerCase().includes(t));
  }
  filtered = [...filtered].sort((a, b) => {
    const aCS = a.status === 'coming_soon' ? 1 : 0;
    const bCS = b.status === 'coming_soon' ? 1 : 0;
    if (aCS !== bCS) return aCS - bCS;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const epItem = items.find((i) => i.id === epModalId);
  const activeFilterLabel =
    activeFilter === 'all' ? 'All' : activeFilter === 'coming_soon' ? 'Coming Soon' : catLabel(categories, activeFilter);

  function openFilterSheet() {
    setFilterDraft({ category: activeFilter, sub: activeSub });
    setFilterSheetOpen(true);
  }

  function applyFilters() {
    setActiveFilter(filterDraft.category);
    setActiveSub(filterDraft.sub);
    setFilterSheetOpen(false);
  }

  const filterSubOptions = (() => {
    const opts = [{ id: 'all', label: 'All' }, { id: 'coming_soon', label: 'Coming Soon' }];
    if (isEpisodicCategory(categories, filterDraft.category) || isMangaCategory(categories, filterDraft.category)) {
      opts.push({ id: 'in_progress', label: 'In Progress' });
    } else if (isGameCategory(categories, filterDraft.category)) {
      opts.push({ id: 'in_progress', label: 'Playing' });
    }
    return opts;
  })();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={shared.h1}>Tracker</Text>
            <Text style={shared.tagline}>
              {activeFilterLabel} · {filtered.length} title{filtered.length === 1 ? '' : 's'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSearchOpen((s) => !s)}
          >
            <Text style={styles.iconBtnText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={openFilterSheet}>
            <Text style={styles.iconBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {searchOpen ? (
          <TextInput
            style={[shared.searchInput, { marginBottom: 16 }]}
            placeholder="Search titles..."
            placeholderTextColor="#9aa5b1"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        ) : null}

        {filtered.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              Nothing here yet
            </Text>
            <Text style={shared.tagline}>
              Tap + to log something you're watching, playing, or reading.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item) => {
              const isGame = isGameCategory(categories, item.category);
              const isManga = isMangaCategory(categories, item.category);
              const isEpisodic = isEpisodicCategory(categories, item.category);
              const color = catColor(categories, item.category);
              const label = catLabel(categories, item.category);
              return (
                <TrackerCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  color={color}
                  label={label}
                  isGame={isGame}
                  isManga={isManga}
                  isEpisodic={isEpisodic}
                  onEdit={() => openEdit(item)}
                  onManageProgress={() => setEpModalId(item.id)}
                  onAdjustEpisode={adjustEpisode}
                  onAdjustGamePercent={adjustGamePercent}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Episode / Chapter / Game % quick counter */}
      <Modal
        visible={!!epItem}
        animationType="slide"
        transparent
        onRequestClose={() => setEpModalId(null)}
      >
        {epItem ? (
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{epItem.title}</Text>
              {isGameCategory(categories, epItem.category) ? (
                <>
                  <Text style={styles.counterBig}>{epItem.gamePercent || 0}%</Text>
                  {epItem.progressTotal > 0 ? (
                    <Text style={{ color: '#9aa5b1', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
                      {epItem.progressCurrent || 0}/{epItem.progressTotal} {epItem.progressLabel || 'Progress'}
                    </Text>
                  ) : null}
                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustGamePercent(epItem, -5)}
                    >
                      <Text style={styles.counterBtnText}>−5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustGamePercent(epItem, -1)}
                    >
                      <Text style={styles.counterBtnText}>−1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustGamePercent(epItem, 1)}
                    >
                      <Text style={styles.counterBtnText}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustGamePercent(epItem, 5)}
                    >
                      <Text style={styles.counterBtnText}>+5</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.counterBig}>{epItem.epCurrent || 0}</Text>
                  <Text style={{ textAlign: 'center', color: DIM, marginBottom: 16 }}>
                    {epItem.epTotal > 0
                      ? `of ${epItem.epTotal} ${isMangaCategory(categories, epItem.category) ? 'chapters' : 'episodes'}`
                      : isMangaCategory(categories, epItem.category)
                      ? 'chapters'
                      : 'episodes'}
                  </Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustEpisode(epItem, -1)}
                    >
                      <Text style={styles.counterBtnText}>−1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustEpisode(epItem, 1)}
                    >
                      <Text style={styles.counterBtnText}>+1</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEpModalId(null)}
              >
                <Text style={styles.cancelBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View />
        )}
      </Modal>

      {/* Filter sheet (replaces the old always-visible category tab row) */}
      <Modal
        visible={filterSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterSheetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView>
              <Text style={styles.sheetTitle}>Filter</Text>

              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catChip,
                      filterDraft.category === c.id && { backgroundColor: c.color },
                    ]}
                    onPress={() => setFilterDraft((d) => ({ ...d, category: c.id, sub: 'all' }))}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        filterDraft.category === c.id && styles.catChipTextSel,
                      ]}
                    >
                      {c.label} {counts[c.id] || 0}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Status</Text>
              <View style={styles.catRow}>
                {filterSubOptions.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.catChip, filterDraft.sub === o.id && styles.chipSel]}
                    onPress={() => setFilterDraft((d) => ({ ...d, sub: o.id }))}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        filterDraft.sub === o.id && styles.catChipTextSel,
                      ]}
                    >
                      {o.id === 'coming_soon' ? `${o.label} ${comingSoonCount}` : o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={applyFilters}>
                <Text style={styles.saveBtnText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setFilterSheetOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add/Edit modal */}
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
                {editingId ? 'Edit' : 'Add'}
              </Text>

              {draft.image ? (
                <Image source={{ uri: draft.image }} style={styles.imgPreview} />
              ) : null}
              <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                <Text style={styles.imgBtnText}>
                  {draft.image ? 'Change Photo' : 'Add Photo (optional)'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={draft.title}
                onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
                placeholder="What are you tracking?"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catChip,
                      draft.category === c.id && { backgroundColor: c.color },
                    ]}
                    onPress={() => setDraft((d) => ({ ...d, category: c.id }))}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        draft.category === c.id && styles.catChipTextSel,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Trailer / Video Link (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.mediaUrl}
                onChangeText={(v) => setDraft((d) => ({ ...d, mediaUrl: v }))}
                placeholder="YouTube link"
                placeholderTextColor="#9aa5b1"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={draft.notes}
                onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#9aa5b1"
                multiline
              />

              {isGameCategory(categories, draft.category) ? (
                <TouchableOpacity
                  style={styles.visitedRow}
                  onPress={() => setDraft((d) => ({ ...d, wantToBuy: !d.wantToBuy }))}
                >
                  <View style={[styles.checkbox, draft.wantToBuy && styles.checkboxDone]}>
                    {draft.wantToBuy ? <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text> : null}
                  </View>
                  <Text style={{ fontSize: 14, color: INK }}>
                    Want to buy soon (already released, just don't own it yet)
                  </Text>
                </TouchableOpacity>
              ) : null}

              {!isMangaCategory(categories, draft.category) ? (
                <>
                  <TouchableOpacity
                    style={styles.visitedRow}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        status: d.status === 'coming_soon' ? '' : 'coming_soon',
                      }))
                    }
                  >
                    <View
                      style={[
                        styles.checkbox,
                        draft.status === 'coming_soon' && styles.checkboxDone,
                      ]}
                    >
                      {draft.status === 'coming_soon' ? (
                        <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 14, color: INK }}>Coming soon</Text>
                  </TouchableOpacity>

                  {draft.status === 'coming_soon' ? (
                    <>
                      <Text style={styles.label}>Release Date (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.input}
                        value={draft.releaseDate}
                        onChangeText={(v) =>
                          setDraft((d) => ({ ...d, releaseDate: v }))
                        }
                        placeholder="2026-09-01"
                        placeholderTextColor="#9aa5b1"
                      />
                    </>
                  ) : null}
                </>
              ) : null}

              {isEpisodicCategory(categories, draft.category) ||
              isMangaCategory(categories, draft.category) ? (
                <>
                  <Text style={styles.label}>
                    {isMangaCategory(categories, draft.category)
                      ? 'Chapter Progress'
                      : 'Episode Progress'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={draft.epCurrent}
                      onChangeText={(v) =>
                        setDraft((d) => ({ ...d, epCurrent: v }))
                      }
                      placeholder="Current"
                      placeholderTextColor="#9aa5b1"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={draft.epTotal}
                      onChangeText={(v) =>
                        setDraft((d) => ({ ...d, epTotal: v }))
                      }
                      placeholder="Total"
                      placeholderTextColor="#9aa5b1"
                      keyboardType="numeric"
                    />
                  </View>
                </>
              ) : null}

              {isGameCategory(categories, draft.category) ? (
                <>
                  <Text style={styles.label}>Track Main Story Completion (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.progressLabel}
                    onChangeText={(v) => setDraft((d) => ({ ...d, progressLabel: v }))}
                    placeholder="Main Story Missions, Chapters..."
                    placeholderTextColor="#9aa5b1"
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={draft.progressCurrent}
                      onChangeText={(v) => setDraft((d) => ({ ...d, progressCurrent: v }))}
                      placeholder="Current"
                      placeholderTextColor="#9aa5b1"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={draft.progressTotal}
                      onChangeText={(v) => setDraft((d) => ({ ...d, progressTotal: v }))}
                      placeholder="Total"
                      placeholderTextColor="#9aa5b1"
                      keyboardType="numeric"
                    />
                  </View>
                  {Number(draft.progressTotal) > 0 ? (
                    <Text style={{ color: '#9aa5b1', fontSize: 12, marginTop: 6 }}>
                      = {Math.round((Number(draft.progressCurrent) / Number(draft.progressTotal)) * 100)}% complete
                      (overrides the manual % below)
                    </Text>
                  ) : null}

                  <Text style={[styles.label, { marginTop: 14 }]}>Completion %</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.gamePercent}
                    onChangeText={(v) =>
                      setDraft((d) => ({ ...d, gamePercent: v }))
                    }
                    placeholder={Number(draft.progressTotal) > 0 ? 'Auto-calculated above' : '0-100'}
                    placeholderTextColor="#9aa5b1"
                    keyboardType="numeric"
                    editable={!(Number(draft.progressTotal) > 0)}
                  />
                </>
              ) : null}

              <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Save Changes' : 'Add'}
                </Text>
              </TouchableOpacity>

              {editingId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteItem}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconBtnText: { fontSize: 17 },
  chipSel: { backgroundColor: GOLD, borderColor: GOLD },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    paddingTop: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  thumbWrap: {},
  thumbPoster: {
    width: 100,
    height: 148,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  thumbVideoWrap: {
    width: 170,
    height: 148,
    borderRadius: 12,
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  thumbVideo: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { fontSize: 36, fontWeight: '700', color: '#fff' },
  playBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeText: {
    fontSize: 26,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 19, fontWeight: '700', color: INK, flex: 1 },
  cardMeta: { fontSize: 13, color: DIM, marginTop: 2, textTransform: 'uppercase', fontWeight: '700' },
  stampRow: { marginTop: 6, alignItems: 'flex-start' },
  stamp: {
    backgroundColor: '#332a13',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f0dfb0',
  },
  stampText: { color: GOLD, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  releaseText: { fontSize: 13, color: DIM, fontWeight: '700', marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: { fontSize: 13, color: DIM, marginLeft: 8, fontWeight: '700' },
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
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12, textAlign: 'center' },
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
  counterBig: { fontSize: 48, fontWeight: '800', color: INK, textAlign: 'center', marginTop: 8 },
  counterRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 20 },
  counterBtn: {
    backgroundColor: '#232d3a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  counterBtnText: { fontSize: 16, fontWeight: '700', color: INK },
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
  catChipText: { fontSize: 13, color: INK, fontWeight: '600' },
  catChipTextSel: { color: '#fff' },
  visitedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: GOLD,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: GOLD },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
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
  saveBtnAlt: { backgroundColor: CARD, borderWidth: 1, borderColor: GOLD, marginTop: 10 },
  saveBtnTextAlt: { color: GOLD },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
});

