import { Router } from "express";
import { Product } from "../models/Product.js";
import { Bug } from "../models/Bug.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (_req, res) => {
  const products = await Product.find().populate("createdBy", "name email").sort({ name: 1 });
  res.json(products);
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  const product = await Product.create({
    name: name.trim(),
    description: description?.trim() || "",
    createdBy: req.user._id,
  });
  await product.populate("createdBy", "name email");
  res.status(201).json(product);
});

router.patch("/:id", requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  const { name, description } = req.body;
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ message: "Name is required" });
    product.name = name.trim();
  }
  if (description !== undefined) {
    product.description = description.trim();
  }
  await product.save();
  await product.populate("createdBy", "name email");
  res.json(product);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  const bugCount = await Bug.countDocuments({ product: product._id });
  if (bugCount > 0) {
    return res.status(400).json({ message: "Remove bugs for this product before deleting it" });
  }
  await product.deleteOne();
  res.json({ message: "Product deleted" });
});

export default router;
