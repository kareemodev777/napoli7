import { describe, expect, test } from "bun:test";
import {
  formatTimeValue,
  parseTimeValue,
} from "./time-input";

describe("opening hours time helpers", () => {
  test("formats midnight as 12:00 AM in the editor", () => {
    expect(parseTimeValue("00:00")).toEqual({
      hour: "12",
      minute: "00",
      meridiem: "AM",
    });
  });

  test("formats afternoon times with PM", () => {
    expect(parseTimeValue("13:45")).toEqual({
      hour: "1",
      minute: "45",
      meridiem: "PM",
    });
  });

  test("converts AM and PM selections back to 24-hour time", () => {
    expect(
      formatTimeValue({ hour: "12", minute: "30", meridiem: "AM" }),
    ).toBe("00:30");
    expect(
      formatTimeValue({ hour: "7", minute: "05", meridiem: "PM" }),
    ).toBe("19:05");
  });
});
