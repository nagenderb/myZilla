import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (_req, res) => {
  const users = await User.find().sort({ name: 1 });
  res.json(users);
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  if (role && !["admin", "user"].includes(role)) {
    return res.status(400).json({ message: "Role must be admin or user" });
  }
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ message: "Email is already registered" });
  }
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: await bcrypt.hash(password, 10),
    role: role || "user",
  });
  res.status(201).json(user);
});

router.patch("/:id", requireAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const { name, email, password, role } = req.body;
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ message: "Name is required" });
    user.name = name.trim();
  }
  if (email !== undefined) {
    const next = email.toLowerCase().trim();
    if (!next) return res.status(400).json({ message: "Email is required" });
    const existing = await User.findOne({ email: next, _id: { $ne: user._id } });
    if (existing) return res.status(409).json({ message: "Email is already registered" });
    user.email = next;
  }
  if (role !== undefined) {
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Role must be admin or user" });
    }
    if (user.role === "admin" && role !== "admin") {
      const admins = await User.countDocuments({ role: "admin" });
      if (admins <= 1) {
        return res.status(400).json({ message: "Cannot remove the last admin" });
      }
    }
    user.role = role;
  }
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    user.password = await bcrypt.hash(password, 10);
  }
  await user.save();
  res.json(user);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role === "admin") {
    const admins = await User.countDocuments({ role: "admin" });
    if (admins <= 1) {
      return res.status(400).json({ message: "Cannot delete the last admin" });
    }
  }
  await user.deleteOne();
  res.json({ message: "User deleted" });
});

export default router;
