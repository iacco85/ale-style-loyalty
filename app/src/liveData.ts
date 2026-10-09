import { type Ref, ref } from "vue";
import { messageFor } from "./errorMessage";

interface LoadOptions {
  background?: boolean;
}

export interface LiveData<T> {
  data: Ref<T>;
  error: Ref<string>;
  busy: Ref<boolean>;
  load: (options?: LoadOptions) => Promise<void>;
}

export function createLiveData<T>(fetcher: () => Promise<T>): LiveData<T | undefined>;
export function createLiveData<T>(fetcher: () => Promise<T>, initial: T): LiveData<T>;
export function createLiveData<T>(fetcher: () => Promise<T>, initial?: T): LiveData<T | undefined> {
  const data = ref(initial) as Ref<T | undefined>;
  const error = ref("");
  const busy = ref(false);
  let inFlight = false;

  // Un aggiornamento "in background" non tocca lo stato di caricamento e, se fallisce, lascia i dati che c'erano
  async function load({ background = false }: LoadOptions = {}) {
    if (inFlight) return;
    inFlight = true;
    if (!background) {
      busy.value = true;
      error.value = "";
    }
    try {
      data.value = await fetcher();
      error.value = "";
    } catch (e) {
      if (!background) error.value = messageFor(e);
    } finally {
      inFlight = false;
      busy.value = false;
    }
  }

  return { data, error, busy, load };
}
