import assert from "node:assert/strict";
import { test } from "node:test";

import { openApplicationWithComputer } from "./application-computer.ts";

test("自動操作視窗逐欄位重播已收整資料", async () => {
  const events = [];
  const values = [
    { tag: "input", type: "text", value: "王小明", checked: false },
    { tag: "select", type: null, value: "HOME", checked: false },
    { tag: "input", type: "checkbox", value: "", checked: true },
  ];
  const controls = values.map((item) => {
    let evaluated = false;
    return {
      evaluate: async () => {
        if (!evaluated) {
          evaluated = true;
          return item.tag;
        }
      },
      getAttribute: async () => item.type,
      inputValue: async () => item.value,
      isChecked: async () => item.checked,
      uncheck: async () => events.push("clear checkbox"),
      selectOption: async (value) => events.push(`${value ? "select" : "clear select"} ${value}`.trim()),
      fill: async (value) => events.push(`${value ? "fill" : "clear text"} ${value}`.trim()),
      pressSequentially: async (value) => events.push(`type ${value}`),
      check: async () => events.push("check"),
      scrollIntoViewIfNeeded: async () => {},
    };
  });
  const collection = { count: async () => controls.length, nth: (index) => controls[index] };
  const form = {
    locator: () => collection,
    evaluate: async () => {},
    isVisible: async () => true,
  };
  const continueButton = {
    scrollIntoViewIfNeeded: async () => {},
    click: async () => events.push("next"),
  };
  const page = {
    goto: async (url) => events.push(`goto ${url}`),
    waitForSelector: async () => {},
    locator: (selector) => selector === ".gov-long-form" ? form : continueButton,
    waitForTimeout: async () => {},
  };
  const context = {
    addCookies: async (cookies) => events.push(`cookie ${cookies[0].value}`),
    route: async () => {},
    unroute: async () => {},
    newPage: async () => page,
  };
  const browser = {
    close: async () => {},
    on: () => {},
    newContext: async () => context,
  };

  await openApplicationWithComputer(
    "http://localhost:3003/apply/00000000-0000-4000-8000-000000000001",
    "session-token",
    async () => browser,
  );

  assert.match(events[1], /\?view=form$/);
  assert.deepEqual(events.slice(2), [
    "clear text",
    "clear select",
    "clear checkbox",
    "type 王小明",
    "select HOME",
    "check",
    "next",
  ]);
});
