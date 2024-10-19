import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { z } from "zod";
import { google, lucia } from "../auth/auth";
import prisma from "../prisma/prismaClient";
import { AuthenticatedRequest } from "../@types/authenticatedRequest";
import {
    generateCodeVerifier,
    generateState,
    OAuth2RequestError,
} from "arctic";
import { GoogleOauth2User } from "../@types/googleUser";

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
    password: passwordSchema,
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
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
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
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
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

export const googleOAuth = async (req: Request, res: Response) => {
    try {
        const state = generateState();
        const codeVerifier = generateCodeVerifier();
        const authorizationUrl = await google.createAuthorizationURL(
            state,
            codeVerifier,
            {
                scopes: ["openid", "profile"],
            }
        );

        // Store the state and code verifier in cookies
        res.cookie("google_oauth_state", state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            expires: new Date(Date.now() + 600000), // Expires in 10 minutes
        });
        res.cookie("google_oauth_code_verifier", codeVerifier, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            expires: new Date(Date.now() + 600000), // Expires in 10 minutes
        });

        // Redirect the user to the Google OAuth URL
        res.status(200).redirect(authorizationUrl.toString());
    } catch (error) {
        console.log("Error in googleOAuth: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const googleOAuthCallback = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query as {
            code: string;
            state: string;
        };
        const storedState = req.cookies["google_oauth_state"] ?? null;
        const storedCodeVerifier =
            req.cookies["google_oauth_code_verifier"] ?? null;

        const sessionCookie = lucia.createBlankSessionCookie();

        // Check if the state is valid and matches the stored state
        if (
            !code ||
            !state ||
            !storedState ||
            !storedCodeVerifier ||
            state !== storedState
        ) {
            // Clear the session cookie
            res.header("Set-Cookie", sessionCookie.serialize());
            res.cookie(
                sessionCookie.name,
                sessionCookie.value,
                sessionCookie.attributes
            );
            res.status(400).json({
                success: false,
                message: "Invalid state",
            });
            return;
        }

        // Exchange the code for an access token
        const tokens = await google.validateAuthorizationCode(
            code,
            storedCodeVerifier
        );
        const accessToken = tokens.accessToken;

        const googleUserResponse = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );
        const googleUser = await googleUserResponse.json();
        res.status(200).json({
            success: true,
            googleUser,
        });
    } catch (error) {
        if (error instanceof OAuth2RequestError) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
            return;
        }
        console.log("Error in googleOAuthCallback: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const { session } = (req as AuthenticatedRequest).authData;

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

export const verifySession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(401).json({
                message: "Unauthorized - Session not found",
            });
            return;
        }
        const { session, user } = await lucia.validateSession(sessionId);
        if (!session || !user) {
            res.status(401).json({
                message: "Unauthorized - Invalid session",
            });
        }
        res.status(200).json({
            success: true,
            message: "Session is valid",
        });
    } catch (error) {
        console.log("Error in verifySession: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        const { user } = (req as AuthenticatedRequest).authData;
        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.log("Error in getCurrentUser controller: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
