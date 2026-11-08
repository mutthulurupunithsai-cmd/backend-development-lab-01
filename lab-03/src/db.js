const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function initDb(dbPath) {
  const db = await open({
    filename: path.resolve(dbPath || "./books.db"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      author     TEXT    NOT NULL,
      price      REAL    NOT NULL CHECK (price >= 0),
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

module.exports = { initDb };
