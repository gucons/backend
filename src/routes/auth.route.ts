import express from "express";
import {
    login,
    logout,
    signup,
    getCurrentUser,
    verifySession,
    googleOAuth,
    googleOAuthCallback,
} from "../controllers/auth.controller";
import { protectRoute } from "../middleware/auth.middleware";

const router = express.Router();

// Email and Password based authentication
router.post("/signup", signup);
router.post("/login", login);

// OAuth based authentication
router.get("/oauth/google", googleOAuth);
router.get("/oauth/google/callback", googleOAuthCallback);

// Verify session to check if the user is logged in
router.post("/verify-session", verifySession);

// Protected routes
router.post("/logout", protectRoute, logout);
router.get("/current-user", protectRoute, getCurrentUser);

export default router;
