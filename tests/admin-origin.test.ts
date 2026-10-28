import test from "node:test";
import assert from "node:assert/strict";
import { isAdminOrigin } from "../src/lib/admin-origin.ts";

test("admin mutations accept same-origin browser requests, including local host aliases", () => {
  assert.equal(isAdminOrigin(new Request("https://sidequest-costumequest.vercel.app/api/admin/voting", { headers: { origin: "https://sidequest-costumequest.vercel.app", host: "sidequest-costumequest.vercel.app", "sec-fetch-site": "same-origin" } })), true);
  assert.equal(isAdminOrigin(new Request("http://localhost:3004/api/admin/login", { headers: { origin: "http://127.0.0.1:3004", host: "127.0.0.1:3004" } })), true);
});
test("admin mutations reject missing, forged and insecure origins and ignore forwarded hosts", () => {
  const cases: Record<string, string>[] = [
    { host: "quest.example" },
    { origin: "null", host: "quest.example" },
    { origin: "https://attacker.example", host: "quest.example", "x-forwarded-host": "attacker.example" },
    { origin: "http://quest.example", host: "quest.example" },
    { origin: "https://quest.example", host: "quest.example", "sec-fetch-site": "cross-site" },
  ];
  for (const headers of cases) assert.equal(isAdminOrigin(new Request("https://quest.example/api/admin/voting", { headers })), false);
});
