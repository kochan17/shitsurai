import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

interface AuthData {
  token: string;
  user_id?: string;
  email?: string;
  baseUrl?: string;
}

function getAuthPath(): string {
  return join(homedir(), ".shitsurai", "auth.json");
}

export function saveAuth(data: AuthData): void {
  const authPath = getAuthPath();
  const dir = dirname(authPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(authPath, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 0o600 });
  try {
    chmodSync(authPath, 0o600);
  } catch {
    // best-effort
  }
}

export function loadAuth(): AuthData | undefined {
  const authPath = getAuthPath();
  if (!existsSync(authPath)) return undefined;
  try {
    const raw = readFileSync(authPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj["token"] !== "string") return undefined;
    return {
      token: obj["token"],
      user_id: typeof obj["user_id"] === "string" ? obj["user_id"] : undefined,
      email: typeof obj["email"] === "string" ? obj["email"] : undefined,
      baseUrl: typeof obj["baseUrl"] === "string" ? obj["baseUrl"] : undefined,
    };
  } catch {
    return undefined;
  }
}

export function clearAuth(): void {
  const authPath = getAuthPath();
  if (existsSync(authPath)) {
    unlinkSync(authPath);
  }
}

export function getAuthToken(): string | undefined {
  const envToken = process.env["SHITSURAI_API_KEY"];
  if (envToken !== undefined && envToken.length > 0) return envToken;
  return loadAuth()?.token;
}

export function getBaseUrl(): string | undefined {
  const envUrl = process.env["SHITSURAI_BASE_URL"];
  if (envUrl !== undefined && envUrl.length > 0) return envUrl;
  return loadAuth()?.baseUrl;
}

export function isHostedMode(): boolean {
  return getBaseUrl() !== undefined;
}
