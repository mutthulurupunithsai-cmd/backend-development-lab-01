// BROKEN practice version - contains the 4 classic bugs. Do not use for submission.
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { validateBook } = require("./validators");      // BUG 2: file is actually ../../src/validation.js

const app = express();
app.use(express.json());
let db;

app.get("/books", async (req, res) => {
  const rows = await db.all("SELECT * FROM book");     // BUG 3: table is named "books"
  res.json(rows);
});

app.post("/books", async (req, res) => {
  const result = db.run(                                // BUG 4: missing await
    "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
    [req.body.title, req.body.author, req.body.price]
  );
  res.status(201).json({ id: result.lastID });          // lastID is undefined: result is a Promise
});

(async () => {
  db = await open({ filename: "./broken.db", driver: sqlite3.Database });
  await db.exec("CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, author TEXT, price REAL)");
  app.listen(3000, () => console.log("Broken server on 3000")); // BUG 1: port clash -> EADDRINUSE, no handler
})();
