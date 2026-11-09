import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "./config/db.js";
import { User } from "./models/User.js";
import { Product } from "./models/Product.js";
import mongoose from "mongoose";

const ADMIN_EMAIL = "admin@myzilla.local";

async function seed() {
  await connectDb();
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      name: "Admin",
      email: ADMIN_EMAIL,
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
    });
    console.log("Created admin", ADMIN_EMAIL);
  } else {
    console.log("Admin already exists");
  }

  const existingProduct = await Product.findOne({ name: "Myzilla" });
  if (!existingProduct) {
    await Product.create({
      name: "Myzilla",
      description: "Sample product",
      createdBy: admin._id,
    });
    console.log("Created sample product Myzilla");
  } else {
    console.log("Sample product already exists");
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
