import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { GOLD, INK, DIM, BORDER } from './theme';

// Setting YouTube's start/end parameters alone is not enough: playback
// stops at `end`, but the native scrubber still shows the whole 4-hour
// video and you can drag anywhere in it. So YouTube's own controls are
// switched off entirely (controls=0, disablekb=1) and replaced with our
// own, and a watchdog snaps playback back inside the range if it ever
// drifts outside. The result is that only the segment exists as far as
// the learner is concerned.

function html(videoId, start, end) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html,body{margin:0;padding:0;background:#000;overflow:hidden}
  #p,iframe{position:absolute;top:0;left:0;width:100%!important;height:100%!important;border:0}
  /* Blocks taps reaching the iframe, so YouTube's own UI and the
     "watch on YouTube" link are unreachable. */
  #veil{position:absolute;top:0;left:0;right:0;bottom:0;z-index:5}
</style></head><body>
<div id="p"></div><div id="veil"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
  var START = ${start}, END = ${end}, player, timer;
  function send(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }

  function onYouTubeIframeAPIReady(){
    player = new YT.Player('p', {
      videoId: '${videoId}',
      playerVars: {
        start: START, end: END,
        controls: 0, disablekb: 1, modestbranding: 1,
        rel: 0, fs: 0, iv_load_policy: 3, playsinline: 1,
        origin: 'https://localhost'
      },
      events: {
        onReady: function(){ send({type:'ready', duration: END - START}); },
        onStateChange: function(e){
          if (e.data === YT.PlayerState.PLAYING) startTimer();
          else stopTimer();
          if (e.data === YT.PlayerState.ENDED) send({type:'done'});
          send({type:'state', playing: e.data === YT.PlayerState.PLAYING});
        }
      }
    });
  }

  function startTimer(){
    stopTimer();
    timer = setInterval(function(){
      if(!player || !player.getCurrentTime) return;
      var t = player.getCurrentTime();
      // Watchdog: never allow playback outside the segment.
      if (t < START - 1) { player.seekTo(START, true); return; }
      if (t >= END) { player.pauseVideo(); player.seekTo(END, true); send({type:'done'}); stopTimer(); return; }
      send({type:'tick', pos: t - START, len: END - START});
    }, 500);
  }
  function stopTimer(){ if(timer){ clearInterval(timer); timer = null; } }

  document.addEventListener('message', handle);
  window.addEventListener('message', handle);
  function handle(e){
    if(!player) return;
    if(e.data === 'play') player.playVideo();
    if(e.data === 'pause') player.pauseVideo();
    if(e.data === 'restart'){ player.seekTo(START, true); player.playVideo(); }
    if(typeof e.data === 'string' && e.data.indexOf('seek:') === 0){
      var delta = parseInt(e.data.split(':')[1], 10);
      var cur = player.getCurrentTime();
      // Clamp inside the segment so scrubbing can never leave it.
      var target = Math.min(END - 1, Math.max(START, cur + delta));
      player.seekTo(target, true);
      send({type:'tick', pos: target - START, len: END - START});
    }
  }
</script></body></html>`;
}

function mmss(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function LessonVideo({ video, watched, onWatched }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [len, setLen] = useState((video.end || 0) - (video.start || 0));
  const doneRef = useRef(!!watched);

  useEffect(() => {
    doneRef.current = !!watched;
  }, [watched]);

  if (!video || !video.videoId) return null;
  const start = video.start || 0;
  const end = video.end || start + 600;

  function onMessage(e) {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'tick') {
        setPos(m.pos);
        setLen(m.len);
        // Count it watched at 90% — the last few seconds are usually
        // sign-off, and forcing them just makes people skip ahead.
        if (!doneRef.current && m.pos / m.len > 0.9) {
          doneRef.current = true;
          if (onWatched) onWatched();
        }
      }
      if (m.type === 'state') setPlaying(m.playing);
      if (m.type === 'ready') setLen(m.duration);
      if (m.type === 'done' && !doneRef.current) {
        doneRef.current = true;
        if (onWatched) onWatched();
      }
    } catch (err) {}
  }

  function send(msg) {
    ref.current?.postMessage(msg);
  }

  const pct = len ? Math.min(100, (pos / len) * 100) : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.player}>
        <WebView
          ref={ref}
          source={{ html: html(video.videoId, start, end), baseUrl: 'https://localhost/' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onMessage={onMessage}
          style={{ backgroundColor: '#000' }}
        />
      </View>

      {/* Our own controls. The segment is the whole timeline here — there
          is no way to reach the rest of the source video. */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.skipBtn} onPress={() => send('seek:-10')}>
          <Text style={styles.skipText}>−10</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => send(playing ? 'pause' : 'play')}
        >
          <Text style={styles.playText}>{playing ? '❚❚' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => send('seek:10')}>
          <Text style={styles.skipText}>+10</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.time}>
            {mmss(pos)} / {mmss(len)}
            {watched ? '  ·  watched ✓' : ''}
          </Text>
        </View>
        {watched ? (
          <TouchableOpacity onPress={() => send('restart')}>
            <Text style={styles.replay}>Replay</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.caption}>
        {video.title}
        {video.source ? ` · ${video.source}` : ''}
      </Text>
      {video.note ? <Text style={styles.note}>{video.note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: BORDER,
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  skipBtn: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  skipText: { color: INK, fontSize: 12, fontWeight: '700' },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: GOLD },
  time: { color: DIM, fontSize: 11, marginTop: 5 },
  replay: { color: GOLD, fontSize: 12, fontWeight: '700' },
  caption: { color: INK, fontSize: 14, fontWeight: '700', marginTop: 12 },
  note: { color: DIM, fontSize: 12, marginTop: 4, lineHeight: 18 },
});

