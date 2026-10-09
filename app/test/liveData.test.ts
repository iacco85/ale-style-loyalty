import { describe, expect, it } from "vitest";
import { ApiError } from "../src/http";
import { createLiveData } from "../src/liveData";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createLiveData", () => {
  it("loads the data and clears the busy flag", async () => {
    const live = createLiveData(async () => 42);
    const loading = live.load();
    expect(live.busy.value).toBe(true);
    await loading;
    expect(live.data.value).toBe(42);
    expect(live.busy.value).toBe(false);
    expect(live.error.value).toBe("");
  });

  it("shows an error when the first load fails", async () => {
    const live = createLiveData<number>(async () => {
      throw new TypeError("network down");
    });
    await live.load();
    expect(live.error.value).toBe("Impossibile contattare il server");
    expect(live.data.value).toBeUndefined();
  });

  it("starts from the initial value when one is given", () => {
    expect(createLiveData(async () => [1], [] as number[]).data.value).toEqual([]);
  });

  it("keeps the old data and stays quiet when a background refresh fails", async () => {
    let fail = false;
    const live = createLiveData(async () => {
      if (fail) throw new TypeError("offline");
      return "vecchio";
    });
    await live.load();

    fail = true;
    await live.load({ background: true });

    expect(live.data.value).toBe("vecchio");
    expect(live.error.value).toBe("");
  });

  it("does not flip the busy flag during a background refresh", async () => {
    const live = createLiveData(async () => 1);
    const refreshing = live.load({ background: true });
    expect(live.busy.value).toBe(false);
    await refreshing;
  });

  it("replaces the data when a background refresh succeeds", async () => {
    let value = 1;
    const live = createLiveData(async () => value);
    await live.load();
    value = 2;
    await live.load({ background: true });
    expect(live.data.value).toBe(2);
  });

  it("clears an old error once a refresh succeeds again", async () => {
    let fail = true;
    const live = createLiveData(async () => {
      if (fail) throw new TypeError("offline");
      return "ok";
    });
    await live.load();
    expect(live.error.value).not.toBe("");

    fail = false;
    await live.load({ background: true });
    expect(live.error.value).toBe("");
    expect(live.data.value).toBe("ok");
  });

  it("ignores a refresh requested while another one is still running", async () => {
    const pending = deferred<number>();
    let calls = 0;
    const live = createLiveData(() => {
      calls++;
      return pending.promise;
    });

    const first = live.load();
    await live.load({ background: true });
    pending.resolve(7);
    await first;

    expect(calls).toBe(1);
    expect(live.data.value).toBe(7);
  });

  it("maps API errors to a readable message", async () => {
    const live = createLiveData<number>(async () => {
      throw new ApiError(404, { error: "not_found" });
    });
    await live.load();
    expect(live.error.value).toBe("Elemento non trovato");
  });
});
