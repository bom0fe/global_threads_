require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const path     = require("path");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

/* API routes. */
app.use("/api/events", require("./routes/events"));
app.use("/api/news",   require("./routes/news"));

app.get("/health", (_, res) => res.json({ status: "ok" }));

const buildPath = path.join(__dirname, "..", "build");
app.use(express.static(buildPath));
app.get("*", (_, res) => res.sendFile(path.join(buildPath, "index.html")));

/* Connect and start. */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Atlas 연결 성공");
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`🚀 서버 실행 중 → http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("❌ MongoDB 연결 실패:", err.message);
    process.exit(1);
  });
