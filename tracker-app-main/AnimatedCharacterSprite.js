import React, { useState, useEffect } from 'react';
import SpriteTile from './SpriteTile';

// Plays one animation strip (a single row of equally-sized frames in one
// PNG, which is how these packs ship each animation as its own file)
// by cycling the frame index on a timer. Reuses SpriteTile's crop trick
// with sheetRows=1.
//
// frameSize/frameCount are per-animation since different animations in
// this pack have different frame counts at the same 48px frame height
// (confirmed: idle=4 frames, run=6, attack1=6 — check yours the same
// way if you add more: pixel width ÷ 48).
export default function AnimatedCharacterSprite({
  sheet,
  frameCount,
  frameSize = 48,
  fps = 10,
  loop = true,
  playing = true,
  style,
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setFrame((f) => {
        const next = f + 1;
        if (next >= frameCount) return loop ? 0 : f;
        return next;
      });
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [playing, frameCount, fps, loop]);

  return (
    <SpriteTile
      sheet={sheet}
      index={frame}
      sheetCols={frameCount}
      sheetRows={1}
      tileSize={frameSize}
      style={style}
    />
  );
}
