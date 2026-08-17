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
import { LinearGradient } from 'expo-linear-gradient';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

function makeId(prefix = 'bill') {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly', perMonth: 1 },
  { id: 'weekly', label: 'Weekly', perMonth: 52 / 12 },
  { id: 'fortnightly', label: 'Fortnightly', perMonth: 26 / 12 },
  { id: 'yearly', label: 'Yearly', perMonth: 1 / 12 },
];

// Everything is normalised to a monthly figure so income, bills, and
// goal contributions can actually be compared. A yearly insurance
// premium and a weekly shop are not otherwise comparable numbers.
function monthlyAmount(bill) {
  const f = FREQUENCIES.find((x) => x.id === bill.frequency) || FREQUENCIES[0];
  return (Number(bill.amount) || 0) * f.perMonth;
}

function ordinal(d) {
  if (d === 1 || d === 21 || d === 31) return 'st';
  if (d === 2 || d === 22) return 'nd';
  if (d === 3 || d === 23) return 'rd';
  return 'th';
}

export default function SavingsScreen({
  savingsGoals,
  setSavingsGoals,
  bills,
  setBills,
  debts,
  setDebts,
  monthlyIncome,
  setMonthlyIncome,
  groceries,
  buylist,
  trips,
}) {
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState(null);
  const [billDraft, setBillDraft] = useState({ name: '', amount: '', frequency: 'monthly', dueDay: '' });
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState('');

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalDraft, setGoalDraft] = useState({ name: '', target: '', saved: '', monthly: '' });

  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState(null);
  const [debtDraft, setDebtDraft] = useState({ name: '', balance: '', apr: '', minPayment: '' });

  const billsList = bills || [];
  const goals = savingsGoals || [];
  const debtsList = debts || [];

  const income = Number(monthlyIncome) || 0;
  const billsTotal = billsList.reduce((n, b) => n + monthlyAmount(b), 0);
  const goalsTotal = goals.reduce((n, g) => n + (Number(g.monthly) || 0), 0);
  const debtsTotal = debtsList.reduce((n, d) => n + (Number(d.minPayment) || 0), 0);
  const free = income - billsTotal - goalsTotal - debtsTotal;

  // Real spending this month, pulled directly from what's already
  // tracked in Groceries/Buylist/Travel - not a separate manually-kept
  // total that could drift out of sync with the real data.
  function isThisMonth(dateValue) {
    if (!dateValue) return false;
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  const groceriesSpend = (groceries || []).reduce((sum, g) => {
    const thisMonthEntries = (g.priceHistory || []).filter((h) => isThisMonth(h.date));
    return sum + thisMonthEntries.reduce((s, h) => s + (Number(h.price) || 0), 0);
  }, 0);
  const buylistSpend = (buylist || []).reduce((sum, b) => {
    if (!isThisMonth(b.addedAt)) return sum;
    return sum + (parseFloat(b.price) || 0);
  }, 0);
  const travelSpend = (trips || []).reduce((sum, t) => {
    const items = t.items || [];
    return (
      sum +
      items.reduce((s, i) => {
        const thisMonthEntries = (i.priceHistory || []).filter((h) => isThisMonth(h.date));
        return s + thisMonthEntries.reduce((s2, h) => s2 + (Number(h.price) || 0), 0);
      }, 0)
    );
  }, 0);
  const spendingBreakdown = [
    { label: 'Bills', amount: billsTotal, color: '#e0a94b', icon: '📄' },
    { label: 'Debt payments', amount: debtsTotal, color: ROSE, icon: '💳' },
    { label: 'Groceries', amount: groceriesSpend, color: '#4fb894', icon: '🛒' },
    { label: 'Buylist', amount: buylistSpend, color: '#6db8f2', icon: '🛍️' },
    { label: 'Travel', amount: travelSpend, color: '#a678d4', icon: '✈️' },
  ];
  const spendingMax = Math.max(1, ...spendingBreakdown.map((s) => s.amount));

  function openDebtAdd() {
    setEditingDebtId(null);
    setDebtDraft({ name: '', balance: '', apr: '', minPayment: '' });
    setDebtModalOpen(true);
  }
  function openDebtEdit(d) {
    setEditingDebtId(d.id);
    setDebtDraft({
      name: d.name,
      balance: String(d.balance || ''),
      apr: String(d.apr || ''),
      minPayment: String(d.minPayment || ''),
    });
    setDebtModalOpen(true);
  }
  function saveDebt() {
    const name = debtDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'What is this debt for?');
      return;
    }
    const d = {
      id: editingDebtId || makeId('debt'),
      name,
      balance: Number(debtDraft.balance) || 0,
      apr: Number(debtDraft.apr) || 0,
      minPayment: Number(debtDraft.minPayment) || 0,
    };
    if (editingDebtId) {
      setDebts((prev) => prev.map((x) => (x.id === editingDebtId ? d : x)));
    } else {
      setDebts((prev) => [...prev, d]);
    }
    setDebtModalOpen(false);
  }
  function deleteDebt(id) {
    Alert.alert('Delete debt?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setDebts((prev) => prev.filter((x) => x.id !== id)) },
    ]);
  }

  function openBillAdd() {
    setEditingBillId(null);
    setBillDraft({ name: '', amount: '', frequency: 'monthly', dueDay: '' });
    setBillModalOpen(true);
  }
  function openBillEdit(b) {
    setEditingBillId(b.id);
    setBillDraft({
      name: b.name,
      amount: String(b.amount || ''),
      frequency: b.frequency || 'monthly',
      dueDay: String(b.dueDay || ''),
    });
    setBillModalOpen(true);
  }
  function saveBill() {
    const name = billDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'What is this bill for?');
      return;
    }
    const entry = {
      id: editingBillId || makeId(),
      name,
      amount: Number(billDraft.amount) || 0,
      frequency: billDraft.frequency,
      dueDay: Number(billDraft.dueDay) || 0,
    };
    setBills((prev) =>
      editingBillId
        ? (prev || []).map((b) => (b.id === editingBillId ? entry : b))
        : [...(prev || []), entry]
    );
    setBillModalOpen(false);
  }
  function deleteBill() {
    setBills((prev) => (prev || []).filter((b) => b.id !== editingBillId));
    setBillModalOpen(false);
  }

  function openGoalAdd() {
    setEditingGoalId(null);
    setGoalDraft({ name: '', target: '', saved: '', monthly: '' });
    setGoalModalOpen(true);
  }
  function openGoalEdit(g) {
    setEditingGoalId(g.id);
    setGoalDraft({
      name: g.name,
      target: String(g.target || ''),
      saved: String(g.saved || ''),
      monthly: String(g.monthly || ''),
    });
    setGoalModalOpen(true);
  }
  function saveGoal() {
    const name = goalDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'What are you saving for?');
      return;
    }
    const entry = {
      id: editingGoalId || makeId('goal'),
      name,
      target: Number(goalDraft.target) || 0,
      saved: Number(goalDraft.saved) || 0,
      monthly: Number(goalDraft.monthly) || 0,
    };
    setSavingsGoals((prev) =>
      editingGoalId
        ? (prev || []).map((g) => (g.id === editingGoalId ? entry : g))
        : [...(prev || []), entry]
    );
    setGoalModalOpen(false);
  }
  function deleteGoal() {
    setSavingsGoals((prev) => (prev || []).filter((g) => g.id !== editingGoalId));
    setGoalModalOpen(false);
  }

  const sortedBills = [...billsList].sort((a, b) => monthlyAmount(b) - monthlyAmount(a));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Money</Text>
        <Text style={shared.tagline}>Bills, goals, and what's actually left</Text>

        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#1f1a15', '#0c0a08']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.heroLabel}>FREE TO ALLOCATE</Text>
          <Text style={[styles.heroValue, free < 0 && styles.overspent]}>{money(free)}</Text>
          {free < 0 ? (
            <Text style={styles.warning}>
              You're committing {money(Math.abs(free))} more than you bring in.
              Reduce a goal contribution or cut a bill.
            </Text>
          ) : income > 0 && free > 0 ? (
            <Text style={styles.suggestion}>
              {money(free)} spare each month. Putting it toward a goal below would reach it sooner.
            </Text>
          ) : null}

          {income > 0 ? (
            <>
              <View style={styles.splitBar}>
                <View style={[styles.splitSeg, { flex: Math.max(billsTotal, 0), backgroundColor: ROSE }]} />
                <View style={[styles.splitSeg, { flex: Math.max(debtsTotal, 0), backgroundColor: '#c96a3e' }]} />
                <View style={[styles.splitSeg, { flex: Math.max(goalsTotal, 0), backgroundColor: GOLD }]} />
                <View style={[styles.splitSeg, { flex: Math.max(free, 0), backgroundColor: '#4f9e5c' }]} />
              </View>
              <View style={styles.legendRow}>
                <Text style={[styles.legend, { color: ROSE }]}>Bills</Text>
                <Text style={[styles.legend, { color: '#c96a3e' }]}>Debt</Text>
                <Text style={[styles.legend, { color: GOLD }]}>Goals</Text>
                <Text style={[styles.legend, { color: '#4f9e5c' }]}>Free</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.statTileRow}>
          <TouchableOpacity
            style={styles.statTile}
            onPress={() => {
              setIncomeDraft(String(income || ''));
              setIncomeOpen(true);
            }}
          >
            <Text style={styles.statTileIcon}>💰</Text>
            <Text style={styles.statTileLabel}>Monthly Income</Text>
            <Text style={styles.statTileValue}>{income ? money(income) : 'Tap to set'}</Text>
          </TouchableOpacity>
          <View style={styles.statTile}>
            <Text style={styles.statTileIcon}>📊</Text>
            <Text style={styles.statTileLabel}>Committed</Text>
            <Text style={styles.statTileValue}>{money(billsTotal + debtsTotal + goalsTotal)}</Text>
          </View>
        </View>

        <View style={shared.block}>
          <View style={styles.breakdownRowIcon}>
            <Text style={styles.rowIcon}>📄</Text>
            <Text style={styles.breakdownLabel}>Bills</Text>
            <Text style={styles.negative}>- {money(billsTotal)}</Text>
          </View>
          <View style={styles.breakdownRowIcon}>
            <Text style={styles.rowIcon}>💳</Text>
            <Text style={styles.breakdownLabel}>Debt payments</Text>
            <Text style={styles.negative}>- {money(debtsTotal)}</Text>
          </View>
          <View style={styles.breakdownRowIcon}>
            <Text style={styles.rowIcon}>🎯</Text>
            <Text style={styles.breakdownLabel}>Goal contributions</Text>
            <Text style={styles.negative}>- {money(goalsTotal)}</Text>
          </View>
        </View>

        <View style={shared.block}>
          <Text style={shared.blockTitle}>This Month's Spending</Text>
          <Text style={{ color: DIM, fontSize: 12, marginTop: 2, marginBottom: 12 }}>
            Pulled directly from Groceries, Buylist, and Travel - not a separate manual total.
          </Text>
          {spendingBreakdown.map((s) => (
            <View key={s.label} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                <Text style={{ fontSize: 14, marginRight: 6 }}>{s.icon}</Text>
                <Text style={{ color: INK, fontSize: 13, flex: 1 }}>{s.label}</Text>
                <Text style={{ color: s.color, fontSize: 13, fontWeight: '700' }}>{money(s.amount)}</Text>
              </View>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.max(2, (s.amount / spendingMax) * 100)}%`,
                    backgroundColor: s.color,
                    borderRadius: 5,
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>📄 Bills</Text>
            <TouchableOpacity onPress={openBillAdd}>
              <Text style={styles.addLink}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {sortedBills.length === 0 ? (
            <Text style={shared.tagline}>
              Add your recurring costs to see what they really take each month.
            </Text>
          ) : (
            sortedBills.map((b) => {
              const freq = FREQUENCIES.find((f) => f.id === b.frequency) || FREQUENCIES[0];
              return (
                <TouchableOpacity key={b.id} style={shared.row} onPress={() => openBillEdit(b)}>
                  <View style={{ flex: 1 }}>
                    <Text style={shared.rowName}>{b.name}</Text>
                    <Text style={styles.billMeta}>
                      {money(b.amount)} {freq.label.toLowerCase()}
                      {b.dueDay ? ` - due ${b.dueDay}${ordinal(b.dueDay)}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.billMonthly}>{money(monthlyAmount(b))}/mo</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>💳 Debts</Text>
            <TouchableOpacity onPress={openDebtAdd}>
              <Text style={styles.addLink}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {debtsList.length === 0 ? (
            <Text style={shared.tagline}>No debts tracked - nice, or add one to keep an eye on it.</Text>
          ) : (
            debtsList.map((d) => (
              <TouchableOpacity key={d.id} style={shared.row} onPress={() => openDebtEdit(d)}>
                <View style={{ flex: 1 }}>
                  <Text style={shared.rowName}>{d.name}</Text>
                  <Text style={styles.billMeta}>
                    {money(d.balance)} balance{d.apr > 0 ? ` - ${d.apr}% APR` : ''}
                  </Text>
                </View>
                <Text style={styles.billMonthly}>{money(d.minPayment)}/mo</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>🎯 Goals</Text>
            <TouchableOpacity onPress={openGoalAdd}>
              <Text style={styles.addLink}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {goals.length === 0 ? (
            <Text style={shared.tagline}>Nothing you're saving toward yet.</Text>
          ) : (
            goals.map((g) => {
              const pct = g.target ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
              const remaining = Math.max(0, (g.target || 0) - (g.saved || 0));
              const months = g.monthly > 0 ? Math.ceil(remaining / g.monthly) : null;
              return (
                <TouchableOpacity key={g.id} style={styles.goalRow} onPress={() => openGoalEdit(g)}>
                  <View style={styles.goalHead}>
                    <Text style={shared.rowName}>{g.name}</Text>
                    <Text style={styles.goalPct}>{pct}%</Text>
                  </View>
                  <View style={styles.goalBarTrack}>
                    <View style={[styles.goalBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.goalMeta}>
                    {money(g.saved)} of {money(g.target)}
                    {g.monthly > 0 ? ` - ${money(g.monthly)}/mo` : ' - no monthly amount set'}
                    {months !== null && remaining > 0
                      ? ` - ${months} month${months === 1 ? '' : 's'} to go`
                      : ''}
                    {remaining === 0 && g.target > 0 ? ' - reached' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={incomeOpen} animationType="slide" transparent onRequestClose={() => setIncomeOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Monthly income</Text>
            <Text style={styles.label}>What comes in each month, after tax</Text>
            <TextInput
              style={styles.input}
              value={incomeDraft}
              onChangeText={(v) => setIncomeDraft(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor="#9aa5b1"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                setMonthlyIncome(Number(incomeDraft) || 0);
                setIncomeOpen(false);
              }}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIncomeOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={billModalOpen} animationType="slide" transparent onRequestClose={() => setBillModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{editingBillId ? 'Edit Bill' : 'Add Bill'}</Text>

              <Text style={styles.label}>What is it?</Text>
              <TextInput
                style={styles.input}
                value={billDraft.name}
                onChangeText={(v) => setBillDraft((d) => ({ ...d, name: v }))}
                placeholder="Rent, phone, insurance..."
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={billDraft.amount}
                onChangeText={(v) => setBillDraft((d) => ({ ...d, amount: v.replace(/[^0-9.]/g, '') }))}
                placeholder="0.00"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>How often</Text>
              <View style={styles.freqRow}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.freqChip, billDraft.frequency === f.id && styles.freqChipSel]}
                    onPress={() => setBillDraft((d) => ({ ...d, frequency: f.id }))}
                  >
                    <Text
                      style={[
                        styles.freqChipText,
                        billDraft.frequency === f.id && styles.freqChipTextSel,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Day of month it's due</Text>
              <View style={styles.dayGrid}>
                {Array.from({ length: 31 }).map((_, i) => {
                  const day = i + 1;
                  const sel = Number(billDraft.dueDay) === day;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayCell, sel && styles.dayCellSel]}
                      onPress={() =>
                        setBillDraft((d) => ({ ...d, dueDay: sel ? '' : String(day) }))
                      }
                    >
                      <Text style={[styles.dayCellText, sel && styles.dayCellTextSel]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.hint}>
                Tap the day it comes out. It'll show on your Calendar that day
                each month. Tap again to clear.
              </Text>

              <TouchableOpacity style={styles.saveBtn} onPress={saveBill}>
                <Text style={styles.saveBtnText}>{editingBillId ? 'Save Changes' : 'Add Bill'}</Text>
              </TouchableOpacity>
              {editingBillId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteBill}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBillModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={debtModalOpen} animationType="slide" transparent onRequestClose={() => setDebtModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{editingDebtId ? 'Edit Debt' : 'Add Debt'}</Text>

              <Text style={styles.label}>What is it?</Text>
              <TextInput
                style={styles.input}
                value={debtDraft.name}
                onChangeText={(v) => setDebtDraft((d) => ({ ...d, name: v }))}
                placeholder="Credit card, student loan, car..."
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Current balance</Text>
              <TextInput
                style={styles.input}
                value={debtDraft.balance}
                onChangeText={(v) => setDebtDraft((d) => ({ ...d, balance: v.replace(/[^0-9.]/g, '') }))}
                placeholder="0.00"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>APR (optional)</Text>
              <TextInput
                style={styles.input}
                value={debtDraft.apr}
                onChangeText={(v) => setDebtDraft((d) => ({ ...d, apr: v.replace(/[^0-9.]/g, '') }))}
                placeholder="e.g. 19.99"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Minimum monthly payment</Text>
              <TextInput
                style={styles.input}
                value={debtDraft.minPayment}
                onChangeText={(v) => setDebtDraft((d) => ({ ...d, minPayment: v.replace(/[^0-9.]/g, '') }))}
                placeholder="0.00"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveDebt}>
                <Text style={styles.saveBtnText}>{editingDebtId ? 'Save Changes' : 'Add Debt'}</Text>
              </TouchableOpacity>
              {editingDebtId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDebt(editingDebtId)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDebtModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={goalModalOpen} animationType="slide" transparent onRequestClose={() => setGoalModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{editingGoalId ? 'Edit Goal' : 'Add Goal'}</Text>

              <Text style={styles.label}>What are you saving for?</Text>
              <TextInput
                style={styles.input}
                value={goalDraft.name}
                onChangeText={(v) => setGoalDraft((d) => ({ ...d, name: v }))}
                placeholder="Emergency fund, car, trip..."
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Target amount</Text>
              <TextInput
                style={styles.input}
                value={goalDraft.target}
                onChangeText={(v) => setGoalDraft((d) => ({ ...d, target: v.replace(/[^0-9.]/g, '') }))}
                placeholder="0.00"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Already saved</Text>
              <TextInput
                style={styles.input}
                value={goalDraft.saved}
                onChangeText={(v) => setGoalDraft((d) => ({ ...d, saved: v.replace(/[^0-9.]/g, '') }))}
                placeholder="0.00"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Putting aside each month</Text>
              <TextInput
                style={styles.input}
                value={goalDraft.monthly}
                onChangeText={(v) => setGoalDraft((d) => ({ ...d, monthly: v.replace(/[^0-9.]/g, '') }))}
                placeholder="0.00"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />
              <Text style={styles.hint}>
                This comes out of your free money above, so you can see whether
                the plan actually fits before committing to it.
              </Text>

              <TouchableOpacity style={styles.saveBtn} onPress={saveGoal}>
                <Text style={styles.saveBtnText}>{editingGoalId ? 'Save Changes' : 'Add Goal'}</Text>
              </TouchableOpacity>
              {editingGoalId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteGoal}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalModalOpen(false)}>
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
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,164,65,0.25)',
    overflow: 'hidden',
  },
  heroLabel: { color: DIM, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  heroValue: { color: '#4f9e5c', fontSize: 42, fontWeight: '800', marginTop: 6, marginBottom: 4 },
  statTileRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statTile: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statTileIcon: { fontSize: 18, marginBottom: 6 },
  statTileLabel: { color: DIM, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  statTileValue: { color: INK, fontSize: 17, fontWeight: '800' },
  breakdownRowIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowIcon: { fontSize: 15, marginRight: 10, width: 20, textAlign: 'center' },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownLabel: { color: DIM, fontSize: 14, flex: 1 },
  negative: { color: ROSE, fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  overspent: { color: ROSE },
  splitBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  splitSeg: { height: '100%' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  legend: { fontSize: 11, fontWeight: '700' },
  warning: { color: ROSE, fontSize: 13, marginTop: 12, lineHeight: 19 },
  suggestion: { color: DIM, fontSize: 13, marginTop: 12, lineHeight: 19 },
  addLink: { color: GOLD, fontWeight: '700', fontSize: 14 },
  billMeta: { color: DIM, fontSize: 12, marginTop: 2 },
  billMonthly: { color: INK, fontSize: 14, fontWeight: '700' },
  goalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalPct: { color: GOLD, fontSize: 14, fontWeight: '800' },
  goalBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 8,
  },
  goalBarFill: { height: '100%', borderRadius: 3, backgroundColor: GOLD },
  goalMeta: { color: DIM, fontSize: 12, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
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
  hint: { fontSize: 11, color: DIM, marginTop: 6, lineHeight: 16 },
  input: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayCell: {
    width: 40,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#232d3a',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSel: { backgroundColor: GOLD, borderColor: GOLD },
  dayCellText: { color: INK, fontSize: 13, fontWeight: '600' },
  dayCellTextSel: { color: '#fff', fontWeight: '800' },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#232d3a',
    borderWidth: 1,
    borderColor: BORDER,
  },
  freqChipSel: { backgroundColor: GOLD, borderColor: GOLD },
  freqChipText: { color: INK, fontSize: 13, fontWeight: '600' },
  freqChipTextSel: { color: '#fff', fontWeight: '800' },
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

