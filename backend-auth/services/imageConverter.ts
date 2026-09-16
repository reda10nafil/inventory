import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToDrive } from '../google/drive';

/**
 * Seleziona un'immagine dalla galleria e la carica su Drive
 * Restituisce il link scaricabile
 */
export async function pickAndUploadImage(
  accessToken: string
): Promise<string | null> {
  try {
    // Seleziona immagine
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const imageUri = result.assets[0].uri;

    // Converti in base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Carica su Drive
    const fileName = `product_${Date.now()}.jpg`;
    const imageUrl = await uploadImageToDrive(accessToken, fileName, base64);

    return imageUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

/**
 * Converti un'immagine da URI a link Drive
 */
export async function convertImageToLink(
  accessToken: string,
  imageUri: string,
  fileName?: string
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64
  });

  const name = fileName || `product_${Date.now()}.jpg`;
  return uploadImageToDrive(accessToken, name, base64);
}

export default { pickAndUploadImage, convertImageToLink };
