
export enum UnitSystem {
  IMPERIAL = 'Imperial',
  METRIC = 'Metric'
}

export enum ExposureCondition {
  MILD = 'Mild',
  MODERATE = 'Moderate',
  SEVERE = 'Severe'
}

export enum ConcreteType {
  NON_AIR_ENTRAINED = 'Non-Air-Entrained',
  AIR_ENTRAINED = 'Air-Entrained'
}

export interface MixInputs {
  strength: number;
  concreteType: ConcreteType;
  exposure: ExposureCondition;
  slumpMin: number;
  slumpMax: number;
  maxAggSize: number;
  cementSG: number;
  caSG: number;
  caAbsorption: number;
  caDRUW: number;
  caMoisture: number;
  faSG: number;
  faAbsorption: number;
  faFM: number;
  faMoisture: number;
  batchVolume: number;
}

export interface MixStep {
  id: number;
  title: string;
  value: string;
  calculation: string;
  explanation?: string;
}

export interface MixResult {
  water: number;
  cement: number;
  coarseAgg: number;
  fineAgg: number;
  airContent: number;
  unitWeight: number;
  steps: MixStep[];
}
