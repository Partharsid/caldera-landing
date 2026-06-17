import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const SECRET = process.env.ADMIN_COOKIE_SECRET ?? "fallback-dev-secret";

async function getSecretKey() {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await getSecretKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyToken(token: string): Promise<boolean> {
  const [value, sig] = token.split(".");
  if (!value || !sig) return false;
  const expected = await sign(value);
  
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

export async function makeToken(): Promise<string> {
  const value = `admin:${Date.now()}`;
  return `${value}.${await sign(value)}`;
}

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) {
    throw new Error("Unauthorized: Missing admin session");
  }

  const isValid = await verifyToken(token);
  if (!isValid) {
    throw new Error("Unauthorized: Invalid admin session");
  }
  
  return true;
}
