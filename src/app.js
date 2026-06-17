import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

import healthCheckRoute from "./routes/healthcheck.route.js";
app.use("/api/v1/healthcheck", healthCheckRoute);

import authRouter from "./routes/auth.routes.js";
app.use("/api/v1/auth", authRouter);

// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });

// app.get("/instagram", (req, res) => {
//   res.send(`Instagram route ...`);
// });

export default app;
