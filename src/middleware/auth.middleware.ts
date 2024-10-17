import { NextFunction, Request, Response } from "express";
import { lucia } from "../auth/auth";
import { Session, User } from "lucia";

export const protectRoute = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const sessionId = req.cookies[lucia.sessionCookieName] ?? null;
        if (!sessionId) {
            res.status(401).json({
                message: "Unauthorized - Session not found",
            });
            return;
        }

        const result = await lucia.validateSession(sessionId);
        if (result.session && result.session.fresh) {
            const sessionCookie = lucia.createSessionCookie(result.session.id);
            res.cookie(
                sessionCookie.name,
                sessionCookie.value,
                sessionCookie.attributes
            );
        }
        if (!result.session) {
            const sessionCookie = lucia.createBlankSessionCookie();
            res.cookie(
                sessionCookie.name,
                sessionCookie.value,
                sessionCookie.attributes
            );
        }

        req.result = result as { user: User; session: Session };
        next();
    } catch (error: any) {
        console.log("Error in protectRoute middleware:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
