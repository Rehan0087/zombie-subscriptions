import fc from "fast-check";
import { normalize } from "./normalize";
import { arbNoisyDescription, INVENTED_MERCHANTS } from "./test-arbitraries";

describe("normalization properties", () => {
  it("P2: normalize is idempotent", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.fullUnicodeString(), fc.constantFrom(...INVENTED_MERCHANTS).chain(arbNoisyDescription)), (s) => {
        const once = normalize(s);
        expect(normalize(once)).toBe(once);
      }),
      { numRuns: 500 },
    );
  });

  it("P3: bank noise does not change the merchant key", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INVENTED_MERCHANTS).chain((m) => fc.tuple(fc.constant(m), arbNoisyDescription(m))),
        ([merchant, noisy]) => {
          expect(normalize(noisy)).toBe(normalize(merchant));
        },
      ),
      { numRuns: 200 },
    );
  });
});
