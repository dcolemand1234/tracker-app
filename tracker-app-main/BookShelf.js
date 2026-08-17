import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shared, GOLD, INK, DIM, CARD, BORDER } from './theme';
import ReadingSession from './ReadingSession';
import { pickCompressedImage } from './imagePicker';
import { bookProgressPct, bookIsFinished } from './bookUtils';

function makeBookId() {
  return 'book_' + Date.now() + Math.random().toString(36).slice(2, 8);
}

// Several books can be "currently reading" at once — this is the shelf
// you land on, and tapping a book drops into ReadingSession for just that
// one. Adding a book lives here now (not in the reader), since you add a
// book to the shelf, not to a session.
export default function BookShelf({ habit, onUpdateBooks, onComplete, onExit }) {
  const insets = useSafeAreaInsets();
  const books = habit.books || [];
  const [openBookId, setOpenBookId] = useState(null);
  const openBook = books.find((b) => b.id === openBookId) || null;
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualPages, setManualPages] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // One-time migration: earlier versions of this habit stored a single
  // `book` field instead of a `books` array. Fold it in rather than lose it.
  React.useEffect(() => {
    if (habit.book && !books.length) {
      onUpdateBooks([{ ...habit.book, id: habit.book.id || makeBookId(), pageCount: habit.book.pageCount || 0, durationMs: habit.book.durationMs || 0 }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patchBook(id, patch) {
    onUpdateBooks(books.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  async function setCover(id) {
    const res = await pickCompressedImage(500, 0.7);
    if (res.error === 'permission') {
      Alert.alert('Photo access needed', 'Allow photo library access to set a cover.');
      return;
    }
    if (res.canceled || !res.uri) return;
    patchBook(id, { coverUri: res.uri });
  }

  async function addBook(kind) {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: kind === 'audio' ? 'audio/*' : '*/*',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets || !res.assets[0]) return;
      const file = res.assets[0];
      let format = 'txt';
      if (kind === 'text') {
        const lower = (file.name || '').toLowerCase();
        if (lower.endsWith('.pdf')) {
          Alert.alert(
            'PDFs need a viewer, not a reader',
            "A PDF stores positioned glyphs rather than paragraphs, so pulling clean text out of one is unreliable — you get jumbled columns and broken hyphenation. Rendering the real pages is the right approach and I can add that separately. For now use .epub, .txt, or .md."
          );
          return;
        }
        if (lower.endsWith('.epub')) format = 'epub';
      }
      const newBook = {
        id: makeBookId(),
        kind,
        format,
        uri: file.uri,
        name: file.name || 'Untitled',
        page: 0,
        pageCount: 0,
        positionMs: 0,
        durationMs: 0,
        addedAt: Date.now(),
        lastReadAt: null,
      };
      onUpdateBooks([...books, newBook]);
      setOpenBookId(newBook.id);
    } catch (e) {
      Alert.alert("Couldn't add that file", (e && e.message) || String(e));
    }
  }

  // For a physical copy or anything you don't have a file for — just a
  // title and, optionally, how many pages it is so progress can still
  // show a percentage. Page count is editable later from the reader too.
  function saveManualBook() {
    const title = manualTitle.trim();
    if (!title) {
      Alert.alert('Give it a title first');
      return;
    }
    const pages = parseInt(manualPages, 10);
    const newBook = {
      id: makeBookId(),
      kind: 'manual',
      name: title,
      page: 0,
      pageCount: Number.isFinite(pages) && pages > 0 ? pages : 0,
      addedAt: Date.now(),
      lastReadAt: null,
    };
    onUpdateBooks([...books, newBook]);
    setManualOpen(false);
    setManualTitle('');
    setManualPages('');
    setOpenBookId(newBook.id);
  }

  function removeBook(id) {
    const b = books.find((x) => x.id === id);
    if (!b) return;
    Alert.alert('Remove this book?', b.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onUpdateBooks(books.filter((x) => x.id !== id)),
      },
    ]);
  }

  // A book is open — hand off to the reader. Its own "back" exits to the
  // shelf, not out of the whole habit modal.
  if (openBook) {
    return (
      <ReadingSession
        key={openBook.id}
        book={openBook}
        onProgress={(patch) => {
          patchBook(openBook.id, { ...patch, lastReadAt: Date.now() });
        }}
        onComplete={onComplete}
        onExit={() => setOpenBookId(null)}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>📚 Reading</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onExit}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 90 }]}
      >
        {books.map((b) => {
          const pct = bookProgressPct(b);
          const finished = bookIsFinished(b);
          return (
            <TouchableOpacity
              key={b.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => setOpenBookId(b.id)}
              onLongPress={() => removeBook(b.id)}
            >
              <View style={[styles.cover, finished && styles.coverDone]}>
                {b.coverUri ? (
                  <Image source={{ uri: b.coverUri }} style={styles.coverImage} />
                ) : (
                  <Text style={styles.coverIcon}>
                    {b.kind === 'audio' ? '🎧' : b.kind === 'manual' ? '✏️' : '📖'}
                  </Text>
                )}
                {finished ? <Text style={styles.doneBadge}>✓ Finished</Text> : null}
                <TouchableOpacity
                  style={styles.coverBadge}
                  onPress={() => setCover(b.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.coverBadgeText}>📷</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {b.name}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressLabel}>
                {b.kind === 'manual' && !b.pageCount ? 'no page count set' : `${pct}%`}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.card, styles.addCard]}
          activeOpacity={0.8}
          onPress={() => setAddMenuOpen(true)}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addText}>Add book</Text>
        </TouchableOpacity>
      </ScrollView>

      {!books.length ? (
        <Text style={[styles.emptyNote, { paddingBottom: insets.bottom + 20 }]}>
          Nothing on the shelf yet — add a book or audiobook to get started.
        </Text>
      ) : null}

      <Modal visible={addMenuOpen} transparent animationType="fade" onRequestClose={() => setAddMenuOpen(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAddMenuOpen(false)}
        >
          <View style={styles.sheetCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add to your shelf</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setAddMenuOpen(false);
                addBook('text');
              }}
            >
              <Text style={styles.sheetOptionText}>📖 Book (.epub / .txt)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setAddMenuOpen(false);
                addBook('audio');
              }}
            >
              <Text style={styles.sheetOptionText}>🎧 Audiobook</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setAddMenuOpen(false);
                setManualOpen(true);
              }}
            >
              <Text style={styles.sheetOptionText}>✏️ Track a book you don't have the file for</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancel} onPress={() => setAddMenuOpen(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={manualOpen} transparent animationType="fade" onRequestClose={() => setManualOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Track a book</Text>
            <Text style={styles.modalSub}>
              No file needed — just the title, and page count if you know it,
              so progress can still show a percentage.
            </Text>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Atomic Habits"
              placeholderTextColor={DIM}
              value={manualTitle}
              onChangeText={setManualTitle}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Total pages (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 320"
              placeholderTextColor={DIM}
              value={manualPages}
              onChangeText={setManualPages}
              keyboardType="number-pad"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setManualOpen(false)}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={saveManualBook}>
                <Text style={styles.modalBtnText}>Add to shelf</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const CARD_W = '47%';

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 14,
  },
  card: { width: CARD_W, marginBottom: 14 },
  cover: {
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  coverBadgeText: { fontSize: 13 },
  coverDone: { borderColor: GOLD },
  coverIcon: { fontSize: 34 },
  doneBadge: {
    position: 'absolute', bottom: 8, color: GOLD, fontSize: 11, fontWeight: '800',
  },
  cardTitle: { color: INK, fontSize: 13, fontWeight: '700', marginTop: 8, lineHeight: 18 },
  progressTrack: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden', marginTop: 8,
  },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: GOLD },
  progressLabel: { color: DIM, fontSize: 11, fontWeight: '700', marginTop: 4 },
  addCard: {
    aspectRatio: undefined,
  },
  addIcon: {
    fontSize: 30, color: GOLD, textAlign: 'center',
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 12,
    aspectRatio: 3 / 4, textAlignVertical: 'center', backgroundColor: 'rgba(217,164,65,0.06)',
  },
  addText: { color: DIM, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  emptyNote: { color: DIM, fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  sheetCard: {
    width: '100%', backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 8,
  },
  sheetOption: {
    paddingVertical: 16, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 16,
  },
  sheetOptionText: { color: '#7fd4c9', fontSize: 15, fontWeight: '700' },
  sheetCancel: { paddingVertical: 16, alignItems: 'flex-end' },
  sheetCancelText: { color: DIM, fontSize: 14, fontWeight: '700' },
  modalCard: {
    width: '100%', backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 20,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalSub: { color: DIM, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 18 },
  fieldLabel: { color: DIM, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: '#0d141c', borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, color: INK, fontSize: 15, marginBottom: 16,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: {
    flex: 1, backgroundColor: GOLD, borderRadius: 10, paddingVertical: 13, alignItems: 'center',
  },
  modalBtnText: { color: '#1a1200', fontSize: 14, fontWeight: '800' },
  modalBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: BORDER },
  modalBtnGhostText: { color: DIM, fontSize: 14, fontWeight: '700' },
});
