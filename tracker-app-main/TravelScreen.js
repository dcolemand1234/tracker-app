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
import { LinearGradient } from 'expo-linear-gradient';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import { pickCompressedImage } from './imagePicker';

function makeId(p = 'tr') {
  return p + Date.now() + Math.random().toString(36).slice(2, 8);
}

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const TRIP_CATEGORIES = [
  { id: 'flights', name: 'Flights', icon: '✈️', unit: 'total' },
  { id: 'hotels', name: 'Stays', icon: '🏨', unit: 'per night' },
  { id: 'transport', name: 'Transport', icon: '🚕', unit: '' },
  { id: 'food', name: 'Food', icon: '🍜', unit: 'per person' },
  { id: 'entertainment', name: 'Things to do', icon: '🎟️', unit: 'per person' },
];

const SORTS = [
  { id: 'recent', label: 'Recent' },
  { id: 'price', label: 'Price ↑' },
  { id: 'rating', label: 'Rating' },
];

function Stars({ rating }) {
  const r = Number(rating) || 0;
  if (!r) return null;
  return (
    <View style={styles.starRow}>
      <Text style={styles.starText}>{'★'.repeat(Math.round(r))}</Text>
      <Text style={styles.starNum}>{r.toFixed(1)}</Text>
    </View>
  );
}

