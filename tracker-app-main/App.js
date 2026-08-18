import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveChunked,
  loadChunked,
  snapshot,
  recoverySources,
  restoreFrom,
  repairMeta,
} from './chunkedStorage';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import CalendarScreen from './CalendarScreen';
import InventoryScreen from './InventoryScreen';
import RoadmapsScreen from './RoadmapsScreen';
import PlacesScreen from './PlacesScreen';
import BuylistScreen from './BuylistScreen';
import TrackerScreen from './TrackerScreen';
import RecipesScreen from './RecipesScreen';
import SavingsScreen from './SavingsScreen';
import InformationScreen from './InformationScreen';
import RestaurantsScreen from './RestaurantsScreen';
import SettingsScreen from './SettingsScreen';
import TravelScreen from './TravelScreen';
import HabitsDetailScreen from './HabitsDetailScreen';
import { ensureNotificationPermissions, resyncAllHabitNotifications } from './notifications';
import { GOLD, INK, DIM, CARD, BORDER, BLUE, ROSE, glowRose } from './theme';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInToFirebaseWithGoogle, pushBackupToCloud, pullBackupFromCloud } from './firebaseSync';

const STORAGE_KEY = 'tracker_expo_data_v12';

const NAV_ITEMS = [
  { key: 'tracker', label: 'Tracker', icon: '🎬' },
  { key: 'roadmaps', label: 'Roadmaps', icon: '🚩' },
  { key: 'buylist', label: 'Buylist', icon: '🛍️' },
  { key: 'habits', label: 'Habits', icon: '🔥' },
  { key: 'information', label: 'Information', icon: 'ℹ️' },
  { key: 'savings', label: 'Money', icon: '💰' },
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

const TAB_LABELS = {
  tracker: 'Tracker',
  roadmaps: 'Roadmaps',
  buylist: 'Buylist',
  information: 'Information',
  savings: 'Money',
  calendar: 'Calendar',
  recipes: 'Recipes',
  places: 'Places',
  travel: 'Traveling',
  inventory: 'Inventory',
  restaurants: 'Restaurants',
  settings: 'Settings',
  habits: 'Habits',
};

const DRAWER_WIDTH = 280;

function MainApp() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('calendar');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [inventory, setInventory] = useState([]);
  const [cards, setCards] = useState([]);
  const [datingPlaces, setDatingPlaces] = useState([]);
  const [travelPlaces, setTravelPlaces] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [gardenItems, setGardenItems] = useState([]);
  const [preservedItems, setPreservedItems] = useState([]);
  const [stats, setStats] = useState([]);
  const [level, setLevel] = useState({ level: 1, xp: 0 });
  const [rewardPoints, setRewardPoints] = useState(0);
  const [rewardItems, setRewardItems] = useState([]);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [buylist, setBuylist] = useState([]);
  const [buylistCategories, setBuylistCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [todoItems, setTodoItems] = useState([]);
  const [habits, setHabits] = useState([]);
  const [hero, setHero] = useState({ weaponTier: 0, armorTier: 0, energy: 0, minionsDefeated: 0 });
  const [googleUser, setGoogleUser] = useState(null);
  const [customColors, setCustomColors] = useState([]);
  const [trips, setTrips] = useState([]);
  const [farmingProgress, setFarmingProgress] = useState({});
  const [pendingHabitId, setPendingHabitId] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saveBytes, setSaveBytes] = useState(0);
  const [cloudSyncError, setCloudSyncError] = useState(null);
  const [calendarViewMode, setCalendarViewMode] = useState('agenda');
  const [meditationSettings, setMeditationSettings] = useState({
    breathCount: 5,
    tempoId: 'medium',
    totalRounds: 1,
    soundOn: true,
  });
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [bills, setBills] = useState([]);
  const [debts, setDebts] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [bodyWorkouts, setBodyWorkouts] = useState([]);
  const [bodyRoutines, setBodyRoutines] = useState([]);
  const [bodyInventory, setBodyInventory] = useState([]);
  const [bodyExercises, setBodyExercises] = useState([]);
  const [infoCategories, setInfoCategories] = useState([]);
  const [ingredientLinkMemory, setIngredientLinkMemory] = useState({});
  const [placesKind, setPlacesKind] = useState('dating');
  const [trackerFilter, setTrackerFilter] = useState('all');
  const [buylistFilter, setBuylistFilter] = useState('all');
  const [drawerSubmenu, setDrawerSubmenu] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const hasHydrated = useRef(false);

  // Always-current refs for the AppState background-push effect below.
  // Mobile OSes don't reliably let async work finish once a process is
  // actually being terminated, so instead of trying to catch "full
  // close" directly (not reliably possible), this pushes to the cloud
  // the moment the app is backgrounded - which always happens before a
  // full close, whether the user swipes it away or the OS kills it
  // later. Refs (not the raw state values) so the AppState listener,
  // which subscribes once on mount, always reads the latest data
  // instead of a stale closure from whenever it first subscribed.
  const latestPayloadRef = useRef(null);
  const googleUserRef = useRef(null);
  useEffect(() => {
    googleUserRef.current = googleUser;
  }, [googleUser]);

  function drawerSubmenuFor(currentTab) {
    return null;
  }

  function openDrawer() {
    setDrawerSubmenu(drawerSubmenuFor(tab));
    setDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function closeDrawer() {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }

  function selectTab(key) {
    setTab(key);
    closeDrawer();
  }

  function selectSubmenuItem(item) {
    item.action();
    closeDrawer();
  }

  function getFullPayload() {
    return {
      inventory,
      cards,
      datingPlaces,
      travelPlaces,
      restaurants,
      gardenItems,
      preservedItems,
      stats,
      level,
      buylist,
      buylistCategories,
      items,
      categories,
      recipes,
      groceries,
      rewardPoints,
      rewardItems,
      rewardHistory,
      todoItems,
      savingsGoals,
      bills,
      debts,
      monthlyIncome,
      bodyWorkouts,
      bodyRoutines,
      bodyInventory,
      bodyExercises,
      infoCategories,
      ingredientLinkMemory,
      habits,
      hero,
      googleUser,
      customColors,
      trips,
      farmingProgress,
      calendarViewMode,
      meditationSettings,
    };
  }

  function applyFullPayload(p) {
    setInventory(p.inventory || []);
    setCards(p.cards || []);
    setDatingPlaces(p.datingPlaces || []);
    setTravelPlaces(p.travelPlaces || []);
    setStats(p.stats || []);
    setLevel(p.level || { level: 1, xp: 0 });
    setBuylist(p.buylist || []);
    setBuylistCategories(p.buylistCategories || []);
    setItems(p.items || []);
    setCategories(p.categories || []);
    setRecipes(p.recipes || []);
    setGroceries(p.groceries || []);
    setRewardPoints(p.rewardPoints || 0);
    setRewardItems(p.rewardItems || []);
    setRewardHistory(p.rewardHistory || []);
    setTodoItems(p.todoItems || []);
    setSavingsGoals(p.savingsGoals || []);
    setBills(p.bills || []);
    setMonthlyIncome(p.monthlyIncome || 0);
    setBodyWorkouts(p.bodyWorkouts || []);
    setBodyRoutines(p.bodyRoutines || []);
    setBodyInventory(p.bodyInventory || []);
    setBodyExercises(p.bodyExercises || []);
    setInfoCategories(p.infoCategories || []);
    setIngredientLinkMemory(p.ingredientLinkMemory || {});
    setHabits(p.habits || []);
    setHero(p.hero || { weaponTier: 0, armorTier: 0, energy: 0, minionsDefeated: 0 });
    setGoogleUser(p.googleUser || null);
    setCustomColors(p.customColors || []);
    setTrips(p.trips || []);
    setFarmingProgress(p.farmingProgress || {});
    setCalendarViewMode(p.calendarViewMode || 'agenda');
    setMeditationSettings(p.meditationSettings || { breathCount: 5, tempoId: 'medium', totalRounds: 1, soundOn: true });
  }

  function handleInfoNavigate(targetTab, kind) {
    if (kind) setPlacesKind(kind);
    setTab(targetTab);
  }

  // Load once on startup: prefer whatever's saved on-device,
  // fall back to the bundled real-data snapshot on first ever run.
  // Genuine empty defaults, never a bundled realData fallback — that
  // fallback (removed here) is what could silently repopulate old,
  // bundled data.js content any time storage came back empty for any
  // reason, with zero indication anything had reverted.
  useEffect(() => {
    async function load() {
      try {
        const saved = (await loadChunked(STORAGE_KEY)) || {};
        setInventory(saved.inventory || []);
        setCards(saved.cards || []);
        setDatingPlaces(saved.datingPlaces || []);
        setTravelPlaces(saved.travelPlaces || []);
        setRestaurants(saved.restaurants || []);
        setGardenItems(saved.gardenItems || []);
        setPreservedItems(saved.preservedItems || []);
        setStats(saved.stats || []);
        setLevel(saved.level || { level: 1, xp: 0 });
        setBuylist(saved.buylist || []);
        setBuylistCategories(saved.buylistCategories || []);
        setItems(saved.items || []);
        setCategories(saved.categories || []);
        setRecipes(saved.recipes || []);
        setGroceries(saved.groceries || []);
        setRewardPoints(saved.rewardPoints != null ? saved.rewardPoints : 0);
        setRewardItems(saved.rewardItems || []);
        setRewardHistory(saved.rewardHistory || []);
        setTodoItems(saved.todoItems || []);
        setHabits(saved.habits || []);
        setHero(saved.hero || { weaponTier: 0, armorTier: 0, energy: 0, minionsDefeated: 0 });
        setGoogleUser(saved.googleUser || null);
        setCustomColors(saved.customColors || []);
        setTrips(saved.trips || []);
        setFarmingProgress(saved.farmingProgress || {});
        setCalendarViewMode(saved.calendarViewMode || 'agenda');
        setMeditationSettings(saved.meditationSettings || { breathCount: 5, tempoId: 'medium', totalRounds: 1, soundOn: true });
        setSavingsGoals(saved.savingsGoals || []);
        setBills(saved.bills || []);
        setDebts(saved.debts || []);
        setMonthlyIncome(saved.monthlyIncome || 0);
        setBodyWorkouts(saved.bodyWorkouts || []);
        setBodyRoutines(saved.bodyRoutines || []);
        setBodyInventory(saved.bodyInventory || []);
        setBodyExercises(saved.bodyExercises || []);
        setInfoCategories(saved.infoCategories || []);
        setIngredientLinkMemory(saved.ingredientLinkMemory || {});
        // Only reached when the load genuinely succeeded, so this is the
        // only place saving gets enabled.
        hasHydrated.current = true;
        // One good snapshot per launch, taken before any writes.
        snapshot(STORAGE_KEY);
        setLoaded(true);
      } catch (e) {
        // Critically: do NOT fall back to the bundled starter data here.
        // This catch used to reset every piece of state to realData and
        // then mark hydration complete, so the auto-save immediately
        // wrote that fallback over the user's real saved data — which is
        // why changes appeared to save during a session and then vanished
        // on the next launch. Now a failed load leaves state untouched
        // and, by leaving hasHydrated false, blocks saving entirely so
        // whatever is on disk stays recoverable via Backup.
        setLoadError(e && e.message ? e.message : String(e));
        setLoaded(true);
      }
    }
    load();
  }, []);

  // Once loaded, make sure notification permission is granted and every
  // habit's reminder schedule is rebuilt clean (avoids any chance of
  // duplicate/orphaned notifications piling up across app restarts).
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      // Must be awaited: on Android this is what creates the 'habits'
      // notification channel, and scheduling into a channel that does
      // not exist yet means the notification silently never displays.
      // Previously this ran un-awaited alongside the resync below, so
      // on a cold start the two raced and reminders could be dropped.
      await ensureNotificationPermissions();
      const updates = await resyncAllHabitNotifications(habits);
      setHabits((prev) =>
        prev.map((h) =>
          updates[h.id] !== undefined ? { ...h, scheduledNotifications: updates[h.id] } : h
        )
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Automatic cloud PULL - deliberately narrow: only fires when local
  // storage came back genuinely empty (checked against several core
  // fields at once, not just one, so a user who simply hasn't added
  // habits yet but has other real data doesn't get treated as "empty")
  // AND this device has previously signed in with Google for this app.
  // That second check uses GoogleSignin's own native-level session
  // state rather than the app's `googleUser` state, since that field is
  // ITSELF part of the payload that would be empty in exactly the
  // scenario this exists to catch. Never fires if there's any real
  // local data - auto-pull only ever fills a genuine void, it never
  // overwrites something that already exists.
  useEffect(() => {
    if (!loaded || !hasHydrated.current) return;
    const genuinelyEmpty =
      habits.length === 0 &&
      trips.length === 0 &&
      inventory.length === 0 &&
      items.length === 0 &&
      cards.length === 0;
    if (!genuinelyEmpty) return;

    (async () => {
      try {
        const hasPrior = await GoogleSignin.hasPreviousSignIn();
        if (!hasPrior) return;
        const userInfo = await GoogleSignin.signInSilently();
        const tokens = await GoogleSignin.getTokens();
        await signInToFirebaseWithGoogle(tokens.idToken, tokens.accessToken);
        const cloudData = await pullBackupFromCloud();
        if (cloudData) {
          applyFullPayload(cloudData);
          if (userInfo && userInfo.data && userInfo.data.user) {
            setGoogleUser({
              name: userInfo.data.user.name,
              email: userInfo.data.user.email,
              photo: userInfo.data.user.photo,
            });
          }
        }
      } catch (e) {
        // Silent - this is a background best-effort recovery attempt,
        // not a user-initiated action, so there's no action for an
        // error message to prompt here. Worst case, local state simply
        // stays at its genuine (empty) value, same as it would without
        // this effect existing at all.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Auto-save on every change, once initial load is done
  // (so we don't immediately overwrite saved data with empty state).
  useEffect(() => {
    if (!hasHydrated.current) return;
    const payload = {
      inventory,
      cards,
      datingPlaces,
      travelPlaces,
      restaurants,
      gardenItems,
      preservedItems,
      stats,
      level,
      buylist,
      buylistCategories,
      items,
      categories,
      recipes,
      groceries,
      rewardPoints,
      rewardItems,
      rewardHistory,
      todoItems,
      savingsGoals,
      bills,
      debts,
      monthlyIncome,
      bodyWorkouts,
      bodyRoutines,
      bodyInventory,
      bodyExercises,
      infoCategories,
      ingredientLinkMemory,
      habits,
      hero,
      googleUser,
      customColors,
      trips,
      farmingProgress,
      calendarViewMode,
      meditationSettings,
    };
    latestPayloadRef.current = payload;
    // This used to be `.catch(() => {})`, which silently swallowed every
    // storage failure. On Android AsyncStorage has a per-item size limit,
    // and the bundled starter photos push the payload close to it — so
    // writes were failing with no error and nothing persisted between
    // launches, while everything still looked fine in memory. Failures
    // are now surfaced instead of hidden.
    saveChunked(STORAGE_KEY, payload)
      .then((bytes) => {
        setSaveBytes(bytes);
        setSaveError(null);
        // Automatic cloud push - safe to do unconditionally on every
        // successful local save, since pushing your OWN current data TO
        // the cloud can never destroy anything locally. Silent/
        // best-effort: a cloud hiccup shouldn't interrupt anything or
        // show the local save-error banner, which is specifically for
        // local save failures (the thing that actually risks losing
        // work). Only attempted when actually signed in.
        if (googleUser) {
          pushBackupToCloud(payload)
            .then(() => setCloudSyncError(null))
            .catch((e) => {
              // Local save already succeeded, which is what matters most -
              // this doesn't interrupt anything. But unlike before, the
              // failure is now visible in Settings instead of vanishing
              // silently, especially now that it can mean "payload too
              // large to sync" rather than just a network hiccup.
              setCloudSyncError(e && e.message ? e.message : String(e));
            });
        }
      })
      .catch((e) => {
        setSaveError(e && e.message ? e.message : String(e));
      });
  }, [
    inventory,
    cards,
    datingPlaces,
    travelPlaces,
    restaurants,
    gardenItems,
    preservedItems,
    stats,
    level,
    buylist,
    buylistCategories,
    items,
    categories,
    recipes,
    groceries,
    rewardPoints,
    rewardItems,
    rewardHistory,
    todoItems,
    savingsGoals,
    bills,
    debts,
    monthlyIncome,
    bodyWorkouts,
    bodyRoutines,
    bodyInventory,
    bodyExercises,
    infoCategories,
    ingredientLinkMemory,
    habits,
    hero,
    googleUser,
    customColors,
    trips,
    farmingProgress,
    calendarViewMode,
    meditationSettings,
  ]);

  // Push to the cloud the moment the app is backgrounded (see the refs
  // above for why this is the right hook instead of trying to catch a
  // literal "full close"). Subscribes once on mount; reads via refs so
  // it's never working with stale data regardless of when it fires.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'background') return;
      if (!googleUserRef.current) return; // not signed in - nothing to push to
      if (!latestPayloadRef.current) return; // haven't hydrated/saved yet this session
      pushBackupToCloud(latestPayloadRef.current)
        .then(() => setCloudSyncError(null))
        .catch((e) => {
          // Best-effort, same as the push after a normal local save - a
          // failure here shouldn't block or interrupt backgrounding, but
          // it's now visible in Settings instead of vanishing silently.
          setCloudSyncError(e && e.message ? e.message : String(e));
        });
    });
    return () => sub.remove();
  }, []);

  const data = { inventory, cards, datingPlaces };

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: DIM }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const activeLabel = TAB_LABELS[tab] || 'Tracker';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activeLabel}</Text>
        <View style={{ width: 40 }} />
      </View>

      {saveError ? (
        <TouchableOpacity
          style={styles.saveErrorBanner}
          onPress={() => setTab('settings')}
        >
          <Text style={styles.saveErrorText} numberOfLines={2}>
            ⚠️ Your last change didn't save: {saveError} — tap for recovery options
          </Text>
        </TouchableOpacity>
      ) : null}

      {!saveError && cloudSyncError ? (
        <TouchableOpacity
          style={styles.cloudSyncErrorBanner}
          onPress={() => setTab('settings')}
        >
          <Text style={styles.saveErrorText} numberOfLines={2}>
            ⚠️ Cloud backup failed: {cloudSyncError} — tap for details
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={{ flex: 1 }}>
        {tab === 'calendar' && (
          <CalendarScreen
            data={data}
            habits={habits}
            setHabits={setHabits}
            level={level}
            setLevel={setLevel}
            rewardPoints={rewardPoints}
            setRewardPoints={setRewardPoints}
            hero={hero}
            setHero={setHero}
            calendarViewMode={calendarViewMode}
            todoItems={todoItems}
            setTodoItems={setTodoItems}
            bodyRoutines={bodyRoutines}
            setBodyRoutines={setBodyRoutines}
            bills={bills}
            onOpenDating={() => {
              setPlacesKind('dating');
              setTab('places');
            }}
            onOpenHabit={(id) => {
              setPendingHabitId(id);
              setTab('habits');
            }}
          />
        )}
        {tab === 'roadmaps' && (
          <RoadmapsScreen
            cards={cards}
            setCards={setCards}
            stats={stats}
            setStats={setStats}
            level={level}
            setLevel={setLevel}
            rewardPoints={rewardPoints}
            setRewardPoints={setRewardPoints}
            rewardItems={rewardItems}
            setRewardItems={setRewardItems}
            rewardHistory={rewardHistory}
            setRewardHistory={setRewardHistory}
            habits={habits}
            setHabits={setHabits}
            hero={hero}
            setHero={setHero}
            customColors={customColors}
            guideProgress={farmingProgress}
            setGuideProgress={setFarmingProgress}
            onGoToCalendar={() => setTab('calendar')}
          />
        )}
        {tab === 'travel' && <TravelScreen trips={trips} setTrips={setTrips} />}
        {tab === 'places' && (
          <PlacesScreen
            datingPlaces={datingPlaces}
            setDatingPlaces={setDatingPlaces}
            travelPlaces={travelPlaces}
            setTravelPlaces={setTravelPlaces}
            initialKind={placesKind}
          />
        )}
        {tab === 'buylist' && (
          <BuylistScreen
            buylist={buylist}
            setBuylist={setBuylist}
            buylistCategories={buylistCategories}
            setBuylistCategories={setBuylistCategories}
            initialFilter={buylistFilter}
          />
        )}
        {tab === 'tracker' && (
          <TrackerScreen
            items={items}
            setItems={setItems}
            categories={categories}
            setCategories={setCategories}
            initialFilter={trackerFilter}
          />
        )}
        {tab === 'recipes' && (
          <RecipesScreen
            recipes={recipes}
            setRecipes={setRecipes}
            groceries={groceries}
            setGroceries={setGroceries}
            inventory={inventory}
            setInventory={setInventory}
            ingredientLinkMemory={ingredientLinkMemory}
            setIngredientLinkMemory={setIngredientLinkMemory}
            gardenItems={gardenItems}
            setGardenItems={setGardenItems}
            preservedItems={preservedItems}
            setPreservedItems={setPreservedItems}
          />
        )}
        {tab === 'inventory' && (
          <InventoryScreen
            inventory={inventory}
            setInventory={setInventory}
            bodyInventory={bodyInventory}
            setBodyInventory={setBodyInventory}
          />
        )}
        {tab === 'restaurants' && (
          <RestaurantsScreen restaurants={restaurants} setRestaurants={setRestaurants} />
        )}
        {tab === 'savings' && (
          <SavingsScreen
            savingsGoals={savingsGoals}
            setSavingsGoals={setSavingsGoals}
            bills={bills}
            setBills={setBills}
            debts={debts}
            setDebts={setDebts}
            monthlyIncome={monthlyIncome}
            setMonthlyIncome={setMonthlyIncome}
            groceries={groceries}
            buylist={buylist}
            trips={trips}
          />
        )}
        {tab === 'information' && (
          <InformationScreen
            infoCategories={infoCategories}
            setInfoCategories={setInfoCategories}
            onNavigate={handleInfoNavigate}
          />
        )}
        {tab === 'settings' && (
          <SettingsScreen
            googleUser={googleUser}
            setGoogleUser={setGoogleUser}
            applyFullPayload={applyFullPayload}
            getLatestPayload={() => latestPayloadRef.current}
            setLevel={setLevel}
            setStats={setStats}
            setRewardPoints={setRewardPoints}
            setRewardHistory={setRewardHistory}
            setHero={setHero}
            customColors={customColors}
            setCustomColors={setCustomColors}
            calendarViewMode={calendarViewMode}
            setCalendarViewMode={setCalendarViewMode}
            habits={habits}
            setHabits={setHabits}
            saveError={saveError}
            loadError={loadError}
            saveBytes={saveBytes}
            cloudSyncError={cloudSyncError}
            meditationSettings={meditationSettings}
            setMeditationSettings={setMeditationSettings}
            storageBreakdown={{
              Recipes: recipes,
              Groceries: groceries,
              Inventory: inventory,
              Buylist: buylist,
              Restaurants: restaurants,
              'Garden/Preserving': [...gardenItems, ...preservedItems],
              'Tracker (movies/shows/games)': items,
              Travel: trips,
              Places: [...datingPlaces, ...travelPlaces],
              'Roadmap Cards': cards,
            }}
          />
        )}
        {tab === 'habits' && (
          <HabitsDetailScreen
            habits={habits}
            setHabits={setHabits}
            level={level}
            setLevel={setLevel}
            rewardPoints={rewardPoints}
            setRewardPoints={setRewardPoints}
            hero={hero}
            setHero={setHero}
            meditationSettings={meditationSettings}
            bodyWorkouts={bodyWorkouts}
            setBodyWorkouts={setBodyWorkouts}
            bodyExercises={bodyExercises}
            pendingHabitId={pendingHabitId}
            onPendingHandled={() => setPendingHabitId(null)}
            bodyRoutines={bodyRoutines}
            setBodyRoutines={setBodyRoutines}
          />
        )}
      </View>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Animated.View
            style={[
              styles.drawer,
              { paddingTop: insets.top + 20, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <LinearGradient
              colors={['#1a1512', '#0c0a0a', '#050403']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Bold sun-disc motif, built as a plain shape (no image
                asset) - the solid vermilion circle bleeding off the edge
                is the actual recurring graphic element from the
                reference, not a photo standing in for it. */}
            <View style={styles.sunDisc} />
            <Text style={styles.drawerTitle}>TRACKER</Text>
            {drawerSubmenu ? (
              <>
                <TouchableOpacity
                  style={styles.drawerBackRow}
                  onPress={() => setDrawerSubmenu(null)}
                >
                  <Text style={styles.drawerBackText}>← Main Menu</Text>
                </TouchableOpacity>
                <Text style={styles.drawerSubHeader}>{TAB_LABELS[tab]}</Text>
                {drawerSubmenu.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.drawerItem}
                    onPress={() => selectSubmenuItem(item)}
                  >
                    <Text style={styles.drawerLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              NAV_ITEMS.map((item, i) => (
                <React.Fragment key={item.key}>
                  <TouchableOpacity
                    style={[
                      styles.drawerItem,
                      tab === item.key && styles.drawerItemSel,
                    ]}
                    onPress={() => selectTab(item.key)}
                  >
                    <View style={[styles.drawerIconBadge, tab === item.key && styles.drawerIconBadgeSel]}>
                      <Text style={styles.drawerIcon}>{item.icon}</Text>
                    </View>
                    <Text
                      style={[
                        styles.drawerLabel,
                        tab === item.key && styles.drawerLabelSel,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                  {i < NAV_ITEMS.length - 1 ? <View style={styles.drawerDivider} /> : null}
                </React.Fragment>
              ))
            )}
          </Animated.View>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={closeDrawer}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BLUE },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 8,
    height: 52,
  },
  hamburgerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hamburgerIcon: { fontSize: 22, color: INK },
  headerTitle: { fontSize: 16, fontWeight: '700', color: INK },
  saveErrorBanner: {
    backgroundColor: '#7a2020',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  saveErrorText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  cloudSyncErrorBanner: {
    backgroundColor: '#7a5a20',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#0c0a0a',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderRightColor: 'rgba(217,164,65,0.25)',
    overflow: 'hidden',
  },
  drawerTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 24,
    fontFamily: 'serif',
    textShadowColor: 'rgba(217,164,65,0.35)',
    textShadowRadius: 8,
  },
  sunDisc: {
    position: 'absolute',
    top: -50,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: ROSE,
    opacity: 0.85,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  // Hanko-seal treatment for the active tab: a solid rose accent bar on
  // the left (matching the samurai UI convention researched - red/black/
  // gold, a red seal stamp marking what's "chosen") plus a warm
  // background tint, instead of just bolding the text.
  drawerItemSel: {
    backgroundColor: 'rgba(217,164,65,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: ROSE,
    paddingLeft: 5,
    ...glowRose,
  },
  drawerIconBadge: {
    width: 30, height: 30, borderRadius: 15, marginRight: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(217,164,65,0.08)', borderWidth: 1, borderColor: 'rgba(217,164,65,0.3)',
  },
  drawerIconBadgeSel: { borderColor: ROSE, backgroundColor: 'rgba(234,90,95,0.15)' },
  drawerIcon: { fontSize: 15, textAlign: 'center' },
  drawerLabel: { color: '#c7c0b5', fontSize: 16, fontWeight: '500', letterSpacing: 0.3 },
  drawerLabelSel: { color: GOLD, fontWeight: '700' },
  drawerDivider: { height: 1, backgroundColor: 'rgba(217,164,65,0.12)', marginVertical: 2 },
  drawerBackRow: { paddingVertical: 10, marginBottom: 4 },
  drawerBackText: { color: GOLD, fontSize: 14, fontWeight: '700' },
  drawerSubHeader: {
    color: '#8a8474',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
});

