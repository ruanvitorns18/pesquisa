
export interface Store {
  id: string;
  name: string;
  address?: string;
}

export type UserRole = 'ADMIN' | 'MANAGER';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  assignedStoreId?: string;
}

export type SurveyType = 'vendas_queda' | 'melhoria_geral';

export type QuestionType = 'text' | 'boolean' | 'rating';

export interface SurveyQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  dependsOn?: {
    questionId: string;
    value: any;
  };
}

export interface SurveyConfig {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  questions: SurveyQuestion[];
  createdAt: string;
}

export interface SurveySubmission {
  id: string;
  surveyId: string;
  timestamp: string;
  storeId: string;
  customerName: string;
  gender: string;
  ageRange: string;
  answers: Record<string, any>;
  npsScore: number;
}

export interface AIAnalysisResult {
  summary: string;
  keyIssues: string[];
  recommendations: string[];
  sentimentScore: number;
  storePerformances: {
    storeName: string;
    status: 'Melhorando' | 'Crítico' | 'Estável';
    insight: string;
  }[];
}
