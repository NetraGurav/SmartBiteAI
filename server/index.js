//--------------------------------------------------------------
// SmartBite AI Backend (FULL FILE WITH FIXED MONGO CONNECTION)
//--------------------------------------------------------------

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();

console.log("🚀 Starting SmartBite AI Backend...");

const app = express();
const server = http.createServer(app);

// -------------------------
// Socket.IO
// -------------------------
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const CLIENT_ORIGIN = process.env.CLIENT_URL || "http://localhost:3000";

// -------------------------
// CORS
// -------------------------
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// -------------------------
// Basic Middleware
// -------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📥 ${req.method} ${req.url}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `📤 ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
});

// Timeout protection
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

const PORT = process.env.PORT || 5000;

// ----------------------------------------------------
//  🔥 FIXED HIGH-STABILITY MONGODB CONNECTION
// ----------------------------------------------------
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smartbiteai";

console.log("💾 MongoDB URI:", MONGO_URI);

async function connectDB() {
  try {
    console.log("\n⏳ Attempting MongoDB connection...");

    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully!");
  } catch (err) {
    console.log("❌ MongoDB connection failed:", err.message);
    console.log("🔁 Retrying in 3 seconds...");
    setTimeout(connectDB, 6000);
  }
}

// Delay connection until Windows MongoDB service fully starts
setTimeout(connectDB, 6000);

// MongoDB events
mongoose.connection.on("connected", () => console.log("🔗 MongoDB connected"));
mongoose.connection.on("reconnected", () =>
  console.log("🔄 MongoDB reconnected")
);
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected — retrying...");
  setTimeout(connectDB, 6000);
});
mongoose.connection.on("error", (err) =>
  console.error("❌ MongoDB error:", err.message)
);

// Graceful Shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Graceful shutdown...");
  await mongoose.connection.close();
  process.exit(0);
});

// ----------------------------------------------------
// Routes
// ----------------------------------------------------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/foods", require("./routes/food"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/reports", require("./routes/reports"));

// Server health check
app.get("/", (req, res) => {
  res.json({
    message: "SmartBite AI backend is running!",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ success: false, message: "Something went wrong!" });
});

// ----------------------------------------------------
// Socket.IO
// ----------------------------------------------------
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on("join-user-room", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined room user-${userId}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

app.set("io", io);

// ----------------------------------------------------
// Start Server
// ----------------------------------------------------
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🔌 Socket.IO ready`);
});

module.exports = { app, getIO: () => io };
