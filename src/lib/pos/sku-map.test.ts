import { describe, expect, test } from "bun:test";
import {
  normalizePosSize,
  POS_SKU_ENTRIES,
  resolvePosSku,
} from "./sku-map";

/**
 * Every product + size the LIVE menu can put on an order, read from the
 * `products` / `product_sizes` tables on 15 September 2026.
 *
 * Deliberately NOT derived from `src/data/mock/catalog.ts`: that file is a
 * dev-time fallback for when Supabase is unavailable and has drifted from the
 * real menu (it still carries the old country-prefixed names and is missing the
 * three newest pizzas). A guard built on it would pass while production failed,
 * which is worse than no guard.
 *
 * Add a row when the kitchen adds a product. The test then fails until the SKU
 * is in the map, which is the whole point: an unmapped line does not lose itself
 * a line, it loses the kitchen the entire order.
 */
const LIVE_MENU: readonly (readonly [string, string])[] = [
  // Ajman Pizza Collection — renamed on the site to drop the country prefixes.
  ["Camel Kebab", "Medium"], ["Camel Kebab", "Small"],
  ["Chicken Adobo", "Medium"], ["Chicken Adobo", "Small"],
  ["Hawaiian", "Medium"], ["Hawaiian", "Small"],
  ["Kitfo", "Medium"], ["Kitfo", "Small"],
  ["Legend Chicken", "Medium"], ["Legend Chicken", "Small"],
  ["Merguez (Sausage)", "Medium"], ["Merguez (Sausage)", "Small"],
  // "small" lower-cased is how this one is stored; normalisation must cope.
  ["Mutton Kebab", "Medium"], ["Mutton Kebab", "small"],
  ["Pepperoni", "Medium"], ["Pepperoni", "Small"],
  ["Spicy Beef Kebab", "Medium"], ["Spicy Beef Kebab", "Small"],
  ["Spicy Chicken Kebab", "Medium"], ["Spicy Chicken Kebab", "Small"],
  // Italian
  ["Bresaola (Beef Dry Ham)", "Medium"], ["Bresaola (Beef Dry Ham)", "Small"],
  ["Diavola Piccante (Spicy Italian Beef Salami)", "Medium"],
  ["Diavola Piccante (Spicy Italian Beef Salami)", "Small"],
  ["Margherita", "Medium"], ["Margherita", "Small"],
  ["Mortadella (Beef Ham)", "Medium"], ["Mortadella (Beef Ham)", "Small"],
  ["Ortolana (Vegetarian)", "Medium"], ["Ortolana (Vegetarian)", "Small"],
  ["Prosciutto e Funghi (Veal Ham & Mushroom)", "Medium"],
  ["Prosciutto e Funghi (Veal Ham & Mushroom)", "Small"],
  ["Quattro Formaggi (Four Cheese)", "Medium"],
  ["Quattro Formaggi (Four Cheese)", "Small"],
  ["Quattro Stagioni (Four Seasons)", "Medium"],
  ["Quattro Stagioni (Four Seasons)", "Small"],
  ["Tonno (Tuna)", "Medium"], ["Tonno (Tuna)", "Small"],
  // Focaccia
  ["Focaccia Bresaola", "Regular"], ["Focaccia Bresaola", "Small"],
  ["Focaccia Mortadella", "Regular"], ["Focaccia Mortadella", "Small"],
  ["Focaccia Veal Ham", "Regular"], ["Focaccia Veal Ham", "Small"],
  // Dessert
  ["Lotus Pizza", "Medium"], ["Lotus Pizza", "Small"],
  ["Nutella Pizza", "Medium"], ["Nutella Pizza", "Small"],
  ["Pistachio Pizza", "Medium"], ["Pistachio Pizza", "Small"],
  // Drinks
  ["Coca-Cola", "Regular"], ["Coca-Cola Zero", "Regular"],
  ["Fanta", "Regular"], ["Sprite", "Regular"], ["Water", "Regular"],
];

