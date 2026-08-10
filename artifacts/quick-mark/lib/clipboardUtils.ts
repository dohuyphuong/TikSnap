import * as Clipboard from 'expo-clipboard';
import { captureRef } from 'react-native-view-shot';

export const copyImageToClipboard = async (canvasRef: React.RefObject<any>) => {
  try {
    const uri = await captureRef(canvasRef, { format: 'png', quality: 1 });
    await Clipboard.setImageAsync(uri);
    return true;
  } catch (e) {
    console.error('Clipboard error:', e);
    return false;
  }
};
