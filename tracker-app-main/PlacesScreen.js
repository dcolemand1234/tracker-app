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
  Linking,
} from 'react-native';
import { pickCompressedImage } from './imagePicker';
import { WebView } from 'react-native-webview';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

const HOURS_DAYS = [
  { key: 'sun', label: 'Sunday' },
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
];

function makeId() {
  return 'pl' + Date.now() + Math.random().toString(36).slice(2, 8);
}

function isPlaceOpenNow(place) {
  if (!place.hours || typeof place.hours !== 'object') return null;
  const now = new Date();
  const key = HOURS_DAYS[now.getDay()].key;
  const day = place.hours[key];
  if (!day || day.closed || !day.open || !day.close) return false;
  const [oh, om] = day.open.split(':').map(Number);
  const [ch, cm] = day.close.split(':').map(Number);
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  if (closeMins > openMins) return nowMins >= openMins && nowMins < closeMins;
  return nowMins >= openMins || nowMins < closeMins;
}

function hasAnyHours(place) {
  if (!place.hours || typeof place.hours !== 'object') return false;
  return HOURS_DAYS.some((d) => {
    const day = place.hours[d.key];
    return day && (day.closed || (day.open && day.close));
  });
}

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatPlaceDateTime(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const dateStr = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
}

function mapsUrlFor(location) {
  return (
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(location)
  );
}

function isDirectVideoUrl(url) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}

function isFacebookUrl(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.watch';
  } catch (e) {
    return false;
  }
}

