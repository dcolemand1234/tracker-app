import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// Picks a photo and resizes it to a sane max dimension before returning it
// as a base64 data URI. Resizing (not just JPEG quality) is what actually
// keeps file size down — a modern phone camera photo run through the old
// { quality: 0.5 } option alone stayed at full resolution and could still
// be several MB of base64 text sitting in storage.
export async function pickCompressedImage(maxDim = 900, quality = 0.72) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { error: 'permission' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });
  if (result.canceled || !result.assets || !result.assets[0]) {
    return { canceled: true };
  }
  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: maxDim } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return { uri: `data:image/jpeg;base64,${manipulated.base64}` };
}

