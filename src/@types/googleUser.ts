export interface GoogleOauth2User {
    iss: string;
    azp: string;
    aud: string;
    sub: string;
    at_hash: string;
    hd: string;
    email: string;
    email_verified: string;
    iat: number;
    exp: number;
    nonce: string;
}
