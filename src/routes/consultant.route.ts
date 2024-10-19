import express, { Request, Response } from "express";
import {
    createConsultant,
    retrieveConsultant,
    updateConsultant,
} from "../controllers/consultant.controller";
import { protectRoute } from "../middleware/auth.middleware";
import { ensureLoggedConsultant } from "../middleware/consultant.middleware";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Consultant Route is working",
    });
});

router.post("/create", protectRoute, ensureLoggedConsultant, createConsultant);
router.get(
    "/retrieve",
    protectRoute,
    ensureLoggedConsultant,
    retrieveConsultant
);
router.post("/update", protectRoute, ensureLoggedConsultant, updateConsultant);

export default router;
