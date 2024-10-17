import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { z } from "zod";
import { lucia } from "../auth/auth";
import prisma from "../prisma/prismaClient";

const passwordSchema = z
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
    });

const signupSchema = z.object({
    email: z.string().email(),
    password: passwordSchema,
    role: z.nativeEnum(UserRole),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const signup = async (req: Request, res: Response) => {
    try {
        const { email, password, role } = signupSchema.parse(req.body);

        // Check if email is already in use
        const existingEmail = await prisma.user.findUnique({
            where: { email },
        });
        if (existingEmail) {
            res.status(400).json({
                success: false,
                message: "Email already exists",
            });
            return;
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
            },
        });

        // Create a new session using Lucia
        const session = await lucia.createSession(user.id, {});
        const sessionCookie = lucia.createSessionCookie(session.id);

        // Set the session cookie
        res.cookie(sessionCookie.name, sessionCookie.value, {
            httpOnly: true,
            // maxAge: sessionCookie.attributes.maxAge, // You might need to adjust this
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });

        // Respond with success
        res.status(200).json({
            success: true,
            message: "User registered successfully",
        });

        // Optional: Send a welcome email (if needed)
        const profileUrl = process.env.CLIENT_URL + "/profile/" + user.id;
        try {
            console.log("Email sent to:", email);
            // await sendWelcomeEmail(email, profileUrl);
        } catch (emailError) {
            console.error("Error sending welcome email", emailError);
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                message: error.errors[0].message,
            });
            return;
        }
        console.log("Error in signup: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        // Check if user exists
        const user = await prisma.user.findUnique({
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

        // Create a new session using Lucia
        const session = await lucia.createSession(user.id, {});
        const sessionCookie = lucia.createSessionCookie(session.id);

        // Set the session cookie
        res.cookie(sessionCookie.name, sessionCookie.value, {
            httpOnly: true,
            // maxAge: sessionCookie.attributes.maxAge, // You might need to adjust this
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                message: error.errors[0].message,
            });
            return;
        }
        console.log("Error in signup: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const { session } = req.result;

        // Invalidate the session
        await lucia.invalidateSession(session.id);

        const sessionCookie = lucia.createBlankSessionCookie();
        res.cookie(
            sessionCookie.name,
            sessionCookie.value,
            sessionCookie.attributes
        );
        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        console.log("Error in logout: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        const { user } = req.result;
        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("Error in getCurrentUser controller: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
