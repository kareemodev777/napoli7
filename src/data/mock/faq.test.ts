import { describe, expect, test } from "bun:test";
import { FAQ_ITEMS } from "./faq";

describe("FAQ_ITEMS", () => {
  test("matches the live opening hours", () => {
    const hours = FAQ_ITEMS.find((item) => item.q === "What are your opening hours?");
    expect(hours?.a).toBe(
      "We are open Tuesday to Sunday from 12:30 to 00:00. We are closed on Mondays.",
    );
  });

  test("describes the current payment options", () => {
    const payment = FAQ_ITEMS.find((item) => item.q === "How can I pay?");
    expect(payment?.a).toBe(
      "Card payments are available at checkout, including Apple Pay and Google Pay. Cash on delivery is available for pickup orders only.",
    );
  });
});
