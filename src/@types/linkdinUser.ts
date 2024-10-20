export interface linkedinOAuthUser {
    sub: string;
    email_verified: boolean;
    name: string;
    locale: {
        country: string;
        language: string;
    };
    given_name: string;
    family_name: string;
    email: string;
    picture: string;
}
