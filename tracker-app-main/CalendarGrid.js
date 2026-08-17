import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GOLD, INK, DIM, CARD, BORDER } from './theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ROWS = 6;
const COLS = 7;

function todayKey() {
  const dt = new Date();
  // Local date, not UTC - see habitUtils.localDateKey.
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function dateKeyFor(year, month, day) {
  const d = new Date(year, month, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// A real month grid — fixed 6x7 rectangle every month (so the layout
// never reflows), gridlines between cells, day numbers in the top-left
// corner, and adjacent months' overflow days shown dimmed rather than
// left blank, matching how Google/Apple Calendar lay a month out.
export default function CalendarGrid({ habits, selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) {
    cells.push({ day: daysInPrevMonth - startDow + 1 + i, inMonth: false, monthOffset: -1 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, monthOffset: 0 });
  }
  let nextDay = 1;
  while (cells.length < ROWS * COLS) {
    cells.push({ day: nextDay++, inMonth: false, monthOffset: 1 });
  }

  function goPrevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function goNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    setViewDate(new Date());
    onSelectDate(todayKey());
  }

  function habitCountForDow(dow) {
    return (habits || []).filter((h) => !h.days || !h.days.length || h.days.includes(dow)).length;
  }

  const today = todayKey();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToday}>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month]} {year}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNextMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LETTERS.map((l, i) => (
          <Text key={i} style={styles.weekdayText}>{l}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, i) => {
          const cellMonth = month + cell.monthOffset;
          const key = dateKeyFor(year, cellMonth, cell.day);
          const isToday = key === today;
          const isSelected = key === selectedDate;
          const dow = new Date(year, cellMonth, cell.day).getDay();
          const hasHabits = cell.inMonth && habitCountForDow(dow) > 0;
          const isLastCol = (i + 1) % 7 === 0;
          const isLastRow = i >= ROWS * COLS - COLS;
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                !isLastCol && styles.cellBorderRight,
                !isLastRow && styles.cellBorderBottom,
              ]}
              onPress={() => cell.inMonth && onSelectDate(key)}
              activeOpacity={cell.inMonth ? 0.6 : 1}
            >
              <View style={[styles.dayNumWrap, isToday && styles.dayNumWrapToday]}>
                <Text
                  style={[
                    styles.dayNumText,
                    !cell.inMonth && styles.dayNumTextDim,
                    isToday && styles.dayNumTextToday,
                    isSelected && !isToday && styles.dayNumTextSelected,
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
              {hasHabits ? <View style={styles.dot} /> : null}
              {isSelected && !isToday ? <View style={styles.selectedRing} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingTop: 14,
    paddingHorizontal: 10,
    paddingBottom: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  navBtn: { paddingHorizontal: 14, paddingVertical: 4 },
  navBtnText: { color: GOLD, fontSize: 24, fontWeight: '700' },
  monthLabel: { color: INK, fontSize: 16, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', marginBottom: 2 },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: DIM,
    fontSize: 11,
    fontWeight: '700',
    paddingBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
  },
  cell: {
    width: `${100 / 7}%`,
    height: 52,
    paddingTop: 4,
    paddingLeft: 5,
    alignItems: 'flex-start',
  },
  cellBorderRight: { borderRightWidth: 1, borderRightColor: BORDER },
  cellBorderBottom: { borderBottomWidth: 1, borderBottomColor: BORDER },
  dayNumWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumWrapToday: { backgroundColor: GOLD },
  dayNumText: { fontSize: 13, color: INK, fontWeight: '600' },
  dayNumTextDim: { color: DIM, opacity: 0.4 },
  dayNumTextToday: { color: '#fff', fontWeight: '800' },
  dayNumTextSelected: { color: GOLD, fontWeight: '800' },
  selectedRing: {
    position: 'absolute',
    top: 3,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 3,
    marginLeft: 9,
  },
});

