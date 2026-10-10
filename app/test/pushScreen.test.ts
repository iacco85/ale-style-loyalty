import { describe, expect, it } from "vitest";
import { routeForPush } from "../src/pushScreen";

describe("routeForPush", () => {
  it("opens the screen named by the notification", () => {
    expect(routeForPush({ screen: "offers" })).toBe("offers");
    expect(routeForPush({ screen: "prizes" })).toBe("prizes");
    expect(routeForPush({ screen: "home" })).toBe("home");
  });

  it("ignores screens the app does not know", () => {
    expect(routeForPush({ screen: "login" })).toBeUndefined();
    expect(routeForPush({ screen: "admin" })).toBeUndefined();
  });

  it("ignores notifications without a screen", () => {
    expect(routeForPush({})).toBeUndefined();
    expect(routeForPush(undefined)).toBeUndefined();
  });
});
