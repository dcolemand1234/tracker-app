import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pickCompressedImage } from './imagePicker';
import { runOcr } from './ocrHelper';
import { fetchRecipeFromUrl, sanitizeRecipeText, prettifyLeadingQuantity } from './recipeImport';
import HomesteadScreen from './HomesteadScreen';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

const INV_CATEGORIES = ['Seasonings', 'Meats', 'Pantry', 'Produce', 'Dairy', 'Other'];

// Placeholder - swap in the real Worker URL once `wrangler deploy` finishes
// (looks like https://kroger-price-lookup.YOUR-SUBDOMAIN.workers.dev).
const KROGER_WORKER_URL = 'https://kroger-price-lookup.demarcus3456.workers.dev';
const PRICES_WORKER_URL = 'https://prices-api-lookup.demarcus3456.workers.dev';

// Limited to stores actually shopped at. Matched by substring against
// seller name/URL since PricesAPI's naming isn't guaranteed to be exact
// ("Kroger" vs "Kroger.com" vs a specific division name).
const PREFERRED_STORES = [
  { label: 'Kroger', match: ['kroger'] },
  { label: 'Walmart', match: ['walmart'] },
  { label: 'Amazon Fresh', match: ['amazon'] },
  { label: 'HEB', match: ['heb', 'h-e-b'] },
  { label: 'Fiesta', match: ['fiesta'] },
];
function isPreferredStore(seller, sellerUrl) {
  const text = `${seller || ''} ${sellerUrl || ''}`.toLowerCase();
  return PREFERRED_STORES.some((s) => s.match.some((m) => text.includes(m)));
}

// PricesAPI nests results as products[].offers[] (multiple matched
// product listings, each with its own list of seller offers) - flattens
// that into one price-sorted list, which is what actually answers "what's
// on sale," rather than making the user dig through per-product groups.
// Filtered down to PREFERRED_STORES only, since the raw result set spans
// dozens of random retailers that aren't relevant here.
function flattenPriceOffers(data) {
  const products = (data && data.data && data.data.products) || [];
  const offers = [];
  products.forEach((p) => {
    (p.offers || []).forEach((o) => {
      if (o.price != null && isPreferredStore(o.seller, o.seller_url)) offers.push(o);
    });
  });
  offers.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  return offers;
}
const UNITS = [
  'tsp','tbsp','tablespoon','tablespoons','teaspoon','teaspoons','cup','cups','oz','ounce',
  'ounces','lb','lbs','pound','pounds','g','gram','grams','kg','ml','l','liter','liters',
  'clove','cloves','can','cans','pinch','dash','slice','slices','stick','sticks','bunch',
  'head','piece','pieces',
];
const UNIT_RE = new RegExp('^(' + UNITS.join('|') + ')s?\\b\\.?\\s*(of\\s+)?', 'i');

function guessInvNameFromIngredientText(text) {
  let t = (text || '').trim();
  t = t.replace(/\([^)]*\)/g, ' ');
  t = t.replace(/^[\s\d.\/¼½¾⅓⅔⅛⅜⅝⅞-]+/, '');
  t = t.replace(UNIT_RE, '');
  t = t.split(',')[0];
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/\b\w/g, (c) => c.toUpperCase());
  return t || text;
}

function ingredientMemoryKey(text) {
  return guessInvNameFromIngredientText(text).toLowerCase().trim();
}

function splitIntoSteps(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];

  // 1. Explicit line breaks are the clearest signal.
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) return lines;

  // 2. Older notes are often one long blob with inline numbering
  // ("1. Do this 2. Then that") or "Step 1:" markers. Split on those
  // before falling back to sentences, otherwise the whole blob stays
  // as a single unreadable paragraph.
  const numbered = trimmed.split(/(?=(?:^|\s)(?:step\s*)?\d{1,2}[.):]\s+)/i);
  const numberedClean = numbered.map((s) => s.trim()).filter(Boolean);
  if (numberedClean.length > 1) return numberedClean;

  // 3. Semicolon-separated instructions.
  const semis = trimmed.split(';').map((s) => s.trim()).filter(Boolean);
  if (semis.length > 1) return semis;

  // 4. Fall back to sentence boundaries.
  const sentences = trimmed.match(/[^.!?]+[.!?]+(\s+|$)/g);
  if (sentences && sentences.length > 1) {
    return sentences.map((s) => s.trim()).filter(Boolean);
  }
  return [trimmed];
}

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

// Same pattern as Travel's latestPrice() - the current price is just the
// most recent entry in the history, so there's one source of truth for
// "what does this cost right now" instead of a separate static field
// that could drift out of sync with the tracked history.
function latestGroceryPrice(item) {
  const h = (item && item.priceHistory) || [];
  return h.length ? Number(h[h.length - 1].price) || 0 : 0;
}

function normalizeWord(w) {
  return w.replace(/s$/, '');
}

// Ported from the web app: fuzzy-matches an ingredient's text (or its
// direct invItemId link) against what's currently in Inventory.
function ingredientHave(ing, inventory) {
  if (ing.invItemId && inventory.some((inv) => inv.id === ing.invItemId)) {
    return true;
  }
  // Deliberately no early `return false` when invItemId is set but
  // missing: running out and restocking creates a brand new inventory
  // id, and hard-failing here is what forced re-linking the same
  // ingredient across every recipe. Fall through to name matching so a
  // restocked item is recognised everywhere automatically.
  const rawText = (ing.text || '').toLowerCase();
  const textWords = rawText
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map(normalizeWord);
  return inventory.some((inv) => {
    const invName = (inv.name || '').toLowerCase().trim();
    if (!invName) return false;
    if (rawText.includes(invName) || invName.includes(rawText)) return true;
    const invWords = invName.split(/[^a-z]+/).filter(Boolean).map(normalizeWord);
    if (!invWords.length) return false;
    if (invWords.every((iw) => textWords.includes(iw))) return true;
    const coreWord = invWords[invWords.length - 1];
    return coreWord.length > 2 && textWords.includes(coreWord);
  });
}

function parseQty(text) {
  const m = (text || '').match(/^\s*(\d+(\.\d+)?|\d+\/\d+)/);
  if (!m) return null;
  if (m[1].includes('/')) {
    const [a, b] = m[1].split('/').map(Number);
    return a / b;
  }
  return parseFloat(m[1]);
}

