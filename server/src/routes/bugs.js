import { Router } from "express";
import mongoose from "mongoose";
import { Bug, BUG_STATUSES } from "../models/Bug.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const userFields = "name email";

router.use(requireAuth);

function populateBug(query) {
  return query
    .populate("product", "name")
    .populate("createdBy", userFields)
    .populate("updatedBy", userFields)
    .populate("developer", userFields)
    .populate("qa", userFields);
}

async function optionalUser(id, label) {
  if (id === null || id === "") return null;
  if (!id) return undefined;
  if (!mongoose.isValidObjectId(id)) {
    return { error: `${label} is invalid` };
  }
  const user = await User.findById(id);
  if (!user) return { error: `${label} not found` };
  return user._id;
}

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.product) {
    if (!mongoose.isValidObjectId(req.query.product)) {
      return res.status(400).json({ message: "Product is invalid" });
    }
    filter.product = req.query.product;
  }
  if (req.query.status) {
    if (!BUG_STATUSES.includes(req.query.status)) {
      return res.status(400).json({ message: "Status is invalid" });
    }
    filter.status = req.query.status;
  }
  const bugs = await populateBug(Bug.find(filter).sort({ updatedAt: -1 }));
  res.json(bugs);
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Bug is invalid" });
  }
  const bug = await populateBug(Bug.findById(req.params.id));
  if (!bug) return res.status(404).json({ message: "Bug not found" });
  res.json(bug);
});

router.post("/", async (req, res) => {
  const { title, description, product, status, developer, qa } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
  if (!product || !mongoose.isValidObjectId(product)) {
    return res.status(400).json({ message: "Product is required" });
  }
  const productDoc = await Product.findById(product);
  if (!productDoc) return res.status(400).json({ message: "Product not found" });
  if (status && !BUG_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Status is invalid" });
  }
  const developerId = await optionalUser(developer, "Developer");
  if (developerId?.error) return res.status(400).json({ message: developerId.error });
  const qaId = await optionalUser(qa, "QA");
  if (qaId?.error) return res.status(400).json({ message: qaId.error });

  const bug = await Bug.create({
    title: title.trim(),
    description: description?.trim() || "",
    product: productDoc._id,
    status: status || "Open",
    createdBy: req.user._id,
    updatedBy: req.user._id,
    developer: developerId || null,
    qa: qaId || null,
  });
  res.status(201).json(await populateBug(Bug.findById(bug._id)));
});

router.patch("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Bug is invalid" });
  }
  const bug = await Bug.findById(req.params.id);
  if (!bug) return res.status(404).json({ message: "Bug not found" });

  const { title, description, product, status, developer, qa } = req.body;
  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ message: "Title is required" });
    bug.title = title.trim();
  }
  if (description !== undefined) bug.description = description.trim();
  if (product !== undefined) {
    if (!mongoose.isValidObjectId(product)) {
      return res.status(400).json({ message: "Product is invalid" });
    }
    const productDoc = await Product.findById(product);
    if (!productDoc) return res.status(400).json({ message: "Product not found" });
    bug.product = productDoc._id;
  }
  if (status !== undefined) {
    if (!BUG_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Status is invalid" });
    }
    bug.status = status;
  }
  if (developer !== undefined) {
    const developerId = await optionalUser(developer, "Developer");
    if (developerId?.error) return res.status(400).json({ message: developerId.error });
    bug.developer = developerId;
  }
  if (qa !== undefined) {
    const qaId = await optionalUser(qa, "QA");
    if (qaId?.error) return res.status(400).json({ message: qaId.error });
    bug.qa = qaId;
  }
  bug.updatedBy = req.user._id;
  await bug.save();
  res.json(await populateBug(Bug.findById(bug._id)));
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Bug is invalid" });
  }
  const bug = await Bug.findById(req.params.id);
  if (!bug) return res.status(404).json({ message: "Bug not found" });
  await bug.deleteOne();
  res.json({ message: "Bug deleted" });
});

export default router;
