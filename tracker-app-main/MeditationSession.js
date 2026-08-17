import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Animated, Easing, TouchableOpacity, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { GOLD, INK, DIM } from './theme';
import WhiteNoisePlayer from './WhiteNoisePlayer';

// A hexagon built from three plain Views (a rectangle plus two
// border-triangles) rather than react-native-svg, which isn't a
// dependency here. Pointy top/bottom, flat left/right — the classic
// badge-hexagon silhouette.
function Hexagon({ size, color, style }) {
  const triH = size * 0.29;
  const rectH = size * 0.58;
  return (
    <View style={[{ width: size, alignItems: 'center' }, style]}>
      <View
        style={{
          width: 0, height: 0,
          borderLeftWidth: size / 2, borderRightWidth: size / 2, borderBottomWidth: triH,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
        }}
      />
      <View style={{ width: size, height: rectH, backgroundColor: color }} />
      <View
        style={{
          width: 0, height: 0,
          borderLeftWidth: size / 2, borderRightWidth: size / 2, borderTopWidth: triH,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
        }}
      />
    </View>
  );
}

// A real, appropriately-licensed video loop (Pixabay - royalty-free, no
// attribution required per their license) instead of a still photo with
// fake movement layered on top. Explicitly shows sea, beach, and sand
// together, which is what a static image couldn't guarantee.
//
// Worth knowing: hotlinking Pixabay's CDN directly is fine for testing,
// but for anything you actually ship, download this file and bundle it
// with the app instead - their CDN URLs aren't guaranteed stable long
// term, and their terms expect downloading rather than perpetual
// deep-linking into their servers.
const BEACH_VIDEO_URL = 'https://cdn.pixabay.com/video/2016/11/15/6399-191636228_large.mp4';

const TEMPO_MS = { slow: 2200, medium: 1500, fast: 1000 };

// Progression: hold a 7-day streak to move up a level. Rounds climb
// 1 -> 2 -> 3, then breaths step up by 5 and rounds reset to 1.
// 5b1r, 5b2r, 5b3r, 10b1r ... through to 30b3r at the top.
export const MEDITATION_MAX_LEVEL = 17;
export const DAYS_PER_LEVEL = 7;

export function meditationLevelSpec(levelIndex) {
  const n = Math.max(0, Math.min(MEDITATION_MAX_LEVEL, levelIndex || 0));
  return {
    level: n,
    breathCount: 5 + 5 * Math.floor(n / 3),
    rounds: (n % 3) + 1,
    isMax: n >= MEDITATION_MAX_LEVEL,
  };
}

export function meditationLevelLabel(levelIndex) {
  const spec = meditationLevelSpec(levelIndex);
  return `${spec.breathCount} breaths x ${spec.rounds} round${spec.rounds === 1 ? '' : 's'}`;
}
const RECOVERY_HOLD_SECONDS = 15;

// Wind particles: varied angle, size, and a slight per-particle timing
// offset so they don't all move in perfect unison — real blowing sand
// isn't that uniform. Each one fades in/out along its own length via a
// gradient instead of being a flat solid streak.
const WIND_PARTICLES = [
  { angle: 0, size: 26, offset: 0 },
  { angle: 30, size: 18, offset: 0.06 },
  { angle: 60, size: 22, offset: 0.12 },
  { angle: 90, size: 30, offset: 0.02 },
  { angle: 120, size: 16, offset: 0.09 },
  { angle: 150, size: 24, offset: 0.15 },
  { angle: 180, size: 20, offset: 0.04 },
  { angle: 210, size: 28, offset: 0.11 },
  { angle: 240, size: 18, offset: 0.07 },
  { angle: 270, size: 25, offset: 0.13 },
  { angle: 300, size: 20, offset: 0.03 },
  { angle: 330, size: 22, offset: 0.1 },
];

function formatSeconds(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
}

