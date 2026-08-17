import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import { applyXPDelta } from './leveling';
import {
  HABIT_POINTS,
  habitDaysLabel,
  habitScheduledOn,
  habitDoneOn,
  todayDateKey,
  toggleHabitCompletion,
  formatTimeDisplay,
} from './habitUtils';
import { cancelTodayForHabit, scheduleTodoNotification, cancelTodoNotification } from './notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import CalendarGrid from './CalendarGrid';

export default function CalendarScreen({ data, habits, setHabits, level, setLevel, rewardPoints, setRewardPoints, hero, setHero, calendarViewMode, todoItems, setTodoItems, bodyRoutines, setBodyRoutines, onOpenHabit, bills, onOpenDating }) {
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [datingOpen, setDatingOpen] = useState(false);
  const [todoDraft, setTodoDraft] = useState('');
  const [todoReminderTime, setTodoReminderTime] = useState('');
  const [showTodoTimePicker, setShowTodoTimePicker] = useState(false);

  function timeStringToDate(timeStr) {
    const d = new Date();
    if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    return d;
  }
  function dateToTimeString(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  async function addTodo() {
    const text = todoDraft.trim();
    if (!text) return;
    const id = 'td' + Date.now() + Math.random().toString(36).slice(2, 8);
    // Reminders are for today's to-do list, so a reminder time defaults
    // to today's date - if that time's already passed today,
    // scheduleTodoNotification's own guard just skips it rather than
    // firing immediately or erroring.
    const dueDate = todoReminderTime ? todayDateKey() : '';
    const newTodo = {
      id,
      text,
      dueDate,
      reminderTime: todoReminderTime,
      notes: '',
      done: false,
      addedAt: Date.now(),
      reminderNotificationId: null,
    };
    if (todoReminderTime) {
      newTodo.reminderNotificationId = await scheduleTodoNotification(newTodo);
    }
    setTodoItems((prev) => [...(prev || []), newTodo]);
    setTodoDraft('');
    setTodoReminderTime('');
    setTodoModalOpen(false);
  }

  const recipeInventory = data.inventory || [];
  const datingPlaces = data.datingPlaces || [];

  const now = new Date();
  const todayKey = todayDateKey();
  const dow = now.getDay();

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const todayMidnight = new Date(todayKey + 'T00:00:00');
  const expiring = recipeInventory
    .filter((it) => it.expDate)
    .map((it) => {
      const daysLeft = Math.round(
        (new Date(it.expDate + 'T00:00:00') - todayMidnight) / 86400000
      );
      return { it, daysLeft };
    })
    .filter((e) => e.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const todaysHabits = (habits || []).filter((h) => habitScheduledOn(h, dow));
  const pendingHabits = todaysHabits.filter((h) => !habitDoneOn(h, todayKey));
  const doneCount = todaysHabits.length - pendingHabits.length;

  // Bills whose due day is today or within the next 3 days, so a
  // payment doesn't quietly arrive unnoticed.
  const todayDom = now.getDate();
  const dueBills = (bills || [])
    .filter((b) => b.dueDay > 0)
    .map((b) => {
      let inDays = b.dueDay - todayDom;
      if (inDays < 0) {
        const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        inDays += dim;
      }
      return { bill: b, inDays };
    })
    .filter((x) => x.inDays <= 3)
    .sort((a, b) => a.inDays - b.inDays);

  // Everything still open, dated or not — the calendar is where the day
  // gets planned, so an undated task shouldn't be invisible here.
  const openTodos = (todoItems || [])
    .filter((t) => !t.done)
    .sort((a, b) => {
      const ad = a.dueDate || '9999';
      const bd = b.dueDate || '9999';
      return ad.localeCompare(bd);
    });
  const dueTodos = openTodos.filter((t) => t.dueDate && t.dueDate <= todayKey);
  const laterTodos = openTodos.filter((t) => !t.dueDate || t.dueDate > todayKey);

  const todaysRoutines = (bodyRoutines || []).filter(
    (r) => Array.isArray(r.days) && r.days.includes(dow)
  );

  function toggleRoutine(r) {
    setBodyRoutines((prev) =>
      prev.map((x) => {
        if (x.id !== r.id) return x;
        const doneDates = { ...(x.doneDates || {}) };
        if (doneDates[todayKey]) delete doneDates[todayKey];
        else doneDates[todayKey] = true;
        return { ...x, doneDates };
      })
    );
  }

  function toggleTodo(t) {
    const newDone = !t.done;
    if (newDone) {
      // Cancel the pending reminder once it's checked off - no point
      // getting reminded about something already done, same as habits.
      cancelTodoNotification(t);
    }
    setTodoItems((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, done: newDone } : x))
    );
  }

  function toggleHabit(habit) {
    const newDone = toggleHabitCompletion(habit, {
      setHabits,
      setLevel,
      setRewardPoints,
      setHero,
      applyXPDelta,
      HABIT_POINTS,
    });
    if (newDone) {
      cancelTodayForHabit(habit, todayKey).then((remaining) => {
        setHabits((prev) =>
          prev.map((h) => (h.id === habit.id ? { ...h, scheduledNotifications: remaining } : h))
        );
      });
    }
  }

  const HOURS_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  function isPlaceOpenNow(place) {
    if (!place.hours || typeof place.hours !== 'object') return false;
    const key = HOURS_KEYS[now.getDay()];
    const day = place.hours[key];
    if (!day || day.closed || !day.open || !day.close) return false;
    const [oh, om] = day.open.split(':').map(Number);
    const [ch, cm] = day.close.split(':').map(Number);
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    if (closeMins > openMins) return nowMins >= openMins && nowMins < closeMins;
    return nowMins >= openMins || nowMins < closeMins;
  }

  const term = search.trim().toLowerCase();
  let placesToShow = [];
  let placesHeader = '';
  if (term) {
    placesToShow = datingPlaces.filter((p) =>
      (p.location || '').toLowerCase().includes(term)
    );
    placesHeader = `Places matching "${search.trim()}"`;
  } else {
    const openNow = datingPlaces.filter((p) => isPlaceOpenNow(p));
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    const scheduledToday = datingPlaces.filter((p) => {
      if (!p.dateTime) return false;
      const t = new Date(p.dateTime).getTime();
      return !isNaN(t) && t >= startOfDay && t < endOfDay;
    });
    if (openNow.length) {
      placesToShow = openNow;
      placesHeader = 'Open Right Now';
    } else if (scheduledToday.length) {
      placesToShow = scheduledToday;
      placesHeader = 'Scheduled Today';
    }
  }

  return (
    <ScrollView contentContainerStyle={shared.container}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={shared.h1}>Calendar</Text>
          <Text style={shared.tagline}>
            {dateLabel} • {timeLabel}
          </Text>
        </View>
        {onOpenDating ? (
          <TouchableOpacity
            onPress={() => setDatingOpen(true)}
            style={{
              backgroundColor: CARD,
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 7,
              marginTop: 4,
            }}
          >
            <Text style={{ color: INK, fontSize: 13, fontWeight: '700' }}>💕 Dating</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {calendarViewMode === 'grid' ? (
        <CalendarGrid
          habits={habits}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      ) : null}

      {expiring.length > 0 && (
        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>Expiring Soon</Text>
            <View style={shared.countBadge}>
              <Text style={shared.countBadgeText}>{expiring.length}</Text>
            </View>
          </View>
          {expiring.map(({ it, daysLeft }) => {
            let label, color;
            if (daysLeft < 0) {
              label = 'Expired';
              color = ROSE;
            } else if (daysLeft === 0) {
              label = 'Today';
              color = ROSE;
            } else if (daysLeft === 1) {
              label = 'Tomorrow';
              color = GOLD;
            } else {
              label = `In ${daysLeft}d`;
              color = GOLD;
            }
            return (
              <TouchableOpacity key={it.id} style={shared.row}>
                {it.image ? (
                  <Image source={{ uri: it.image }} style={shared.thumb44} />
                ) : null}
                <Text style={shared.rowName}>{it.name}</Text>
                <Text style={[shared.rowRight, { color }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {dueBills.length > 0 && (
        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>Bills Due</Text>
            <View style={shared.countBadge}>
              <Text style={shared.countBadgeText}>{dueBills.length}</Text>
            </View>
          </View>
          {dueBills.map(({ bill, inDays }) => (
            <View key={bill.id} style={shared.row}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>💵</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: INK, fontWeight: '500' }}>{bill.name}</Text>
                <Text style={{ fontSize: 12, color: inDays === 0 ? ROSE : DIM, marginTop: 2 }}>
                  {inDays === 0 ? 'Due today' : `Due in ${inDays} day${inDays === 1 ? '' : 's'}`}
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: INK, fontWeight: '700' }}>
                {Number(bill.amount || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {dueTodos.length > 0 && (
        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>Due Today</Text>
            <View style={shared.countBadge}>
              <Text style={shared.countBadgeText}>{dueTodos.length}</Text>
            </View>
          </View>
          {dueTodos.map((t) => (
            <TouchableOpacity key={t.id} style={shared.row} onPress={() => toggleTodo(t)}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: t.dueDate < todayKey ? ROSE : GOLD,
                  marginRight: 10,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: INK, fontWeight: '500' }}>{t.text}</Text>
                {t.dueDate < todayKey ? (
                  <Text style={{ fontSize: 12, color: ROSE, marginTop: 2 }}>Overdue</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {todaysRoutines.length > 0 && (
        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>Self Care</Text>
            <View style={shared.countBadge}>
              <Text style={shared.countBadgeText}>
                {todaysRoutines.filter((r) => (r.doneDates || {})[todayKey]).length}/
                {todaysRoutines.length}
              </Text>
            </View>
          </View>
          {todaysRoutines.map((r) => {
            const done = !!(r.doneDates || {})[todayKey];
            return (
              <TouchableOpacity key={r.id} style={shared.row} onPress={() => toggleRoutine(r)}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: GOLD,
                    backgroundColor: done ? GOLD : 'transparent',
                    marginRight: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {done ? <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: done ? DIM : INK,
                      fontWeight: '500',
                      textDecorationLine: done ? 'line-through' : 'none',
                    }}
                  >
                    {r.name}
                  </Text>
                  {(r.steps || []).length ? (
                    <Text style={{ fontSize: 12, color: DIM, marginTop: 2 }}>
                      {r.steps.length} step{r.steps.length === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                </View>
                {r.time ? (
                  <Text style={{ fontSize: 12, color: DIM }}>{formatTimeDisplay(r.time)}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>To Do</Text>
            <TouchableOpacity onPress={() => setTodoModalOpen(true)}>
              <Text style={{ color: GOLD, fontWeight: '700', fontSize: 14 }}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {laterTodos.length === 0 ? (
            <Text style={shared.tagline}>Nothing pending. Tap + Add to jot something down.</Text>
          ) : null}
          {laterTodos.map((t) => (
            <TouchableOpacity key={t.id} style={shared.row} onPress={() => toggleTodo(t)}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: GOLD,
                  marginRight: 10,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: INK, fontWeight: '500' }}>{t.text}</Text>
                {t.dueDate ? (
                  <Text style={{ fontSize: 12, color: DIM, marginTop: 2 }}>{t.dueDate}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
      </View>

      {todaysHabits.length > 0 && (
        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>Today's Habits</Text>
            <View style={shared.countBadge}>
              <Text style={shared.countBadgeText}>
                {doneCount}/{todaysHabits.length}
              </Text>
            </View>
          </View>
          {pendingHabits.length === 0 ? (
            <Text style={shared.tagline}>🎉 All habits done for today.</Text>
          ) : (
            pendingHabits.map((h) => {
              // Reading/selfcare/cardistry already have full session
              // screens wired up in HabitsDetailScreen.js (same as
              // workout/breathing) - this check just wasn't listing them,
              // so they fell back to a plain checkbox instead of the
              // "tap to start" treatment they're actually built for.
              const autoTracked =
                !!h.linkedContent ||
                h.sessionType === 'breathing' ||
                h.sessionType === 'workout' ||
                h.sessionType === 'reading' ||
                h.sessionType === 'selfcare' ||
                h.sessionType === 'cardistry';
              return (
                <TouchableOpacity
                  key={h.id}
                  style={shared.row}
                  onPress={() => {
                    // Auto-tracked habits have a session to actually do, so
                    // jump into it rather than silently ticking the box.
                    if (autoTracked && onOpenHabit) onOpenHabit(h.id);
                    else toggleHabit(h);
                  }}
                  activeOpacity={0.6}
                >
                  {autoTracked ? (
                    <Text style={{ fontSize: 16, marginRight: 10 }}>
                      {h.linkedContent
                        ? '🔗'
                        : h.sessionType === 'workout'
                        ? '🏋️'
                        : h.sessionType === 'reading'
                        ? '📖'
                        : h.sessionType === 'selfcare'
                        ? '🧖'
                        : h.sessionType === 'cardistry'
                        ? '🎴'
                        : '🧘'}
                    </Text>
                  ) : (
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: GOLD,
                        marginRight: 10,
                      }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: INK, fontWeight: '500' }}>
                      {h.text}
                    </Text>
                    <Text style={{ fontSize: 12, color: DIM, marginTop: 2 }}>
                      {autoTracked
                        ? 'Tap to start'
                        : habitDaysLabel(h)}
                    </Text>
                  </View>
                  {h.time ? (
                    <Text style={{ fontSize: 12, color: DIM }}>
                      {formatTimeDisplay(h.time)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      <Modal
        visible={datingOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDatingOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: CARD,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: INK, marginBottom: 4 }}>
              Open right now
            </Text>
            <Text style={[shared.tagline, { marginBottom: 12 }]}>
              Based on the opening hours saved for each place.
            </Text>
            <ScrollView>
              {(() => {
                const open = datingPlaces.filter((p) => isPlaceOpenNow(p));
                if (!datingPlaces.length) {
                  return (
                    <Text style={shared.tagline}>
                      No dating places saved yet. Add some under Information →
                      Dating and their hours will show up here.
                    </Text>
                  );
                }
                if (!open.length) {
                  return (
                    <Text style={shared.tagline}>
                      Nothing open at the moment. Places without saved hours
                      won't appear here either.
                    </Text>
                  );
                }
                return open.map((p) => (
                  <View key={p.id} style={shared.row}>
                    {p.image ? (
                      <Image source={{ uri: p.image }} style={shared.thumb66} />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={shared.rowName}>{p.name}</Text>
                      {p.location ? (
                        <Text style={{ fontSize: 12, color: DIM, marginTop: 2 }}>
                          {p.location}
                        </Text>
                      ) : null}
                    </View>
                    {p.cost ? (
                      <Text style={{ color: GOLD, fontSize: 13, fontWeight: '700' }}>
                        {p.cost}
                      </Text>
                    ) : null}
                  </View>
                ));
              })()}
            </ScrollView>
            {onOpenDating ? (
              <TouchableOpacity
                style={{ paddingVertical: 14, alignItems: 'center' }}
                onPress={() => {
                  setDatingOpen(false);
                  onOpenDating();
                }}
              >
                <Text style={{ color: GOLD, fontSize: 14, fontWeight: '700' }}>
                  Open Dating
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={{ paddingVertical: 10, alignItems: 'center' }}
              onPress={() => setDatingOpen(false)}
            >
              <Text style={{ color: DIM, fontSize: 14 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={todoModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTodoModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: CARD,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 40,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12 }}>
              Add To Do
            </Text>
            <TextInput
              style={{
                backgroundColor: '#232d3a',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
                color: INK,
              }}
              value={todoDraft}
              onChangeText={setTodoDraft}
              placeholder="What needs doing?"
              placeholderTextColor="#9aa5b1"
              autoFocus
            />

            <TouchableOpacity
              style={{
                backgroundColor: '#232d3a',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginTop: 10,
              }}
              onPress={() => setShowTodoTimePicker(true)}
            >
              <Text style={{ color: todoReminderTime ? INK : '#9aa5b1', fontSize: 14 }}>
                {todoReminderTime ? `⏰ Remind me at ${formatTimeDisplay(todoReminderTime)}` : 'Set a reminder (optional)'}
              </Text>
            </TouchableOpacity>
            {todoReminderTime ? (
              <TouchableOpacity style={{ paddingVertical: 8 }} onPress={() => setTodoReminderTime('')}>
                <Text style={{ color: ROSE, fontSize: 12, fontWeight: '600' }}>Clear reminder</Text>
              </TouchableOpacity>
            ) : null}
            {showTodoTimePicker ? (
              <DateTimePicker
                value={timeStringToDate(todoReminderTime)}
                mode="time"
                is24Hour={false}
                onChange={(event, selectedDate) => {
                  setShowTodoTimePicker(false);
                  if (event.type !== 'dismissed' && selectedDate) {
                    setTodoReminderTime(dateToTimeString(selectedDate));
                  }
                }}
              />
            ) : null}

            <TouchableOpacity
              style={{
                backgroundColor: GOLD,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 18,
              }}
              onPress={addTodo}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 12, alignItems: 'center' }}
              onPress={() => {
                setTodoModalOpen(false);
                setTodoReminderTime('');
              }}
            >
              <Text style={{ color: DIM, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

