// One place to compute "how far through this book" so the shelf and the
// reader agree on the number. Text progress needs pageCount, which is only
// known once the file has actually been opened and paginated once —
// ReadingSession persists it back onto the book the first time it loads.
export function bookProgressPct(book) {
  if (!book) return 0;
  if (book.kind === 'audio') {
    if (!book.durationMs) return 0;
    return Math.min(100, Math.round(((book.positionMs || 0) / book.durationMs) * 100));
  }
  if (!book.pageCount) return 0;
  return Math.min(100, Math.round((((book.page || 0) + 1) / book.pageCount) * 100));
}

export function bookIsFinished(book) {
  return bookProgressPct(book) >= 100;
}
