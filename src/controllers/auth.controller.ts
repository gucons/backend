import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendWelcomeEmail } from "../emails/emailHandlers";
import { Request, Response } from "express";
import prismaClient from "../prisma/prismaClient";

export const signup = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
            return;
        }

        const existingEmail = await prismaClient.prisma.user.findUnique({
            where: { email },
        });
        if (existingEmail) {
            res.status(400).json({
                success: false,
                message: "Email already exists",
            });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prismaClient.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: "PENDING", // Assign the role and data based on user choice afterwards
            },
        });

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({
                success: false,
                message: "Internal server error - JWT secret not configured",
            });
            return;
        }

        const token = jwt.sign({ userId: user.id }, secret, {
            expiresIn: "3d",
        });

        res.cookie("jwt-token", token, {
            httpOnly: true,
            maxAge: 3 * 24 * 60 * 60 * 1000,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });

        res.status(200).json({
            success: true,
            message: "User registered successfully",
        });

        const profileUrl = process.env.CLIENT_URL + "/profile/" + user.id; // Adjust based on your routing

        try {
            console.log("Email sent to:", user.email);
            // await sendWelcomeEmail(user.email, profileUrl);
        } catch (emailError) {
            console.error("Error sending welcome Email", emailError);
        }
    } catch (error: any) {
        console.log("Error in signup: ", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await prismaClient.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid credentials",
            });
            return;
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({
                success: false,
                message: "Invalid credentials",
            });
            return;
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({
                success: false,
                message: "Internal server error - JWT secret not configured",
            });
            return;
        }

        // Create and send token
        const token = jwt.sign({ userId: user.id, email: user.email }, secret, {
            expiresIn: "3d",
        });

        res.cookie("jwt-token", token, {
            httpOnly: true,
            maxAge: 3 * 24 * 60 * 60 * 1000,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
        });
    } catch (error) {
        console.error("Error in login controller:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie("jwt-token");
    res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const getCurrentUser = async (req: Request, res: Response) => {
    console.log("User:", req.user);
    res.status(200).json({ success: true, user: req.user });

    // try {
    //     const user = await prismaClient.prisma.user.findUnique({
    //         where: { id: req.user?.id },
    //     });

    //     if (!user) {
    //         res.status(404).json({ success: false, message: "User not found" });
    //         return;
    //     }

    // } catch (error) {
    //     console.error("Error in getCurrentUser controller:", error);
    //     res.status(500).json({ success: false, message: "Server error" });
    // }
};
