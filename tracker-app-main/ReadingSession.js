import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { shared, GOLD, INK, DIM, CARD, BORDER } from './theme';
import { parseEpub } from './epubReader';

// Two modes in one screen because a "reading" habit is satisfied either
// way: a text book you page through, or an audiobook you listen to.
// Both persist their position on the habit, so closing mid-chapter and
// coming back tomorrow resumes exactly where you stopped.
//
// Text support covers .txt, .md, and .epub. EPUB is unzipped and its
// spine followed in epubReader.js so chapters come out in reading order.
// PDF is deliberately not handled here: extracting text from a PDF is
// unreliable (it stores positioned glyphs, not paragraphs), so rendering
// the actual pages with a native viewer is the honest approach, and that
// is a separate piece of work.

const CHARS_PER_PAGE = 1400;

function paginate(text) {
  const clean = (text || '').replace(/\r\n/g, '\n');
  const pages = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(i + CHARS_PER_PAGE, clean.length);
    if (end < clean.length) {
      // Break on a paragraph or sentence boundary so pages don't end
      // mid-word.
      const para = clean.lastIndexOf('\n', end);
      const stop = clean.lastIndexOf('. ', end);
      const cut = Math.max(para, stop);
      if (cut > i + 400) end = cut + 1;
    }
    pages.push(clean.slice(i, end).trim());
    i = end;
  }
  return pages.length ? pages : ['(empty file)'];
}

