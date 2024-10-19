interface GoogleOauth2User {
    sub: string; // Unique identifier for the user
    name?: string; // User's full name
    given_name?: string; // User's first name
    family_name?: string; // User's last name
    profile?: string; // URL of the user's profile page
    picture?: string; // URL of the user's profile picture
    email: string; // User's email address
    email_verified: boolean; // Whether the email has been verified
    locale?: string; // User's locale
    hd?: string; // Google Workspace domain (if applicable)
    exp?: number; // Expiration time of the ID token
    iat?: number; // Issued at time of the ID token
    iss?: string; // Issuer of the ID token
    aud?: string; // Audience of the ID token
}
