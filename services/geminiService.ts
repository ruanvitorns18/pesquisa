
import { GoogleGenAI } from "@google/genai";
import { SurveySubmission, AIAnalysisResult, Store, SurveyConfig } from "../types";

export const analyzeSurveys = async (
  surveys: SurveySubmission[],
  stores: Store[],
  surveyConfigs: SurveyConfig[]
): Promise<AIAnalysisResult> => {
  if (surveys.length === 0) {
    throw new Error("Dados insuficientes.");
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  // Mapeia todas as respostas para um formato legível para a IA,
  // independente de quais perguntas o usuário criou no admin.
  const context = surveys.map(s => {
    const store = stores.find(st => st.id === s.storeId);
    const config = surveyConfigs.find(c => c.id === s.surveyId);

    const answers = Object.entries(s.answers).map(([qId, answer]) => {
      const q = config?.questions.find(question => question.id === qId);
      return {
        campo: q ? q.label : "Campo Personalizado",
        valor: answer
      };
    });

    return {
      campanha: config?.name || "Geral",
      unidade: store?.name || "Unidade PDV",
      nps_geral: s.npsScore,
      detalhamento: answers,
      perfil: { genero: s.gender, idade: s.ageRange }
    };
  });

  const prompt = `
    Como consultor analítico de varejo, processe os seguintes dados de pesquisa de campo:
    ${JSON.stringify(context)}

    DIRETRIZES:
    1. Analise os textos das perguntas ("campo") e as respostas para extrair padrões de ruptura (falta de produto), mau atendimento ou oportunidades.
    2. Identifique pontos cegos que os gerentes de loja podem não estar vendo.
    3. Seja direto e focado em ROI (retorno sobre investimento).

    RETORNE OBRIGATORIAMENTE EM JSON:
    {
      "summary": "Resumo de alto impacto",
      "keyIssues": ["Problema detectado (seja específico)"],
      "recommendations": ["Ação corretiva sugerida"],
      "sentimentScore": 0-100,
      "storePerformances": [
        {"storeName": "Nome da Loja", "status": "Crítico|Estável|Melhorando", "insight": "Dica de ouro"}
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};
