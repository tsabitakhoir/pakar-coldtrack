export interface TelemetryReading {
  ts: string;
  temp_c: number;
  humidity: number;
  ambient_c: number;
  door_open: boolean;
  reefer_on: boolean;
  lat: number | null;
  lon: number | null;
  speed_kmh: number;
  harsh_events: number;
  solar_radiation: number | null;
}

export interface ScenarioMetadata {
  id: string;
  title: string;
  description: string;
  cargo_profile: string;
  expected_status: string;
  reading_count: number;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  cargo_profile: string;
  expected_status: string;
  readings: TelemetryReading[];
}

export interface FailureMode {
  label: string;
  confidence: number;
}

export interface Forecast {
  t15: number;
  t30: number;
  t60: number;
}

export interface FeatureDriver {
  feature: string;
  value: string;
  contribution: number;
}

export interface RecommendedAction {
  priority: number;
  text: string;
  eta_min: number | null;
}

export interface AnalyzeResponse {
  status: string;
  risk_index: number;
  time_to_breach_min: number | null;
  failure_mode: FailureMode;
  forecast: Forecast;
  drivers: FeatureDriver[];
  actions: RecommendedAction[];
  model_version: string;
  inference_ms: number;
}

export interface AnalyzeRequest {
  shipment_id: string;
  cargo_profile: string;
  readings: TelemetryReading[];
}
