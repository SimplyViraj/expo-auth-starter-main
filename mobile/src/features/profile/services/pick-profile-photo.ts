import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { profilePhotoPolicy } from '@/lib/config/profile-photo-policy';

export type SelectedProfilePhoto = { base64: string; uri: string };

export async function pickProfilePhoto(): Promise<SelectedProfilePhoto | null> {
  // The system photo picker grants access to the selected photo; broad library access is unnecessary.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || asset.width <= 0 || asset.height <= 0) throw new Error('Choose a valid image.');
  if (asset.fileSize && asset.fileSize > profilePhotoPolicy.maxSourceBytes) {
    throw new Error('Choose a photo smaller than 20 MB.');
  }

  const side = Math.min(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    // Native provides the crop UI. Web uses a centered square crop for the same thumbnail shape.
    context.crop({ originX: Math.floor((asset.width - side) / 2), originY: Math.floor((asset.height - side) / 2), width: side, height: side });
    context.resize({ width: profilePhotoPolicy.thumbnailSize, height: profilePhotoPolicy.thumbnailSize });
    const image = await context.renderAsync();
    try {
      const photo = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
      if (!photo.base64) throw new Error('Could not prepare this photo. Choose another image.');
      if (photo.base64.length > 4 * Math.ceil(profilePhotoPolicy.maxUploadBytes / 3)) {
        throw new Error('This photo is too large. Choose a smaller image.');
      }
      return { base64: photo.base64, uri: `data:image/jpeg;base64,${photo.base64}` };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
