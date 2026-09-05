// AgriImpact engine constants — every number here is an explicitly documented
// assumption. They are shown verbatim in the Methodology page of the app so
// stakeholders can audit what the impact numbers rest on.

export const MODEL_VERSION = "fao56-dualbucket-v1";

// --- Water / impact constants -------------------------------------------------

// Conventional (business-as-usual) irrigation depth a typical smallholder
// applies on a fixed calendar schedule, regardless of soil status.
// Planning assumption for the baseline scenario (mm/week).
export const CONVENTIONAL_MM_PER_WEEK: Record<string, number> = {
  rice: 70, // continuous flood maintenance (net of rainfall), Mekong practice
  maize: 35,
  sugarcane: 40,
  coffee: 25,
  vegetables: 30,
  soybean: 30,
  peanut: 25,
  cassava: 15,
  fruit: 25,
};

// --- Energy / carbon ----------------------------------------------------------

export const PUMP_HEAD_M = 10; // assumed pumping lift (m)
export const PUMP_EFFICIENCY = 0.4; // typical smallholder centrifugal pump

// Vietnam national grid average emission factor (tCO2/MWh).
// Source: IGES Grid Emission Factors list, Vietnam 2019 value (0.6538).
export const GRID_EF_KG_PER_KWH = 0.6538;

// --- Rules --------------------------------------------------------------------

// Stress alert triggers (see engine/alerts.ts)
export const HEAVY_RAIN_MM = 50; // drainage / erosion risk
export const EXTREME_RAIN_MM = 90;
export const HEAT_TMAX_C = 35; // heat stress during flowering stages
export const EXTREME_HEAT_C = 38;

// Sustainability score weights (must sum to 1) — displayed in the UI.
export const SCORE_WEIGHTS = {
  water: 0.35,
  stress: 0.25,
  adoption: 0.25,
  energy: 0.15,
} as const;

// Engine: water balance
export const SURFACE_LAYER_MM = 100; // 0–10 cm layer depth used for the surface bucket
export const PAST_DAYS = 30; // days of observed weather used to initialise soil state
export const FORECAST_DAYS = 7;
