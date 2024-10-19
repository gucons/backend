import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { User } from "@prisma/client";
import { Google, LinkedIn } from "arctic";
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

// OAuth providers
export const google = new Google(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.APP_URL}/api/v1/auth/oauth/google/callback`
);

export const linkedin  = new LinkedIn(
    process.env.LINKEDIN_CLIENT_ID!,
    process.env.LINKEDIN_CLIENT_SECRET!,
    `${process.env.APP_URL}/api/v1/auth/oauth/linkedin/callback`
);