/**
 * Products the live menu sells that the POS has not given us a SKU for.
 *
 * These are a real outage, not an accepted state: an order containing one is
 * refused by the POS in full. They are listed rather than asserted-against so
 * the suite stays green on the 55 combinations that DO work, while keeping the
 * gap visible and counted.
 *
 * Blocked on the POS team (asked 1 September 2026, chased 15 September). Do NOT
 * guess a SKU to clear this list — "Prawns Pizza" looks like the POS's "Frutti
 * Di Mare (Seafood Pizza)" and may well not be. A wrong SKU is worse than a
 * missing one: a missing SKU fails loudly, a wrong one quietly sends the kitchen
 * a different dish.
 *
 * The trailing spaces are in the product names as stored; `resolvePosSku`
 * trims, so they are reproduced here exactly as an order would carry them.
 */
const AWAITING_POS_SKU: readonly (readonly [string, string])[] = [
  ["Prawns Pizza", "Medium"], ["Prawns Pizza", "Small"],
  ["Truffel & Mushroom ", "Medium"], ["Truffel & Mushroom ", "Small"],
  ["Truffle Prosciutto ", "Medium"], ["Truffle Prosciutto ", "Small"],
];

describe("every product on the live menu resolves to a POS SKU", () => {
  for (const [name, size] of LIVE_MENU) {
    test(`${name} (${size})`, () => {
      expect(resolvePosSku(name, size)).toBeTruthy();
    });
  }
});

describe("the products still waiting on the POS team", () => {
  // If one of these starts resolving, the SKU arrived — move it into LIVE_MENU
  // and delete it here, so the list never quietly outlives the problem.
  for (const [name, size] of AWAITING_POS_SKU) {
    test(`${name.trim()} (${size}) is still unmapped`, () => {
      expect(resolvePosSku(name, size)).toBeUndefined();
    });
  }
});

describe("resolution rules", () => {
  test("size decides, and only Small is small", () => {
    expect(normalizePosSize("Small")).toBe("small");
    expect(normalizePosSize("small")).toBe("small");
    expect(normalizePosSize("Medium")).toBe("regular");
    expect(normalizePosSize("Regular")).toBe("regular");
    expect(normalizePosSize(null)).toBe("regular");
  });

  test("Medium and Small are different SKUs for the same product", () => {
    const medium = resolvePosSku("Margherita", "Medium");
    const small = resolvePosSku("Margherita", "Small");
    expect(medium).toBe("MAR-0001");
    expect(small).toBe("SMA-0035");
    expect(medium).not.toBe(small);
  });

  test("names are matched case- and whitespace-insensitively", () => {
    expect(resolvePosSku("  pepperoni  ", "Medium")).toBe("AME-0022");
    expect(resolvePosSku("PEPPERONI", "Medium")).toBe("AME-0022");
  });

  test("an unknown product resolves to nothing rather than to something near", () => {
    expect(resolvePosSku("Pizza That Does Not Exist", "Medium")).toBeUndefined();
  });

  // The renaming that broke N7-00135/N7-00136: the site dropped the country
  // prefixes, the POS kept them. `name` follows the site, `posName` the POS.
  test("the site name is the lookup key and the POS name is kept alongside", () => {
    const pepperoni = POS_SKU_ENTRIES.find(
      (e) => e.name === "Pepperoni" && e.size === "regular",
    );
    expect(pepperoni).toBeDefined();
    expect(pepperoni?.posName).toBe("American - Pepperoni");
    expect(pepperoni?.sku).toBe("AME-0022");
    // The old site name must no longer resolve — if it does, a rename was
    // half-applied and two entries are competing for the same product.
    expect(resolvePosSku("American - Pepperoni", "Medium")).toBeUndefined();
  });

  test("no two entries claim the same product and size", () => {
    const seen = new Set<string>();
    for (const e of POS_SKU_ENTRIES) {
      const key = `${e.name.toLowerCase().trim()}|${e.size}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
