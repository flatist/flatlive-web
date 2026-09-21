import crypto from "crypto";

const PEPPER = process.env.AUTH_PASSWORD_PEPPER || "flatlive-dev-pepper";

export function hashPassword(password: string) {
  return crypto
    .createHash("sha256")
    .update(`${PEPPER}:${password}`)
    .digest("hex");
}

export function verifyPassword(password: string, passwordHash: string) {
  return hashPassword(password) === passwordHash;
}

export function getPasswordHashInfo() {
  return {
    algorithm: "sha256",
    pepper: Boolean(process.env.AUTH_PASSWORD_PEPPER),
  };
}