function fmtTime(ms) {
  if (!ms || ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function ReadingSession({ book, onProgress, onComplete, onExit }) {
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const [pageIndex, setPageIndex] = useState(book ? book.page || 0 : 0);
  const [manualPage, setManualPage] = useState(book.page || 0);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState(String(book.pageCount || ''));
  const manualCountedRef = useRef(false);

  const isAudio = book && book.kind === 'audio';
  // Migrated from expo-av's Audio.Sound (deprecated) to expo-audio.
  // useAudioPlayer accepts null for "no source", which is how this
  // stays a single unconditional hook call regardless of book kind.
  // This depends on the same assumption the old code already had: the
  // parent remounts this component (a `key` tied to the book's id) any
  // time a different book is opened, rather than swapping book.uri on
  // an already-mounted instance.
  const player = useAudioPlayer(isAudio ? book.uri : null);
  const status = useAudioPlayerStatus(player);
  const [playing, setPlaying] = useState(false);
  const [posMs, setPosMs] = useState(0);
  const [durMs, setDurMs] = useState(0);
  const countedRef = useRef(false);
  const seekedRef = useRef(false);
  const latestPosRef = useRef(0);

  // --- load a text book's contents whenever one is attached ---
  useEffect(() => {
    let cancelled = false;
    async function read() {
      if (!book || book.kind !== 'text') return;
      setLoading(true);
      try {
        let content;
        if (book.format === 'epub') {
          const parsed = await parseEpub(book.uri);
          content = parsed.text;
        } else {
          content = await FileSystem.readAsStringAsync(book.uri);
        }
        if (!cancelled) {
          const pgs = paginate(content);
          setPages(pgs);
          if (onProgress && book.pageCount !== pgs.length) {
            onProgress({ pageCount: pgs.length });
          }
        }
      } catch (e) {
        if (!cancelled) {
          Alert.alert(
            "Couldn't open the file",
            'It may have been moved or deleted since you added it. Try adding it again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    read();
    return () => {
      cancelled = true;
    };
  }, [book && book.uri]);

  // --- audio: configure playback mode once, resume the saved position
  // the first time the player finishes loading, and mirror live status
  // into state for the progress bar / play button. ---
  useEffect(() => {
    if (!isAudio) return;
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudio]);

  useEffect(() => {
    if (!isAudio || !status.isLoaded) return;
    if (!seekedRef.current) {
      seekedRef.current = true;
      const resumeSeconds = (book.positionMs || 0) / 1000;
      if (resumeSeconds > 0) player.seekTo(resumeSeconds);
      if (status.duration && onProgress && book.durationMs !== status.duration * 1000) {
        onProgress({ durationMs: status.duration * 1000 });
      }
    }
    const currentMs = (status.currentTime || 0) * 1000;
    setPosMs(currentMs);
    setDurMs((status.duration || 0) * 1000);
    setPlaying(!!status.playing);
    latestPosRef.current = currentMs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudio, status.isLoaded, status.currentTime, status.duration, status.playing]);

  // Save wherever we stopped when this session closes.
  useEffect(() => {
    return () => {
      if (isAudio && onProgress) onProgress({ positionMs: latestPosRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A session counts as done once you've made real progress: a page
  // turn for text, or five minutes of listening for audio.
  useEffect(() => {
    if (countedRef.current) return;
    if (book && book.kind === 'audio' && posMs > 5 * 60 * 1000) {
      countedRef.current = true;
      onComplete();
    }
  }, [posMs, book, onComplete]);

  function setManualTotal() {
    const n = parseInt(totalInput, 10);
    if (onProgress) onProgress({ pageCount: Number.isFinite(n) && n > 0 ? n : 0 });
    setEditingTotal(false);
  }

  function turnManualPage(dir) {
    const cap = book.pageCount || Infinity;
    const next = Math.max(0, Math.min(cap, manualPage + dir));
    setManualPage(next);
    if (onProgress) onProgress({ page: next });
    if (dir > 0 && !manualCountedRef.current) {
      manualCountedRef.current = true;
      onComplete();
    }
  }

  function turnPage(dir) {
    const next = Math.max(0, Math.min(pages.length - 1, pageIndex + dir));
    setPageIndex(next);
    if (onProgress) onProgress({ page: next });
    if (dir > 0 && !countedRef.current) {
      countedRef.current = true;
      onComplete();
    }
  }

  async function togglePlay() {
    if (!isAudio) return;
    if (playing) player.pause();
    else player.play();
  }

  async function skip(seconds) {
    if (!isAudio) return;
    const target = Math.max(0, Math.min(durMs, posMs + seconds * 1000));
    player.seekTo(target / 1000);
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
        <Text style={styles.exitText}>✕</Text>
      </TouchableOpacity>

      {book.kind === 'manual' ? (
        <View style={styles.center}>
          <Text style={styles.bookTitle}>{book.name}</Text>

          {book.pageCount ? (
            <>
              <Text style={styles.audioTime}>{manualPage}</Text>
              <Text style={styles.audioDur}>of {book.pageCount} pages</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (manualPage / book.pageCount) * 100)}%` },
                  ]}
                />
              </View>
            </>
          ) : (
            <Text style={styles.body}>
              No page count set yet — add one to see a percentage, or just
              tap forward as you read.
            </Text>
          )}

          <View style={styles.audioControls}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => turnManualPage(-1)}
              disabled={manualPage === 0}
            >
              <Text style={styles.skipText}>− page</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={() => turnManualPage(1)}>
              <Text style={[styles.playText, { fontSize: 16 }]}>+1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => turnManualPage(10)}>
              <Text style={styles.skipText}>+10</Text>
            </TouchableOpacity>
          </View>

          {editingTotal ? (
            <View style={styles.manualEditRow}>
              <TextInput
                style={styles.manualInput}
                keyboardType="number-pad"
                placeholder="Total pages"
                placeholderTextColor={DIM}
                value={totalInput}
                onChangeText={setTotalInput}
                autoFocus
              />
              <TouchableOpacity style={styles.linkBtn} onPress={setManualTotal}>
                <Text style={styles.linkText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.linkBtn} onPress={() => setEditingTotal(true)}>
              <Text style={styles.linkText}>
                {book.pageCount ? 'Change total pages' : 'Set total pages'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : book.kind === 'audio' ? (
        <View style={styles.center}>
          <Text style={styles.bookTitle}>{book.name}</Text>
          <Text style={styles.audioTime}>{fmtTime(posMs)}</Text>
          <Text style={styles.audioDur}>of {fmtTime(durMs)}</Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: durMs ? `${Math.min(100, (posMs / durMs) * 100)}%` : '0%' },
              ]}
            />
          </View>

          <View style={styles.audioControls}>
            <TouchableOpacity style={styles.skipBtn} onPress={() => skip(-30)}>
              <Text style={styles.skipText}>−30s</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
              <Text style={styles.playText}>{playing ? '❚❚' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => skip(30)}>
              <Text style={styles.skipText}>+30s</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.linkBtn} onPress={onExit}>
            <Text style={styles.linkText}>‹ Back to shelf</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.readerHeader} numberOfLines={1}>
            {book.name}
          </Text>
          <ScrollView contentContainerStyle={styles.readerBody}>
            <Text style={styles.readerText}>{pages[pageIndex] || ''}</Text>
          </ScrollView>
          <View style={styles.pager}>
            <TouchableOpacity
              style={[styles.pageBtn, pageIndex === 0 && styles.pageBtnOff]}
              onPress={() => turnPage(-1)}
              disabled={pageIndex === 0}
            >
              <Text style={styles.pageBtnText}>‹ Prev</Text>
            </TouchableOpacity>
            <Text style={styles.pageCount}>
              {pageIndex + 1} / {pages.length}
            </Text>
            <TouchableOpacity
              style={[styles.pageBtn, pageIndex >= pages.length - 1 && styles.pageBtnOff]}
              onPress={() => turnPage(1)}
              disabled={pageIndex >= pages.length - 1}
            >
              <Text style={styles.pageBtnText}>Next ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  exitBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: { color: '#fff', fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  bookTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 26 },
  audioTime: { color: '#fff', fontSize: 46, fontWeight: '800' },
  audioDur: { color: DIM, fontSize: 13, marginTop: 2, marginBottom: 20 },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginBottom: 26,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: GOLD },
  audioControls: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  skipText: { color: INK, fontSize: 13, fontWeight: '700' },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  linkBtn: { paddingVertical: 18 },
  linkText: { color: DIM, fontSize: 13 },
  manualEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  manualInput: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, color: INK, fontSize: 14, width: 110, textAlign: 'center',
  },
  readerHeader: {
    color: DIM,
    fontSize: 12,
    fontWeight: '700',
    paddingTop: 52,
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  readerBody: { paddingHorizontal: 22, paddingBottom: 20 },
  readerText: { color: '#e8edf2', fontSize: 17, lineHeight: 28 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  pageBtnOff: { opacity: 0.3 },
  pageBtnText: { color: GOLD, fontSize: 15, fontWeight: '700' },
  pageCount: { color: DIM, fontSize: 13, fontWeight: '600' },
});

