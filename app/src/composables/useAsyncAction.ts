import { ref } from "vue";
import { ApiError } from "../http";

const messages: Record<string, string> = {
  unauthorized: "Sessione scaduta, accedi di nuovo",
  invalid_phone: "Numero di telefono non valido",
  not_found: "Elemento non trovato",
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
