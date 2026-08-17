import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { GOLD, INK, DIM } from './theme';

// Error 153 ("Video Player Configuration Error") happens when the
// WebView loads raw HTML with no real origin — YouTube's embed checks
// reject that. Giving the WebView a baseUrl AND setting the player's
// origin to match fixes it (documented fix used by react-native
// YouTube embed libraries).
const ORIGIN = 'https://localhost';

function buildHtml(videoId) {
  return `
<!DOCTYPE html>
<html>
<head><style>
  html,body{margin:0;padding:0;background:#000;width:100%;height:100%;}
  #player{width:100%;height:100%;}
  #player iframe{width:100% !important;height:100% !important;position:absolute;top:0;left:0;}
</style></head>
<body>
<div id="player"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
  var player;
  var tickTimer = null;
  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      videoId: '${videoId}',
      playerVars: { playsinline: 1, rel: 0, origin: '${ORIGIN}' },
      events: {
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  }
  function onPlayerError(event) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', code: event.data }));
  }
  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = setInterval(function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tick' }));
      }, 1000);
    } else {
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      if (event.data === YT.PlayerState.ENDED) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
      }
    }
  }
  function reportFullscreen() {
    var fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fullscreen', value: fs }));
  }
  document.addEventListener('fullscreenchange', reportFullscreen);
  document.addEventListener('webkitfullscreenchange', reportFullscreen);
</script>
</body>
</html>`;
}

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Renders an embedded YouTube video and tracks how many seconds it's
// actually been PLAYING (pauses don't count) via the YouTube IFrame
// API's state-change events, bridged out of the WebView via
// postMessage. Calls onComplete() once when watched time reaches
// requiredSeconds. Starts from initialWatched and calls onProgress on
// every tick so the parent can persist progress — otherwise closing and
// reopening the video (which unmounts this component) would silently
// lose everything watched so far.
export default function HabitVideoPlayer({
  videoId,
  requiredSeconds = 300,
  initialWatched = 0,
  onComplete,
  onProgress,
  onFullscreenChange,
}) {
  const [watched, setWatched] = useState(initialWatched);
  const [errorCode, setErrorCode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const completedRef = useRef(initialWatched >= requiredSeconds);

  function handleMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'error') {
        setErrorCode(msg.code);
        return;
      }
      if (msg.type === 'fullscreen') {
        setIsFullscreen(msg.value);
        if (onFullscreenChange) onFullscreenChange(msg.value);
        return;
      }
      if (msg.type === 'tick' || msg.type === 'ended') {
        setWatched((prev) => {
          const next = msg.type === 'ended' ? requiredSeconds : prev + 1;
          return Math.min(next, requiredSeconds);
        });
      }
    } catch (e) {}
  }

  useEffect(() => {
    if (onProgress) onProgress(watched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched]);

  // Calling onComplete (which cascades into parent state updates, and
  // can remount this whole component via a changed key) from inside the
  // setWatched updater above is what caused the "can't update" crash —
  // side effects like this belong in an effect, not inside a state
  // updater function.
  useEffect(() => {
    if (watched >= requiredSeconds && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [watched, requiredSeconds, onComplete]);

  const pct = Math.min(100, Math.round((watched / requiredSeconds) * 100));

  return (
    <View style={styles.wrap}>
      <View style={styles.playerBox}>
        <WebView
          source={{ html: buildHtml(videoId), baseUrl: ORIGIN + '/' }}
          onMessage={handleMessage}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          style={{ flex: 1, backgroundColor: '#000' }}
          originWhitelist={['*']}
        />
      </View>
      {errorCode || isFullscreen ? (
        errorCode ? (
          <Text style={styles.errorText}>
            YouTube couldn't play this video here (error {errorCode}). Some
            videos block embedded playback — try a different one in the
            playlist.
          </Text>
        ) : null
      ) : (
        <>
          <View style={styles.progressRow}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {formatMMSS(watched)} / {formatMMSS(requiredSeconds)} watched
            </Text>
          </View>
          {watched >= requiredSeconds ? (
            <Text style={styles.doneText}>✅ Habit completed for today!</Text>
          ) : (
            <Text style={styles.hint}>Keep it playing — pausing stops the count.</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 4, flex: 1 },
  playerBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  progressRow: { marginTop: 12 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#33475a', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: GOLD },
  progressText: { fontSize: 12, color: DIM, marginTop: 6, textAlign: 'center' },
  doneText: { fontSize: 14, color: '#4f9e5c', fontWeight: '700', textAlign: 'center', marginTop: 10 },
  hint: { fontSize: 11, color: DIM, textAlign: 'center', marginTop: 10 },
  errorText: { fontSize: 13, color: '#ea5a5f', textAlign: 'center', marginTop: 14, lineHeight: 19 },
});

