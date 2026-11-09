import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.JWT_SECRET = "test-secret";

const { default: app } = await import("../src/app.js");
const { User } = await import("../src/models/User.js");
const { backfillBugIds } = await import("../src/bugIds.js");

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

async function register(name, email, password = "secret1") {
  const response = await request(app).post("/api/auth/register").send({ name, email, password });
  assert.equal(response.status, 201);
  return response.body;
}

test("health check", async () => {
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
});

test("registration creates a user and never an admin", async () => {
  const response = await request(app).post("/api/auth/register").send({
    name: "Ada",
    email: "Ada@Example.com",
    password: "secret1",
    role: "admin",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.user.role, "user");
  assert.equal(response.body.user.email, "ada@example.com");
  assert.equal(response.body.user.password, undefined);
  assert.ok(response.body.token);

  const duplicate = await request(app).post("/api/auth/register").send({
    name: "Ada",
    email: "ada@example.com",
    password: "secret1",
  });
  assert.equal(duplicate.status, 409);
});

test("login rejects a bad password and returns the current user", async () => {
  await register("Ada", "ada@example.com");
  const bad = await request(app).post("/api/auth/login").send({
    email: "ada@example.com",
    password: "wrong-password",
  });
  assert.equal(bad.status, 401);

  const good = await request(app).post("/api/auth/login").send({
    email: "ada@example.com",
    password: "secret1",
  });
  assert.equal(good.status, 200);

  const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${good.body.token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, "ada@example.com");

  const missing = await request(app).get("/api/auth/me");
  assert.equal(missing.status, 401);
});

test("a user can list people but cannot manage products or accounts", async () => {
  const ada = await register("Ada", "ada@example.com");
  const auth = { Authorization: `Bearer ${ada.token}` };

  const users = await request(app).get("/api/users").set(auth);
  assert.equal(users.status, 200);
  assert.equal(users.body.length, 1);

  const product = await request(app).post("/api/products").set(auth).send({ name: "Myzilla" });
  assert.equal(product.status, 403);

  const created = await request(app).post("/api/users").set(auth).send({
    name: "Other",
    email: "other@example.com",
    password: "secret1",
  });
  assert.equal(created.status, 403);
});

test("an admin manages products and users, and the last admin cannot be removed", async () => {
  const login = await register("Admin", "admin@myzilla.local");
  await User.updateOne({ email: "admin@myzilla.local" }, { role: "admin" });
  const auth = { Authorization: `Bearer ${login.token}` };

  const product = await request(app).post("/api/products").set(auth).send({
    name: "Myzilla",
    description: "Sample",
  });
  assert.equal(product.status, 201);
  assert.equal(product.body.createdBy.email, "admin@myzilla.local");

  const renamed = await request(app).patch(`/api/products/${product.body._id}`).set(auth).send({ name: "Myzilla Web" });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.name, "Myzilla Web");

  const member = await request(app).post("/api/users").set(auth).send({
    name: "Pat",
    email: "pat@example.com",
    password: "secret1",
    role: "user",
  });
  assert.equal(member.status, 201);

  const demoteLast = await request(app).patch(`/api/users/${login.user._id}`).set(auth).send({ role: "user" });
  assert.equal(demoteLast.status, 400);
  assert.match(demoteLast.body.message, /last admin/);

  const removeLast = await request(app).delete(`/api/users/${login.user._id}`).set(auth);
  assert.equal(removeLast.status, 400);
  assert.match(removeLast.body.message, /last admin/);

  const removed = await request(app).delete(`/api/users/${member.body._id}`).set(auth);
  assert.equal(removed.status, 200);
});