// Laid out like a booking site's results page — photo, name, rating,
// price to the right — because that's the shape your eye already knows
// how to scan. The data behind it is all yours: prices you log by hand,
// since live inventory needs a commercial API this app has no key for.
export default function TravelScreen({ trips, setTrips }) {
  const list = trips || [];
  const [openTripId, setOpenTripId] = useState(list.length ? list[0].id : null);
  const [activeCat, setActiveCat] = useState('flights');
  const [sortBy, setSortBy] = useState('recent');

  const [tripModal, setTripModal] = useState(false);
  const [tripDraft, setTripDraft] = useState({ name: '', start: '', end: '', budget: '' });

  const [itemModal, setItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemDraft, setItemDraft] = useState({
    name: '', sub: '', price: '', rating: '', notes: '', link: '', image: null,
  });

  const [priceModal, setPriceModal] = useState(false);
  const [priceTargetId, setPriceTargetId] = useState(null);
  const [priceDraft, setPriceDraft] = useState('');

  const trip = list.find((t) => t.id === openTripId);
  const items = trip ? trip.items || [] : [];
  const cat = TRIP_CATEGORIES.find((c) => c.id === activeCat) || TRIP_CATEGORIES[0];

  function latestPrice(item) {
    const h = item.priceHistory || [];
    return h.length ? Number(h[h.length - 1].price) || 0 : 0;
  }

  const catItems = items
    .filter((i) => i.category === activeCat)
    .sort((a, b) => {
      if (sortBy === 'price') return latestPrice(a) - latestPrice(b);
      if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      return (b.addedAt || 0) - (a.addedAt || 0);
    });

  const bookedTotal = items.filter((i) => i.booked).reduce((n, i) => n + latestPrice(i), 0);
  const budget = trip ? Number(trip.budget) || 0 : 0;

  function saveTrip() {
    const name = tripDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Where are you going?');
      return;
    }
    const t = {
      id: makeId('trip'),
      name,
      start: tripDraft.start.trim(),
      end: tripDraft.end.trim(),
      budget: Number(tripDraft.budget) || 0,
      items: [],
    };
    setTrips((prev) => [...(prev || []), t]);
    setOpenTripId(t.id);
    setTripDraft({ name: '', start: '', end: '', budget: '' });
    setTripModal(false);
  }

  function openItemAdd() {
    setEditingItemId(null);
    setItemDraft({ name: '', sub: '', price: '', rating: '', notes: '', link: '', image: null });
    setItemModal(true);
  }

  function openItemEdit(it) {
    setEditingItemId(it.id);
    setItemDraft({
      name: it.name,
      sub: it.sub || '',
      price: String(latestPrice(it) || ''),
      rating: String(it.rating || ''),
      notes: it.notes || '',
      link: it.link || '',
      image: it.image || null,
    });
    setItemModal(true);
  }

  async function pickItemPhoto() {
    const uri = await pickCompressedImage();
    if (uri) setItemDraft((d) => ({ ...d, image: uri }));
  }

  function saveItem() {
    const name = itemDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this option a name.');
      return;
    }
    const price = Number(itemDraft.price) || 0;
    setTrips((prev) =>
      (prev || []).map((t) => {
        if (t.id !== openTripId) return t;
        if (editingItemId) {
          return {
            ...t,
            items: (t.items || []).map((i) => {
              if (i.id !== editingItemId) return i;
              const hist = i.priceHistory || [];
              const changed = !hist.length || Number(hist[hist.length - 1].price) !== price;
              return {
                ...i,
                name,
                sub: itemDraft.sub.trim(),
                rating: Number(itemDraft.rating) || 0,
                notes: itemDraft.notes.trim(),
                link: itemDraft.link.trim(),
                image: itemDraft.image,
                priceHistory: changed ? [...hist, { date: todayKey(), price }] : hist,
              };
            }),
          };
        }
        return {
          ...t,
          items: [
            ...(t.items || []),
            {
              id: makeId('item'),
              category: activeCat,
              name,
              sub: itemDraft.sub.trim(),
              rating: Number(itemDraft.rating) || 0,
              notes: itemDraft.notes.trim(),
              link: itemDraft.link.trim(),
              image: itemDraft.image,
              booked: false,
              addedAt: Date.now(),
              priceHistory: price ? [{ date: todayKey(), price }] : [],
            },
          ],
        };
      })
    );
    setItemModal(false);
  }

  function deleteItem() {
    setTrips((prev) =>
      (prev || []).map((t) =>
        t.id === openTripId
          ? { ...t, items: (t.items || []).filter((i) => i.id !== editingItemId) }
          : t
      )
    );
    setItemModal(false);
  }

  function toggleBooked(it) {
    setTrips((prev) =>
      (prev || []).map((t) =>
        t.id === openTripId
          ? {
              ...t,
              items: (t.items || []).map((i) => (i.id === it.id ? { ...i, booked: !i.booked } : i)),
            }
          : t
      )
    );
  }

  function logPrice() {
    const price = Number(priceDraft) || 0;
    if (!price) return;
    setTrips((prev) =>
      (prev || []).map((t) =>
        t.id === openTripId
          ? {
              ...t,
              items: (t.items || []).map((i) =>
                i.id === priceTargetId
                  ? { ...i, priceHistory: [...(i.priceHistory || []), { date: todayKey(), price }] }
                  : i
              ),
            }
          : t
      )
    );
    setPriceDraft('');
    setPriceModal(false);
  }

  function trend(item) {
    const h = item.priceHistory || [];
    if (h.length < 2) return null;
    const first = Number(h[0].price) || 0;
    const last = Number(h[h.length - 1].price) || 0;
    if (last === first) return null;
    return { dir: last > first ? 'up' : 'down', diff: Math.abs(last - first) };
  }

  if (!list.length) {
    return (
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Traveling</Text>
        <View style={shared.block}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
            No trips yet
          </Text>
          <Text style={shared.tagline}>
            Start one and collect flights, stays, and things to do — with the
            prices you find, tracked over time.
          </Text>
          <TouchableOpacity style={styles.saveBtn} onPress={() => setTripModal(true)}>
            <Text style={styles.saveBtnText}>Plan a Trip</Text>
          </TouchableOpacity>
        </View>
        <TripModal />
      </ScrollView>
    );
  }

  function TripModal() {
    return (
      <Modal visible={tripModal} transparent animationType="slide" onRequestClose={() => setTripModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Trip</Text>
            <Text style={styles.label}>Where to?</Text>
            <TextInput
              style={styles.input}
              value={tripDraft.name}
              onChangeText={(v) => setTripDraft((d) => ({ ...d, name: v }))}
              placeholder="Thailand"
              placeholderTextColor="#9aa5b1"
            />
            <Text style={styles.label}>Dates</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={tripDraft.start}
                onChangeText={(v) => setTripDraft((d) => ({ ...d, start: v }))}
                placeholder="Depart"
                placeholderTextColor="#9aa5b1"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={tripDraft.end}
                onChangeText={(v) => setTripDraft((d) => ({ ...d, end: v }))}
                placeholder="Return"
                placeholderTextColor="#9aa5b1"
              />
            </View>
            <Text style={styles.label}>Budget</Text>
            <TextInput
              style={styles.input}
              value={tripDraft.budget}
              onChangeText={(v) => setTripDraft((d) => ({ ...d, budget: v.replace(/[^0-9.]/g, '') }))}
              placeholder="0"
              placeholderTextColor="#9aa5b1"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveTrip}>
              <Text style={styles.saveBtnText}>Create Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setTripModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const pct = budget > 0 ? Math.min(100, Math.round((bookedTotal / budget) * 100)) : 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <LinearGradient colors={['#1a4a6e', '#0d2438']} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>TRIP</Text>
              <Text style={styles.heroTitle}>{trip ? trip.name : ''}</Text>
              {trip && (trip.start || trip.end) ? (
                <Text style={styles.heroDates}>
                  {trip.start}
                  {trip.end ? `  →  ${trip.end}` : ''}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.heroAdd} onPress={() => setTripModal(true)}>
              <Text style={styles.heroAddText}>+</Text>
            </TouchableOpacity>
          </View>

          {list.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {list.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tripPill, openTripId === t.id && styles.tripPillSel]}
                  onPress={() => setOpenTripId(t.id)}
                >
                  <Text
                    style={[styles.tripPillText, openTripId === t.id && styles.tripPillTextSel]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.heroBudget}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroBudgetLabel}>Booked</Text>
              <Text style={styles.heroBudgetValue}>{money(bookedTotal)}</Text>
            </View>
            {budget > 0 ? (
              <View style={{ flex: 1.4 }}>
                <View style={styles.heroBar}>
                  <View
                    style={[
                      styles.heroBarFill,
                      { width: `${pct}%`, backgroundColor: bookedTotal > budget ? ROSE : GOLD },
                    ]}
                  />
                </View>
                <Text style={styles.heroBudgetMeta}>
                  {bookedTotal > budget
                    ? `${money(bookedTotal - budget)} over budget`
                    : `${money(budget - bookedTotal)} of ${money(budget)} left`}
                </Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {TRIP_CATEGORIES.map((c) => {
            const n = items.filter((i) => i.category === c.id).length;
            const on = activeCat === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catTab, on && styles.catTabSel]}
                onPress={() => setActiveCat(c.id)}
              >
                <Text style={styles.catIcon}>{c.icon}</Text>
                <Text style={[styles.catLabel, on && styles.catLabelSel]}>
                  {c.name}
                  {n ? ` (${n})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sort row */}
        <View style={styles.sortRow}>
          <Text style={styles.resultCount}>
            {catItems.length} option{catItems.length === 1 ? '' : 's'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {SORTS.map((so) => (
              <TouchableOpacity
                key={so.id}
                style={[styles.sortChip, sortBy === so.id && styles.sortChipSel]}
                onPress={() => setSortBy(so.id)}
              >
                <Text style={[styles.sortText, sortBy === so.id && styles.sortTextSel]}>
                  {so.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Listings */}
        <View style={{ paddingHorizontal: 16 }}>
          {catItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nothing saved in {cat.name}</Text>
              <Text style={styles.emptyBody}>
                Found something on a booking site? Save it here with its price
                and check back — the card shows you which way it has moved.
              </Text>
            </View>
          ) : (
            catItems.map((it) => {
              const tr = trend(it);
              const hist = it.priceHistory || [];
              return (
                <View key={it.id} style={styles.listing}>
                  <TouchableOpacity style={styles.listingMain} onPress={() => openItemEdit(it)}>
                    {it.image ? (
                      <Image source={{ uri: it.image }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]}>
                        <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
                      </View>
                    )}
                    <View style={styles.listingBody}>
                      <Text style={styles.listingName} numberOfLines={2}>
                        {it.name}
                      </Text>
                      {it.sub ? (
                        <Text style={styles.listingSub} numberOfLines={1}>
                          {it.sub}
                        </Text>
                      ) : null}
                      <Stars rating={it.rating} />
                      {it.booked ? (
                        <View style={styles.bookedTag}>
                          <Text style={styles.bookedTagText}>BOOKED</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.priceCol}>
                      <Text style={styles.price}>{money(latestPrice(it))}</Text>
                      {cat.unit ? <Text style={styles.priceUnit}>{cat.unit}</Text> : null}
                      {tr ? (
                        <Text style={[styles.trend, tr.dir === 'up' ? styles.up : styles.down]}>
                          {tr.dir === 'up' ? '▲' : '▼'} {money(tr.diff)}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.listingFoot}>
                    <Text style={styles.histText}>
                      {hist.length > 1
                        ? `${hist.length} price checks since ${hist[0].date}`
                        : 'No price history yet'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={styles.miniBtn}
                        onPress={() => {
                          setPriceTargetId(it.id);
                          setPriceDraft('');
                          setPriceModal(true);
                        }}
                      >
                        <Text style={styles.miniBtnText}>Log price</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.miniBtn, it.booked && styles.miniBtnOn]}
                        onPress={() => toggleBooked(it)}
                      >
                        <Text style={[styles.miniBtnText, it.booked && styles.miniBtnTextOn]}>
                          {it.booked ? 'Booked' : 'Book'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openItemAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <TripModal />

      <Modal visible={itemModal} transparent animationType="slide" onRequestClose={() => setItemModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingItemId ? 'Edit' : `Add to ${cat.name}`}
              </Text>

              <TouchableOpacity style={styles.photoPick} onPress={pickItemPhoto}>
                {itemDraft.image ? (
                  <Image source={{ uri: itemDraft.image }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoPickText}>📷 Add a photo</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={itemDraft.name}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, name: v }))}
                placeholder="Bangkok — AirAsia, or Riverside Hotel"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Detail line</Text>
              <TextInput
                style={styles.input}
                value={itemDraft.sub}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, sub: v }))}
                placeholder="Direct · 11h 20m  /  Sukhumvit, near BTS"
                placeholderTextColor="#9aa5b1"
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price</Text>
                  <TextInput
                    style={styles.input}
                    value={itemDraft.price}
                    onChangeText={(v) => setItemDraft((d) => ({ ...d, price: v.replace(/[^0-9.]/g, '') }))}
                    placeholder="0"
                    placeholderTextColor="#9aa5b1"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Rating (0–5)</Text>
                  <TextInput
                    style={styles.input}
                    value={itemDraft.rating}
                    onChangeText={(v) => setItemDraft((d) => ({ ...d, rating: v.replace(/[^0-9.]/g, '') }))}
                    placeholder="4.5"
                    placeholderTextColor="#9aa5b1"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Text style={styles.hint}>
                Changing the price adds a dated entry to its history rather than
                overwriting the old one.
              </Text>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={itemDraft.notes}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, notes: v }))}
                placeholder="Baggage included, free cancellation..."
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <Text style={styles.label}>Link</Text>
              <TextInput
                style={styles.input}
                value={itemDraft.link}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, link: v }))}
                placeholder="https://..."
                placeholderTextColor="#9aa5b1"
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                <Text style={styles.saveBtnText}>{editingItemId ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
              {editingItemId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteItem}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setItemModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={priceModal} transparent animationType="slide" onRequestClose={() => setPriceModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Log today's price</Text>
            <TextInput
              style={styles.input}
              value={priceDraft}
              onChangeText={(v) => setPriceDraft(v.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor="#9aa5b1"
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={logPrice}>
              <Text style={styles.saveBtnText}>Log</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPriceModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 2 },
  heroDates: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
  heroAdd: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  heroAddText: { color: '#fff', fontSize: 22, fontWeight: '400', marginTop: -2 },
  tripPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)', marginRight: 8,
  },
  tripPillSel: { backgroundColor: '#fff' },
  tripPillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tripPillTextSel: { color: '#14324a', fontWeight: '800' },
  heroBudget: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 18, gap: 14 },
  heroBudgetLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  heroBudgetValue: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroBar: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden',
  },
  heroBarFill: { height: '100%', borderRadius: 3 },
  heroBudgetMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 6 },
  catScroll: { marginTop: 14 },
  catTab: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
  },
  catTabSel: { backgroundColor: GOLD, borderColor: GOLD },
  catIcon: { fontSize: 17 },
  catLabel: { color: DIM, fontSize: 11, fontWeight: '700', marginTop: 3 },
  catLabelSel: { color: '#fff' },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: 16, marginBottom: 10,
  },
  resultCount: { color: DIM, fontSize: 12, fontWeight: '700' },
  sortChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
  },
  sortChipSel: { backgroundColor: GOLD, borderColor: GOLD },
  sortText: { color: DIM, fontSize: 11, fontWeight: '700' },
  sortTextSel: { color: '#fff' },
  emptyCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 18,
  },
  emptyTitle: { color: INK, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  emptyBody: { color: DIM, fontSize: 13, lineHeight: 19 },
  listing: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    marginBottom: 12, overflow: 'hidden',
  },
  listingMain: { flexDirection: 'row', padding: 10 },
  thumb: { width: 92, height: 92, borderRadius: 10, backgroundColor: '#0c1117' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  listingBody: { flex: 1, paddingHorizontal: 10, justifyContent: 'center' },
  listingName: { color: INK, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  listingSub: { color: DIM, fontSize: 12, marginTop: 3 },
  starRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  starText: { color: GOLD, fontSize: 12, letterSpacing: 1 },
  starNum: { color: DIM, fontSize: 11, fontWeight: '700', marginLeft: 5 },
  bookedTag: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(79,158,92,0.2)',
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 6,
  },
  bookedTagText: { color: '#4f9e5c', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  priceCol: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 74 },
  price: { color: INK, fontSize: 19, fontWeight: '800' },
  priceUnit: { color: DIM, fontSize: 10, marginTop: 1 },
  trend: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  up: { color: ROSE },
  down: { color: '#4f9e5c' },
  listingFoot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2,
  },
  histText: { color: DIM, fontSize: 10, flex: 1 },
  miniBtn: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, backgroundColor: '#232d3a',
  },
  miniBtnOn: { backgroundColor: GOLD, borderColor: GOLD },
  miniBtnText: { color: INK, fontSize: 11, fontWeight: '700' },
  miniBtnTextOn: { color: '#fff' },
  fab: {
    position: 'absolute', right: 20, bottom: 90,
    width: 56, height: 56, borderRadius: 28, backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, marginTop: -2 },
  photoPick: {
    height: 130, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    backgroundColor: '#232d3a', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 4,
  },
  photoPickText: { color: GOLD, fontSize: 13, fontWeight: '700' },
  photoPreview: { width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40, maxHeight: '90%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  hint: { fontSize: 11, color: DIM, marginTop: 6, lineHeight: 16 },
  input: {
    backgroundColor: '#232d3a', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15, color: INK,
  },
  saveBtn: {
    backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
});

