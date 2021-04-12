const { randomBytes } = require("crypto");
const { default: migrate } = require("node-pg-migrate");
const format = require("pg-format");
const pool = require("../pool");

const DEFAULT_OPTIONS = {
  host: "localhost",
  port: 5432,
  database: process.env.DB_TEST_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

class Context {
  static async build() {
    // Randomly generating a role name to connect to PG as
    // By default, pg first tries to connect to a schema equal to user's name
    // and only then to public (if no schem specified in query)
    // To view search path, run SHOW search_path

    // Adding a letter since name needs to start with one
    const roleName = "a" + randomBytes(4).toString("hex");

    // Connect to PG
    await pool.connect(DEFAULT_OPTIONS);

    // Create a new role
    await pool.query(
      format("CREATE ROLE %I WITH LOGIN PASSWORD %L", rolename, rolename)
    );

    // Create a schema with the same name
    await pool.query(
      format("CREATE SCHEMA %I AUTHORIZATION %I", rolename, rolename)
    );

    // Disconnect entirely from PG
    await pool.close();

    // Run our migrations in the new schema
    await migrate({
      schema: roleName,
      direction: "up",
      log: () => {},
      noLock: true,
      dir: "migrations",
      databaseUrl: {
        host: "localhost",
        port: 5432,
        database: process.env.DB_TEST_NAME,
        user: roleName,
        password: roleName,
      },
    });

    // Connect to PG as the newly created role
    await pool.connect({
      host: "localhost",
      port: 5432,
      database: process.env.DB_TEST_NAME,
      user: roleName,
      password: roleName,
    });

    return new Context(roleName);
  }

  constructor(roleName) {
    this.roleName = roleName;
  }

  async close() {
    await pool.close();
    await pool.connect(DEFAULT_OPTIONS);
    await pool.query(format("DROP SCHEMA %I CASCADE;", this.roleName));
    await pool.query(format("DROP ROLE %I", this.roleName));
    await pool.close();
  }
}

module.exports = Context;
