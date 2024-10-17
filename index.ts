import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import authRoutes from "./src/routes/auth.route";
import connectionRoutes from "./src/routes/connection.route";
import notificationRoutes from "./src/routes/notification.route";
import postRoutes from "./src/routes/post.route";
import userRoutes from "./src/routes/user.route";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

const corsOptions = {
    origin: (origin: any, callback: any) => {
        // Allow requests with no origin (like mobile apps, Postman, server-side)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true, // Enable credentials (Required for cookies)
};

app.options("*", cors(corsOptions)); // Enable pre-flight request for all routes
app.use(cors(corsOptions)); // Enable CORS for all routes
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/connections", connectionRoutes);

app.get("/", (req, res) => {
    res.send("API is running...");
});

app.listen(PORT, () => {
    console.log(`Server running on port https://localhost:${PORT}`);
});
