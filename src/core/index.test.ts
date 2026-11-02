import fc from "fast-check";
import { ENGINE_VERSION } from "./index";

describe("toolchain", () => {
  it("runs unit tests", () => {
    expect(ENGINE_VERSION).toBe(1);
  });

  it("runs property tests", () => {
    fc.assert(fc.property(fc.integer(), (n) => n + 0 === n), { numRuns: 200 });
  });
});
