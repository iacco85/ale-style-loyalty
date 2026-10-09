import { ref } from "vue";

const storageKey = "ale-style-last-account";

// Solo nome e telefono, mai PIN o token: servono per chiedere solo il PIN ai login successivi
interface RememberedAccount {
  name: string;
  phone: string;
}

function readStoredAccount(): RememberedAccount | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeAccount(account: RememberedAccount | null) {
  try {
    if (account) localStorage.setItem(storageKey, JSON.stringify(account));
    else localStorage.removeItem(storageKey);
  } catch {
    // storage non disponibile: l'account resta ricordato finché l'app è aperta
  }
}

const account = ref(readStoredAccount());

export function useRememberedAccount() {
  return {
    account,
    remember({ name, phone }: RememberedAccount) {
      account.value = { name, phone };
      storeAccount(account.value);
    },
    forget() {
      account.value = null;
      storeAccount(null);
    },
  };
}