// Returns { type: 'youtube'|'facebook'|'direct'|null, uri, html }
// describing how to render this video inside the in-app WebView player.
function getVideoEmbed(url) {
  if (!url) return null;
  const ytId = getYouTubeId(url);
  if (ytId) {
    return {
      type: 'youtube',
      uri: `https://www.youtube.com/embed/${ytId}?rel=0&autoplay=1&playsinline=1`,
    };
  }
  if (isDirectVideoUrl(url)) {
    return {
      type: 'direct',
      html: `<html><body style="margin:0;background:#000;"><video src="${url}" controls autoplay playsinline style="width:100%;height:100%;"></video></body></html>`,
    };
  }
  if (isFacebookUrl(url)) {
    return {
      type: 'facebook',
      uri: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url
      )}&show_text=false&autoplay=true`,
    };
  }
  return { type: 'other', uri: url };
}

export default function PlacesScreen({ datingPlaces, setDatingPlaces, travelPlaces, setTravelPlaces, initialKind }) {
  const kind = initialKind || 'dating';
  const [detailId, setDetailId] = useState(null);
  const [videoPlayerUrl, setVideoPlayerUrl] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());

  function emptyDraft() {
    return {
      name: '',
      location: '',
      notes: '',
      cost: '',
      dateTime: '',
      videoUrl: '',
      image: null,
      visited: false,
    };
  }

  const list = kind === 'dating' ? datingPlaces : travelPlaces;
  const setList = kind === 'dating' ? setDatingPlaces : setTravelPlaces;
  const detailPlace = list.find((p) => p.id === detailId);

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(place) {
    setEditingId(place.id);
    setDraft({
      name: place.name || '',
      location: place.location || '',
      notes: place.notes || '',
      cost: place.cost || '',
      dateTime: place.dateTime || '',
      videoUrl: place.videoUrl || '',
      image: place.image || null,
      visited: !!place.visited,
      hours: place.hours || null,
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

  function savePlace() {
    if (!draft.name.trim()) {
      Alert.alert('Name required', 'Give this place a name first.');
      return;
    }
    const place = {
      id: editingId || makeId(),
      name: draft.name.trim(),
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      cost: draft.cost.trim(),
      dateTime: draft.dateTime.trim(),
      videoUrl: draft.videoUrl.trim(),
      image: draft.image,
      visited: draft.visited,
      hours: draft.hours || null,
    };
    if (editingId) {
      setList((prev) => prev.map((p) => (p.id === editingId ? place : p)));
    } else {
      setList((prev) => [...prev, place]);
    }
    setModalOpen(false);
  }

  function deletePlace() {
    Alert.alert('Delete place?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setList((prev) => prev.filter((p) => p.id !== editingId));
          setModalOpen(false);
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>{kind === 'dating' ? 'Dating' : 'Traveling'}</Text>

        {list.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              No places yet
            </Text>
            <Text style={shared.tagline}>
              {kind === 'dating'
                ? 'Add spots you want to check out.'
                : 'Add places you want to visit abroad.'}
            </Text>
          </View>
        ) : (
          <View style={shared.block}>
            {list.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[shared.row, p.visited && { opacity: 0.55 }]}
                onPress={() => setDetailId(p.id)}
                onLongPress={() => openEdit(p)}
                delayLongPress={400}
              >
                {p.image ? (
                  <Image source={{ uri: p.image }} style={shared.thumb66} />
                ) : null}
                <Text style={shared.rowName}>
                  {p.visited ? '✅ ' : ''}
                  {p.name}
                </Text>
                {p.cost ? <Text style={styles.costTag}>{p.cost}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Detail modal */}
      <Modal
        visible={!!detailPlace}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailId(null)}
      >
        {detailPlace ? (
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <ScrollView>
                {detailPlace.image ? (
                  <Image source={{ uri: detailPlace.image }} style={styles.hero} />
                ) : null}
                <View style={styles.detailHeadRow}>
                  <Text style={styles.sheetTitle}>{detailPlace.name}</Text>
                  <TouchableOpacity onPress={() => openEdit(detailPlace)}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                </View>
                {detailPlace.visited ? (
                  <Text style={{ color: GOLD, fontWeight: '600', marginBottom: 8 }}>
                    ✅ Visited
                  </Text>
                ) : null}

                {detailPlace.videoUrl ? (
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => setVideoPlayerUrl(detailPlace.videoUrl)}
                  >
                    <Text style={styles.linkBtnText}>▶ Watch Video</Text>
                  </TouchableOpacity>
                ) : null}

                {detailPlace.location ? (
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() =>
                      Linking.openURL(mapsUrlFor(detailPlace.location))
                    }
                  >
                    <Text style={styles.linkBtnText}>
                      📍 {detailPlace.location} ↗
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {detailPlace.dateTime ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Scheduled</Text>
                    <Text style={styles.infoValue}>
                      {formatPlaceDateTime(detailPlace.dateTime)}
                    </Text>
                  </View>
                ) : null}

                {hasAnyHours(detailPlace) ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Hours</Text>
                    {(() => {
                      const open = isPlaceOpenNow(detailPlace);
                      return open !== null ? (
                        <Text
                          style={{
                            color: open ? '#2e9e5b' : ROSE,
                            fontWeight: '700',
                            marginBottom: 6,
                          }}
                        >
                          {open ? 'Open now' : 'Closed now'}
                        </Text>
                      ) : null;
                    })()}
                    {HOURS_DAYS.map((d) => {
                      const day = detailPlace.hours[d.key];
                      const text = day && day.closed
                        ? 'Closed'
                        : day && day.open && day.close
                        ? `${formatTime12(day.open)} – ${formatTime12(day.close)}`
                        : '—';
                      const isToday =
                        d.key === HOURS_DAYS[new Date().getDay()].key;
                      return (
                        <View
                          key={d.key}
                          style={[
                            styles.hoursRow,
                            isToday && { backgroundColor: '#332a13' },
                          ]}
                        >
                          <Text style={styles.hoursDay}>{d.label}</Text>
                          <Text style={styles.hoursVal}>{text}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {detailPlace.cost ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Typical cost</Text>
                    <Text style={styles.infoValue}>{detailPlace.cost}</Text>
                  </View>
                ) : null}

                {detailPlace.notes ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Notes</Text>
                    <Text style={styles.infoValue}>{detailPlace.notes}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setDetailId(null)}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        ) : (
          <View />
        )}
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
                {editingId ? 'Edit Place' : 'Add Place'}
              </Text>

              {draft.image ? (
                <Image source={{ uri: draft.image }} style={styles.hero} />
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
                placeholder="e.g. Rooftop Bar"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={draft.location}
                onChangeText={(v) => setDraft((d) => ({ ...d, location: v }))}
                placeholder="Address or area"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Typical cost (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.cost}
                onChangeText={(v) => setDraft((d) => ({ ...d, cost: v }))}
                placeholder="e.g. 60 for two"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={draft.notes}
                onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <Text style={styles.label}>Video URL (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.videoUrl}
                onChangeText={(v) => setDraft((d) => ({ ...d, videoUrl: v }))}
                placeholder="YouTube, Facebook, or direct link"
                placeholderTextColor="#9aa5b1"
                autoCapitalize="none"
              />

              <Text style={styles.label}>
                Scheduled Date/Time (optional, ISO format)
              </Text>
              <TextInput
                style={styles.input}
                value={draft.dateTime}
                onChangeText={(v) => setDraft((d) => ({ ...d, dateTime: v }))}
                placeholder="2026-08-01T19:00:00"
                placeholderTextColor="#9aa5b1"
              />

              <TouchableOpacity
                style={styles.visitedRow}
                onPress={() =>
                  setDraft((d) => ({ ...d, visited: !d.visited }))
                }
              >
                <View
                  style={[
                    styles.checkbox,
                    draft.visited && styles.checkboxDone,
                  ]}
                >
                  {draft.visited ? (
                    <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 14, color: INK }}>
                  Mark as visited
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Hours</Text>
              {HOURS_DAYS.map((d) => {
                const day = (draft.hours && draft.hours[d.key]) || {
                  open: '',
                  close: '',
                  closed: false,
                };
                function updateDay(patch) {
                  setDraft((prev) => ({
                    ...prev,
                    hours: {
                      ...(prev.hours || {}),
                      [d.key]: { ...day, ...patch },
                    },
                  }));
                }
                return (
                  <View key={d.key} style={styles.hoursEditRow}>
                    <Text style={styles.hoursEditDay}>{d.label.slice(0, 3)}</Text>
                    <TextInput
                      style={[styles.hoursEditInput, day.closed && styles.hoursEditInputDisabled]}
                      value={day.open}
                      onChangeText={(v) => updateDay({ open: v })}
                      placeholder="09:00"
                      placeholderTextColor="#9aa5b1"
                      editable={!day.closed}
                    />
                    <Text style={styles.hoursEditSep}>–</Text>
                    <TextInput
                      style={[styles.hoursEditInput, day.closed && styles.hoursEditInputDisabled]}
                      value={day.close}
                      onChangeText={(v) => updateDay({ close: v })}
                      placeholder="21:00"
                      placeholderTextColor="#9aa5b1"
                      editable={!day.closed}
                    />
                    <TouchableOpacity
                      style={styles.hoursClosedBtn}
                      onPress={() => updateDay({ closed: !day.closed })}
                    >
                      <View style={[styles.checkbox, day.closed && styles.checkboxDone]}>
                        {day.closed ? (
                          <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>
                        ) : null}
                      </View>
                      <Text style={styles.hoursClosedLabel}>Closed</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <Text style={[shared.tagline, { marginTop: 4 }]}>
                Times are 24-hour format, e.g. 09:00 and 21:00.
              </Text>

              <TouchableOpacity style={styles.saveBtn} onPress={savePlace}>
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Save Changes' : 'Add Place'}
                </Text>
              </TouchableOpacity>

              {editingId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deletePlace}>
                  <Text style={styles.deleteBtnText}>Delete Place</Text>
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

      {/* In-app fullscreen video player */}
      <Modal
        visible={!!videoPlayerUrl}
        animationType="fade"
        onRequestClose={() => setVideoPlayerUrl(null)}
      >
        <View style={styles.videoScreen}>
          <TouchableOpacity
            style={styles.videoCloseBtn}
            onPress={() => setVideoPlayerUrl(null)}
          >
            <Text style={styles.videoCloseText}>✕</Text>
          </TouchableOpacity>
          {videoPlayerUrl
            ? (() => {
                const embed = getVideoEmbed(videoPlayerUrl);
                if (!embed) return null;
                return (
                  <WebView
                    style={{ flex: 1, backgroundColor: '#000' }}
                    source={embed.html ? { html: embed.html } : { uri: embed.uri }}
                    allowsFullscreenVideo
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                  />
                );
              })()
            : null}
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
    maxHeight: '90%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12 },
  detailHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: { color: GOLD, fontWeight: '700', fontSize: 14 },
  hero: { width: '100%', height: 180, borderRadius: 14, marginBottom: 12 },
  linkBtn: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  linkBtnText: { fontSize: 14, color: INK, fontWeight: '600' },
  costTag: { color: GOLD, fontSize: 13, fontWeight: '700', marginLeft: 8 },
  infoBlock: { marginTop: 6, marginBottom: 14 },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9aa5b1',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  infoValue: { fontSize: 14, color: INK },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  hoursDay: { fontSize: 13, color: DIM },
  hoursVal: { fontSize: 13, color: INK },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
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
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
  hoursEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hoursEditDay: { width: 36, fontSize: 12, color: DIM, fontWeight: '600' },
  hoursEditInput: {
    flex: 1,
    backgroundColor: '#232d3a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 13,
    color: INK,
    textAlign: 'center',
  },
  hoursEditInputDisabled: { opacity: 0.4 },
  hoursEditSep: { marginHorizontal: 6, color: DIM },
  hoursClosedBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  hoursClosedLabel: { fontSize: 11, color: DIM, marginLeft: 4 },
  videoScreen: { flex: 1, backgroundColor: '#000' },
  videoCloseBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCloseText: { color: '#fff', fontSize: 18 },
});

