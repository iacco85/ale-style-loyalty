import { ref } from "vue";
import { messageFor } from "../errorMessage";

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
