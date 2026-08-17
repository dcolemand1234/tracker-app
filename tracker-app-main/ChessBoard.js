import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import {
  initialBoard,
  legalMoves,
  applyMove,
  gameStatus,
  pickReplyMove,
  PIECE_GLYPH,
  PIECE_NAME,
  PIECE_LESSON,
  squareName,
} from './chessEngine';
import { GOLD, INK, DIM, CARD, BORDER, ROSE } from './theme';

const LIGHT = '#eeeed2';
const DARK = '#769656';
const HIGHLIGHT = '#baca44';
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// A straight arrow between two square centers, used to point at a
// suggested move. Plain Views (a rotated bar + a rotated triangle) since
// there's no SVG library here — good enough for a single straight hint
// arrow, which is all a "try this move" hint needs.
function HintArrow({ from, to }) {
  const fr = Math.floor(from / 8), fc = from % 8;
  const tr = Math.floor(to / 8), tc = to % 8;
  const x1 = ((fc + 0.5) / 8) * 100, y1 = ((fr + 0.5) / 8) * 100;
  const x2 = ((tc + 0.5) / 8) * 100, y2 = ((tr + 0.5) / 8) * 100;
  const dxPct = x2 - x1, dyPct = y2 - y1;
  const lengthPct = Math.sqrt(dxPct * dxPct + dyPct * dyPct);
  const angleDeg = (Math.atan2(dyPct, dxPct) * 180) / Math.PI;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.arrowShaft,
          {
            left: `${x1}%`,
            top: `${y1}%`,
            width: `${Math.max(0, lengthPct - 4)}%`,
            transform: [{ translateY: -3 }, { rotate: `${angleDeg}deg` }],
          },
        ]}
      />
      <View
        style={[
          styles.arrowHead,
          {
            left: `${x2}%`,
            top: `${y2}%`,
            transform: [
              { translateX: -10 },
              { translateY: -9 },
              { rotate: `${angleDeg + 90}deg` },
            ],
          },
        ]}
      />
    </View>
  );
}

