import AsyncStorage from '@react-native-async-storage/async-storage';

export type SavedImage = {
  id: string;
  uri: string;
  createdAt: string;
  annotationCount: number;
  notePreview?: string;
};

const SAVED_IMAGES_KEY = 'quick-mark.saved-images';
const WATERMARK_KEY = 'quick-mark.watermark-enabled';

export async function readSavedImages(): Promise<SavedImage[]> {
  const raw = await AsyncStorage.getItem(SAVED_IMAGES_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedImage[]) : [];
  } catch {
    return [];
  }
}

export async function writeSavedImage(image: SavedImage): Promise<void> {
  const current = await readSavedImages();
  const next = [image, ...current.filter((item) => item.id !== image.id)].slice(
    0,
    24,
  );
  await AsyncStorage.setItem(SAVED_IMAGES_KEY, JSON.stringify(next));
}

export async function deleteSavedImage(id: string): Promise<void> {
  const current = await readSavedImages();
  await AsyncStorage.setItem(
    SAVED_IMAGES_KEY,
    JSON.stringify(current.filter((item) => item.id !== id)),
  );
}

export async function readWatermarkEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(WATERMARK_KEY);
  return value !== 'false';
}

export async function writeWatermarkEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(WATERMARK_KEY, String(value));
}