import { getAuthToken, getBaseUrl } from "../auth/token-store.js";

interface GenerateDesignRequest {
  prompt: string;
  repo_context: { framework?: string; tokens?: string; root?: string };
  viewport: "desktop" | "mobile";
  mode?: "inspire" | "clone" | "enhance";
  url?: string;
}

interface RefineDesignRequest {
  run_id_or_html: string;
  feedback: string;
  repo_context: { framework?: string; tokens?: string; root?: string };
  viewport: "desktop" | "mobile";
  mode?: "inspire" | "clone" | "enhance";
  url?: string;
}

interface AdoptRequest {
  html: string;
  framework: "react" | "vue" | "nextjs" | "svelte";
  repo_context: { framework?: string; tokens?: string; root?: string };
}

interface HostedResponse {
  html: string;
  run_id: string;
  viewport: "desktop" | "mobile";
  created_at: string;
}

interface AdoptResponse {
  guide: string;
  created_at: string;
}

interface HostedError {
  error: string;
  code?: string;
}

async function callHosted<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = getBaseUrl();
  const token = getAuthToken();

  if (baseUrl === undefined) {
    throw new Error("SHITSURAI_BASE_URL is not set");
  }
  if (token === undefined) {
    throw new Error("Not logged in. Run: shitsurai login");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `Backend error: ${response.status}`;
    try {
      const parsed: unknown = JSON.parse(errorText);
      if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
        const err = (parsed as HostedError).error;
        message = `Backend error: ${err}`;
      }
    } catch {
      // not JSON
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function hostedGenerateDesign(req: GenerateDesignRequest): Promise<HostedResponse> {
  return callHosted<HostedResponse>("/api/v1/generateDesign", req);
}

export async function hostedRefineDesign(req: RefineDesignRequest): Promise<HostedResponse> {
  return callHosted<HostedResponse>("/api/v1/refineDesign", req);
}

export async function hostedAdopt(req: AdoptRequest): Promise<AdoptResponse> {
  return callHosted<AdoptResponse>("/api/v1/adopt", req);
}

interface WhoamiResponse {
  user_id: string;
  email: string;
  name: string | null;
}

interface CreditStatusResponse {
  balance: number;
  monthly_allocation: number;
  resets_at: string | null;
  plan: "free" | "pro" | "team";
  subscription_status: "active" | "canceled" | "past_due" | "incomplete";
}

async function getHosted<T>(path: string): Promise<T> {
  const baseUrl = getBaseUrl();
  const token = getAuthToken();

  if (baseUrl === undefined) {
    throw new Error("SHITSURAI_BASE_URL is not set");
  }
  if (token === undefined) {
    throw new Error("Not logged in. Run: shitsurai login");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function hostedWhoami(): Promise<WhoamiResponse> {
  return getHosted<WhoamiResponse>("/api/v1/me");
}

export async function hostedCreditStatus(): Promise<CreditStatusResponse> {
  return getHosted<CreditStatusResponse>("/api/v1/credits");
}
