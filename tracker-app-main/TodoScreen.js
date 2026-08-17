import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';
import DateTimePicker from '@react-native-community/datetimepicker';

function makeId(prefix = 'td') {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TodoScreen({ todoItems, setTodoItems }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ text: '', dueDate: '', notes: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);

  function openAdd() {
    setEditingId(null);
    setDraft({ text: '', dueDate: '', notes: '' });
    setModalOpen(true);
  }

  function openEdit(t) {
    setEditingId(t.id);
    setDraft({ text: t.text, dueDate: t.dueDate || '', notes: t.notes || '' });
    setModalOpen(true);
  }

  function toggleDone(t) {
    setTodoItems((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
    );
  }

  function save() {
    const text = draft.text.trim();
    if (!text) {
      Alert.alert('Text required', 'What do you need to do?');
      return;
    }
    if (editingId) {
      setTodoItems((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, text, dueDate: draft.dueDate.trim(), notes: draft.notes.trim() }
            : t
        )
      );
    } else {
      setTodoItems((prev) => [
        ...prev,
        {
          id: makeId(),
          text,
          dueDate: draft.dueDate.trim(),
          notes: draft.notes.trim(),
          done: false,
          addedAt: Date.now(),
        },
      ]);
    }
    setModalOpen(false);
  }

  function deleteItem() {
    setTodoItems((prev) => prev.filter((t) => t.id !== editingId));
    setModalOpen(false);
  }

  const sorted = [...todoItems].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return (b.addedAt || 0) - (a.addedAt || 0);
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>To Do</Text>
        <Text style={shared.tagline}>Things to do</Text>

        {sorted.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              Nothing on your list
            </Text>
            <Text style={shared.tagline}>
              Tap + to add something you need to get done.
            </Text>
          </View>
        ) : (
          <View style={shared.block}>
            {sorted.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.row}
                onPress={() => openEdit(t)}
              >
                <TouchableOpacity onPress={() => toggleDone(t)}>
                  <View style={[styles.checkbox, t.done && styles.checkboxDone]}>
                    {t.done ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.text, t.done && styles.textDone]}>
                    {t.text}
                  </Text>
                  {t.dueDate ? (
                    <Text style={styles.due}>{formatDateDisplay(t.dueDate)}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingId ? 'Edit To Do' : 'Add To Do'}
              </Text>

              <Text style={styles.label}>What needs to get done?</Text>
              <TextInput
                style={styles.input}
                value={draft.text}
                onChangeText={(v) => setDraft((d) => ({ ...d, text: v }))}
                placeholder="Task"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Due Date (optional)</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: draft.dueDate ? INK : '#9aa5b1', fontSize: 15 }}>
                  {draft.dueDate ? formatDateDisplay(draft.dueDate) : 'Set a due date'}
                </Text>
              </TouchableOpacity>
              {draft.dueDate ? (
                <TouchableOpacity
                  style={{ alignItems: 'center', marginTop: 6 }}
                  onPress={() => setDraft((d) => ({ ...d, dueDate: '' }))}
                >
                  <Text style={{ fontSize: 12, color: DIM }}>Clear date</Text>
                </TouchableOpacity>
              ) : null}
              {showDatePicker ? (
                <DateTimePicker
                  value={draft.dueDate ? new Date(draft.dueDate + 'T00:00:00') : new Date()}
                  mode="date"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (event.type !== 'dismissed' && selectedDate) {
                      const y = selectedDate.getFullYear();
                      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const d = String(selectedDate.getDate()).padStart(2, '0');
                      setDraft((prev) => ({ ...prev, dueDate: `${y}-${m}-${d}` }));
                    }
                  }}
                />
              ) : null}

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={draft.notes}
                onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Save Changes' : 'Add'}
                </Text>
              </TouchableOpacity>
              {editingId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteItem}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: GOLD },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  text: { fontSize: 15, color: INK },
  textDone: { color: DIM, textDecorationLine: 'line-through' },
  due: { fontSize: 11, color: DIM, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '400', marginTop: -2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
});

