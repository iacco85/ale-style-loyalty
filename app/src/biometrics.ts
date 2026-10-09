import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

export async function isBiometricSupported(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { isAvailable } = await NativeBiometric.isAvailable({ useFallback: false });
    return isAvailable;
  } catch {
    return false;
  }
}

export async function verifyBiometricIdentity(): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      title: "Ale Style",
      subtitle: "Conferma la tua identità",
      negativeButtonText: "Annulla",
    });
    return true;
  } catch {
    return false;
  }
}
