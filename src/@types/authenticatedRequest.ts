import { Request } from "express";
import { Session, User } from "lucia";

export interface AuthenticatedRequest extends Request {
    authData: { user: User; session: Session };
}
