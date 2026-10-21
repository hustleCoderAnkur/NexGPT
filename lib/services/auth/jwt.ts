
import "server-only";
import { SignJWT, jwtVerify } from "jose";

function getJwtKey() {
    const secret = process.env.JWT_SECRET;

    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error("JWT_SECRET must be at least 32 bytes");
    }

    return new TextEncoder().encode(secret);
}

export async function signAccessToken(
    userId: string,
    sessionId: string,
) {
    return new SignJWT({ sid: sessionId })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(userId)
        .setIssuer("nexgpt")
        .setAudience("nexgpt-web")
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(getJwtKey());
}

export async function verifyAccessToken(token: string) {
    const { payload } = await jwtVerify(token, getJwtKey(), {
        algorithms: ["HS256"],
        issuer: "nexgpt",
        audience: "nexgpt-web",
    });

    if (
        typeof payload.sub !== "string" ||
        typeof payload.sid !== "string"
    ) {
        throw new Error("Invalid access token");
    }

    return {
        userId: payload.sub,
        sessionId: payload.sid,
    };
}
