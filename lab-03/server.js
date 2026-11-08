require("dotenv").config();
const { initDb } = require("./src/db");
const { createApp } = require("./src/app");

const PORT = process.env.PORT || 3000;

async function start() {
  const db = await initDb(process.env.DB_PATH);
  const app = createApp(db);

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Debugging exercise #1: port already in use
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other process or set a different PORT in .env`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
