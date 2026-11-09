import "dotenv/config";
import { connectDb } from "./config/db.js";
import { backfillBugIds } from "./bugIds.js";
import app from "./app.js";

const port = process.env.PORT || 5000;

connectDb()
  .then(async () => {
    await backfillBugIds();
    app.listen(port, () => {
      console.log(`Myzilla API listening on ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err.message);
    process.exit(1);
  });