// Phases: intro -> breathing -> holding -> recovery -> roundEnd -> done
export default function MeditationSession({ settings, levelIndex = 0, streakInfo, onComplete }) {
  // Breaths and rounds come from the earned level, so the session grows
  // with you rather than being set by hand.
  const spec = meditationLevelSpec(levelIndex);
  const breathCount = spec.breathCount;
  const totalRounds = spec.rounds;
  const tempoMs = TEMPO_MS[settings?.tempoId] || TEMPO_MS.medium;
  const soundOn = settings?.soundOn !== false;

  const [phase, setPhase] = useState('intro');
  const [round, setRound] = useState(1);
  const [breathIndex, setBreathIndex] = useState(0);
  const [breathLabel, setBreathLabel] = useState('In');
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [bestHold, setBestHold] = useState(0);
  const [recoverySeconds, setRecoverySeconds] = useState(RECOVERY_HOLD_SECONDS);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const holdTimerRef = useRef(null);
  const recoveryTimerRef = useRef(null);

  useEffect(() => {
    if (phase !== 'breathing') return;
    let cancelled = false;

    function runBreath(i) {
      if (cancelled) return;
      if (i >= breathCount) {
        setPhase('holding');
        return;
      }
      setBreathIndex(i);
      setBreathLabel('In');
      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: tempoMs,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start(() => {
        if (cancelled) return;
        setBreathLabel('Out');
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: tempoMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }).start(() => {
          if (!cancelled) runBreath(i + 1);
        });
      });
    }
    runBreath(0);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'holding') return;
    setHoldSeconds(0);
    holdTimerRef.current = setInterval(() => setHoldSeconds((s) => s + 1), 1000);
    return () => clearInterval(holdTimerRef.current);
  }, [phase]);

  function releaseHold() {
    clearInterval(holdTimerRef.current);
    setBestHold((b) => Math.max(b, holdSeconds));
    setPhase('recovery');
  }

  useEffect(() => {
    if (phase !== 'recovery') return;
    setRecoverySeconds(RECOVERY_HOLD_SECONDS);
    recoveryTimerRef.current = setInterval(() => {
      setRecoverySeconds((s) => {
        if (s <= 1) {
          clearInterval(recoveryTimerRef.current);
          setPhase(round < totalRounds ? 'roundEnd' : 'done');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(recoveryTimerRef.current);
  }, [phase, round, totalRounds]);

  useEffect(() => {
    if (phase === 'done') onComplete(bestHold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function nextRound() {
    setRound((r) => r + 1);
    setPhase('breathing');
  }

  const windOpacity = scaleAnim.interpolate({ inputRange: [1, 1.25, 1.5], outputRange: [0.5, 0.85, 0.1] });
  // The badge hexagons pulse as one coherent unit, a gentler range than
  // the wind/photo effects so it reads as breathing, not throbbing.
  const badgeScale = scaleAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.92, 1.16] });
  // The whole photo surges very slightly on inhale — subtle enough that
  // no edge/gap shows, but enough to feel like the scene itself is
  // breathing along with you. The foam shimmer brightens at the same
  // time, like light catching a cresting wave.
  const shimmerOpacity = scaleAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.12, 0.4] });
  // A very slight zoom on inhale, same idea as before, just applied to
  // the video now instead of a still photo.
  const videoScale = scaleAnim.interpolate({ inputRange: [1, 1.5], outputRange: [1, 1.045] });

  // expo-video (expo-av's Video component is deprecated): the player is
  // a separate object from the view that displays it, created once here
  // and configured via this setup callback rather than props.
  const player = useVideoPlayer(BEACH_VIDEO_URL, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const isSessionPhase = phase === 'breathing' || phase === 'holding' || phase === 'recovery';

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.beachPhoto, { transform: [{ scale: videoScale }] }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </Animated.View>
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.35)']}
        locations={[0, 0.28, 0.68, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Two translucent bands drifting on independent loops (see the
          waveAnim effect above) - this is the actual "water moving" cue,
          not just the photo pulsing. */}
      <Animated.View
        pointerEvents="none"
      />
      <Animated.View pointerEvents="none" style={[styles.foamShimmer, { opacity: shimmerOpacity }]} />

      {/* Guaranteed sand strip at the very bottom, independent of how the
          video happens to be cropped/zoomed. */}
      <LinearGradient
        colors={['transparent', 'rgba(224,193,140,0.65)', 'rgba(199,163,102,0.92)']}
        locations={[0, 0.35, 1]}
        style={styles.sandStrip}
        pointerEvents="none"
      />

      <WhiteNoisePlayer playing={soundOn && isSessionPhase} />

      {phase === 'intro' && (
        <View style={styles.center}>
          <Text style={styles.introTitle}>Breathing Session</Text>
          <Text style={styles.introText}>
            {totalRounds} round{totalRounds > 1 ? 's' : ''} of {breathCount} deep circular
            breaths, then hold as long as comfortable, then a{' '}
            {RECOVERY_HOLD_SECONDS}-second recovery hold. Sit or lie down
            somewhere safe — never do this while driving or swimming.
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeLabel}>LEVEL {spec.level + 1}</Text>
            <Text style={styles.levelBadgeSpec}>
              {breathCount} breaths x {totalRounds} round{totalRounds === 1 ? '' : 's'}
            </Text>
            {streakInfo ? (
              <Text style={styles.levelBadgeNext}>
                {spec.isMax
                  ? 'Top level reached'
                  : `${streakInfo.daysToNext} day${streakInfo.daysToNext === 1 ? '' : 's'} of streak to level up`}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.bigBtn}
            onPress={() => {
              setRound(1);
              setBestHold(0);
              setPhase('breathing');
            }}
          >
            <Text style={styles.bigBtnText}>Begin</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'breathing' && (
        <View style={styles.center}>
          <Text style={styles.phaseLabel}>
            Round {round} of {totalRounds} • Breath {breathIndex + 1} of {breathCount}
          </Text>
          <View style={styles.orbWrap}>
            {WIND_PARTICLES.map((p, i) => {
              const rad = (p.angle * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              const dist = scaleAnim.interpolate({
                inputRange: [1, 1.5],
                outputRange: [95 + p.offset * 40, 18 - p.offset * 10],
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.windParticleWrap,
                    {
                      opacity: windOpacity,
                      transform: [
                        { translateX: Animated.multiply(dist, cos) },
                        { translateY: Animated.multiply(dist, sin) },
                        { rotate: `${p.angle}deg` },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.75)', 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ width: p.size, height: 2.5, borderRadius: 2 }}
                  />
                </Animated.View>
              );
            })}

            {/* Three distinctly-sized hexagons, nested like a badge, all
                scaling together as one unit so they clearly read as
                concentric layers rather than one shape hiding the rest. */}
            <Animated.View style={[styles.hexAbsolute, { transform: [{ scale: badgeScale }] }]}>
              <Hexagon size={176} color="#d9a45c" />
            </Animated.View>
            <Animated.View style={[styles.hexAbsolute, { transform: [{ scale: badgeScale }] }]}>
              <Hexagon size={140} color="#f0cf8f" />
            </Animated.View>
            <Animated.View style={[styles.hexAbsolute, styles.orbCoreGlow, { transform: [{ scale: badgeScale }] }]}>
              <Hexagon size={100} color="#fbeed2" />
            </Animated.View>
            <View style={styles.badgeNumberWrap}>
              <Text style={styles.badgeNumber}>{breathIndex + 1}</Text>
            </View>
          </View>
          <Text style={styles.breathWord}>{breathLabel}</Text>
        </View>
      )}


      {phase === 'holding' && (
        <View style={styles.center}>
          <Text style={styles.phaseLabel}>Hold your breath</Text>
          <Text style={styles.holdTimer}>{formatSeconds(holdSeconds)}</Text>
          <Text style={styles.introText}>Release when you feel the urge to breathe.</Text>
          <TouchableOpacity style={styles.bigBtn} onPress={releaseHold}>
            <Text style={styles.bigBtnText}>I need to breathe</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'recovery' && (
        <View style={styles.center}>
          <Text style={styles.phaseLabel}>Recovery breath</Text>
          <Text style={styles.introText}>Take one huge, deep breath in and hold it.</Text>
          <Text style={styles.holdTimer}>{recoverySeconds}</Text>
        </View>
      )}

      {phase === 'roundEnd' && (
        <View style={styles.center}>
          <Text style={styles.introTitle}>Round {round} done</Text>
          <Text style={styles.introText}>
            {totalRounds - round} round{totalRounds - round > 1 ? 's' : ''} to go.
          </Text>
          <TouchableOpacity style={styles.bigBtn} onPress={nextRound}>
            <Text style={styles.bigBtnText}>Start Round {round + 1}</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.introTitle}>Nice work 🧘</Text>
          <Text style={styles.doneHold}>Best hold: {formatSeconds(bestHold)}</Text>
          <Text style={styles.introText}>Sit quietly for a moment before you go.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0a1a2e', overflow: 'hidden' },
  beachPhoto: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
  },
  foamShimmer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
    backgroundColor: '#eaf6ff',
  },
  sandStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '20%',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  introTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  introText: {
    color: '#e5edf3',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 4,
  },
  levelBadge: {
    backgroundColor: 'rgba(90,180,230,0.18)',
    borderWidth: 1,
    borderColor: '#5ab4e6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 18,
  },
  levelBadgeLabel: { color: '#dff3ff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  levelBadgeSpec: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 4 },
  levelBadgeNext: { color: '#c9d0d8', fontSize: 11, marginTop: 4 },
  bigBtn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginTop: 10, alignSelf: 'center' },
  bigBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  phaseLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textAlign: 'center',
  },
  orbWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  windParticleWrap: { position: 'absolute' },
  hexAbsolute: { position: 'absolute' },
  orbCoreGlow: {
    shadowColor: '#fbeed2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 12,
  },
  badgeNumberWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  badgeNumber: { color: '#7a5324', fontSize: 34, fontWeight: '800' },
  breathWord: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 28, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  holdTimer: { color: '#fff', fontSize: 56, fontWeight: '800', marginBottom: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  doneHold: { color: GOLD, fontSize: 20, fontWeight: '700', marginBottom: 14 },
});

