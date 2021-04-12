require("dotenv").config();
const request = require("supertest");
const buildApp = require("../../app");
const UserRepo = require("../../repos/user-repo");
const pool = require("../../pool");

beforeAll(() => {
  return pool.connect({
    host: "localhost",
    port: 5432,
    database: process.env.DB_TEST_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
});

it("create a user", async () => {
  const startingCount = await UserRepo.count();

  await request(buildApp())
    .post("/users")
    .send({ username: "testuser", bio: "test bio" })
    .expect(200);

  const finishCount = await UserRepo.count();
  expect(finishCount - startingCount).toEqual(1);
});

afterAll(() => {
  return pool.close();
});
