require("dotenv").config();
const { initDb } = require("./src/db");

const books = [
  ["The Alchemist", "Paulo Coelho", 299],
  ["Wings of Fire", "A. P. J. Abdul Kalam", 350],
  ["Clean Code", "Robert C. Martin", 1200],
  ["The Pragmatic Programmer", "Andrew Hunt", 1500],
  ["Atomic Habits", "James Clear", 499],
  ["The Code of the Extraordinary Mind", "Vishen Lakhiani", 650],
  ["Deep Work", "Cal Newport", 550],
  ["Eloquent JavaScript", "Marijn Haverbeke", 800],
];

(async () => {
  const db = await initDb(process.env.DB_PATH);
  const { n } = await db.get("SELECT COUNT(*) AS n FROM books");
  if (n > 0) {
    console.log(`books table already has ${n} rows; skipping seed.`);
  } else {
    for (const [title, author, price] of books) {
      await db.run("INSERT INTO books (title, author, price) VALUES (?, ?, ?)", [title, author, price]);
    }
    console.log(`Seeded ${books.length} books.`);
  }
  await db.close();
})();
