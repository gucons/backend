import { Session, User } from "lucia";

declare global {
    namespace Express {
        interface Request {
            result: { user: User | null; session: Session };
        }
    }
}
