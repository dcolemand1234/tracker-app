import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { INK, DIM, CARD, BORDER } from './theme';

function formatReleaseDate(val) {
  if (!val) return '';
  const d = new Date(val + 'T00:00:00');
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

// A 2-up-per-row poster card that flips on tap to show status, release
// date, and progress on the back — instead of always showing that detail
// stacked below the poster the way the old list layout did.
export default function TrackerCard({
  item,
  categories,
  color,
  label,
  isGame,
  isManga,
  isEpisodic,
  onEdit,
  onManageProgress,
  onAdjustEpisode,
  onAdjustGamePercent,
}) {
  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  // maxresdefault.jpg is the true 1280x720 thumbnail with no baked-in
  // letterboxing - but it doesn't exist for every video, so fall back
  // to the always-available hqdefault.jpg if it 404s.
  const [useMaxRes, setUseMaxRes] = useState(true);

  // Poster art comes in all kinds of aspect ratios - forcing every one
  // into the same fixed box is what was cropping (with cover) or
  // letterboxing (with contain) images that didn't match it. Reading
  // the image's real width/height and using THAT as the card's aspect
  // ratio means the box always matches the picture exactly, so nothing
  // gets cut off or padded with black bars. Falls back to the old
  // movie-poster ratio (2:3-ish) until the real size loads, or if it
  // fails to load at all.
  const FALLBACK_RATIO = 3 / 4.9;
  const [posterRatio, setPosterRatio] = useState(FALLBACK_RATIO);
  useEffect(() => {
    if (!item.image) {
      setPosterRatio(FALLBACK_RATIO);
      return;
    }
    let cancelled = false;
    Image.getSize(
      item.image,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setPosterRatio(w / h);
      },
      () => {
        // Couldn't read real dimensions (bad url, network, etc.) -
        // just keep the fallback ratio rather than leaving it broken.
        if (!cancelled) setPosterRatio(FALLBACK_RATIO);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [item.image]);

  function flip() {
    Animated.spring(anim, {
      toValue: flipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  }

  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const epTotal = Number(item.epTotal) || 0;
  const epCurrent = Number(item.epCurrent) || 0;
  const epPct = epTotal > 0 ? Math.min(100, Math.round((epCurrent / epTotal) * 100)) : 0;
  const progressWord = isManga ? 'Ch' : 'Ep';
  const ytId = item.mediaUrl ? getYouTubeId(item.mediaUrl) : null;
  const hasVideo = !item.image && !!ytId;
  const comingSoon = item.status === 'coming_soon';
  const wantToBuy = !!item.wantToBuy && !comingSoon;
  const finished = epTotal > 0 && epCurrent >= epTotal;

  return (
    <View style={[styles.cardSlot, hasVideo && styles.cardSlotVideo, item.image && { aspectRatio: posterRatio }]}>
      <TouchableOpacity
        style={styles.touchArea}
        activeOpacity={0.9}
        onPress={flip}
        onLongPress={onEdit}
        delayLongPress={400}
      >
        {/* FRONT */}
        <Animated.View
          style={[
            styles.face,
            hasVideo && styles.cardSlotVideoBorder,
            { transform: [{ rotateY: frontRotate }] },
          ]}
        >
          <View style={styles.poster}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.posterImg} resizeMode="contain" />
            ) : hasVideo ? (
              <Image
                source={{
                  uri: `https://img.youtube.com/vi/${ytId}/${useMaxRes ? 'maxresdefault' : 'hqdefault'}.jpg`,
                }}
                style={styles.posterImg}
                resizeMode="cover"
                onError={() => setUseMaxRes(false)}
              />
            ) : (
              <View style={[styles.posterImg, styles.posterPlaceholder, { backgroundColor: color }]}>
                <Text style={styles.posterLetter}>{(item.title || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}

            {comingSoon ? (
              <View style={[styles.ribbon, { backgroundColor: '#bc9440' }]}>
                <Text style={styles.ribbonText}>SOON</Text>
              </View>
            ) : wantToBuy ? (
              <View style={[styles.ribbon, { backgroundColor: '#6b8fc9' }]}>
                <Text style={styles.ribbonText}>WISHLIST</Text>
              </View>
            ) : finished ? (
              <View style={[styles.ribbon, { backgroundColor: '#3f8f82' }]}>
                <Text style={styles.ribbonText}>DONE</Text>
              </View>
            ) : null}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.posterScrim}
            >
              <Text style={styles.posterTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* BACK */}
        <Animated.View
          style={[
            styles.face,
            styles.faceBack,
            { transform: [{ rotateY: backRotate }] },
          ]}
        >
          <View style={[styles.backAccent, { backgroundColor: color }]} />

          <View style={styles.backContent}>
            <Text style={styles.backTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.labelPill, { backgroundColor: color + '2A', borderColor: color + '55' }]}>
              <Text style={[styles.labelPillText, { color }]}>{label}</Text>
            </View>

            <View style={styles.divider} />

            {comingSoon ? (
              <View style={styles.statusBlock}>
                <Text style={styles.statusIcon}>📅</Text>
                <Text style={[styles.statusText, { color: '#d9a441' }]}>Coming Soon</Text>
                <Text style={styles.detailText}>
                  {item.releaseDate ? formatReleaseDate(item.releaseDate) : 'No date set yet'}
                </Text>
              </View>
            ) : wantToBuy ? (
              <View style={styles.statusBlock}>
                <Text style={styles.statusIcon}>🛒</Text>
                <Text style={[styles.statusText, { color: '#6b8fc9' }]}>Want to Buy</Text>
                <Text style={styles.detailText}>Released — just don't own it yet</Text>
              </View>
            ) : finished ? (
              <View style={styles.statusBlock}>
                <Text style={styles.statusIcon}>✓</Text>
                <Text style={[styles.statusText, { color: '#4fb894' }]}>Finished</Text>
                <Text style={styles.detailText}>
                  {progressWord} {epCurrent}/{epTotal}
                </Text>
              </View>
            ) : isGame ? (
              <View style={styles.statusBlock}>
                <Text style={styles.statusIcon}>🎮</Text>
                <Text style={styles.statusText}>{item.gamePercent || 0}% complete</Text>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={[color + 'AA', color]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${item.gamePercent || 0}%` }]}
                  />
                </View>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: color }]}
                    onPress={() => onAdjustGamePercent(item, -5)}
                  >
                    <Text style={[styles.stepBtnText, { color }]}>−5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: color }]}
                    onPress={() => onAdjustGamePercent(item, 5)}
                  >
                    <Text style={[styles.stepBtnText, { color }]}>+5</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : epTotal > 0 ? (
              <View style={styles.statusBlock}>
                <Text style={styles.statusIcon}>{isManga ? '📖' : '🎬'}</Text>
                <Text style={styles.statusText}>
                  {progressWord} {epCurrent} of {epTotal}
                </Text>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={[color + 'AA', color]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${epPct}%` }]}
                  />
                </View>
                <Text style={styles.detailText}>{epPct}% watched</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: color }]}
                    onPress={() => onAdjustEpisode(item, -1)}
                  >
                    <Text style={[styles.stepBtnText, { color }]}>−1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: color }]}
                    onPress={() => onAdjustEpisode(item, 1)}
                  >
                    <Text style={[styles.stepBtnText, { color }]}>+1</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.statusBlock}>
                <Text style={styles.statusIcon}>📡</Text>
                <Text style={styles.statusText}>Ongoing</Text>
                <Text style={styles.detailText}>
                  {epCurrent > 0 ? `${progressWord} ${epCurrent} so far` : 'New weekly releases'}
                </Text>
              </View>
            )}

            {item.notes ? (
              <View style={styles.notesBlock}>
                <Text style={styles.notesLabel}>NOTES</Text>
                <Text style={styles.notesText} numberOfLines={4}>
                  {item.notes}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.backActions}>
            {(isGame || isEpisodic || isManga) && !comingSoon ? (
              <TouchableOpacity style={styles.actionChip} onPress={onManageProgress}>
                <Text style={styles.actionChipText}>Manage</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.actionChip} onPress={onEdit}>
              <Text style={styles.actionChipText}>✎ Edit</Text>
            </TouchableOpacity>
            {item.mediaUrl ? (
              <TouchableOpacity
                style={styles.actionChip}
                onPress={() => Linking.openURL(item.mediaUrl)}
              >
                <Text style={styles.actionChipText}>▶ Watch</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const CARD_W = '47%';

const styles = StyleSheet.create({
  cardSlot: { width: CARD_W, marginBottom: 14, aspectRatio: 3 / 4.9 },
  // Video thumbnails are natively wide (16:9-ish) - forcing them into
  // the same tall movie-poster ratio as cover art means most of the
  // card is empty black letterboxing. A more landscape ratio here lets
  // the actual video frame fill the space instead of getting lost in it.
  cardSlotVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignSelf: 'flex-start',
    borderRadius: 14,
    shadowColor: '#bc9440',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardSlotVideoBorder: {
    borderWidth: 1,
    borderColor: 'rgba(188,148,64,0.55)',
    borderRadius: 14,
  },
  touchArea: { flex: 1 },
  face: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backfaceVisibility: 'hidden',
    borderRadius: 14,
    overflow: 'hidden',
  },
  poster: { flex: 1, backgroundColor: CARD },
  posterImg: { width: '100%', height: '100%', backgroundColor: CARD },
  posterPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  posterLetter: { color: '#fff', fontSize: 40, fontWeight: '800' },
  posterScrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 30,
    paddingHorizontal: 10, paddingBottom: 10,
  },
  posterTitle: { color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 17 },
  ribbon: {
    position: 'absolute', top: 10, right: -28, paddingVertical: 3, width: 100,
    alignItems: 'center', transform: [{ rotate: '40deg' }],
  },
  ribbonText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  faceBack: {
    backgroundColor: '#161d26', flexDirection: 'column',
  },
  backAccent: { height: 4, width: '100%' },
  backContent: { flex: 1, padding: 14 },
  backTitle: { color: '#fff', fontSize: 15, fontWeight: '800', lineHeight: 19 },
  labelPill: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 3, marginTop: 8,
  },
  labelPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  divider: {
    height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginTop: 12, marginBottom: 12,
  },
  statusBlock: { alignItems: 'flex-start' },
  statusIcon: { fontSize: 18, marginBottom: 4 },
  statusText: { color: INK, fontSize: 14, fontWeight: '800' },
  detailText: { color: DIM, fontSize: 11.5, marginTop: 3, lineHeight: 16 },
  barTrack: {
    alignSelf: 'stretch',
    height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', marginTop: 8,
  },
  barFill: { height: '100%', borderRadius: 3 },
  notesBlock: {
    marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
  },
  notesLabel: { color: DIM, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
  notesText: { color: '#c3ccd6', fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  stepperRow: { flexDirection: 'row', gap: 8, marginTop: 12 },  stepBtn: {
    borderWidth: 1.3, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 13,
  },
  stepBtnText: { fontSize: 12, fontWeight: '800' },
  backActions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    padding: 10,
  },
  actionChip: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8,
    paddingVertical: 5, paddingHorizontal: 9,
  },
  actionChipText: { color: '#8fc4e8', fontSize: 11, fontWeight: '700' },
});