// Two modes on one board. Learn: pick up any piece, see exactly where it
// can go and why, with no opponent and no pressure. Play: you take White
// against a deliberately weak engine, which is enough to practise
// against while the rules are still settling.
export default function ChessBoard({ onSessionDone, onExit, hintArrow, initialMode, showHint, hintPieceType }) {
  const [board, setBoard] = useState(initialBoard);
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState([]);
  const [turn, setTurn] = useState('w');
  const [mode, setMode] = useState(initialMode || 'learn');
  const [status, setStatus] = useState('playing');
  const [lastMove, setLastMove] = useState(null);
  const [thinking, setThinking] = useState(false);

  const selectedPiece = selected != null ? board[selected] : null;

  // A simple, honest hint: the first legal move for a piece of the
  // requested type (or any piece, if no type is specified) belonging to
  // whichever side is to move. Not a puzzle solution - just "here's a
  // legal example of the move this lesson is about."
  const computedHint = (() => {
    if (!showHint) return null;
    for (let i = 0; i < 64; i++) {
      const p = board[i];
      if (!p || p.color !== turn) continue;
      if (hintPieceType && p.type !== hintPieceType) continue;
      const m = legalMoves(board, i);
      if (m.length) return { from: i, to: m[0] };
    }
    return null;
  })();
  const activeHintArrow = hintArrow || computedHint;

  useEffect(() => {
    setStatus(gameStatus(board, turn));
  }, [board, turn]);

  // Engine replies on its own turn, after a short pause so the move is
  // visible rather than instant.
  useEffect(() => {
    if (mode !== 'play' || turn !== 'b') return;
    if (status === 'checkmate' || status === 'stalemate') return;
    setThinking(true);
    const t = setTimeout(() => {
      const reply = pickReplyMove(board, 'b');
      if (reply) {
        setBoard((b) => applyMove(b, reply.from, reply.to));
        setLastMove(reply);
        setTurn('w');
      }
      setThinking(false);
    }, 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, mode, status]);

  function reset(nextMode) {
    setBoard(initialBoard());
    setSelected(null);
    setMoves([]);
    setTurn('w');
    setLastMove(null);
    setStatus('playing');
    if (nextMode) setMode(nextMode);
  }

  function tapSquare(i) {
    if (thinking) return;

    // Completing a move.
    if (selected != null && moves.includes(i)) {
      const next = applyMove(board, selected, i);
      setBoard(next);
      setLastMove({ from: selected, to: i });
      setSelected(null);
      setMoves([]);
      if (mode === 'play') setTurn('b');
      else setTurn(board[selected].color === 'w' ? 'b' : 'w');
      if (onSessionDone) onSessionDone();
      return;
    }

    const piece = board[i];
    if (!piece) {
      setSelected(null);
      setMoves([]);
      return;
    }
    // In play mode you only handle your own pieces; in learn mode you can
    // pick up either side to see how anything moves.
    if (mode === 'play' && piece.color !== 'w') return;
    setSelected(i);
    setMoves(legalMoves(board, i));
  }

  const statusLine = (() => {
    if (status === 'checkmate') {
      return turn === 'w' ? 'Checkmate — black wins' : 'Checkmate — white wins';
    }
    if (status === 'stalemate') return 'Stalemate — draw';
    if (status === 'check') return turn === 'w' ? 'White is in check' : 'Black is in check';
    if (mode === 'play') return thinking ? 'Black is thinking…' : 'Your move (white)';
    return 'Tap any piece to see where it can go';
  })();

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
        <Text style={styles.exitText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'learn' && styles.modeBtnSel]}
            onPress={() => reset('learn')}
          >
            <Text style={[styles.modeText, mode === 'learn' && styles.modeTextSel]}>
              Learn
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'play' && styles.modeBtnSel]}
            onPress={() => reset('play')}
          >
            <Text style={[styles.modeText, mode === 'play' && styles.modeTextSel]}>
              ▶ Play
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.status, status === 'checkmate' && styles.statusBad]}>
          {statusLine}
        </Text>

        <View style={styles.board}>
          {Array.from({ length: 64 }).map((_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isLight = (row + col) % 2 === 0;
            const piece = board[i];
            const isSel = selected === i;
            const isTarget = moves.includes(i);
            const isLast = lastMove && (lastMove.from === i || lastMove.to === i);
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.8}
                onPress={() => tapSquare(i)}
                style={[
                  styles.square,
                  { backgroundColor: isLight ? LIGHT : DARK },
                  isLast && styles.squareLast,
                  isSel && styles.squareSel,
                ]}
              >
                {piece ? (
                  <Text
                    style={[
                      styles.piece,
                      piece.color === 'w' ? styles.pieceWhite : styles.pieceBlack,
                    ]}
                  >
                    {PIECE_GLYPH[piece.color + piece.type]}
                  </Text>
                ) : null}
                {isTarget ? (
                  <View style={piece ? styles.captureRing : styles.moveDot} />
                ) : null}
                {col === 0 ? (
                  <Text style={[styles.coordRank, { color: isLight ? DARK : LIGHT }]}>
                    {8 - row}
                  </Text>
                ) : null}
                {row === 7 ? (
                  <Text style={[styles.coordFile, { color: isLight ? DARK : LIGHT }]}>
                    {FILES[col]}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
          {activeHintArrow ? <HintArrow from={activeHintArrow.from} to={activeHintArrow.to} /> : null}
        </View>

        {selectedPiece ? (
          <View style={styles.lesson}>
            <Text style={styles.lessonTitle}>
              {PIECE_GLYPH[selectedPiece.color + selectedPiece.type]}{' '}
              {PIECE_NAME[selectedPiece.type]} on {squareName(selected)}
            </Text>
            <Text style={styles.lessonBody}>{PIECE_LESSON[selectedPiece.type]}</Text>
            <Text style={styles.lessonMoves}>
              {moves.length === 0
                ? 'No legal moves from here right now.'
                : `${moves.length} legal move${moves.length === 1 ? '' : 's'}: ${moves
                    .map(squareName)
                    .join(', ')}`}
            </Text>
          </View>
        ) : (
          <View style={styles.lesson}>
            <Text style={styles.lessonBody}>
              Dots show where the selected piece may legally move. A ring
              means a capture. Moves that would leave your own king in check
              are hidden automatically — that is why a pinned piece shows
              fewer options than you might expect.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.resetBtn} onPress={() => reset()}>
          <Text style={styles.resetText}>Reset board</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d141c' },
  scroll: { padding: 16, paddingTop: 54 },
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
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modeBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  modeBtnSel: { backgroundColor: GOLD, borderColor: GOLD },
  modeText: { color: INK, fontSize: 14, fontWeight: '700' },
  modeTextSel: { color: '#fff', fontWeight: '800' },
  status: { color: DIM, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  statusBad: { color: ROSE, fontWeight: '800' },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#5c4630',
  },
  square: {
    width: '12.5%',
    height: '12.5%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareSel: { backgroundColor: HIGHLIGHT },
  squareLast: { backgroundColor: 'rgba(186,202,68,0.55)' },
  piece: { fontSize: 30, lineHeight: 36 },
  pieceWhite: {
    color: '#f7f3ea',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 2,
  },
  pieceBlack: {
    color: '#1b1b1b',
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1.5,
  },
  moveDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(20,60,20,0.55)',
  },
  captureRing: {
    position: 'absolute',
    width: '82%',
    height: '82%',
    borderRadius: 100,
    borderWidth: 3,
    borderColor: 'rgba(180,40,40,0.75)',
  },
  coordRank: {
    position: 'absolute', top: 2, left: 3, fontSize: 9, fontWeight: '700', opacity: 0.7,
  },
  coordFile: {
    position: 'absolute', bottom: 1, right: 3, fontSize: 9, fontWeight: '700', opacity: 0.7,
  },
  arrowShaft: {
    position: 'absolute', height: 6, borderRadius: 3,
    backgroundColor: 'rgba(240,180,41,0.9)', transformOrigin: '0 50%',
  },
  arrowHead: {
    position: 'absolute', width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 16,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(240,180,41,0.95)',
  },
  lesson: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginTop: 16,
  },
  lessonTitle: { color: INK, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  lessonBody: { color: '#c3ccd6', fontSize: 13, lineHeight: 20 },
  lessonMoves: { color: GOLD, fontSize: 12, fontWeight: '600', marginTop: 8, lineHeight: 18 },
  resetBtn: { alignItems: 'center', paddingVertical: 16 },
  resetText: { color: DIM, fontSize: 13, fontWeight: '600' },
});

