import {
  AnalyzeRequest,
  AnalyzeResponse,
  Scenario,
  ScenarioMetadata,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API error: ${response.status}`);
  }

  return response.json();
}

export async function getScenarios(): Promise<ScenarioMetadata[]> {
  return request<ScenarioMetadata[]>("/api/v1/scenarios");
}

export async function getScenario(
  scenarioId: string
): Promise<Scenario> {
  return request<Scenario>(
    `/api/v1/scenarios/${encodeURIComponent(scenarioId)}`
  );
}

export async function analyzeScenario(
  payload: AnalyzeRequest
): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/api/v1/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
