// A structured lesson path replacing the old "watch a video" habit flow.
// Reuses the existing chessEngine and ChessBoard directly — this file is
// just the sequence and the teaching text, expanded from the short
// PIECE_LESSON strings already in chessEngine.js. Each lesson embeds the
// real interactive board (chessEngine handles legality), not a video.

export const CHESS_LESSONS = [
  {
    id: 'pawn',
    piece: 'p',
    title: 'The Pawn',
    icon: '♙',
    boardMode: 'learn',
    moveThreshold: 3,
    intro:
      "The pawn only moves forward — one square at a time, or two on its very first move from its starting row. It captures diagonally instead, which trips almost everyone up at first: a pawn sitting directly in front of another pawn is completely stuck, blocked, even though it could normally move there.\n\nTap a few pawns on the board below and watch how their legal moves change once another piece is in the way.",
    task: 'Move a pawn at least 3 times to feel out how it advances and captures.',
  },
  {
    id: 'knight',
    piece: 'n',
    title: 'The Knight',
    icon: '♘',
    boardMode: 'learn',
    moveThreshold: 3,
    intro:
      "The knight moves in an L shape — two squares in one direction, then one square to the side. It's the only piece that jumps clean over anything in its path, which makes it especially strong in cluttered positions where sliding pieces get stuck.\n\nTap a knight and notice its move pattern stays the same shape no matter where it stands on the board.",
    task: 'Move a knight at least 3 times to get a feel for the L-shaped jump.',
  },
  {
    id: 'bishop',
    piece: 'b',
    title: 'The Bishop',
    icon: '♗',
    boardMode: 'learn',
    moveThreshold: 3,
    intro:
      "The bishop slides diagonally, any distance, in a straight line. Because of that, a bishop starting on a light square can only ever reach light squares — it never changes color for the entire game. That's why strong players usually think of "
      + "their two bishops as covering different halves of the board.",
    task: 'Move a bishop at least 3 times and notice it never leaves its color.',
  },
  {
    id: 'rook',
    piece: 'r',
    title: 'The Rook',
    icon: '♖',
    boardMode: 'learn',
    moveThreshold: 3,
    intro:
      'The rook slides any distance in a straight line — up, down, left, or right, never diagonally. It tends to be strongest later in the game, once files (the vertical lines) open up and there are fewer pawns blocking its path.',
    task: 'Move a rook at least 3 times to explore its straight-line reach.',
  },
  {
    id: 'queen',
    piece: 'q',
    title: 'The Queen',
    icon: '♕',
    boardMode: 'learn',
    moveThreshold: 3,
    intro:
      "The queen combines the rook and bishop: any distance, in a straight or diagonal line. It's the most powerful piece on the board by a wide margin — which is exactly why bringing it out too early is a common beginner mistake. An exposed queen gets chased around by cheaper pieces, costing time you can't get back.",
    task: 'Move the queen at least 3 times to see how much of the board it covers.',
  },
  {
    id: 'king',
    piece: 'k',
    title: 'The King',
    icon: '♔',
    boardMode: 'learn',
    moveThreshold: 3,
    intro:
      'The king moves one square in any direction — but never onto a square that is under attack, and it can never be left in check. Protecting the king matters more than any material advantage: lose it (checkmate) and the game ends immediately, regardless of what else is on the board.',
    task: 'Move the king a few times to feel how restricted — and how important — it is.',
  },
  {
    id: 'check',
    title: 'Check and Checkmate',
    icon: '♚',
    boardMode: 'learn',
    moveThreshold: 0,
    intro:
      "Check means the king is under attack right now and must be dealt with immediately — by moving it to safety, blocking the attack, or capturing the attacking piece. Checkmate means none of those options exist: the king is attacked and cannot escape. That's the actual end of the game, not just a threat.\n\nStalemate is different and easy to confuse with checkmate: it's when the player to move has no legal move at all, but their king isn't in check. That ends the game as a draw, not a win.\n\nNo move requirement for this one — just read it over, then continue whenever you're ready.",
    task: 'Read through, then continue when ready.',
  },
  {
    id: 'practice',
    title: 'Play a Practice Game',
    icon: '🏆',
    boardMode: 'play',
    moveThreshold: 8,
    intro:
      "Now put it together. You play White against a deliberately weak opponent — enough resistance to practice against while the rules are still settling in, not enough to be discouraging. Play until checkmate, stalemate, or at least 8 moves in, whichever comes first.",
    task: 'Play at least 8 moves, or through to the end of the game.',
  },
];

export function chessLessonProgress(mastered) {
  const done = CHESS_LESSONS.filter((l) => mastered[l.id]).length;
  return { done, total: CHESS_LESSONS.length, complete: done === CHESS_LESSONS.length };
}

export function nextChessLesson(mastered) {
  return CHESS_LESSONS.find((l) => !mastered[l.id]) || null;
}
