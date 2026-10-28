import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
const image = "44444444-4444-4444-8444-444444444444";
const admin = "55555555-5555-4555-8555-555555555555";

test("database enforces participation, ownership, storage and voting rules", async (suite) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth; create schema storage;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function storage.foldername(text) returns text[] language sql immutable as
        $$ select string_to_array($1, '/') $$;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, unique(bucket_id, name));
      alter table storage.objects enable row level security;
      grant usage on schema auth, storage, public to authenticated, anon;
      grant select, insert, delete on storage.objects to authenticated;
      insert into auth.users values ('${alice}'), ('${bob}'), ('${outsider}'), ('${admin}');
    `);
    const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
    const migrations = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();
    for (const filename of migrations) {
      await db.exec(await readFile(new URL(filename, migrationDirectory), "utf8"));
    }
    await db.query("insert into public.quest_admins(user_id) values ($1)", [admin]);
    const asUser = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec("set role authenticated");
    };
    const upload = async (id: string) => db.query("insert into storage.objects(bucket_id,name) values ('costumes',$1)", [`${id}/${image}.jpg`]);
    const register = async (name: string, id: string) => db.query<{ id: string }>("select * from public.create_participant($1, '', $2)", [name, `${id}/${image}.jpg`]);
    let aliceEntry = "";
    let bobEntry = "";

    await suite.test("voting starts closed; public status exposes no private results", async () => {
      await db.exec("set role anon");
      assert.equal((await db.query<{ get_voting_status: boolean }>("select public.get_voting_status()")).rows[0].get_voting_status, false);
      await assert.rejects(db.query("select public.quest_dashboard()"));
      await assert.rejects(db.query("select public.set_voting_enabled(true)"));
      await asUser(outsider);
      await assert.rejects(db.query("select public.quest_dashboard()"));
      await assert.rejects(db.query("select * from public.list_costumes()"), { code: "55000" });
      await assert.rejects(db.query("select public.cast_vote($1,5)", [image]), { code: "55000" });
      await assert.rejects(db.query("select public.set_voting_enabled(true)"));
      await assert.rejects(db.query("update public.quest_settings set voting_enabled=true"));
      await assert.rejects(db.query("insert into public.quest_admins(user_id) values ($1)", [outsider]));
      await assert.rejects(db.query("select * from public.quest_admins"));
      await asUser(admin);
      assert.equal((await db.query<{ set_voting_enabled: boolean }>("select public.set_voting_enabled(true)")).rows[0].set_voting_enabled, true);
    });

    await suite.test("a visitor cannot register without their own uploaded photo", async () => {
      await asUser(alice);
      await assert.rejects(register("Alice", bob));
      await assert.rejects(register("Alice", alice));
      await assert.rejects(upload(bob));
      await upload(alice);
      aliceEntry = (await register("Alice", alice)).rows[0].id;
    });
    await suite.test("registration retry is idempotent and the photo cannot be deleted", async () => {
      const repeat = await register("Changed name", alice);
      assert.equal(repeat.rows[0].id, aliceEntry);
      await db.query("delete from storage.objects where name=$1", [`${alice}/${image}.jpg`]);
      const files = await db.query("select * from storage.objects");
      assert.equal(files.rows.length, 1);
      await assert.rejects(db.query("insert into public.participants(owner_id,name,photo_path) values ($1,'Injected','x')", [alice]));
    });
    await suite.test("self votes, invalid scores and direct vote writes are rejected", async () => {
      await assert.rejects(db.query("select public.cast_vote($1,5)", [aliceEntry]));
      await asUser(bob); await upload(bob); bobEntry = (await register("Bob", bob)).rows[0].id;
      for (const score of [0, 6, null]) await assert.rejects(db.query("select public.cast_vote($1,$2)", [aliceEntry, score]));
      await assert.rejects(db.query("insert into public.votes(voter_id,participant_id,stars) values ($1,$2,5)", [bob, aliceEntry]));
    });
    await suite.test("pending costumes exclude self; repeated votes are not counted twice", async () => {
      const pending = await db.query<{ id: string }>("select * from public.list_costumes()");
      assert.deepEqual(pending.rows.map((row) => row.id), [aliceEntry]);
      await db.query("select public.cast_vote($1,5)", [aliceEntry]);
      await db.query("select public.cast_vote($1,1)", [aliceEntry]);
      const votes = await db.query<{ stars: number }>("select stars from public.votes");
      assert.deepEqual(votes.rows, [{ stars: 5 }]);
      assert.equal((await db.query("select * from public.list_costumes()")).rows.length, 0);
    });
    await suite.test("votes are private and a participant can vote on other costumes", async () => {
      await asUser(alice);
      assert.equal((await db.query("select * from public.votes")).rows.length, 0);
      assert.equal((await db.query("select * from public.participants")).rows.length, 1);
      await db.query("select public.cast_vote($1,4)", [bobEntry]);
      assert.equal((await db.query("select * from public.votes")).rows.length, 1);
    });
    await suite.test("a visitor without a photo can browse and vote once per costume", async () => {
      await asUser(outsider);
      assert.equal((await db.query("select * from public.participants")).rows.length, 0);
      const pending = await db.query<{ id: string }>("select * from public.list_costumes()");
      assert.deepEqual(new Set(pending.rows.map((row) => row.id)), new Set([aliceEntry, bobEntry]));
      for (const invalid of [0, 6, null]) await assert.rejects(db.query("select public.cast_vote($1,$2)", [aliceEntry, invalid]));
      await db.query("select public.cast_vote($1,3)", [aliceEntry]);
      await db.query("select public.cast_vote($1,5)", [aliceEntry]);
      const votes = await db.query<{ stars: number }>("select stars from public.votes");
      assert.deepEqual(votes.rows, [{ stars: 3 }]);
      const remaining = await db.query<{ id: string }>("select * from public.list_costumes()");
      assert.deepEqual(remaining.rows.map((row) => row.id), [bobEntry]);
      await assert.rejects(db.query("insert into public.votes(voter_id,participant_id,stars) values ($1,$2,5)", [outsider, bobEntry]));
    });
    await suite.test("closing blocks stale cards and preserves existing stars; uploads remain open", async () => {
      await asUser(outsider);
      assert.equal((await db.query("select * from public.list_costumes()")).rows.length, 1);
      await asUser(admin);
      await db.query("select public.set_voting_enabled(false)");
      await asUser(outsider);
      await assert.rejects(db.query("select public.cast_vote($1,5)", [bobEntry]), { code: "55000" });
      await assert.rejects(db.query("select * from public.list_costumes()"), { code: "55000" });
      await upload(outsider); await register("Outsider", outsider);
      await asUser(admin);
      const result = await db.query<{ quest_dashboard: { votingEnabled: boolean; votes: number; totalStars: number; ranking: { id: string; totalStars: number; place: number | null }[] } }>("select public.quest_dashboard()");
      const dashboard = result.rows[0].quest_dashboard;
      assert.equal(dashboard.votingEnabled, false);
      assert.equal(dashboard.votes, 3);
      assert.equal(dashboard.totalStars, 12);
      assert.deepEqual(dashboard.ranking.map((entry) => [entry.id, entry.totalStars, entry.place]), [[aliceEntry, 8, 1], [bobEntry, 4, 2], [dashboard.ranking[2].id, 0, null]]);
      await db.query("select public.set_voting_enabled(true)");
      await asUser(outsider); await db.query("select public.cast_vote($1,4)", [bobEntry]);
    });
    await suite.test("ranking uses total stars, shares tied places, and never declares zero-vote winners", async () => {
      await asUser(admin);
      const result = await db.query<{ quest_dashboard: { ranking: { totalStars: number; place: number | null }[] } }>("select public.quest_dashboard()");
      assert.deepEqual(result.rows[0].quest_dashboard.ranking.map((entry) => [entry.totalStars, entry.place]), [[8, 1], [8, 1], [0, null]]);
      await db.exec("reset role");
      await db.query("delete from public.quest_admins where user_id=$1", [admin]);
      await asUser(admin);
      await assert.rejects(db.query("select public.quest_dashboard()"));
      await assert.rejects(db.query("select public.set_voting_enabled(false)"));
    });
    await suite.test("requests still require an anonymous session, not a photo", async () => {
      await db.exec("reset role; set role anon");
      await assert.rejects(db.query("select public.cast_vote($1,5)", [aliceEntry]));
      await assert.rejects(db.query("select * from public.list_costumes()"));
      await assert.rejects(db.query("select * from public.participants"));
      await asUser("");
      await assert.rejects(db.query("select public.cast_vote($1,5)", [aliceEntry]));
      await assert.rejects(db.query("select * from public.list_costumes()"));
    });
  } finally { await db.close(); }
});
