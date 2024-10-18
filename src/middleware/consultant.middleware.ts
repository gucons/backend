import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../@types/authenticatedRequest";

export const ensureLoggedConsultant = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { user } = (req as AuthenticatedRequest).authData;
        if (user.role !== "CONSULTANT") {
            res.status(403).json({
                message:
                    "Forbidden - You are not authorized to access this route",
            });
            return;
        }

        return next();
    } catch (error: any) {
        console.log(
            "Error in ensureLoggedConsultant middleware:",
            error.message
        );
        res.status(500).json({ message: "Internal server error" });
    }
};
