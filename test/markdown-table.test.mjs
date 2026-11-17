import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMarkdownTables } from "../src/markdown-table.js";

test("normalizes pipe tables without outer pipes and preserves escaped pipes", () => {
  const markdown = "이름 | 값\n--- | ---\nA\\|B | 1\n\n다음 문단";
  assert.equal(
    normalizeMarkdownTables(markdown),
    "| 이름 | 값 |\n| --- | --- |\n| A\\|B | 1 |\n\n다음 문단",
  );
});

test("leaves fenced examples and HTML tables alone", () => {
  const markdown = "```md\nA | B\n--- | ---\n```\n<table><tr><td>값</td></tr></table>";
  assert.equal(normalizeMarkdownTables(markdown), markdown);
});
