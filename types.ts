
export type Page = 'home' | 'analyzer' | 'dashboard' | 'resources';

export interface Violation {
  type: string;
  legal_limit: string;
  actual_rate: string;
  excess: string;
  excess_amount?: string;
}

export interface AnalysisResult {
  is_lawful: boolean;
  violations: Violation[];
  recommended_action: string;
}

export interface LoanDetails {
    principal: string;
    dailyRate: string;
    termDays: string;
    totalPayment: string;
}

// Data for charts
export interface MfoViolationData {
  name: string;
  violations: number;
}

export interface ViolationTypeData {
  name:string;
  value: number;
}

export interface RegionalData {
    region: string;
    cases: number;
}