test("bugs get sequential ids, keep them after delete, and can be filtered", async () => {
  const ada = await register("Ada", "ada@example.com");
  const pat = await register("Pat", "pat@example.com");
  await User.updateOne({ email: "ada@example.com" }, { role: "admin" });
  const auth = { Authorization: `Bearer ${ada.token}` };

  const product = await request(app).post("/api/products").set(auth).send({ name: "Myzilla" });
  const other = await request(app).post("/api/products").set(auth).send({ name: "Mobile" });

  const first = await request(app).post("/api/bugs").set(auth).send({
    title: "Login fails",
    description: "Blank error",
    product: product.body._id,
    developer: pat.user._id,
  });
  assert.equal(first.status, 201);
  assert.equal(first.body.bugId, 1);
  assert.equal(first.body.createdBy.name, "Ada");
  assert.equal(first.body.updatedBy.name, "Ada");
  assert.equal(first.body.developer.name, "Pat");
  assert.equal(first.body.status, "Open");

  const second = await request(app).post("/api/bugs").set({ Authorization: `Bearer ${pat.token}` }).send({
    title: "Search returns nothing",
    product: other.body._id,
    status: "In Progress",
  });
  assert.equal(second.status, 201);
  assert.equal(second.body.bugId, 2);

  const patched = await request(app).patch(`/api/bugs/${first.body._id}`).set({ Authorization: `Bearer ${pat.token}` }).send({
    status: "Resolved",
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.bugId, 1);
  assert.equal(patched.body.status, "Resolved");
  assert.equal(patched.body.updatedBy.name, "Pat");
  assert.equal(patched.body.createdBy.name, "Ada");

  const byProduct = await request(app).get("/api/bugs").query({ product: other.body._id }).set(auth);
  assert.equal(byProduct.status, 200);
  assert.deepEqual(byProduct.body.map((bug) => bug.bugId), [2]);

  const byStatus = await request(app).get("/api/bugs").query({ status: "Resolved" }).set(auth);
  assert.deepEqual(byStatus.body.map((bug) => bug.bugId), [1]);

  const one = await request(app).get(`/api/bugs/${second.body._id}`).set(auth);
  assert.equal(one.status, 200);
  assert.equal(one.body.title, "Search returns nothing");

  const blocked = await request(app).delete(`/api/products/${other.body._id}`).set(auth);
  assert.equal(blocked.status, 400);

  await request(app).delete(`/api/bugs/${second.body._id}`).set(auth).expect(200);
  const removed = await request(app).delete(`/api/products/${other.body._id}`).set(auth);
  assert.equal(removed.status, 200);

  const third = await request(app).post("/api/bugs").set(auth).send({
    title: "Next number",
    product: product.body._id,
  });
  assert.equal(third.body.bugId, 3);

  const invalid = await request(app).post("/api/bugs").set(auth).send({
    title: "Bad status",
    product: product.body._id,
    status: "Done",
  });
  assert.equal(invalid.status, 400);

  const guest = await request(app).get("/api/bugs");
  assert.equal(guest.status, 401);
});

test("backfill assigns ids to bugs that were stored without one", async () => {
  const ada = await register("Ada", "ada@example.com");
  await User.updateOne({ email: "ada@example.com" }, { role: "admin" });
  const auth = { Authorization: `Bearer ${ada.token}` };
  const product = await request(app).post("/api/products").set(auth).send({ name: "Myzilla" });
  const created = await request(app).post("/api/bugs").set(auth).send({
    title: "Already numbered",
    product: product.body._id,
  });
  assert.equal(created.body.bugId, 1);

  await mongoose.connection.collection("bugs").insertOne({
    title: "Legacy",
    description: "",
    product: new mongoose.Types.ObjectId(product.body._id),
    status: "Open",
    createdBy: new mongoose.Types.ObjectId(ada.user._id),
    updatedBy: new mongoose.Types.ObjectId(ada.user._id),
    createdAt: new Date("2020-01-01"),
    updatedAt: new Date("2020-01-01"),
  });

  await backfillBugIds();
  const bugs = await request(app).get("/api/bugs").set(auth);
  const legacy = bugs.body.find((bug) => bug.title === "Legacy");
  assert.equal(legacy.bugId, 2);
});
