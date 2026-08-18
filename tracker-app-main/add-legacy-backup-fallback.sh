#!/bin/bash
set -e

# Run this from the root of your tracker-app project.
#
# What this fixes: pullBackupFromCloud() only knows how to read the
# newer chunked backup format (a manifest doc with `chunkCount` + a
# `chunks` subcollection). Your actual cloud backup predates that
# migration - it's a single trackerBackups/{uid} document with the
# whole payload directly under a `data` field, and no `chunkCount`.
# Because chunkCount comes back undefined (0), the pull code has been
# treating that as "no backup" and returning null, even though the
# real data is sitting right there in the old field.
#
# The fix: if the manifest document exists but has no chunkCount,
# fall back to reading `data` directly off it (the old format) instead
# of assuming there's nothing there.

FILE="firebaseSync.js"
if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found - run this from your project root." >&2
  exit 1
fi

echo "==> Patching $FILE"
python3 << 'PYEOF'
path = "firebaseSync.js"
with open(path, "r") as f:
    src = f.read()

old = '''  const manifestSnap = await getDoc(doc(db, 'trackerBackups', uid));
  // exists is a METHOD in the modular API, not a property like it was
  // in the old namespaced style - a easy thing to get wrong silently.
  if (!manifestSnap.exists()) return null;
  const chunkCount = manifestSnap.data()?.chunkCount || 0;
  if (chunkCount === 0) return null;'''

new = '''  const manifestSnap = await getDoc(doc(db, 'trackerBackups', uid));
  // exists is a METHOD in the modular API, not a property like it was
  // in the old namespaced style - a easy thing to get wrong silently.
  if (!manifestSnap.exists()) return null;
  const manifestData = manifestSnap.data();
  const chunkCount = manifestData?.chunkCount || 0;

  if (chunkCount === 0) {
    // Backwards compatibility: backups written before the chunked-
    // storage migration stored the full payload directly under a
    // `data` field on this same manifest document, with no
    // chunkCount at all. Treating that as "no backup" would silently
    // throw away a perfectly good pre-migration backup - read it the
    // old way instead.
    if (manifestData && manifestData.data) {
      return manifestData.data;
    }
    return null;
  }'''

if old not in src:
    raise SystemExit("Could not find the expected pullBackupFromCloud body - aborting, no changes made.")
src = src.replace(old, new, 1)

with open(path, "w") as f:
    f.write(src)

print("  firebaseSync.js patched successfully")
PYEOF

echo ""
echo "Done. Reload the app and tap 'Restore from Cloud' in Settings again -"
echo "it should now find and offer to restore your old-format backup."
echo ""
echo "One more thing worth knowing: the NEXT time this app pushes a backup"
echo "(any autosave while signed in), pushBackupToCloud() will overwrite"
echo "that document with the new chunked format. That's fine and expected -"
echo "just flagging it so it's not a surprise if you look at the document"
echo "in the console again later and its shape has changed."