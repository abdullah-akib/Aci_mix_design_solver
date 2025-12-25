
// ACI Table 2.1: Recommended Slumps
export const SLUMP_TABLE = [
  { type: 'Reinforced foundation walls and footings', max: 3, min: 1 },
  { type: 'Plain footings, caissons, and substructure walls', max: 3, min: 1 },
  { type: 'Beams and reinforced walls', max: 4, min: 1 },
  { type: 'Building columns', max: 4, min: 1 },
  { type: 'Pavements and slabs', max: 3, min: 1 },
  { type: 'Mass concrete', max: 3, min: 1 },
];

// ACI Table 3.1: Water (lb/yd3) and Air (%)
// Columns: 3/8", 1/2", 3/4", 1", 1.5", 2", 3", 6"
export const MAX_AGG_SIZES = [0.375, 0.5, 0.75, 1, 1.5, 2, 3, 6];

export const WATER_NON_AE = {
  '1-2': [350, 335, 315, 300, 275, 260, 220, 190],
  '3-4': [385, 365, 340, 325, 300, 285, 245, 210],
  '6-7': [410, 385, 360, 340, 315, 300, 270, 0], // 0 means not recommended
  air: [3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.3, 0.2]
};

export const WATER_AE = {
  '1-2': [305, 295, 280, 270, 250, 240, 225, 180],
  '3-4': [340, 325, 305, 295, 275, 265, 250, 200],
  '6-7': [365, 345, 325, 310, 290, 280, 270, 0],
  air: {
    Mild: [4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0],
    Moderate: [6.0, 5.5, 5.0, 4.5, 4.5, 4.0, 3.5, 3.0],
    Severe: [7.5, 7.0, 6.0, 6.0, 5.5, 5.0, 4.5, 4.0]
  }
};

// ACI Table 4.1: W/C vs Strength
export const WC_STRENGTH = {
  psi: [2000, 3000, 4000, 5000, 6000, 7000],
  NonAE: [0.82, 0.68, 0.57, 0.48, 0.41, 0.33],
  AE: [0.74, 0.59, 0.48, 0.40, 0.32, 0] // 0 means use NonAE and reduce? No, usually not given
};

// ACI Table 6.1: Coarse Aggregate Volume
// Rows: Size (in), Columns: Fineness Modulus (2.4, 2.6, 2.8, 3.0)
export const CA_VOLUME_TABLE = {
  sizes: [0.375, 0.5, 0.75, 1, 1.5, 2, 3, 6],
  fm: [2.4, 2.6, 2.8, 3.0],
  data: [
    [0.50, 0.48, 0.46, 0.44],
    [0.59, 0.57, 0.55, 0.53],
    [0.66, 0.64, 0.62, 0.60],
    [0.71, 0.69, 0.67, 0.65],
    [0.75, 0.73, 0.71, 0.69],
    [0.78, 0.76, 0.74, 0.72],
    [0.82, 0.80, 0.78, 0.76],
    [0.87, 0.85, 0.83, 0.81]
  ]
};
