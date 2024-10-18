import { Session, User } from "lucia";

declare global {
    namespace Express {
        interface Request {}
    }
}
