import { onMounted } from "vue";
import { type LiveData, createLiveData } from "../liveData";
import { useAutoRefresh } from "./useAutoRefresh";

export function useLiveData<T>(fetcher: () => Promise<T>): LiveData<T | undefined>;
export function useLiveData<T>(fetcher: () => Promise<T>, initial: T): LiveData<T>;
export function useLiveData<T>(fetcher: () => Promise<T>, initial?: T): LiveData<T | undefined> {
  const live = createLiveData(fetcher, initial as T);
  onMounted(() => live.load());
  useAutoRefresh(() => live.load({ background: true }));
  return live;
}
