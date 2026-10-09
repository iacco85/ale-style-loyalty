import { computed, ref } from "vue";

const storageKey = "ale-style-admin-password";

function readStoredPassword(): string {
  try {
    return localStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

function storePassword(value: string) {
  try {
    if (value) localStorage.setItem(storageKey, value);
    else localStorage.removeItem(storageKey);
  } catch {
    // storage non disponibile: la sessione dura solo finché la pagina resta aperta
  }
}

const password = ref(readStoredPassword());

export function currentPassword(): string {
  return password.value;
}

export function useAuth() {
  return {
    isLoggedIn: computed(() => password.value !== ""),
    signIn(value: string) {
      password.value = value;
      storePassword(value);
    },
    signOut() {
      password.value = "";
      storePassword("");
    },
  };
}
