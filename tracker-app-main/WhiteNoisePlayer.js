import { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';

// Real recorded ocean waves instead of synthesized filtered noise.
//
// Track: "Gentle Ocean Waves" by DRAGON-STUDIO on Pixabay - free for
// commercial and personal use, no permission or attribution required
// per the creator's own terms (credit is welcomed but optional):
// https://pixabay.com/sound-effects/nature-gentle-ocean-waves-499666/
//
// Pixabay's audio pages load the file dynamically, so there's no stable
// direct URL to hotlink - download it once and drop it at the path
// below. A bundled local asset is more reliable than streaming anyway:
// it works offline and never depends on an external server being up.
//
//   1. Open the link above, tap "Free Download"
//   2. Save it as: assets/sounds/ocean-waves.mp3
const OCEAN_SOUND = require('./assets/sounds/ocean-waves.mp3');

// Migrated from expo-av's Audio.Sound (deprecated) to expo-audio. This
// is simpler than the old version, not just updated: useAudioPlayer
// loads the file as soon as the component mounts regardless of the
// `playing` prop, which is exactly the manual preload-then-play
// behavior the old version had to build by hand with refs.
export default function WhiteNoisePlayer({ playing }) {
  const player = useAudioPlayer(OCEAN_SOUND);

  useEffect(() => {
    player.loop = true;
    player.volume = 0.5;
  }, [player]);

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  return null;
}
