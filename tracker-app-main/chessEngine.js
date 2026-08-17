// Deliberately a teaching engine, not a competition one. It covers the
// rules a beginner meets first — how each piece moves, captures, blocked
// paths, and check — and leaves out castling, en passant, and promotion
// choice. Those are worth adding once the basics are solid; bolting them
// on now would make the code far harder to follow for no early benefit.

export const EMPTY = null;

// Board is a flat 64-array, index 0 = a8 (top-left as White sees it),
// index 63 = h1. Pieces are objects: { type: 'p'|'n'|'b'|'r'|'q'|'k', color: 'w'|'b' }.
export function initialBoard() {
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const b = new Array(64).fill(EMPTY);
  for (let i = 0; i < 8; i++) {
    b[i] = { type: back[i], color: 'b' };
    b[8 + i] = { type: 'p', color: 'b' };
    b[48 + i] = { type: 'p', color: 'w' };
    b[56 + i] = { type: back[i], color: 'w' };
  }
  return b;
}

export const PIECE_GLYPH = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

export const PIECE_NAME = {
  p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King',
};

// How each piece moves, in plain language — this is the actual teaching
// content, shown when a piece is selected.
export const PIECE_LESSON = {
  p: 'Moves forward one square, or two on its very first move. Captures diagonally, never straight ahead — so a pawn directly in front of another blocks it completely.',
  n: 'Moves in an L: two squares one way, then one square across. The only piece that jumps over others, which makes it strong in crowded positions.',
  b: 'Slides any distance diagonally. It stays on one colour for the whole game, so a bishop on light squares can never reach a dark one.',
  r: 'Slides any distance in straight lines — up, down, left, right. Strongest on open files with no pawns in the way.',
  q: 'Moves like a rook and bishop combined: any distance, any straight or diagonal line. The most powerful piece, so avoid bringing it out too early where it gets chased.',
  k: 'Moves one square in any direction. It can never move onto a square that is attacked, and you can never leave it in check.',
};

function rc(i) {
  return { r: Math.floor(i / 8), c: i % 8 };
}
function idx(r, c) {
  return r * 8 + c;
}
function inside(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function slide(board, from, dirs, color) {
  const out = [];
  const { r, c } = rc(from);
  dirs.forEach(([dr, dc]) => {
    let nr = r + dr;
    let nc = c + dc;
    while (inside(nr, nc)) {
      const t = idx(nr, nc);
      const occupant = board[t];
      if (!occupant) {
        out.push(t);
      } else {
        // Can capture an enemy, but the line stops either way.
        if (occupant.color !== color) out.push(t);
        break;
      }
      nr += dr;
      nc += dc;
    }
  });
  return out;
}

// Moves a piece can make ignoring whether it exposes its own king.
function pseudoMoves(board, from) {
  const piece = board[from];
  if (!piece) return [];
  const { r, c } = rc(from);
  const out = [];
  const enemy = piece.color === 'w' ? 'b' : 'w';

  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    const one = idx(r + dir, c);
    if (inside(r + dir, c) && !board[one]) {
      out.push(one);
      const two = idx(r + 2 * dir, c);
      if (r === startRow && !board[two]) out.push(two);
    }
    [-1, 1].forEach((dc) => {
      const nr = r + dir;
      const nc = c + dc;
      if (!inside(nr, nc)) return;
      const t = idx(nr, nc);
      if (board[t] && board[t].color === enemy) out.push(t);
    });
    return out;
  }

  if (piece.type === 'n') {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (!inside(nr, nc)) return;
      const t = idx(nr, nc);
      if (!board[t] || board[t].color === enemy) out.push(t);
    });
    return out;
  }

  if (piece.type === 'k') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (!inside(nr, nc)) return;
      const t = idx(nr, nc);
      if (!board[t] || board[t].color === enemy) out.push(t);
    });
    return out;
  }

  const diag = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const straight = [[-1,0],[1,0],[0,-1],[0,1]];
  if (piece.type === 'b') return slide(board, from, diag, piece.color);
  if (piece.type === 'r') return slide(board, from, straight, piece.color);
  if (piece.type === 'q') return slide(board, from, diag.concat(straight), piece.color);
  return out;
}

export function findKing(board, color) {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.type === 'k' && p.color === color) return i;
  }
  return -1;
}

export function isSquareAttacked(board, square, byColor) {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.color !== byColor) continue;
    if (pseudoMoves(board, i).includes(square)) return true;
  }
  return false;
}

export function inCheck(board, color) {
  const k = findKing(board, color);
  if (k < 0) return false;
  return isSquareAttacked(board, k, color === 'w' ? 'b' : 'w');
}

export function applyMove(board, from, to) {
  const next = board.slice();
  const piece = next[from];
  next[to] = piece;
  next[from] = EMPTY;
  // Auto-queen: choosing a piece is a rule beginners rarely need, and
  // promoting to anything else is vanishingly rare in practice.
  if (piece && piece.type === 'p') {
    const { r } = rc(to);
    if ((piece.color === 'w' && r === 0) || (piece.color === 'b' && r === 7)) {
      next[to] = { type: 'q', color: piece.color };
    }
  }
  return next;
}

// Pseudo-moves filtered so you can never leave your own king in check —
// which is also how a beginner learns pins without being told about them.
export function legalMoves(board, from) {
  const piece = board[from];
  if (!piece) return [];
  return pseudoMoves(board, from).filter(
    (to) => !inCheck(applyMove(board, from, to), piece.color)
  );
}

export function allLegalMoves(board, color) {
  const moves = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.color !== color) continue;
    legalMoves(board, i).forEach((to) => moves.push({ from: i, to }));
  }
  return moves;
}

export function gameStatus(board, turn) {
  const moves = allLegalMoves(board, turn);
  if (moves.length) return inCheck(board, turn) ? 'check' : 'playing';
  return inCheck(board, turn) ? 'checkmate' : 'stalemate';
}

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Opponent for practice: prefers the most valuable capture available,
// otherwise plays at random. Weak on purpose — the point is to have
// something that moves back while you learn how the pieces work.
export function pickReplyMove(board, color) {
  const moves = allLegalMoves(board, color);
  if (!moves.length) return null;
  let best = null;
  let bestVal = -1;
  moves.forEach((m) => {
    const target = board[m.to];
    const val = target ? VALUE[target.type] || 0 : 0;
    if (val > bestVal) {
      bestVal = val;
      best = m;
    }
  });
  if (bestVal > 0) return best;
  return moves[Math.floor(Math.random() * moves.length)];
}

export function squareName(i) {
  const { r, c } = rc(i);
  return 'abcdefgh'[c] + (8 - r);
}