function ingredientStockInfo(ing, inventory) {
  if (!ing.invItemId) return null;
  const inv = inventory.find((i) => i.id === ing.invItemId);
  if (!inv || inv.qty === undefined || inv.qty === null) return null;
  const needed = parseQty(ing.text);
  if (needed === null) return null;
  return { available: inv.qty, needed, low: inv.qty < needed };
}

export default function RecipesScreen({
  recipes,
  setRecipes,
  groceries,
  setGroceries,
  inventory,
  setInventory,
  ingredientLinkMemory,
  setIngredientLinkMemory,
  gardenItems,
  setGardenItems,
  preservedItems,
  setPreservedItems,
}) {
  const [subTab, setSubTab] = useState('recipes');

  // One-time cleanup for recipes saved before the HTML-sanitization fix
  // in recipeImport.js - that fix only runs on new imports, so anything
  // already saved kept its raw &#176;/<span>/<!--StartFragment--> mess
  // until now. Re-sanitizing already-clean text is a harmless no-op, so
  // this just runs against everything rather than trying to detect
  // which recipes actually need it.
  useEffect(() => {
    let anyChanged = false;
    const cleaned = (recipes || []).map((r) => {
      const title = sanitizeRecipeText(r.title || '');
      const notes = sanitizeRecipeText(r.notes || '');
      const ingredients = (r.ingredients || []).map((ing) => {
        const text = prettifyLeadingQuantity(sanitizeRecipeText(ing.text || ''));
        if (text !== ing.text) anyChanged = true;
        return text !== ing.text ? { ...ing, text } : ing;
      });
      if (title !== r.title || notes !== r.notes) anyChanged = true;
      return title !== r.title || notes !== r.notes || ingredients !== r.ingredients
        ? { ...r, title, notes, ingredients }
        : r;
    });
    if (anyChanged) {
      setRecipes(cleaned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [detailId, setDetailId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [bulkIngredients, setBulkIngredients] = useState('');

  const [groModalOpen, setGroModalOpen] = useState(false);
  const [groEditingId, setGroEditingId] = useState(null);
  const [groDraft, setGroDraft] = useState({ name: '', category: 'Pantry', amount: '', price: '' });

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkIngredientId, setLinkIngredientId] = useState(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkNewOpen, setLinkNewOpen] = useState(false);
  const [linkNewDraft, setLinkNewDraft] = useState({ name: '', category: 'Pantry' });
  const [krogerZip, setKrogerZip] = useState('');
  const [krogerLoading, setKrogerLoading] = useState(false);
  const [krogerResults, setKrogerResults] = useState(null);
  const [krogerError, setKrogerError] = useState('');
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesResults, setPricesResults] = useState(null);
  const [pricesError, setPricesError] = useState('');

  async function comparePricesAcrossStores(term) {
    const q = term.trim();
    if (!q) return;
    setPricesLoading(true);
    setPricesError('');
    setPricesResults(null);
    try {
      const url = `${PRICES_WORKER_URL}?q=${encodeURIComponent(q)}&country=us&limit=10`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setPricesError(data.error || 'Comparison failed.');
        return;
      }
      setPricesResults(flattenPriceOffers(data));
    } catch (e) {
      setPricesError('Could not reach the price comparison. Check your connection and try again.');
    } finally {
      setPricesLoading(false);
    }
  }
  const [linkNewPrice, setLinkNewPrice] = useState('');

  // Ingredient confirmation via Kroger, offered right after a new
  // recipe is added - reduces ambiguity about what an ingredient
  // actually is ("2 cups flour" could match several real products) and
  // stores the confirmed match on the ingredient for future use.
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmRecipeId, setConfirmRecipeId] = useState(null);
  const [confirmingIngredientId, setConfirmingIngredientId] = useState(null);
  const [confirmSearchTerm, setConfirmSearchTerm] = useState('');

  async function lookupKrogerForIngredient(ingredientId, text) {
    const term = text.trim();
    const zip = krogerZip.trim();
    if (!zip) {
      Alert.alert('Zip code required', 'Kroger prices are specific to a store location.');
      return;
    }
    setConfirmingIngredientId(ingredientId);
    setConfirmSearchTerm(term);
    setKrogerLoading(true);
    setKrogerError('');
    setKrogerResults(null);
    try {
      const url = `${KROGER_WORKER_URL}?term=${encodeURIComponent(term)}&zip=${encodeURIComponent(zip)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setKrogerError(data.error || 'Lookup failed.');
        return;
      }
      setKrogerResults(data.results || []);
    } catch (e) {
      setKrogerError('Could not reach the price lookup. Check your connection and try again.');
    } finally {
      setKrogerLoading(false);
    }
  }

  function confirmIngredientMatch(recipeId, ingredientId, product) {
    let ingredientText = '';
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        return {
          ...r,
          ingredients: (r.ingredients || []).map((ing) => {
            if (ing.id !== ingredientId) return ing;
            ingredientText = ing.text;
            return {
              ...ing,
              krogerProductId: product.productId,
              krogerDescription: product.description,
              krogerPrice: product.promoPrice ?? product.regularPrice ?? null,
            };
          }),
        };
      })
    );
    // Remembered globally (same memory the inventory-link system already
    // uses, keyed the same way) so confirming "flour" once applies to
    // every other recipe that mentions flour, not just this one.
    const key = ingredientMemoryKey(ingredientText);
    if (key) {
      setIngredientLinkMemory((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] && typeof prev[key] === 'object' ? prev[key] : {}),
          kroger: {
            productId: product.productId,
            description: product.description,
            price: product.promoPrice ?? product.regularPrice ?? null,
          },
        },
      }));
    }
    setConfirmingIngredientId(null);
    setKrogerResults(null);
  }

  const [cookModeOpen, setCookModeOpen] = useState(false);
  const [cookStepIndex, setCookStepIndex] = useState(0);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanLines, setScanLines] = useState([]);
  const [scanError, setScanError] = useState('');

  const [importing, setImporting] = useState(false);

  function emptyDraft() {
    return { title: '', image: null, notes: '', sourceUrl: '', ingredients: [] };
  }

  const detailRecipe = recipes.find((r) => r.id === detailId);

  // Auto-apply previously-learned ingredient->inventory links whenever a
  // recipe is opened, so linking one ingredient once helps every recipe
  // that mentions it from then on. Also applies remembered Kroger
  // confirmations the same way now, from the same shared memory.
  useEffect(() => {
    const targetId = detailId || confirmRecipeId;
    if (!targetId) return;
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== targetId) return r;
        let changed = false;
        const ingredients = r.ingredients.map((ing) => {
          if (ing.isHeader) return ing;
          const key = ingredientMemoryKey(ing.text);
          const remembered = key && ingredientLinkMemory[key];
          if (!remembered) return ing;
          let next = ing;
          if (!ing.invItemId) {
            // Older entries stored a bare id string; newer ones store
            // { id, name } so the link can survive a restock.
            const rememberedId = typeof remembered === 'string' ? remembered : remembered.id;
            const rememberedName = typeof remembered === 'string' ? null : remembered.name;
            let match = inventory.find((inv) => inv.id === rememberedId);
            if (!match && rememberedName) {
              match = inventory.find(
                (inv) => (inv.name || '').toLowerCase().trim() === rememberedName.toLowerCase().trim()
              );
            }
            if (match) {
              changed = true;
              next = { ...next, invItemId: match.id };
            }
          }
          if (!ing.krogerProductId && typeof remembered === 'object' && remembered.kroger) {
            changed = true;
            next = {
              ...next,
              krogerProductId: remembered.kroger.productId,
              krogerDescription: remembered.kroger.description,
              krogerPrice: remembered.kroger.price,
            };
          }
          return next;
        });
        return changed ? { ...r, ingredients } : r;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId, confirmRecipeId]);

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setBulkIngredients('');
    setModalOpen(true);
  }

  function openEdit(r) {
    setEditingId(r.id);
    setDraft({
      title: r.title || '',
      image: r.image || null,
      notes: r.notes || '',
      sourceUrl: r.sourceUrl || '',
      ingredients: r.ingredients || [],
    });
    setBulkIngredients((r.ingredients || []).map((i) => i.text).join('\n'));
    setModalOpen(true);
  }

  async function pickImage() {
    const result = await pickCompressedImage();
    if (result.error === 'permission') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    if (result.uri) {
      setDraft((d) => ({ ...d, image: result.uri }));
    }
  }

  function saveRecipe() {
    if (!draft.title.trim()) {
      Alert.alert('Title required', 'Give this recipe a title first.');
      return;
    }
    const lines = bulkIngredients.split('\n').map((l) => l.trim()).filter(Boolean);
    const existingByText = {};
    (draft.ingredients || []).forEach((i) => (existingByText[i.text] = i));
    const ingredients = lines.map((text) => {
      const isHeader = /:\s*$/.test(text);
      const existing = existingByText[text];
      return existing || { id: makeId('ing'), text, isHeader };
    });
    const recipe = {
      id: editingId || makeId('r'),
      title: draft.title.trim(),
      image: draft.image,
      notes: draft.notes.trim(),
      sourceUrl: draft.sourceUrl.trim(),
      ingredients,
      addedAt: editingId
        ? recipes.find((r) => r.id === editingId)?.addedAt || Date.now()
        : Date.now(),
    };
    if (editingId) {
      setRecipes((prev) => prev.map((r) => (r.id === editingId ? recipe : r)));
    } else {
      setRecipes((prev) => [...prev, recipe]);
    }
    setModalOpen(false);

    // Only offer confirmation for a brand-new recipe with real
    // (non-header) ingredients - not on every edit, since re-editing an
    // already-confirmed recipe would be a repetitive interruption.
    if (!editingId) {
      const realIngredients = ingredients.filter((i) => !i.isHeader);
      if (realIngredients.length > 0) {
        setConfirmRecipeId(recipe.id);
        setConfirmingIngredientId(null);
        setKrogerResults(null);
        setKrogerError('');
        setConfirmModalOpen(true);
      }
    }
  }

  function deleteRecipe() {
    Alert.alert('Delete recipe?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setRecipes((prev) => prev.filter((r) => r.id !== editingId));
          setModalOpen(false);
          setDetailId(null);
        },
      },
    ]);
  }

  // Long-press-to-delete straight from the list row - tapping through to
  // the recipe, then Edit, then Delete was too many steps for something
  // you just want to remove quickly.
  function deleteRecipeById(id, title) {
    Alert.alert('Delete recipe?', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setRecipes((prev) => prev.filter((r) => r.id !== id)),
      },
    ]);
  }

  function openGroAdd() {
    setGroEditingId(null);
    setGroDraft({ name: '', category: 'Pantry', amount: '', price: '' });
    setGroModalOpen(true);
  }

  function openGroEdit(g) {
    setGroEditingId(g.id);
    setGroDraft({
      name: g.name || '',
      category: g.category || 'Pantry',
      amount: g.amount || '',
      price: String(latestGroceryPrice(g) || ''),
    });
    setGroModalOpen(true);
  }

  function saveGrocery() {
    if (!groDraft.name.trim()) {
      Alert.alert('Name required', 'Give this item a name.');
      return;
    }
    const existing = groEditingId ? groceries.find((g) => g.id === groEditingId) : null;
    const priceHistory = existing ? existing.priceHistory || [] : [];
    const newPrice = Number(groDraft.price) || 0;
    const currentLatest = existing ? latestGroceryPrice(existing) : 0;
    // Same pattern as Travel's price tracking: only append a new history
    // entry when the price actually changed, so re-saving other fields
    // (like just fixing a typo in the name) doesn't spam duplicate
    // entries with the same price.
    const updatedHistory =
      newPrice > 0 && newPrice !== currentLatest
        ? [...priceHistory, { price: newPrice, date: Date.now() }]
        : priceHistory;
    const item = {
      id: groEditingId || makeId('gy'),
      name: groDraft.name.trim(),
      category: groDraft.category,
      amount: groDraft.amount.trim(),
      priceHistory: updatedHistory,
      image: null,
      addedAt: existing ? existing.addedAt : Date.now(),
    };
    if (groEditingId) {
      setGroceries((prev) => prev.map((g) => (g.id === groEditingId ? { ...g, ...item, id: groEditingId } : g)));
    } else {
      setGroceries((prev) => [...prev, item]);
    }
    setGroModalOpen(false);
  }

  function deleteGrocery() {
    setGroceries((prev) => prev.filter((g) => g.id !== groEditingId));
    setGroModalOpen(false);
  }

  async function scanIngredientsPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets || !result.assets[0]) return;

    setScanOpen(true);
    setScanning(true);
    setScanError('');
    setScanLines([]);
    try {
      const lines = await runOcr(result.assets[0].base64);
      setScanLines(lines);
    } catch (e) {
      setScanError(e.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  function addScanLineAsIngredient(line) {
    setBulkIngredients((prev) => (prev.trim() ? prev.trim() + '\n' + line : line));
    setScanLines((prev) => prev.filter((l) => l !== line));
  }

  function addAllScanLinesAsIngredients() {
    if (!scanLines.length) return;
    setBulkIngredients((prev) => {
      const existing = prev.trim();
      return existing ? existing + '\n' + scanLines.join('\n') : scanLines.join('\n');
    });
    setScanLines([]);
    setScanOpen(false);
  }

  async function importFromUrl() {
    const url = draft.sourceUrl.trim();
    if (!url) {
      Alert.alert('Add a link first', 'Paste a recipe URL into the Source URL field, then tap Import.');
      return;
    }
    if (bulkIngredients.trim() || draft.notes.trim()) {
      Alert.alert(
        'Replace current content?',
        'This will replace your current ingredient list and notes with what gets fetched from the link.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => doImportFromUrl(url) },
        ]
      );
    } else {
      doImportFromUrl(url);
    }
  }

  async function doImportFromUrl(url) {
    setImporting(true);
    try {
      const parsed = await fetchRecipeFromUrl(url);
      setDraft((d) => ({
        ...d,
        title: parsed.title || d.title,
        image: parsed.image || d.image,
      }));
      if (parsed.ingredients.length) setBulkIngredients(parsed.ingredients.join('\n'));
      if (parsed.instructions) setDraft((d) => ({ ...d, notes: parsed.instructions }));
      Alert.alert('Imported', 'Recipe details pulled in — review and save.');
    } catch (e) {
      Alert.alert('Import failed', e.message || 'Something went wrong.');
    } finally {
      setImporting(false);
    }
  }

  const GRO_CATEGORIES = ['Seasonings', 'Meats', 'Pantry', 'Produce', 'Dairy', 'Other'];

  // --- Ingredient <-> Inventory linking ---
  function openIngredientLink(ingredientId) {
    setLinkIngredientId(ingredientId);
    setLinkSearch('');
    setLinkOpen(true);
  }

  function linkIngredient(invItemId) {
    if (!detailRecipe || !linkIngredientId) return;
    const ing = detailRecipe.ingredients.find((i) => i.id === linkIngredientId);
    setRecipes((prev) =>
      prev.map((r) =>
        r.id !== detailRecipe.id
          ? r
          : {
              ...r,
              ingredients: r.ingredients.map((i) =>
                i.id === linkIngredientId ? { ...i, invItemId: invItemId || null } : i
              ),
            }
      )
    );
    if (ing) {
      const key = ingredientMemoryKey(ing.text);
      if (key) {
        setIngredientLinkMemory((prev) => {
          const next = { ...prev };
          if (invItemId) {
            const invItem = inventory.find((inv) => inv.id === invItemId);
            // Store the name alongside the id so this link can re-point
            // itself if the item is used up and later restocked.
            next[key] = { id: invItemId, name: invItem ? invItem.name : '' };
          } else delete next[key];
          return next;
        });
      }
    }
    setLinkOpen(false);
  }

  async function lookupKrogerPrice() {
    const term = linkNewDraft.name.trim();
    const zip = krogerZip.trim();
    if (!term) {
      Alert.alert('Name required', 'Enter the item name first.');
      return;
    }
    if (!zip) {
      Alert.alert('Zip code required', 'Kroger prices are specific to a store location.');
      return;
    }
    setKrogerLoading(true);
    setKrogerError('');
    setKrogerResults(null);
    try {
      const url = `${KROGER_WORKER_URL}?term=${encodeURIComponent(term)}&zip=${encodeURIComponent(zip)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setKrogerError(data.error || 'Lookup failed.');
        return;
      }
      setKrogerResults(data.results || []);
    } catch (e) {
      setKrogerError('Could not reach the price lookup. Check your connection and try again.');
    } finally {
      setKrogerLoading(false);
    }
  }

  function saveNewLinkedItem() {
    const name = linkNewDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this item a name.');
      return;
    }
    const price = Number(linkNewPrice) || 0;
    const newItem = {
      id: makeId('inv'),
      name,
      category: linkNewDraft.category,
      amount: '',
      qty: null,
      expDate: '',
      image: null,
      priceHistory: price > 0 ? [{ price, date: Date.now() }] : [],
    };
    setInventory((prev) => [...prev, newItem]);
    setLinkNewOpen(false);
    setLinkNewPrice('');
    setKrogerResults(null);
    setKrogerError('');
    linkIngredient(newItem.id);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'recipes' && styles.subTabBtnSel]}
          onPress={() => setSubTab('recipes')}
        >
          <Text style={[styles.subTabText, subTab === 'recipes' && styles.subTabTextSel]}>
            Recipes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'groceries' && styles.subTabBtnSel]}
          onPress={() => setSubTab('groceries')}
        >
          <Text style={[styles.subTabText, subTab === 'groceries' && styles.subTabTextSel]}>
            Groceries
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'homestead' && styles.subTabBtnSel]}
          onPress={() => setSubTab('homestead')}
        >
          <Text style={[styles.subTabText, subTab === 'homestead' && styles.subTabTextSel]}>
            Homestead
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'homestead' ? (
        <HomesteadScreen
          gardenItems={gardenItems}
          setGardenItems={setGardenItems}
          preservedItems={preservedItems}
          setPreservedItems={setPreservedItems}
        />
      ) : (
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Recipes</Text>

        {subTab === 'recipes' ? (
          recipes.length === 0 ? (
            <View style={shared.block}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
                No recipes yet
              </Text>
              <Text style={shared.tagline}>
                Add one to start tracking what you need for it.
              </Text>
            </View>
          ) : (
            [...recipes]
              .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
              .map((r) => {
                const real = (r.ingredients || []).filter((i) => !i.isHeader);
                const missing = real.filter((i) => !ingredientHave(i, inventory)).length;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={shared.row}
                    onPress={() => setDetailId(r.id)}
                    onLongPress={() => deleteRecipeById(r.id, r.title)}
                  >
                    {r.image ? (
                      <Image source={{ uri: r.image }} style={shared.thumb66} />
                    ) : (
                      <View style={[shared.thumb66, styles.thumbPlaceholder]}>
                        <Text style={styles.thumbLetter}>
                          {(r.title || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: INK }}>
                        {r.title}
                      </Text>
                      <Text style={shared.tagline}>
                        {real.length} ingredient{real.length === 1 ? '' : 's'}
                        {missing > 0 ? ` • ${missing} missing` : real.length ? ' • have everything' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
          )
        ) : groceries.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              Nothing on your list
            </Text>
            <Text style={shared.tagline}>Tap + to add something to buy.</Text>
          </View>
        ) : (
          GRO_CATEGORIES.map((cat) => {
            const items = groceries.filter((g) => g.category === cat);
            if (!items.length) return null;
            return (
              <View key={cat} style={shared.block}>
                <Text style={shared.catHead}>{cat}</Text>
                {items.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={shared.row}
                    onPress={() => openGroEdit(g)}
                  >
                    {g.image ? (
                      <Image source={{ uri: g.image }} style={shared.thumb44} />
                    ) : null}
                    <Text style={shared.rowName}>{g.name}</Text>
                    {g.amount ? <Text style={shared.rowRight}>{g.amount}</Text> : null}
                    {latestGroceryPrice(g) > 0 ? (
                      <Text style={[shared.rowRight, { marginLeft: 8, color: GOLD }]}>
                        ${latestGroceryPrice(g).toFixed(2)}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
      )}

      {subTab !== 'homestead' ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={subTab === 'recipes' ? openAdd : openGroAdd}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}

      {/* Recipe detail modal */}
      <Modal
        visible={!!detailRecipe}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailId(null)}
      >
        {detailRecipe ? (
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <ScrollView>
                {detailRecipe.image ? (
                  <Image source={{ uri: detailRecipe.image }} style={styles.hero} />
                ) : null}
                <View style={styles.detailHeadRow}>
                  <Text style={styles.sheetTitle}>{detailRecipe.title}</Text>
                  <TouchableOpacity onPress={() => openEdit(detailRecipe)}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                </View>
                {detailRecipe.sourceUrl ? (
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => Linking.openURL(detailRecipe.sourceUrl)}
                  >
                    <Text style={styles.linkBtnText}>Source ↗</Text>
                  </TouchableOpacity>
                ) : null}

                {(detailRecipe.ingredients || []).length === 0 ? (
                  <Text style={shared.tagline}>No ingredients listed</Text>
                ) : (
                  <>
                    {(() => {
                      const real = detailRecipe.ingredients.filter((i) => !i.isHeader);
                      const have = real.filter((i) => ingredientHave(i, inventory)).length;
                      const missing = real.length - have;
                      return (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryHave}>{have} have</Text>
                          <Text style={styles.summaryMissing}>{missing} missing</Text>
                        </View>
                      );
                    })()}
                    {detailRecipe.ingredients.map((ing) => {
                      if (ing.isHeader) {
                        return (
                          <Text key={ing.id} style={styles.ingHeader}>
                            {ing.text.replace(/:\s*$/, '')}
                          </Text>
                        );
                      }
                      const have = ingredientHave(ing, inventory);
                      const stock = ingredientStockInfo(ing, inventory);
                      const low = stock && stock.low;
                      return (
                        <TouchableOpacity
                          key={ing.id}
                          style={styles.ingRow}
                          onPress={() => openIngredientLink(ing.id)}
                        >
                          <Text style={styles.ingText}>
                            {ing.invItemId ? '🔗 ' : ''}
                            {ing.text}
                          </Text>
                          <Text
                            style={[
                              styles.ingBadge,
                              { color: !have || low ? ROSE : '#2e9e5b' },
                            ]}
                          >
                            {!have ? 'Missing' : low ? 'Low' : 'Have'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}

                {detailRecipe.notes ? (
                  <>
                    <TouchableOpacity
                      style={[styles.saveBtn, styles.saveBtnAlt, { marginTop: 16 }]}
                      onPress={() => {
                        setCookStepIndex(0);
                        setCookModeOpen(true);
                      }}
                    >
                      <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>
                        👨‍🍳 Cook Mode
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Notes</Text>
                      {(() => {
                        const steps = splitIntoSteps(detailRecipe.notes);
                        return steps.length > 1 ? (
                          steps.map((step, i) => (
                            <View key={i} style={styles.noteStepRow}>
                              <View style={styles.noteStepNum}>
                                <Text style={styles.noteStepNumText}>{i + 1}</Text>
                              </View>
                              <Text style={styles.noteStepText}>{step}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.infoValue}>{detailRecipe.notes}</Text>
                        );
                      })()}
                    </View>
                  </>
                ) : null}

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setDetailId(null)}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        ) : (
          <View />
        )}
      </Modal>

      {/* Add/Edit recipe modal */}
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
                {editingId ? 'Edit Recipe' : 'Add Recipe'}
              </Text>

              {draft.image ? (
                <Image source={{ uri: draft.image }} style={styles.hero} />
              ) : null}
              <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                <Text style={styles.imgBtnText}>
                  {draft.image ? 'Change Photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={draft.title}
                onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
                placeholder="Recipe name"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Source URL (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.sourceUrl}
                onChangeText={(v) => setDraft((d) => ({ ...d, sourceUrl: v }))}
                placeholder="https://..."
                placeholderTextColor="#9aa5b1"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.saveBtn, styles.saveBtnAlt, { marginTop: 8 }]}
                disabled={importing}
                onPress={importFromUrl}
              >
                <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>
                  {importing ? 'Importing...' : '⬇️ Import from Link'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>
                Ingredients (one per line — end a line with ":" to make it a
                section header)
              </Text>
              <TextInput
                style={[styles.input, { height: 140, textAlignVertical: 'top' }]}
                value={bulkIngredients}
                onChangeText={setBulkIngredients}
                placeholder={'2 cups flour\n1 tsp salt\nSauce:\n1 cup cream'}
                placeholderTextColor="#9aa5b1"
                multiline
              />
              <TouchableOpacity
                style={[styles.saveBtn, styles.saveBtnAlt, { marginTop: 8 }]}
                onPress={scanIngredientsPhoto}
              >
                <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>
                  📷 Scan Ingredients from Photo
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Instructions / Notes</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                value={draft.notes}
                onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
                placeholder="Steps, notes..."
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveRecipe}>
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Save Changes' : 'Add Recipe'}
                </Text>
              </TouchableOpacity>

              {editingId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteRecipe}>
                  <Text style={styles.deleteBtnText}>Delete Recipe</Text>
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

      {/* Add/Edit grocery modal */}
      <Modal
        visible={groModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setGroModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {groEditingId ? 'Edit Item' : 'Add Item'}
            </Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={groDraft.name}
              onChangeText={(v) => setGroDraft((d) => ({ ...d, name: v }))}
              placeholder="e.g. Salmon"
              placeholderTextColor="#9aa5b1"
            />
            <Text style={styles.label}>Category</Text>
            <View style={styles.catRow}>
              {GRO_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    groDraft.category === cat && styles.catChipSel,
                  ]}
                  onPress={() => setGroDraft((d) => ({ ...d, category: cat }))}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      groDraft.category === cat && styles.catChipTextSel,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Amount (optional)</Text>
            <TextInput
              style={styles.input}
              value={groDraft.amount}
              onChangeText={(v) => setGroDraft((d) => ({ ...d, amount: v }))}
              placeholder="e.g. 2 lbs"
              placeholderTextColor="#9aa5b1"
            />
            <Text style={styles.label}>Price (optional)</Text>
            <TextInput
              style={styles.input}
              value={groDraft.price}
              onChangeText={(v) => setGroDraft((d) => ({ ...d, price: v.replace(/[^0-9.]/g, '') }))}
              placeholder="0.00"
              placeholderTextColor="#9aa5b1"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveGrocery}>
              <Text style={styles.saveBtnText}>
                {groEditingId ? 'Save Changes' : 'Add Item'}
              </Text>
            </TouchableOpacity>
            {groEditingId ? (
              <TouchableOpacity style={styles.deleteBtn} onPress={deleteGrocery}>
                <Text style={styles.deleteBtnText}>Delete Item</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setGroModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ingredient <-> Inventory link modal */}
      <Modal
        visible={linkOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLinkOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Link to Inventory</Text>
            {(() => {
              const ing = detailRecipe?.ingredients.find((i) => i.id === linkIngredientId);
              if (!ing) return null;
              const linkedInv = ing.invItemId ? inventory.find((i) => i.id === ing.invItemId) : null;
              return (
                <>
                  <Text style={[shared.tagline, { marginTop: -8, marginBottom: 12 }]}>
                    {ing.text}
                  </Text>
                  {linkedInv ? (
                    <View style={styles.linkedRow}>
                      <Text style={{ fontSize: 14, color: INK, fontWeight: '600' }}>
                        Linked: {linkedInv.name}
                      </Text>
                      <TouchableOpacity onPress={() => linkIngredient(null)}>
                        <Text style={{ color: ROSE, fontWeight: '700', fontSize: 13 }}>
                          Unlink
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              );
            })()}

            <TextInput
              style={styles.input}
              value={linkSearch}
              onChangeText={setLinkSearch}
              placeholder="Search your inventory..."
              placeholderTextColor="#9aa5b1"
            />

            <ScrollView style={{ maxHeight: 320, marginTop: 8 }}>
              {INV_CATEGORIES.map((cat) => {
                const t = linkSearch.trim().toLowerCase();
                const inCat = inventory.filter(
                  (it) => it.category === cat && (!t || it.name.toLowerCase().includes(t))
                );
                if (!inCat.length) return null;
                return (
                  <View key={cat}>
                    <Text style={styles.catHeadSmall}>{cat}</Text>
                    {inCat.map((it) => (
                      <TouchableOpacity
                        key={it.id}
                        style={styles.linkInvRow}
                        onPress={() => linkIngredient(it.id)}
                      >
                        <Text style={{ fontSize: 14, color: INK }}>{it.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
              {inventory.length === 0 ? (
                <Text style={shared.tagline}>Nothing in your inventory yet.</Text>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, styles.saveBtnAlt]}
              onPress={() => {
                const ing = detailRecipe?.ingredients.find((i) => i.id === linkIngredientId);
                setLinkNewDraft({
                  name: ing ? guessInvNameFromIngredientText(ing.text) : '',
                  category: 'Pantry',
                });
                setLinkNewOpen(true);
              }}
            >
              <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>
                + Add New Inventory Item
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLinkOpen(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quick add new inventory item from link screen */}
      <Modal
        visible={linkNewOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLinkNewOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Inventory Item</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={linkNewDraft.name}
              onChangeText={(v) => setLinkNewDraft((d) => ({ ...d, name: v }))}
              placeholder="Item name"
              placeholderTextColor="#9aa5b1"
            />
            <Text style={styles.label}>Category</Text>
            <View style={styles.catRow}>
              {INV_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    linkNewDraft.category === cat && styles.catChipSel,
                  ]}
                  onPress={() => setLinkNewDraft((d) => ({ ...d, category: cat }))}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      linkNewDraft.category === cat && styles.catChipTextSel,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 1, backgroundColor: BORDER, marginVertical: 16 }} />
            <Text style={styles.label}>Check real-time Kroger price (optional)</Text>
            <TextInput
              style={styles.input}
              value={krogerZip}
              onChangeText={setKrogerZip}
              placeholder="Zip code"
              placeholderTextColor="#9aa5b1"
              keyboardType="number-pad"
              maxLength={5}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#232d3a', marginTop: 10 }]}
              onPress={lookupKrogerPrice}
              disabled={krogerLoading}
            >
              <Text style={[styles.saveBtnText, { color: GOLD }]}>
                {krogerLoading ? 'Checking...' : 'Check Kroger Price'}
              </Text>
            </TouchableOpacity>
            {krogerError ? (
              <Text style={{ color: ROSE, fontSize: 12, marginTop: 8 }}>{krogerError}</Text>
            ) : null}
            {krogerResults && krogerResults.length === 0 ? (
              <Text style={{ color: DIM, fontSize: 12, marginTop: 8 }}>
                No matching products found near that zip code.
              </Text>
            ) : null}
            {krogerResults && krogerResults.length > 0 ? (
              <View style={{ marginTop: 10 }}>
                {krogerResults.map((r) => {
                  const shown = r.promoPrice ?? r.regularPrice;
                  return (
                    <TouchableOpacity
                      key={r.productId}
                      style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER,
                      }}
                      onPress={() => {
                        if (shown != null) setLinkNewPrice(String(shown));
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ color: INK, fontSize: 13 }}>{r.description}</Text>
                        {r.size ? <Text style={{ color: DIM, fontSize: 11 }}>{r.size}</Text> : null}
                      </View>
                      <Text style={{ color: GOLD, fontSize: 14, fontWeight: '700' }}>
                        {shown != null ? `$${Number(shown).toFixed(2)}` : '—'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={{ color: DIM, fontSize: 11, marginTop: 6 }}>
                  Tap a result to fill in its price below.
                </Text>
              </View>
            ) : null}
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              value={linkNewPrice}
              onChangeText={(v) => setLinkNewPrice(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor="#9aa5b1"
              keyboardType="decimal-pad"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveNewLinkedItem}>
              <Text style={styles.saveBtnText}>Add & Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLinkNewOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* OCR scan results */}
      <Modal
        visible={scanOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setScanOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Scan Results</Text>
            {scanning ? (
              <Text style={shared.tagline}>Reading text from your photo...</Text>
            ) : scanError ? (
              <Text style={{ color: ROSE, fontSize: 13 }}>{scanError}</Text>
            ) : scanLines.length === 0 ? (
              <Text style={shared.tagline}>
                Couldn't make out any usable text in that image. Try a clean
                photo of just the text you need.
              </Text>
            ) : (
              <>
                <Text style={[shared.tagline, { marginTop: -8, marginBottom: 10 }]}>
                  Tap a line to add it as an ingredient, or add everything at once.
                </Text>
                <TouchableOpacity style={styles.saveBtn} onPress={addAllScanLinesAsIngredients}>
                  <Text style={styles.saveBtnText}>Add All as Ingredients</Text>
                </TouchableOpacity>
                <ScrollView style={{ maxHeight: 320, marginTop: 12 }}>
                  {scanLines.map((line, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.scanLineRow}
                      onPress={() => addScanLineAsIngredient(line)}
                    >
                      <Text style={{ fontSize: 14, color: INK }}>{line}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setScanOpen(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cook Mode: full-screen step-by-step walkthrough */}
      <Modal
        visible={cookModeOpen}
        animationType="slide"
        onRequestClose={() => setCookModeOpen(false)}
      >
        {(() => {
          const steps = splitIntoSteps(detailRecipe?.notes);
          const total = steps.length;
          if (!total) return null;
          const step = steps[cookStepIndex];
          const pct = Math.round(((cookStepIndex + 1) / total) * 100);
          return (
            <View style={styles.cookScreen}>
              <View style={styles.cookHeader}>
                <Text style={styles.cookStepTitle}>Step {cookStepIndex + 1}</Text>
                <TouchableOpacity onPress={() => setCookModeOpen(false)}>
                  <Text style={styles.cookClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cookBarTrack}>
                <View style={[styles.cookBarFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.cookCounter}>
                Step {cookStepIndex + 1} of {total}
              </Text>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
                <Text style={styles.cookStepText}>{step}</Text>
              </ScrollView>

              <View style={styles.cookNavRow}>
                <TouchableOpacity
                  style={[styles.cookNavBtn, cookStepIndex === 0 && { opacity: 0 }]}
                  disabled={cookStepIndex === 0}
                  onPress={() => setCookStepIndex((i) => Math.max(0, i - 1))}
                >
                  <Text style={styles.cookNavBtnText}>← Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cookNavBtn, styles.cookNavBtnPrimary]}
                  onPress={() => {
                    if (cookStepIndex < total - 1) setCookStepIndex((i) => i + 1);
                    else setCookModeOpen(false);
                  }}
                >
                  <Text style={styles.cookNavBtnTextPrimary}>
                    {cookStepIndex === total - 1 ? 'Done' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* Confirm ingredients via Kroger - offered after adding a new recipe */}
      <Modal
        visible={confirmModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setConfirmModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView>
              <Text style={styles.sheetTitle}>Confirm Ingredients</Text>
              <Text style={{ color: DIM, fontSize: 12, marginBottom: 12 }}>
                Match each ingredient to a real Kroger product to clear up any ambiguity, and to
                make pricing/inventory linking faster later. Entirely optional - skip any you don't
                want to confirm now.
              </Text>
              <Text style={styles.label}>Your zip code</Text>
              <TextInput
                style={styles.input}
                value={krogerZip}
                onChangeText={setKrogerZip}
                placeholder="Zip code"
                placeholderTextColor="#9aa5b1"
                keyboardType="number-pad"
                maxLength={5}
              />
              {(() => {
                const recipe = recipes.find((r) => r.id === confirmRecipeId);
                const realIngredients = (recipe?.ingredients || []).filter((i) => !i.isHeader);
                return realIngredients.map((ing) => {
                  const isExpanded = confirmingIngredientId === ing.id;
                  return (
                    <View key={ing.id} style={{ marginTop: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: INK, fontSize: 14, flex: 1 }}>{ing.text}</Text>
                        {ing.krogerDescription ? (
                          <Text style={{ color: '#4fb894', fontSize: 12 }}>✓ Confirmed</Text>
                        ) : null}
                      </View>
                      {ing.krogerDescription ? (
                        <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>
                          Matched: {ing.krogerDescription}
                          {ing.krogerPrice != null ? ` · $${Number(ing.krogerPrice).toFixed(2)}` : ''}
                        </Text>
                      ) : null}
                      <TouchableOpacity
                        style={{ marginTop: 6 }}
                        onPress={() => {
                          if (isExpanded) {
                            setConfirmingIngredientId(null);
                            setKrogerResults(null);
                          } else {
                            lookupKrogerForIngredient(ing.id, guessInvNameFromIngredientText(ing.text));
                          }
                        }}
                      >
                        <Text style={{ color: GOLD, fontSize: 13, fontWeight: '700' }}>
                          {ing.krogerDescription
                            ? 'Search again'
                            : isExpanded
                            ? 'Cancel search'
                            : 'Confirm via Kroger'}
                        </Text>
                      </TouchableOpacity>
                      {isExpanded ? (
                        <View style={{ marginTop: 8 }}>
                          <TextInput
                            style={styles.input}
                            value={confirmSearchTerm}
                            onChangeText={setConfirmSearchTerm}
                            placeholder="Search term"
                            placeholderTextColor="#9aa5b1"
                          />
                          <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: '#232d3a', marginTop: 8 }]}
                            onPress={() => lookupKrogerForIngredient(ing.id, confirmSearchTerm)}
                            disabled={krogerLoading}
                          >
                            <Text style={[styles.saveBtnText, { color: GOLD }]}>
                              {krogerLoading ? 'Checking...' : 'Search Kroger'}
                            </Text>
                          </TouchableOpacity>
                          {krogerError ? (
                            <Text style={{ color: ROSE, fontSize: 12, marginTop: 8 }}>{krogerError}</Text>
                          ) : null}
                          {krogerResults && krogerResults.length === 0 ? (
                            <Text style={{ color: DIM, fontSize: 12, marginTop: 8 }}>
                              No matching products found.
                            </Text>
                          ) : null}
                          {krogerResults && krogerResults.length > 0
                            ? krogerResults.map((r) => {
                                const shown = r.promoPrice ?? r.regularPrice;
                                return (
                                  <TouchableOpacity
                                    key={r.productId}
                                    style={{
                                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                                      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER,
                                    }}
                                    onPress={() => confirmIngredientMatch(confirmRecipeId, ing.id, r)}
                                  >
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                      <Text style={{ color: INK, fontSize: 13 }}>{r.description}</Text>
                                      {r.size ? <Text style={{ color: DIM, fontSize: 11 }}>{r.size}</Text> : null}
                                    </View>
                                    <Text style={{ color: GOLD, fontSize: 14, fontWeight: '700' }}>
                                      {shown != null ? `$${Number(shown).toFixed(2)}` : '—'}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })
                            : null}

                          <View style={{ height: 1, backgroundColor: BORDER, marginVertical: 12 }} />
                          <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: '#232d3a' }]}
                            onPress={() => comparePricesAcrossStores(confirmSearchTerm)}
                            disabled={pricesLoading}
                          >
                            <Text style={[styles.saveBtnText, { color: GOLD }]}>
                              {pricesLoading ? 'Comparing (can take up to a minute)...' : 'Compare Prices (Kroger/Walmart/Amazon/HEB/Fiesta)'}
                            </Text>
                          </TouchableOpacity>
                          {pricesError ? (
                            <Text style={{ color: ROSE, fontSize: 12, marginTop: 8 }}>{pricesError}</Text>
                          ) : null}
                          {pricesResults && pricesResults.length === 0 ? (
                            <Text style={{ color: DIM, fontSize: 12, marginTop: 8 }}>
                              No listings found at Kroger, Walmart, Amazon, HEB, or Fiesta for that search.
                            </Text>
                          ) : null}
                          {pricesResults && pricesResults.length > 0
                            ? pricesResults.map((offer, i) => (
                                <View
                                  key={`${offer.seller}-${i}`}
                                  style={{
                                    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER,
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <TouchableOpacity
                                      style={{ flex: 1, marginRight: 8 }}
                                      onPress={() => offer.url && Linking.openURL(offer.url)}
                                    >
                                      <Text style={{ color: '#6db8f2', fontSize: 13, fontWeight: '600' }}>
                                        {offer.seller}
                                      </Text>
                                      <Text style={{ color: DIM, fontSize: 11 }}>{offer.product_title}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => {
                                        if (offer.price != null) {
                                          confirmIngredientMatch(confirmRecipeId, ing.id, {
                                            productId: `priceapi-${offer.seller}-${i}`,
                                            description: `${offer.product_title} (${offer.seller})`,
                                            regularPrice: offer.price,
                                            promoPrice: null,
                                          });
                                        }
                                      }}
                                    >
                                      <Text style={{ color: GOLD, fontSize: 14, fontWeight: '700' }}>
                                        {offer.price != null ? `$${Number(offer.price).toFixed(2)}` : '—'}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                  {offer.stock_status ? (
                                    <Text style={{ color: DIM, fontSize: 10, marginTop: 2 }}>{offer.stock_status}</Text>
                                  ) : null}
                                </View>
                              ))
                            : null}
                        </View>
                      ) : null}
                    </View>
                  );
                });
              })()}
              <TouchableOpacity
                style={[styles.saveBtn, { marginTop: 20 }]}
                onPress={() => setConfirmModalOpen(false)}
              >
                <Text style={styles.saveBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  subTabRow: { flexDirection: 'row', marginBottom: 16, paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  subTabBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  subTabBtnSel: { backgroundColor: GOLD, borderColor: GOLD },
  subTabText: { fontSize: 14, fontWeight: '600', color: DIM },
  subTabTextSel: { color: '#fff' },
  thumbPlaceholder: {
    backgroundColor: '#232d3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLetter: { fontSize: 22, fontWeight: '700', color: DIM },
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
  detailHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: { color: GOLD, fontWeight: '700', fontSize: 14 },
  hero: { width: '100%', height: 180, borderRadius: 14, marginBottom: 12 },
  linkBtn: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  linkBtnText: { fontSize: 14, color: INK, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  summaryHave: { color: '#2e9e5b', fontWeight: '700', fontSize: 13, marginRight: 16 },
  summaryMissing: { color: ROSE, fontWeight: '700', fontSize: 13 },
  ingHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9aa5b1',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
  },
  ingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  ingText: { flex: 1, fontSize: 14, color: INK, marginRight: 8 },
  ingBadge: { fontSize: 12, fontWeight: '700' },
  infoBlock: { marginTop: 14 },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9aa5b1',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  infoValue: { fontSize: 14, color: INK, lineHeight: 20 },
  noteStepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  noteStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  noteStepNumText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  noteStepText: { flex: 1, fontSize: 14, color: INK, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#232d3a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  imgBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  imgBtnText: { color: INK, fontSize: 14, fontWeight: '500' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap' },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#232d3a',
    marginRight: 8,
    marginBottom: 8,
  },
  catChipSel: { backgroundColor: GOLD },
  catChipText: { fontSize: 13, color: INK },
  catChipTextSel: { color: '#fff', fontWeight: '600' },
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
  saveBtnAlt: { backgroundColor: CARD, borderWidth: 1, borderColor: GOLD },
  saveBtnTextAlt: { color: GOLD },
  linkedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#332a13',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  catHeadSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9aa5b1',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
  },
  linkInvRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  scanLineRow: {
    backgroundColor: '#212b37',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  cookScreen: {
    flex: 1,
    backgroundColor: '#1c2b3a',
    padding: 20,
    paddingTop: 50,
  },
  cookHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cookStepTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cookClose: { color: '#a9b6c4', fontSize: 22 },
  cookBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#33475a',
    overflow: 'hidden',
    marginTop: 16,
  },
  cookBarFill: { height: 6, borderRadius: 3, backgroundColor: GOLD },
  cookCounter: { color: '#a9b6c4', fontSize: 12, marginTop: 8 },
  cookStepText: { color: '#fff', fontSize: 22, lineHeight: 32, fontWeight: '500' },
  cookNavRow: { flexDirection: 'row', gap: 12, paddingBottom: 20 },
  cookNavBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#33475a',
  },
  cookNavBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cookNavBtnPrimary: { backgroundColor: GOLD },
  cookNavBtnTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

