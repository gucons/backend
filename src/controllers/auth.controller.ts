import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendWelcomeEmail } from "../emails/emailHandlers";
import { Request, Response } from "express";
import prismaClient from "../prisma/prismaClient";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const signupSchema = z.object({
    email: z.string().email(),
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters long" })
        .max(32, { message: "Password must be at most 32 characters long" })
        .regex(/[a-z]/, {
            message: "Password must contain at least one lowercase letter",
        })
        .regex(/[A-Z]/, {
            message: "Password must contain at least one uppercase letter",
        })
        .regex(/[0-9]/, {
            message: "Password must contain at least one number",
        })
        .regex(/[^a-zA-Z0-9]/, {
            message: "Password must contain at least one special character",
        }),
    role: z.nativeEnum(UserRole),
});

export const signup = async (req: Request, res: Response) => {
    try {
        const { email, password, role } = signupSchema.parse(req.body);

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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prismaClient.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
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
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors,
            });
            return;
        }
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
    try {
        res.status(200).json({
            success: true,
            user: {
                id: req.user?.id,
                email: req.user?.email,
                role: req.user?.role,
            },
        });
    } catch (error) {
        console.error("Error in getCurrentUser controller:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
