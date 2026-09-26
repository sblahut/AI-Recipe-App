import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { Platform } from "react-native";

export type ReceiptImageSource = "library" | "camera";

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

/** Pick a receipt photo and return base64 JPEG (no data-URL prefix). */
export async function pickReceiptImageBase64(source: ReceiptImageSource): Promise<string | null> {
  const granted = await ensurePermission(source);
  if (!granted) {
    throw new Error(
      source === "library"
        ? "Photo library access is required to choose a receipt image."
        : "Camera access is required to photograph a receipt.",
    );
  }

  const result =
    source === "library"
      ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.75,
        })
      : await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.75,
        });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return readAsStringAsync(result.assets[0].uri, { encoding: "base64" });
}
