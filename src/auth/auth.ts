import { Lucia } from "lucia";
import prismaClient from "../prisma/prismaClient";
import prisma from "../prisma/prismaClient";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { User } from "@prisma/client";

const adapter = new PrismaAdapter(prisma.session, prisma.user);

interface DatabaseUserAttributes extends User {}

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
        };
    },
});

declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
    }
}
