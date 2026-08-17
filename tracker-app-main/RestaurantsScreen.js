import React, { useState } from 'react';
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
import { pickCompressedImage } from './imagePicker';
import { fetchProductFromUrl, fetchMenuFromUrl } from './buylistImport';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

const CUISINES = [
  'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Indian',
  'Mediterranean', 'BBQ', 'Seafood', 'Pizza', 'Burgers', 'Breakfast', 'Bakery',
  'Vegan', 'Fast Food', 'Other',
];
const PRICE_TIERS = ['$', '$$', '$$$', '$$$$'];

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

function emptyRestaurantDraft() {
  return {
    name: '',
    cuisine: CUISINES[0],
    address: '',
    phone: '',
    hours: '',
    website: '',
    image: null,
    rating: 0,
    priceTier: '$$',
    notes: '',
  };
}

function emptyItemDraft() {
  return { name: '', description: '', price: '', image: null };
}

export default function RestaurantsScreen({ restaurants, setRestaurants }) {
  const list = restaurants || [];
  const [detailId, setDetailId] = useState(null);
  const detail = list.find((r) => r.id === detailId) || null;

  const [restaurantModalOpen, setRestaurantModalOpen] = useState(false);
  const [editingRestaurantId, setEditingRestaurantId] = useState(null);
  const [restaurantDraft, setRestaurantDraft] = useState(emptyRestaurantDraft());
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  async function autoFillFromWebsite() {
    const url = restaurantDraft.website.trim();
    if (!url) {
      Alert.alert('Link required', 'Paste the restaurant\'s website first.');
      return;
    }
    setFetchLoading(true);
    setFetchError('');
    try {
      // Same fetch used for Buylist product links - most restaurant
      // homepages carry the same og:title/og:image metadata a product
      // page does, so this reuses that instead of a near-duplicate
      // function. Price isn't relevant here, so only name/image are used.
      const result = await fetchProductFromUrl(url);
      setRestaurantDraft((d) => ({
        ...d,
        name: result.title || d.name,
        image: result.image || d.image,
      }));
    } catch (e) {
      setFetchError(e && e.message ? e.message : 'Could not fetch that page.');
    } finally {
      setFetchLoading(false);
    }
  }

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [menuImportModalOpen, setMenuImportModalOpen] = useState(false);
  const [menuImportUrl, setMenuImportUrl] = useState('');
  const [menuImportLoading, setMenuImportLoading] = useState(false);
  const [menuImportError, setMenuImportError] = useState('');
  const [menuImportResult, setMenuImportResult] = useState(null);
  const [menuImportChecked, setMenuImportChecked] = useState({});

  function openMenuImport() {
    setMenuImportUrl('');
    setMenuImportError('');
    setMenuImportResult(null);
    setMenuImportChecked({});
    setMenuImportModalOpen(true);
  }

  async function runMenuImport() {
    const url = menuImportUrl.trim();
    if (!url) {
      Alert.alert('Link required', "Paste the restaurant's menu page link first.");
      return;
    }
    setMenuImportLoading(true);
    setMenuImportError('');
    setMenuImportResult(null);
    try {
      const categories = await fetchMenuFromUrl(url);
      setMenuImportResult(categories);
      // Everything starts checked - reviewing is about unchecking what
      // you don't want, not having to opt every single item back in.
      const checked = {};
      categories.forEach((cat, ci) =>
        cat.items.forEach((_, ii) => {
          checked[`${ci}-${ii}`] = true;
        })
      );
      setMenuImportChecked(checked);
    } catch (e) {
      setMenuImportError(e && e.message ? e.message : 'Could not import that menu.');
    } finally {
      setMenuImportLoading(false);
    }
  }

  function confirmMenuImport() {
    if (!menuImportResult) return;
    const newCategories = menuImportResult
      .map((cat, ci) => {
        const items = cat.items
          .filter((_, ii) => menuImportChecked[`${ci}-${ii}`])
          .map((it) => ({
            id: makeId('item'),
            name: it.name,
            description: it.description || '',
            price: it.price,
            image: null,
          }));
        return { id: makeId('cat'), name: cat.name, items };
      })
      .filter((cat) => cat.items.length > 0);

    if (newCategories.length === 0) {
      Alert.alert('Nothing selected', 'Check at least one item to import it.');
      return;
    }

    setRestaurants((prev) =>
      prev.map((r) => (r.id === detailId ? { ...r, menu: [...(r.menu || []), ...newCategories] } : r))
    );
    setMenuImportModalOpen(false);
  }
  const [categoryDraft, setCategoryDraft] = useState('');

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemCategoryId, setEditingItemCategoryId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemDraft, setItemDraft] = useState(emptyItemDraft());

  function openAddRestaurant() {
    setEditingRestaurantId(null);
    setRestaurantDraft(emptyRestaurantDraft());
    setFetchError('');
    setRestaurantModalOpen(true);
  }
  function openEditRestaurant(r) {
    setEditingRestaurantId(r.id);
    setRestaurantDraft({
      name: r.name || '',
      cuisine: r.cuisine || CUISINES[0],
      address: r.address || '',
      phone: r.phone || '',
      hours: r.hours || '',
      website: r.website || '',
      image: r.image || null,
      rating: r.rating || 0,
      priceTier: r.priceTier || '$$',
      notes: r.notes || '',
    });
    setFetchError('');
    setRestaurantModalOpen(true);
  }
  async function pickRestaurantImage() {
    const result = await pickCompressedImage();
    if (result.error === 'permission') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    if (result.uri) {
      setRestaurantDraft((d) => ({ ...d, image: result.uri }));
    }
  }
  function saveRestaurant() {
    const name = restaurantDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this restaurant a name.');
      return;
    }
    if (editingRestaurantId) {
      setRestaurants((prev) =>
        prev.map((r) => (r.id === editingRestaurantId ? { ...r, ...restaurantDraft, name } : r))
      );
    } else {
      setRestaurants((prev) => [
        ...(prev || []),
        { id: makeId('rest'), ...restaurantDraft, name, menu: [], addedAt: Date.now() },
      ]);
    }
    setRestaurantModalOpen(false);
  }
  function deleteRestaurant(id) {
    Alert.alert('Delete restaurant?', 'This removes its whole menu too. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setRestaurants((prev) => prev.filter((r) => r.id !== id));
          setDetailId(null);
        },
      },
    ]);
  }

  function openAddCategory() {
    setCategoryDraft('');
    setCategoryModalOpen(true);
  }
  function saveCategory() {
    const name = categoryDraft.trim();
    if (!name) {
      Alert.alert('Name required', 'e.g. Appetizers, Entrees, Desserts, Drinks...');
      return;
    }
    setRestaurants((prev) =>
      prev.map((r) =>
        r.id === detailId
          ? { ...r, menu: [...(r.menu || []), { id: makeId('cat'), name, items: [] }] }
          : r
      )
    );
    setCategoryModalOpen(false);
  }
  function deleteCategory(categoryId) {
    Alert.alert('Delete this category?', 'This removes every item in it. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setRestaurants((prev) =>
            prev.map((r) =>
              r.id === detailId ? { ...r, menu: (r.menu || []).filter((c) => c.id !== categoryId) } : r
            )
          );
        },
      },
    ]);
  }

  function openAddItem(categoryId) {
    setEditingItemCategoryId(categoryId);
    setEditingItemId(null);
    setItemDraft(emptyItemDraft());
    setItemModalOpen(true);
  }
  function openEditItem(categoryId, item) {
    setEditingItemCategoryId(categoryId);
    setEditingItemId(item.id);
    setItemDraft({
      name: item.name || '',
      description: item.description || '',
      price: item.price != null ? String(item.price) : '',
      image: item.image || null,
    });
    setItemModalOpen(true);
  }
  async function pickItemImage() {
    const result = await pickCompressedImage();
    if (result.error === 'permission') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    if (result.uri) {
      setItemDraft((d) => ({ ...d, image: result.uri }));
    }
  }
  function saveItem() {
    const name = itemDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this menu item a name.');
      return;
    }
    const price = itemDraft.price.trim() === '' ? null : parseFloat(itemDraft.price);
    setRestaurants((prev) =>
      prev.map((r) => {
        if (r.id !== detailId) return r;
        return {
          ...r,
          menu: (r.menu || []).map((c) => {
            if (c.id !== editingItemCategoryId) return c;
            if (editingItemId) {
              return {
                ...c,
                items: c.items.map((it) =>
                  it.id === editingItemId
                    ? { ...it, name, description: itemDraft.description.trim(), price, image: itemDraft.image }
                    : it
                ),
              };
            }
            return {
              ...c,
              items: [
                ...(c.items || []),
                { id: makeId('item'), name, description: itemDraft.description.trim(), price, image: itemDraft.image },
              ],
            };
          }),
        };
      })
    );
    setItemModalOpen(false);
  }
  function deleteItem(categoryId, itemId) {
    Alert.alert('Delete this item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setRestaurants((prev) =>
            prev.map((r) =>
              r.id !== detailId
                ? r
                : {
                    ...r,
                    menu: (r.menu || []).map((c) =>
                      c.id === categoryId ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c
                    ),
                  }
            )
          );
        },
      },
    ]);
  }

  function toggleFavoriteItem(categoryId, itemId) {
    setRestaurants((prev) =>
      prev.map((r) =>
        r.id !== detailId
          ? r
          : {
              ...r,
              menu: (r.menu || []).map((c) =>
                c.id !== categoryId
                  ? c
                  : {
                      ...c,
                      items: c.items.map((it) =>
                        it.id === itemId ? { ...it, favorite: !it.favorite } : it
                      ),
                    }
              ),
            }
      )
    );
  }

  // --- Detail view: one restaurant, its info, and its full menu ---
  if (detail) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={shared.container}>
          <TouchableOpacity onPress={() => setDetailId(null)} style={{ marginBottom: 8 }}>
            <Text style={{ color: GOLD, fontSize: 15, fontWeight: '700' }}>‹ All Restaurants</Text>
          </TouchableOpacity>

          {detail.image ? (
            <Image source={{ uri: detail.image }} style={styles.detailImage} />
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={[shared.h1, { flex: 1 }]}>{detail.name}</Text>
            <TouchableOpacity onPress={() => openEditRestaurant(detail)}>
              <Text style={{ color: GOLD, fontSize: 13, fontWeight: '700' }}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: DIM, fontSize: 13, marginBottom: 10 }}>
            {detail.cuisine} · {detail.priceTier}
            {detail.rating > 0 ? ` · ${'★'.repeat(detail.rating)}${'☆'.repeat(5 - detail.rating)}` : ''}
          </Text>

          {detail.address || detail.phone || detail.website ? (
            <View style={styles.actionRow}>
              {detail.address ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(detail.address)}`)}
                >
                  <Text style={styles.actionIcon}>📍</Text>
                  <Text style={styles.actionLabel}>Directions</Text>
                </TouchableOpacity>
              ) : null}
              {detail.phone ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${detail.phone}`)}>
                  <Text style={styles.actionIcon}>📞</Text>
                  <Text style={styles.actionLabel}>Call</Text>
                </TouchableOpacity>
              ) : null}
              {detail.website ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(detail.website)}>
                  <Text style={styles.actionIcon}>🔗</Text>
                  <Text style={styles.actionLabel}>Website</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={shared.block}>
            {detail.address ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={styles.infoText}>{detail.address}</Text>
              </View>
            ) : null}
            {detail.hours ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🕒</Text>
                <Text style={styles.infoText}>{detail.hours}</Text>
              </View>
            ) : null}
            {detail.notes ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📝</Text>
                <Text style={styles.infoText}>{detail.notes}</Text>
              </View>
            ) : null}
          </View>

          {(() => {
            const favorites = [];
            (detail.menu || []).forEach((c) =>
              (c.items || []).forEach((it) => {
                if (it.favorite) favorites.push(it);
              })
            );
            if (favorites.length === 0) return null;
            return (
              <View style={[shared.block, { borderColor: 'rgba(217,164,65,0.35)' }]}>
                <Text style={shared.blockTitle}>★ Favorites</Text>
                {favorites.map((item) => (
                  <View key={item.id} style={shared.row}>
                    {item.image ? <Image source={{ uri: item.image }} style={shared.thumb44} /> : null}
                    <View style={{ flex: 1, marginLeft: item.image ? 10 : 0 }}>
                      <Text style={shared.rowName}>{item.name}</Text>
                    </View>
                    {item.price != null ? (
                      <Text style={shared.rowRight}>${Number(item.price).toFixed(2)}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          })()}

          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>🍽️ Menu</Text>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <TouchableOpacity onPress={openMenuImport}>
                <Text style={styles.addLink}>🔗 Import from Link</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openAddCategory}>
                <Text style={styles.addLink}>+ Category</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(detail.menu || []).length === 0 ? (
            <Text style={shared.tagline}>No menu categories yet — add one to start building the menu.</Text>
          ) : (
            (detail.menu || []).map((cat) => (
              <View key={cat.id} style={shared.block}>
                <View style={shared.blockHead}>
                  <Text style={shared.blockTitle}>{cat.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <TouchableOpacity onPress={() => openAddItem(cat.id)}>
                      <Text style={styles.addLink}>+ Item</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteCategory(cat.id)}>
                      <Text style={{ color: ROSE, fontSize: 13, fontWeight: '700' }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {(cat.items || []).length === 0 ? (
                  <Text style={shared.tagline}>Nothing in this category yet.</Text>
                ) : (
                  cat.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={shared.row}
                      onPress={() => openEditItem(cat.id, item)}
                      onLongPress={() => deleteItem(cat.id, item.id)}
                    >
                      <TouchableOpacity
                        onPress={() => toggleFavoriteItem(cat.id, item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginRight: 8 }}
                      >
                        <Text style={{ fontSize: 18, color: item.favorite ? GOLD : '#3a3226' }}>
                          {item.favorite ? '★' : '☆'}
                        </Text>
                      </TouchableOpacity>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={shared.thumb44} />
                      ) : null}
                      <View style={{ flex: 1, marginLeft: item.image ? 10 : 0 }}>
                        <Text style={shared.rowName}>{item.name}</Text>
                        {item.description ? (
                          <Text style={{ color: DIM, fontSize: 12, marginTop: 2 }}>{item.description}</Text>
                        ) : null}
                      </View>
                      {item.price != null ? (
                        <Text style={shared.rowRight}>${Number(item.price).toFixed(2)}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ))
          )}

          <TouchableOpacity style={styles.deleteRestaurantBtn} onPress={() => deleteRestaurant(detail.id)}>
            <Text style={styles.deleteRestaurantText}>Delete Restaurant</Text>
          </TouchableOpacity>
        </ScrollView>

        {renderCategoryModal()}
        {renderItemModal()}
        {renderRestaurantModal()}
        {renderMenuImportModal()}
      </View>
    );
  }

  // --- List view: every restaurant, tap to open ---
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <View style={shared.blockHead}>
          <Text style={shared.h1}>Restaurants</Text>
        </View>
        <Text style={shared.tagline}>Your own restaurant list — menus, prices, notes, all in one place.</Text>

        {list.length === 0 ? (
          <View style={shared.block}>
            <Text style={shared.tagline}>Nothing saved yet. Tap + to add your first restaurant.</Text>
          </View>
        ) : (
          list.map((r) => (
            <TouchableOpacity key={r.id} style={styles.restaurantCard} onPress={() => setDetailId(r.id)}>
              {r.image ? (
                <Image source={{ uri: r.image }} style={styles.cardCoverImage} />
              ) : (
                <View style={[styles.cardCoverImage, styles.cardImagePlaceholder]}>
                  <Text style={{ fontSize: 36 }}>🍽️</Text>
                </View>
              )}
              <View style={styles.cardPriceBadge}>
                <Text style={styles.cardPriceBadgeText}>{r.priceTier}</Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={styles.cardName}>{r.name}</Text>
                  {r.rating > 0 ? (
                    <Text style={styles.cardRating}>
                      ★ {r.rating}<Text style={{ color: DIM }}>/5</Text>
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.cardMeta}>{r.cuisine}</Text>
                {r.address ? (
                  <Text style={styles.cardAddress} numberOfLines={1}>📍 {r.address}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddRestaurant}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {renderRestaurantModal()}
    </View>
  );

  function renderRestaurantModal() {
    return (
      <Modal
        visible={restaurantModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRestaurantModalOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingRestaurantId ? 'Edit Restaurant' : 'Add Restaurant'}
              </Text>

              <TouchableOpacity style={styles.photoBtn} onPress={pickRestaurantImage}>
                {restaurantDraft.image ? (
                  <Image source={{ uri: restaurantDraft.image }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoBtnText}>Add Photo</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Website (optional)</Text>
              <TextInput
                style={styles.input}
                value={restaurantDraft.website}
                onChangeText={(v) => setRestaurantDraft((d) => ({ ...d, website: v }))}
                placeholder="https://..."
                placeholderTextColor="#9aa5b1"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.chip, { alignSelf: 'flex-start', marginTop: 8, marginBottom: 4 }]}
                onPress={autoFillFromWebsite}
                disabled={fetchLoading}
              >
                <Text style={[styles.chipText, { color: GOLD, fontWeight: '700' }]}>
                  {fetchLoading ? 'Fetching...' : 'Auto-fill Name/Photo from Link'}
                </Text>
              </TouchableOpacity>
              {fetchError ? (
                <Text style={{ color: ROSE, fontSize: 12, marginBottom: 6 }}>{fetchError}</Text>
              ) : null}

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={restaurantDraft.name}
                onChangeText={(v) => setRestaurantDraft((d) => ({ ...d, name: v }))}
                placeholder="What is it?"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Cuisine</Text>
              <View style={styles.chipRow}>
                {CUISINES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, restaurantDraft.cuisine === c && styles.chipSel]}
                    onPress={() => setRestaurantDraft((d) => ({ ...d, cuisine: c }))}
                  >
                    <Text style={[styles.chipText, restaurantDraft.cuisine === c && styles.chipTextSel]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Price</Text>
              <View style={styles.chipRow}>
                {PRICE_TIERS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, restaurantDraft.priceTier === p && styles.chipSel]}
                    onPress={() => setRestaurantDraft((d) => ({ ...d, priceTier: p }))}
                  >
                    <Text style={[styles.chipText, restaurantDraft.priceTier === p && styles.chipTextSel]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Your Rating</Text>
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setRestaurantDraft((d) => ({ ...d, rating: d.rating === n ? 0 : n }))}
                  >
                    <Text style={{ fontSize: 28, color: n <= restaurantDraft.rating ? GOLD : '#3a3226', marginRight: 4 }}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Address (optional)</Text>
              <TextInput
                style={styles.input}
                value={restaurantDraft.address}
                onChangeText={(v) => setRestaurantDraft((d) => ({ ...d, address: v }))}
                placeholder="Address"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput
                style={styles.input}
                value={restaurantDraft.phone}
                onChangeText={(v) => setRestaurantDraft((d) => ({ ...d, phone: v }))}
                placeholder="Phone number"
                placeholderTextColor="#9aa5b1"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Hours (optional)</Text>
              <TextInput
                style={styles.input}
                value={restaurantDraft.hours}
                onChangeText={(v) => setRestaurantDraft((d) => ({ ...d, hours: v }))}
                placeholder="e.g. Mon-Sat 11am-9pm"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={restaurantDraft.notes}
                onChangeText={(v) => setRestaurantDraft((d) => ({ ...d, notes: v }))}
                placeholder="What to order, parking tips, anything worth remembering"
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveRestaurant}>
                <Text style={styles.saveBtnText}>{editingRestaurantId ? 'Save Changes' : 'Add Restaurant'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRestaurantModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderCategoryModal() {
    return (
      <Modal
        visible={categoryModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Menu Category</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={categoryDraft}
              onChangeText={setCategoryDraft}
              placeholder="e.g. Appetizers, Entrees, Drinks"
              placeholderTextColor="#9aa5b1"
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveCategory}>
              <Text style={styles.saveBtnText}>Add Category</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCategoryModalOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderMenuImportModal() {
    return (
      <Modal
        visible={menuImportModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMenuImportModalOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>Import Menu from Link</Text>
              <Text style={{ color: DIM, fontSize: 12, marginBottom: 12 }}>
                Paste the restaurant's menu page. This only works on sites that publish a real
                structured menu (schema.org) - most don't, so this won't work everywhere. Nothing
                gets added until you review and confirm below.
              </Text>

              <TextInput
                style={styles.input}
                value={menuImportUrl}
                onChangeText={setMenuImportUrl}
                placeholder="https://restaurant.com/menu"
                placeholderTextColor="#9aa5b1"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.saveBtn, { marginTop: 10 }]}
                onPress={runMenuImport}
                disabled={menuImportLoading}
              >
                <Text style={styles.saveBtnText}>{menuImportLoading ? 'Checking...' : 'Check Link'}</Text>
              </TouchableOpacity>
              {menuImportError ? (
                <Text style={{ color: ROSE, fontSize: 13, marginTop: 10 }}>{menuImportError}</Text>
              ) : null}

              {menuImportResult ? (
                <>
                  <View style={{ height: 1, backgroundColor: BORDER, marginVertical: 16 }} />
                  <Text style={styles.label}>Review what to import</Text>
                  {menuImportResult.map((cat, ci) => (
                    <View key={ci} style={{ marginBottom: 14 }}>
                      <Text style={{ color: GOLD, fontSize: 14, fontWeight: '700', marginBottom: 6 }}>
                        {cat.name}
                      </Text>
                      {cat.items.map((it, ii) => {
                        const key = `${ci}-${ii}`;
                        const checked = !!menuImportChecked[key];
                        return (
                          <TouchableOpacity
                            key={key}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                            onPress={() =>
                              setMenuImportChecked((prev) => ({ ...prev, [key]: !prev[key] }))
                            }
                          >
                            <Text style={{ fontSize: 18, color: checked ? GOLD : '#3a3226', marginRight: 10 }}>
                              {checked ? '☑' : '☐'}
                            </Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: INK, fontSize: 14 }}>{it.name}</Text>
                              {it.description ? (
                                <Text style={{ color: DIM, fontSize: 11, marginTop: 1 }}>{it.description}</Text>
                              ) : null}
                            </View>
                            {it.price != null ? (
                              <Text style={{ color: GOLD, fontSize: 13, fontWeight: '700' }}>
                                ${Number(it.price).toFixed(2)}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                  <TouchableOpacity style={styles.saveBtn} onPress={confirmMenuImport}>
                    <Text style={styles.saveBtnText}>Add Checked Items</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMenuImportModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderItemModal() {
    return (
      <Modal visible={itemModalOpen} animationType="slide" transparent onRequestClose={() => setItemModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{editingItemId ? 'Edit Item' : 'Add Menu Item'}</Text>

              <TouchableOpacity style={styles.photoBtn} onPress={pickItemImage}>
                {itemDraft.image ? (
                  <Image source={{ uri: itemDraft.image }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoBtnText}>Add Photo (optional)</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={itemDraft.name}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, name: v }))}
                placeholder="Dish name"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={itemDraft.description}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, description: v }))}
                placeholder="What's in it"
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <Text style={styles.label}>Price (optional)</Text>
              <TextInput
                style={styles.input}
                value={itemDraft.price}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, price: v.replace(/[^0-9.]/g, '') }))}
                placeholder="0.00"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                <Text style={styles.saveBtnText}>{editingItemId ? 'Save Changes' : 'Add Item'}</Text>
              </TouchableOpacity>
              {editingItemId ? (
                <TouchableOpacity
                  style={styles.deleteRestaurantBtn}
                  onPress={() => {
                    setItemModalOpen(false);
                    deleteItem(editingItemCategoryId, editingItemId);
                  }}
                >
                  <Text style={styles.deleteRestaurantText}>Delete Item</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setItemModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  restaurantCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  cardCoverImage: { width: '100%', height: 150, backgroundColor: '#1a1512' },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardPriceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(12,10,8,0.85)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(217,164,65,0.4)',
  },
  cardPriceBadgeText: { color: GOLD, fontSize: 12, fontWeight: '700' },
  cardInfo: { padding: 14 },
  cardName: { color: INK, fontSize: 17, fontWeight: '800', flex: 1, marginRight: 8 },
  cardRating: { color: GOLD, fontSize: 14, fontWeight: '700' },
  cardMeta: { color: DIM, fontSize: 13, marginTop: 3 },
  cardAddress: { color: DIM, fontSize: 12, marginTop: 6 },
  detailImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionBtn: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,164,65,0.3)',
  },
  actionIcon: { fontSize: 18, marginBottom: 4 },
  actionLabel: { color: GOLD, fontSize: 12, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoIcon: { fontSize: 15, marginRight: 10, width: 20, textAlign: 'center' },
  infoText: { color: INK, fontSize: 14, flex: 1 },
  addLink: { color: GOLD, fontSize: 13, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#1c1206', fontSize: 30, fontWeight: '700', marginTop: -2 },
  deleteRestaurantBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  deleteRestaurantText: { color: ROSE, fontSize: 14, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0c0a08', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  sheetTitle: { color: INK, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  label: { color: DIM, fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: '#1f1a15',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#1f1a15',
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipSel: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: DIM, fontSize: 13 },
  chipTextSel: { color: '#1c1206', fontWeight: '700' },
  photoBtn: {
    borderWidth: 1,
    borderColor: 'rgba(217,164,65,0.4)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  photoBtnText: { color: GOLD, fontSize: 14, fontWeight: '600' },
  photoPreview: { width: '100%', height: 140, borderRadius: 10 },
  saveBtn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: '#1c1206', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: DIM, fontSize: 14 },
});
