import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { User } from "@prisma/client";
import { Lucia } from "lucia";
import prisma from "../prisma/prismaClient";

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        expires: false,
        attributes: {
            secure: process.env.NODE_ENV === "production",
        },
    },
    getUserAttributes: (attributes) => {
        return {
            id: attributes.id,
            email: attributes.email,
            role: attributes.role,
        };
    },
});

declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: User;
    }
}
