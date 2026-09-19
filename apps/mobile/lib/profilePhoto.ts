import * as ImagePicker from "expo-image-picker";
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
} from "expo-file-system/legacy";
import { Platform } from "react-native";

const PROFILE_PHOTO_NAME = "profile-photo.jpg";

export function profilePhotoFileUri(): string | null {
  if (!documentDirectory) {
    return null;
  }
  return `${documentDirectory}${PROFILE_PHOTO_NAME}`;
}

export async function persistProfilePhoto(sourceUri: string): Promise<string> {
  const dest = profilePhotoFileUri();
  if (!dest) {
    throw new Error("File storage is not available on this device.");
  }
  await deleteAsync(dest, { idempotent: true });
  await copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deleteStoredProfilePhoto(): Promise<void> {
  const dest = profilePhotoFileUri();
  if (!dest) {
    return;
  }
  await deleteAsync(dest, { idempotent: true });
}

export async function profilePhotoFileExists(): Promise<boolean> {
  const dest = profilePhotoFileUri();
  if (!dest) {
    return false;
  }
  const info = await getInfoAsync(dest);
  return info.exists;
}

type PickSource = "library" | "camera";

async function ensurePermission(source: PickSource): Promise<boolean> {
  if (source === "library") {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === ImagePicker.PermissionStatus.GRANTED;
  }
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === ImagePicker.PermissionStatus.GRANTED;
}

/** Pick a square photo and copy it into app storage. Returns null if cancelled or denied. */
export async function pickProfilePhoto(source: PickSource): Promise<string | null> {
  const granted = await ensurePermission(source);
  if (!granted) {
    throw new Error(
      source === "library"
        ? "Photo library access is required to choose a profile picture."
        : "Camera access is required to take a profile picture.",
    );
  }

  const result =
    source === "library"
      ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        })
      : await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return persistProfilePhoto(result.assets[0].uri);
}

export function profilePhotoSourceOptions(): PickSource[] {
  if (Platform.OS === "web") {
    return ["library"];
  }
  return ["library", "camera"];
}
