import { computed, ref } from "vue";
import type { Customer } from "../types";

const storageKey = "ale-style-session";

interface Session {
  token: string;
  customer: Customer;
}

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(storageKey, JSON.stringify(session));
    else localStorage.removeItem(storageKey);
  } catch {
    // storage non disponibile: la sessione dura finché l'app resta aperta
  }
}

const session = ref(readStoredSession());

export function currentToken(): string {
  return session.value?.token ?? "";
}

export function useSession() {
  return {
    isLoggedIn: computed(() => session.value !== null),
    customer: computed(() => session.value?.customer ?? null),
    start(value: Session) {
      session.value = value;
      storeSession(value);
    },
    end() {
      session.value = null;
      storeSession(null);
    },
  };
}
