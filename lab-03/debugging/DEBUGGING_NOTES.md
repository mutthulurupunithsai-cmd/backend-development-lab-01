# Debugging exercise: four bugs and their fixes

A practice copy with all four bugs is in `debugging/broken-version/server.js`.

| # | Bug | Symptom (real output) | Cause | Fix |
|---|-----|----------------------|-------|-----|
| 1 | Port conflict | `Error: listen EADDRINUSE: address already in use 0.0.0.0:3000` | Another process already uses the port | Stop the other process (`lsof -i :3000` then `kill <PID>`) or set another `PORT` in `.env`. The real server also handles `server.on("error")` and prints a friendly message. |
| 2 | Wrong import path | `Error: Cannot find module './validators'` | The file is not at that path / name | Correct the relative path in `require(...)` (here `../../src/validation`). |
| 3 | Table-name typo | `SQLITE_ERROR: no such table: book` | Query says `book`, table is `books` | Fix the table name in the SQL string. |
| 4 | Missing `await` | `POST` returns `{}` instead of `{ "id": ... }` | `db.run(...)` returns a Promise; `result.lastID` is read before it resolves | Write `const result = await db.run(...)`. |

## How to reproduce each bug
1. **EADDRINUSE**: start the server twice in two terminals.
2. **Import path**: run `node server.js` inside `debugging/broken-version/` (after `npm install` in lab-03 and linking/copying `node_modules`, or copy the file into lab-03 temporarily).
3. **Table typo**: call `GET /books` on the broken version.
4. **Missing await**: call `POST /books` on the broken version.
