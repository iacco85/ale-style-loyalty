import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { ref } from "vue";
import { isBiometricSupported, verifyBiometricIdentity } from "../biometrics";
import { resumeGraceMs, shouldLockOnResume } from "../lockPolicy";

const storageKey = "ale-style-biometric-lock";

function readEnabled(): boolean {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function storeEnabled(value: boolean) {
  try {
    if (value) localStorage.setItem(storageKey, "1");
    else localStorage.removeItem(storageKey);
  } catch {
    // storage non disponibile: l'impostazione dura finché l'app resta aperta
  }
}

const enabled = ref(readEnabled());
const locked = ref(enabled.value);
const supported = ref(false);
let leftAt: number | null = null;
let watchingAppState = false;

async function watchAppState() {
  if (watchingAppState || !Capacitor.isNativePlatform()) return;
  watchingAppState = true;
  await App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      leftAt = Date.now();
      return;
    }
    if (shouldLockOnResume({ enabled: enabled.value, leftAt, now: Date.now(), graceMs: resumeGraceMs })) {
      locked.value = true;
    }
  });
}

async function unlock(): Promise<boolean> {
  const verified = await verifyBiometricIdentity();
  if (verified) locked.value = false;
  return verified;
}

async function enable(): Promise<boolean> {
  if (!(await verifyBiometricIdentity())) return false;
  enabled.value = true;
  storeEnabled(true);
  return true;
}

function disable() {
  enabled.value = false;
  locked.value = false;
  storeEnabled(false);
}

async function init() {
  supported.value = await isBiometricSupported();
  if (!supported.value) disable();
  await watchAppState();
}

export function useBiometricLock() {
  return { enabled, locked, supported, init, unlock, enable, disable };
}
