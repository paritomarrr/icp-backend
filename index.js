const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors"); // ✅ Add this

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const workspaceRoutes = require("./routes/workspace");

const app = express();

// ✅ Enable CORS for frontend origin
app.use(cors({
  origin: "http://localhost:8080", // your frontend URL
  credentials: true
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error("MongoDB error:", err));
