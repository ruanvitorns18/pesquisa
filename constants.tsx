
import { SurveyType } from './types';

// List of default stores used across the application. 
// This satisfies the dependency in StoreSelector.tsx.
export const STORES = [
  { id: '1', name: 'Atacadão Luiz Raphael' },
  { id: '2', name: 'Centro Ravilla' }
];

export const SURVEY_OBJECTIVES: { id: SurveyType; label: string; icon: string; description: string }[] = [
  { 
    id: 'vendas_queda', 
    label: 'Diagnóstico: Queda de Vendas', 
    icon: '📉',
    description: 'Entender por que o cliente não comprou ou está comprando menos.' 
  },
  { 
    id: 'melhoria_geral', 
    label: 'Sugestões: Melhoria Geral', 
    icon: '🚀',
    description: 'Coletar ideias para expandir e melhorar a experiência.' 
  },
];

export const GENDER_OPTIONS = ['Masculino', 'Feminino'];

export const AGE_OPTIONS = [
  'Menos de 18',
  '18-24 anos',
  '25-34 anos',
  '35-44 anos',
  '45-54 anos',
  '55-64 anos',
  '65 anos ou mais'
];
