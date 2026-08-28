import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EditorState } from '../features/editor/types';

export type SavedImage = {
  id: string;
  uri: string;
  createdAt: string;
  annotationCount: number;
  notePreview?: string;
};

const SAVED_IMAGES_KEY = 'tiksnap.saved-images';
const WATERMARK_KEY = 'tiksnap.watermark-enabled';
const LAUNCH_MODE_KEY = 'tiksnap.launch-mode';
const EDITOR_DRAFT_KEY = 'tiksnap.editor-draft';

export type LaunchMode = 'quick-start' | 'normal';

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

export async function readLaunchMode(): Promise<LaunchMode> {
  const value = await AsyncStorage.getItem(LAUNCH_MODE_KEY);
  return value === 'quick-start' ? 'quick-start' : 'normal';
}

export async function writeLaunchMode(value: LaunchMode): Promise<void> {
  await AsyncStorage.setItem(LAUNCH_MODE_KEY, value);
}

export async function writeEditorDraft(uri: string, state: EditorState): Promise<void> {
  await AsyncStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify({ uri, state, updatedAt: Date.now() }));
}

export async function readEditorDraft(uri: string): Promise<EditorState | null> {
  try {
    const raw = await AsyncStorage.getItem(EDITOR_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { uri?: string; state?: EditorState };
    return draft.uri === uri && draft.state ? draft.state : null;
  } catch { return null; }
}

export async function clearEditorDraft(uri: string): Promise<void> {
  const raw = await AsyncStorage.getItem(EDITOR_DRAFT_KEY);
  if (!raw) return;
  try { if ((JSON.parse(raw) as { uri?: string }).uri === uri) await AsyncStorage.removeItem(EDITOR_DRAFT_KEY); } catch { /* ignore corrupt drafts */ }
}
