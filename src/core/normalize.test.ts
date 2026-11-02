import { displayName, normalize, UNKNOWN_MERCHANT } from "./normalize";

describe("normalize", () => {
  it("groups the same merchant written different ways", () => {
    const variants = ["NETFLIX.COM 8573 CARD-1234", "Netflix.com 9912", "POS NETFLIX.COM XX4421", "netflix 14/03"];
    expect(new Set(variants.map(normalize))).toEqual(new Set(["netflix"]));
  });

  it("strips payment prefixes, references and dates", () => {
    expect(normalize("DEBIT CARD PURCHASE Coffin Cloud #00291")).toBe("coffin cloud");
    expect(normalize("UPI/Bat Beats 2026-03-14")).toBe("bat beats");
    expect(normalize("ACH Wraith Gym *4421")).toBe("wraith gym");
    expect(normalize("SQ *Lantern Cafe")).toBe("lantern cafe");
  });

  it("keeps merchants whose name happens to be a prefix word", () => {
    expect(normalize("PayPal")).toBe("paypal");
    expect(normalize("Possum Pies")).toBe("possum pies");
  });

  // Bengali vowel signs are combining marks (\p{M}); stripping them as punctuation broke the word apart.
  it("keeps non-English letters", () => {
    expect(normalize("দারাজ 1234")).toBe("দারাজ");
  });

  it("falls back for pure noise", () => {
    expect(normalize("123456")).toBe(UNKNOWN_MERCHANT);
    expect(normalize("")).toBe(UNKNOWN_MERCHANT);
  });
});

describe("displayName", () => {
  it("title-cases the key", () => {
    expect(displayName("coffin cloud")).toBe("Coffin Cloud");
    expect(displayName("grimflix")).toBe("Grimflix");
    expect(displayName("phantom shield vpn")).toBe("Phantom Shield VPN");
  });
});
