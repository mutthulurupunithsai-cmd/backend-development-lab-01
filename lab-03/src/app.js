const express = require("express");
const { validateBookBody, parseId, parseListQuery } = require("./validation");

// Builds the Express app around an already-open database (easy to test).
function createApp(db) {
  const app = express();
  app.use(express.json());

  // GET /books  -> search, filter, sort, paginate
  app.get("/books", async (req, res, next) => {
    try {
      const parsed = parseListQuery(req.query);
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      const q = parsed.value;

      // Build WHERE with placeholders only; user input never joins the SQL string.
      const where = [];
      const params = [];
      if (q.search_q) {
        where.push("title LIKE ?");
        params.push(`%${q.search_q}%`);
      }
      if (q.min_price !== undefined && q.max_price !== undefined) {
        where.push("price BETWEEN ? AND ?");
        params.push(q.min_price, q.max_price);
      } else if (q.min_price !== undefined) {
        where.push("price >= ?");
        params.push(q.min_price);
      } else if (q.max_price !== undefined) {
        where.push("price <= ?");
        params.push(q.max_price);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      // order_by / order are checked against a whitelist in validation.js
      // (column names cannot be bound as parameters).
      const rows = await db.all(
        `SELECT id, title, author, price FROM books ${whereSql}
         ORDER BY ${q.order_by} ${q.order} LIMIT ? OFFSET ?`,
        [...params, q.limit, q.offset]
      );
      const { total } = await db.get(
        `SELECT COUNT(*) AS total FROM books ${whereSql}`,
        params
      );

      res.status(200).json({
        message: "Books fetched successfully",
        total,
        limit: q.limit,
        offset: q.offset,
        data: rows,
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /books/:id
  app.get("/books/:id", async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (id.error) return res.status(400).json({ message: id.error });

      const book = await db.get(
        "SELECT id, title, author, price FROM books WHERE id = ?",
        [id.value]
      );
      if (!book) return res.status(404).json({ message: "Book not found" });
      res.status(200).json({ message: "Book fetched successfully", data: book });
    } catch (err) {
      next(err);
    }
  });

  // POST /books
  app.post("/books", async (req, res, next) => {
    try {
      const v = validateBookBody(req.body);
      if (v.error) return res.status(400).json({ message: v.error });
      const { title, author, price } = v.value;

      const result = await db.run(
        "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
        [title, author, price]
      );
      res.status(201).json({
        message: "Book created successfully",
        data: { id: result.lastID, title, author, price },
      });
    } catch (err) {
      next(err);
    }
  });

  // PUT /books/:id
  app.put("/books/:id", async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (id.error) return res.status(400).json({ message: id.error });
      const v = validateBookBody(req.body);
      if (v.error) return res.status(400).json({ message: v.error });
      const { title, author, price } = v.value;

      const result = await db.run(
        "UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?",
        [title, author, price, id.value]
      );
      if (result.changes === 0) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.status(200).json({
        message: "Book updated successfully",
        data: { id: id.value, title, author, price },
      });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /books/:id
  app.delete("/books/:id", async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (id.error) return res.status(400).json({ message: id.error });

      const result = await db.run("DELETE FROM books WHERE id = ?", [id.value]);
      if (result.changes === 0) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.status(200).json({ message: "Book deleted successfully" });
    } catch (err) {
      next(err);
    }
  });

  // Unknown route -> 404 in the same { message } format
  app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // Central error handler -> consistent { message } format
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Invalid JSON in request body" });
    }
    console.error(err); // log server-side only, never leak internals
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
