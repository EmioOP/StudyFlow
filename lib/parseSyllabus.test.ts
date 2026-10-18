import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSyllabus } from "./parseSyllabus.ts";

test("parses modules, hours and bracketed commas", () => {
  const r = parseSyllabus(`Module 1 (8 hours)
Introduction to Algorithms, Asymptotic notation (Big-O, Omega, Theta); Recurrences.
Module 2: Sorting (9 Hrs)
Merge sort
• Quick sort
• Heap sort
Unit III
Graphs, BFS, DFS`);
  assert.equal(r.length, 3);
  assert.equal(r[0].title, "Module 1");
  assert.deepEqual(r[0].topics, ["Introduction to Algorithms", "Asymptotic notation (Big-O, Omega, Theta)", "Recurrences"]);
  assert.equal(r[1].title, "Module 2: Sorting");
  assert.deepEqual(r[1].topics, ["Merge sort", "Quick sort", "Heap sort"]);
  assert.deepEqual(r[2].topics, ["Graphs", "BFS", "DFS"]);
});

test("text without module headings becomes one module", () => {
  const r = parseSyllabus("Arrays, Linked lists\nStacks");
  assert.equal(r.length, 1);
  assert.equal(r[0].topics.length, 3);
});
