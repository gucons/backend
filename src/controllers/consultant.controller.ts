import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/prismaClient";
import { AuthenticatedRequest } from "../@types/authenticatedRequest";
import { Consultant } from "@prisma/client";

const consultantCreationSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    contactEmail: z.string().email(),
    profilePicture: z.string().url().nullable(),
    phoneNumber: z.string().nullable(),
    location: z.string().nullable(),
    timeZone: z.string().nullable(),
});

export const createConsultant = async (req: Request, res: Response) => {
    try {
        const { user } = (req as AuthenticatedRequest).authData;

        const consultantData: Omit<
            Consultant,
            "id" | "createdAt" | "updatedAt" | "benchSalesId" | "userId"
        > = consultantCreationSchema.parse(req.body);

        const exitstingConsultant = await prisma.consultant.findUnique({
            where: { userId: user.id },
        });
        if (exitstingConsultant) {
            res.status(400).json({
                success: false,
                message: "Consultant already exists",
            });
        }

        prisma.consultant.create({
            data: {
                ...consultantData,
                userId: user.id,
            },
        });
        res.status(201).json({
            success: true,
            message: "Consultant created successfully",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                message: error.errors[0].message,
            });
            return;
        }
        console.log("Error in createConsultant controller: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const consultantUpdateSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    contactEmail: z.string().email(),
    profilePicture: z.string().url(),
    phoneNumber: z.string(),
    location: z.string(),
    timeZone: z.string(),
});

export const updateConsultant = async (req: Request, res: Response) => {
    try {
        const { user } = (req as AuthenticatedRequest).authData;

        const consultantData = consultantUpdateSchema.partial().parse(req.body);

        await prisma.consultant.update({
            where: { id: user.id },
            data: {
                ...consultantData,
            },
        });
        res.status(200).json({
            success: true,
            message: "Consultant updated successfully",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                message: error.errors[0].message,
            });
            return;
        }
        console.log("Error in updateConsultant controller: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const retrieveConsultant = async (req: Request, res: Response) => {
    try {
        const { user } = (req as AuthenticatedRequest).authData;

        const consultant = await prisma.consultant.findUnique({
            where: { id: user.id },
        });
        if (!consultant) {
            res.status(404).json({
                success: false,
                message: "Consultant not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Consultant retrieved successfully",
            data: consultant,
        });
    } catch (error) {
        console.log("Error in retrieveConsultant controller: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
