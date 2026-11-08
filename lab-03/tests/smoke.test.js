// Self-contained smoke test: spins up the API on a temp DB and checks every success/failure case.
// Run: npm test
const fs = require("fs");
const os = require("os");
const path = require("path");
const { initDb } = require("../src/db");
const { createApp } = require("../src/app");

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
}

(async () => {
  const dbFile = path.join(os.tmpdir(), `lab03-test-${Date.now()}.db`);
  const db = await initDb(dbFile);
  for (const [t, a, p] of [
    ["The Alchemist", "Paulo Coelho", 299],
    ["Clean Code", "Robert C. Martin", 1200],
    ["Atomic Habits", "James Clear", 499],
    ["The Code of the Extraordinary Mind", "Vishen Lakhiani", 650],
  ]) await db.run("INSERT INTO books (title, author, price) VALUES (?,?,?)", [t, a, p]);

  const server = createApp(db).listen(0);
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, url, body, raw) => {
    const r = await fetch(base + url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, json: await r.json() };
  };

  let r = await call("GET", "/books");
  check("GET /books -> 200 with defaults (limit 10, offset 0)", r.status === 200 && r.json.limit === 10 && r.json.offset === 0 && r.json.data.length === 4);
  r = await call("GET", "/books?search_q=code");
  check("search_q partial match (case-insensitive) -> 2 rows", r.status === 200 && r.json.data.length === 2);
  r = await call("GET", "/books?order_by=price&order=DESC");
  check("order_by=price&order=DESC -> highest first", r.json.data[0].price === 1200);
  r = await call("GET", "/books?limit=2&offset=1");
  check("limit=2&offset=1 -> 2 rows, total 4", r.json.data.length === 2 && r.json.total === 4);
  r = await call("GET", "/books?min_price=300&max_price=700");
  check("price range 300-700 -> 2 rows", r.json.data.length === 2);
  r = await call("GET", "/books?min_price=1000");
  check("min_price only -> 1 row", r.json.data.length === 1);
  r = await call("GET", "/books?order_by=password");
  check("invalid order_by -> 400", r.status === 400 && r.json.message);
  r = await call("GET", "/books?order=sideways");
  check("invalid order -> 400", r.status === 400);
  r = await call("GET", "/books?limit=abc");
  check("non-numeric limit -> 400", r.status === 400);
  r = await call("GET", "/books?min_price=900&max_price=100");
  check("min_price > max_price -> 400", r.status === 400);
  r = await call("GET", "/books?search_q=%27%3B%20DROP%20TABLE%20books%3B--");
  check("SQL injection attempt in search_q is harmless -> 200, 0 rows", r.status === 200 && r.json.data.length === 0);
  r = await call("GET", "/books");
  check("table still intact after injection attempt", r.json.total === 4);

  r = await call("GET", "/books/1");
  check("GET /books/1 -> 200", r.status === 200 && r.json.data.id === 1);
  r = await call("GET", "/books/9999");
  check("GET /books/9999 -> 404", r.status === 404 && r.json.message === "Book not found");
  r = await call("GET", "/books/abc");
  check("GET /books/abc -> 400", r.status === 400);

  r = await call("POST", "/books", { title: "Deep Work", author: "Cal Newport", price: 550 });
  check("POST valid -> 201", r.status === 201 && r.json.data.id);
  const newId = r.json.data && r.json.data.id;
  r = await call("POST", "/books", { author: "X", price: 10 });
  check("POST missing title -> 400", r.status === 400);
  r = await call("POST", "/books", { title: "X", price: 10 });
  check("POST missing author -> 400", r.status === 400);
  r = await call("POST", "/books", { title: "X", author: "Y", price: "abc" });
  check("POST non-numeric price -> 400", r.status === 400 && /price/.test(r.json.message));
  r = await call("POST", "/books", { title: "X", author: "Y" });
  check("POST missing price -> 400", r.status === 400);
  r = await call("POST", "/books", { title: "X", author: "Y", price: -5 });
  check("POST negative price -> 400", r.status === 400);
  r = await call("POST", "/books", undefined, "{bad json");
  check("POST malformed JSON -> 400", r.status === 400 && r.json.message === "Invalid JSON in request body");

  r = await call("PUT", `/books/${newId}`, { title: "Deep Work (2nd ed)", author: "Cal Newport", price: 600 });
  check("PUT valid -> 200", r.status === 200 && r.json.data.price === 600);
  r = await call("PUT", "/books/9999", { title: "A", author: "B", price: 1 });
  check("PUT unknown id -> 404", r.status === 404);
  r = await call("PUT", `/books/${newId}`, { title: "", author: "B", price: 1 });
  check("PUT empty title -> 400", r.status === 400);

  r = await call("DELETE", `/books/${newId}`);
  check("DELETE existing -> 200", r.status === 200);
  r = await call("DELETE", `/books/${newId}`);
  check("DELETE again (gone) -> 404", r.status === 404);
  r = await call("GET", "/nothing-here");
  check("Unknown route -> 404 with { message }", r.status === 404 && r.json.message);

  server.close();
  await db.close();
  fs.unlinkSync(dbFile);
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
