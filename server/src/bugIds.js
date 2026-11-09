import { Bug } from "./models/Bug.js";
import { Counter, nextBugId } from "./models/Counter.js";

const missingBugId = { $or: [{ bugId: { $exists: false } }, { bugId: null }] };

export async function backfillBugIds() {
  const highest = await Bug.findOne({ bugId: { $type: "number" } }).sort({ bugId: -1 }).select("bugId");
  const counter = await Counter.findById("bug");
  const floor = Math.max(counter?.seq || 0, highest?.bugId || 0);
  if (!counter || counter.seq < floor) {
    await Counter.findOneAndUpdate({ _id: "bug" }, { $set: { seq: floor } }, { upsert: true });
  }

  const missing = await Bug.find(missingBugId).sort({ createdAt: 1 });
  for (const bug of missing) {
    bug.bugId = await nextBugId();
    await bug.save();
  }
}
