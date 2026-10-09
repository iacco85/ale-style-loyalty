import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
}

async function loadComposable() {
  vi.resetModules();
  return (await import("../src/composables/useRememberedAccount")).useRememberedAccount();
}

describe("useRememberedAccount", () => {
  beforeEach(stubStorage);
  afterEach(() => vi.unstubAllGlobals());

  it("starts with no remembered account", async () => {
    expect((await loadComposable()).account.value).toBeNull();
  });

  it("remembers name and phone, and finds them again on the next app start", async () => {
    (await loadComposable()).remember({ name: "Giulia", phone: "+393331112233" });

    const afterRestart = await loadComposable();
    expect(afterRestart.account.value).toEqual({ name: "Giulia", phone: "+393331112233" });
  });

  it("never stores anything else, such as ids or tokens", async () => {
    (await loadComposable()).remember({ id: 7, name: "Giulia", phone: "+393331112233" } as { name: string; phone: string });
    expect(Object.keys((await loadComposable()).account.value ?? {}).sort()).toEqual(["name", "phone"]);
  });

  it("forgets the account on request", async () => {
    const first = await loadComposable();
    first.remember({ name: "Giulia", phone: "+393331112233" });
    first.forget();

    expect(first.account.value).toBeNull();
    expect((await loadComposable()).account.value).toBeNull();
  });

  it("works without storage available", async () => {
    vi.stubGlobal("localStorage", undefined);
    const composable = await loadComposable();
    composable.remember({ name: "Giulia", phone: "+393331112233" });
    expect(composable.account.value).toEqual({ name: "Giulia", phone: "+393331112233" });
  });
});
