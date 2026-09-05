// Demo dataset — 6 realistic smallholder fields in Vietnam.
// Coordinates are real places; when seeded, EVERY field runs the real analysis
// pipeline against live Open-Meteo weather for its actual location, so all
// moisture values, advisories and impact numbers are genuinely computed —
// never hard-coded.

export interface SeedFieldSpec {
  name: string;
  cropType: string;
  soilType: string;
  growthStage: string;
  region: string;
  ownerName: string;
  ownerRole: string;
  irrigationMethod: string;
  polygon: [number, number][];
  /** Which advisory to auto-decide after the first analysis run, to populate the
   *  impact ledger: "adopt" | "dismiss" | null (leave pending). */
  decide: "adopted" | "dismissed" | null;
}

export const SEED_FIELDS: SeedFieldSpec[] = [
  {
    name: "Paddy An Binh — Can Tho",
    cropType: "rice",
    soilType: "clay",
    growthStage: "mid",
    region: "Can Tho",
    ownerName: "Tran Van Minh",
    ownerRole: "farmer",
    irrigationMethod: "pump",
    polygon: [
      [10.0301, 105.7812],
      [10.0313, 105.7814],
      [10.0312, 105.7829],
      [10.03, 105.7827],
    ],
    decide: "adopted",
  },
  {
    name: "Paddy Hoa Minh — Tra Vinh",
    cropType: "rice",
    soilType: "clayLoam",
    growthStage: "initial",
    region: "Tra Vinh",
    ownerName: "Nguyen Thi Hoa",
    ownerRole: "farmer",
    irrigationMethod: "gravity",
    polygon: [
      [9.9472, 106.351],
      [9.9481, 106.3512],
      [9.948, 106.3521],
      [9.9471, 106.3519],
    ],
    decide: "adopted",
  },
  {
    name: "Maize Ea Kar — Dak Lak",
    cropType: "maize",
    soilType: "loam",
    growthStage: "development",
    region: "Dak Lak",
    ownerName: "Le Van Son",
    ownerRole: "farmer",
    irrigationMethod: "pump",
    polygon: [
      [12.8532, 108.2425],
      [12.8544, 108.2428],
      [12.8543, 108.2445],
      [12.8531, 108.2442],
    ],
    decide: "adopted",
  },
  {
    name: "Coffee Cu M'gar — Dak Lak",
    cropType: "coffee",
    soilType: "clayLoam",
    growthStage: "mid",
    region: "Dak Lak",
    ownerName: "Bui Van Hiep",
    ownerRole: "farmer",
    irrigationMethod: "pump",
    polygon: [
      [12.7088, 108.206],
      [12.7097, 108.2063],
      [12.7096, 108.2075],
      [12.7087, 108.2072],
    ],
    decide: "adopted",
  },
  {
    name: "Veg Garden Da Lat — Lam Dong",
    cropType: "vegetables",
    soilType: "loam",
    growthStage: "mid",
    region: "Lam Dong",
    ownerName: "Da Lat Veg Cooperative",
    ownerRole: "cooperative",
    irrigationMethod: "pump",
    polygon: [
      [11.9435, 108.2468],
      [11.9439, 108.2471],
      [11.9438, 108.2476],
      [11.9434, 108.2473],
    ],
    decide: "adopted",
  },
  {
    name: "Sugarcane Go Dau — Tay Ninh",
    cropType: "sugarcane",
    soilType: "sandyLoam",
    growthStage: "late",
    region: "Tay Ninh",
    ownerName: "Vo Van Tai",
    ownerRole: "farmer",
    irrigationMethod: "pump",
    polygon: [
      [11.3188, 106.0965],
      [11.3202, 106.0968],
      [11.3201, 106.0989],
      [11.3187, 106.0986],
    ],
    decide: "dismissed",
  },
];
