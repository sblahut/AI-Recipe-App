import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { Platform } from "react-native";

export type ReceiptImageSource = "library" | "camera";

export const MAX_RECEIPT_PHOTOS = 8;

export type ReceiptPickedPhoto = {
  uri: string;
  base64: string;
};

async function ensurePermission(source: ReceiptImageSource): Promise<boolean> {
  if (source === "library") {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === ImagePicker.PermissionStatus.GRANTED;
  }
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === ImagePicker.PermissionStatus.GRANTED;
}

export function receiptImageSourceOptions(): ReceiptImageSource[] {
  if (Platform.OS === "web") {
    return ["library"];
  }
  return ["library", "camera"];
}

async function readAssetBase64(uri: string): Promise<string> {
  return readAsStringAsync(uri, { encoding: "base64" });
}

/** Pick one receipt photo and return base64 JPEG (no data-URL prefix). */
export async function pickReceiptImageBase64(source: ReceiptImageSource): Promise<string | null> {
  const photos = await pickReceiptPhotos(source, { existingCount: 0, maxNew: 1 });
  return photos[0]?.base64 ?? null;
}

type PickReceiptPhotosOptions = {
  existingCount: number;
  maxNew?: number;
};

/** Pick one or more receipt photos from the library or camera. */
export async function pickReceiptPhotos(
  source: ReceiptImageSource,
  options: PickReceiptPhotosOptions,
): Promise<ReceiptPickedPhoto[]> {
  const remainingSlots = MAX_RECEIPT_PHOTOS - options.existingCount;
  if (remainingSlots <= 0) {
    throw new Error(`You can add up to ${MAX_RECEIPT_PHOTOS} photos per receipt.`);
  }
  const maxNew = Math.min(options.maxNew ?? remainingSlots, remainingSlots);

  const granted = await ensurePermission(source);
  if (!granted) {
    throw new Error(
      source === "library"
        ? "Photo library access is required to choose receipt images."
        : "Camera access is required to photograph a receipt.",
    );
  }

  const result =
    source === "library"
      ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          allowsMultipleSelection: maxNew > 1,
          selectionLimit: maxNew,
          quality: 0.75,
        })
      : await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.75,
        });

  if (result.canceled || result.assets.length === 0) {
    return [];
  }

  const assets = result.assets.slice(0, maxNew);
  const photos: ReceiptPickedPhoto[] = [];
  for (const asset of assets) {
    if (!asset.uri) {
      continue;
    }
    const base64 = await readAssetBase64(asset.uri);
    photos.push({ uri: asset.uri, base64 });
  }
  return photos;
}
