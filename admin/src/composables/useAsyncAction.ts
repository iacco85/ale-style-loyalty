import { ref } from "vue";
import { ApiError } from "../http";

const messages: Record<string, string> = {
  unauthorized: "Password non corretta",
  not_found: "Elemento non trovato",
  already_redeemed: "Premio già usato",
  expired: "Premio scaduto",
  not_enough_points: "Punti insufficienti per uno sconto",
};

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return messages[error.code] ?? "Operazione non riuscita, riprova";
  return "Impossibile contattare il server";
}

export function useAsyncAction() {
  const busy = ref(false);
  const error = ref("");

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    busy.value = true;
    error.value = "";
    try {
      return await action();
    } catch (e) {
      error.value = messageFor(e);
      return undefined;
    } finally {
      busy.value = false;
    }
  }

  return { busy, error, run };
}
