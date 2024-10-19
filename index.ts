import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";

import authRoutes from "./src/routes/auth.route";
import consultantRoutes from "./src/routes/consultant.route";
import connectionRoutes from "./src/routes/connection.route";
import notificationRoutes from "./src/routes/notification.route";
import postRoutes from "./src/routes/post.route";
import userRoutes from "./src/routes/user.route";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

const corsOptions = {
    origin: (origin: string | undefined, callback: any) => {
        if (!origin) {
            // Allow requests with no origin (like Postman or server-side)
            console.log("No origin provided, allowing request.");
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true); // Origin is allowed
        } else {
            console.error(`CORS Error: Origin ${origin} not allowed.`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true, // Support cookies, authorization headers
};

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/consultant", consultantRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/connections", connectionRoutes);

app.get("/", (req, res) => {
    res.send("API is running...");
});

app.listen(PORT, () => {
    console.log(
        `Server running on ${process.env.APP_URL || `http://localhost:${PORT}`}`
    );
});
