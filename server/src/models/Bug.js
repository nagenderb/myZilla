import mongoose from "mongoose";

export const BUG_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

const bugSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    status: { type: String, enum: BUG_STATUSES, default: "Open" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    developer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    qa: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const Bug = mongoose.model("Bug", bugSchema);
