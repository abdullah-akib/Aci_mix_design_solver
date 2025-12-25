
import { MixInputs, MixResult, MixStep, ConcreteType, ExposureCondition } from '../types';
import { 
  WATER_NON_AE, WATER_AE, MAX_AGG_SIZES, 
  WC_STRENGTH, CA_VOLUME_TABLE 
} from '../constants';

function lerp(x: number, x0: number, x1: number, y0: number, y1: number) {
  return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

export function calculateMix(inputs: MixInputs): MixResult {
  const steps: MixStep[] = [];
  const aggIndex = MAX_AGG_SIZES.indexOf(inputs.maxAggSize);
  
  // Step 1: Slump Selection
  steps.push({
    id: 1,
    title: "Choice of Slump",
    value: `${inputs.slumpMin}-${inputs.slumpMax} in`,
    calculation: `Manual Input: ${inputs.slumpMin}-${inputs.slumpMax} in`
  });

  // Step 2: Agg Size
  steps.push({
    id: 2,
    title: "Maximum Aggregate Size",
    value: `${inputs.maxAggSize} in`,
    calculation: `Manual Input: ${inputs.maxAggSize} in`
  });

  // Step 3: Mixing Water and Air
  let designWater = 0;
  let air = 0;
  const isAE = inputs.concreteType === ConcreteType.AIR_ENTRAINED;
  const slumpRange = inputs.slumpMax <= 2 ? '1-2' : (inputs.slumpMax <= 4 ? '3-4' : '6-7');

  if (isAE) {
    designWater = (WATER_AE as any)[slumpRange][aggIndex];
    air = (WATER_AE.air as any)[inputs.exposure][aggIndex];
  } else {
    designWater = (WATER_NON_AE as any)[slumpRange][aggIndex];
    air = WATER_NON_AE.air[aggIndex];
  }

  steps.push({
    id: 3,
    title: "Mixing Water and Air Content",
    value: `Water: ${designWater} lb/yd³, Air: ${air}%`,
    calculation: `From ACI Table 3.1 based on ${inputs.maxAggSize}" agg and ${slumpRange}" slump.`
  });

  // Step 4: W/C Ratio
  let wcStrength = 0;
  const strengths = WC_STRENGTH.psi;
  const ratios = isAE ? WC_STRENGTH.AE : WC_STRENGTH.NonAE;
  
  if (inputs.strength <= strengths[0]) {
    wcStrength = ratios[0];
  } else if (inputs.strength >= strengths[strengths.length - 1]) {
    wcStrength = ratios[ratios.length - 1];
  } else {
    for (let i = 0; i < strengths.length - 1; i++) {
      if (inputs.strength >= strengths[i] && inputs.strength <= strengths[i+1]) {
        wcStrength = lerp(inputs.strength, strengths[i], strengths[i+1], ratios[i], ratios[i+1]);
        break;
      }
    }
  }

  let wcLimit = 1.0;
  if (inputs.exposure === ExposureCondition.SEVERE) wcLimit = 0.45;
  if (inputs.exposure === ExposureCondition.MODERATE) wcLimit = 0.50;

  const finalWC = Math.min(wcStrength, wcLimit);

  steps.push({
    id: 4,
    title: "Water-Cement Ratio",
    value: `w/c = ${finalWC.toFixed(2)}`,
    calculation: `Strength req: ${wcStrength.toFixed(2)}, Durability limit: ${wcLimit.toFixed(2)}. Selected lower.`
  });

  // Step 5: Cement Content
  const cement = designWater / finalWC;
  steps.push({
    id: 5,
    title: "Cement Content",
    value: `${cement.toFixed(1)} lb/yd³`,
    calculation: `Cement = Water / (w/c) = ${designWater} / ${finalWC.toFixed(2)}`
  });

  // Step 6: Coarse Aggregate Oven Dry (OD) Weight
  const fmIndex0 = Math.floor((inputs.faFM - 2.4) / 0.2);
  const fmIndex1 = Math.ceil((inputs.faFM - 2.4) / 0.2);
  let volBulkCA = 0;
  if (fmIndex0 === fmIndex1) {
    volBulkCA = CA_VOLUME_TABLE.data[aggIndex][fmIndex0];
  } else {
    volBulkCA = lerp(
      inputs.faFM, 
      CA_VOLUME_TABLE.fm[fmIndex0], 
      CA_VOLUME_TABLE.fm[fmIndex1], 
      CA_VOLUME_TABLE.data[aggIndex][fmIndex0], 
      CA_VOLUME_TABLE.data[aggIndex][fmIndex1]
    );
  }

  const weightCA_OD = volBulkCA * 27 * inputs.caDRUW;

  steps.push({
    id: 6,
    title: "Coarse Aggregate Content (Oven Dry)",
    value: `${weightCA_OD.toFixed(1)} lb/yd³`,
    calculation: `Volume Bulk = ${volBulkCA.toFixed(2)} yd³/yd³\nWeight OD = ${volBulkCA.toFixed(2)} * 27 * ${inputs.caDRUW} lb/ft³`
  });

  // Step 7: Fine Aggregate Oven Dry (OD) Weight (Absolute Volume Method)
  const volWater = designWater / 62.4;
  const volCement = cement / (inputs.cementSG * 62.4);
  const volAir = 27 * (air / 100);
  
  // Per request: Calculate volume of CA using OD weight for the summation
  const volCAAbs = weightCA_OD / (inputs.caSG * 62.4);
  
  const volFA = 27 - (volWater + volCement + volAir + volCAAbs);
  
  // Per request: Calculate FA Oven Weight directly (no absorption adjustment)
  const weightFA_OD = volFA * (inputs.faSG * 62.4);

  steps.push({
    id: 7,
    title: "Fine Aggregate Content (Oven Dry)",
    value: `${weightFA_OD.toFixed(1)} lb/yd³`,
    calculation: `Absolute Volume Method: 27 - (${volWater.toFixed(2)} + ${volCement.toFixed(2)} + ${volAir.toFixed(2)} + ${volCAAbs.toFixed(2)}) = ${volFA.toFixed(2)} ft³\nWeight OD = ${volFA.toFixed(2)} * ${inputs.faSG} * 62.4`
  });

  // Step 8: Stockpile Weights
  const mcFA_total_dec = (inputs.faAbsorption + inputs.faMoisture) / 100;
  const mcCA_total_dec = (inputs.caAbsorption + inputs.caMoisture) / 100;
  
  const weightFA_Stock = weightFA_OD * (1 + mcFA_total_dec);
  const weightCA_Stock = weightCA_OD * (1 + mcCA_total_dec);

  steps.push({
    id: 8,
    title: "Stockpile Weight Calculation",
    value: `FA: ${weightFA_Stock.toFixed(1)} lb, CA: ${weightCA_Stock.toFixed(1)} lb`,
    calculation: `Total MC_FA = ${inputs.faAbsorption}% + ${inputs.faMoisture}% = ${(mcFA_total_dec * 100).toFixed(1)}%\n` +
      `FA Stockpile = FA_OD × (1 + Total MC_FA) = ${weightFA_OD.toFixed(1)} × (1 + ${mcFA_total_dec.toFixed(3)}) = ${weightFA_Stock.toFixed(1)} lb\n` +
      `Total MC_CA = ${inputs.caAbsorption}% + ${inputs.caMoisture}% = ${(mcCA_total_dec * 100).toFixed(1)}%\n` +
      `CA Stockpile = CA_OD × (1 + Total MC_CA) = ${weightCA_OD.toFixed(1)} × (1 + ${mcCA_total_dec.toFixed(3)}) = ${weightCA_Stock.toFixed(1)} lb`
  });

  // Step 9: Moisture Adjustment for Water
  const faSurf_dec = inputs.faMoisture / 100;
  const caSurf_dec = inputs.caMoisture / 100;
  
  const faFreeWater = weightFA_OD * faSurf_dec;
  const caFreeWater = weightCA_OD * caSurf_dec;
  const finalWater = designWater - (faFreeWater + caFreeWater);

  steps.push({
    id: 9,
    title: "Adjusted Batch Water",
    value: `Final Batch Water: ${finalWater.toFixed(1)} lb/yd³`,
    calculation: `Design Water: ${designWater} lb\n` +
      `Free Water (FA) = ${weightFA_OD.toFixed(1)} lb × ${faSurf_dec.toFixed(3)} = ${faFreeWater.toFixed(1)} lb\n` +
      `Free Water (CA) = ${weightCA_OD.toFixed(1)} lb × ${caSurf_dec.toFixed(3)} = ${caFreeWater.toFixed(1)} lb\n` +
      `Final Water = ${designWater} - (${faFreeWater.toFixed(1)} + ${caFreeWater.toFixed(1)}) = ${finalWater.toFixed(1)} lb/yd³`
  });

  return {
    water: finalWater,
    cement: cement,
    coarseAgg: weightCA_Stock,
    fineAgg: weightFA_Stock,
    airContent: air,
    unitWeight: (finalWater + cement + weightCA_Stock + weightFA_Stock) / 27,
    steps
  };
}
