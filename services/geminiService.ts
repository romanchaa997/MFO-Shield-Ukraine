
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, LoanDetails } from '../types';

// The API key is injected by the environment.
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    console.warn("API_KEY environment variable not set. Gemini API features will be disabled.");
}

export const generateComplaintDraft = async (loanDetails: LoanDetails, analysisResult: AnalysisResult): Promise<string> => {
  if (!ai) {
    return "Помилка: Ключ Gemini API не налаштовано. Функція генерування скарги недоступна.";
  }

  const violationDetails = analysisResult.violations.map(v => `- ${v.type}: Фактична ставка/виплата ${v.actual_rate} перевищує законний ліміт ${v.legal_limit}.`).join('\n');

  const prompt = `
    Act as a legal assistant for a Ukrainian citizen preparing a complaint against a microfinance organization (MFO).
    Your task is to generate a formal complaint draft based on the following details. The tone should be formal, confident, and clear.
    The output should be in Ukrainian.

    Loan Details:
    - Principal Amount: ${loanDetails.principal} UAH
    - Daily Interest Rate: ${parseFloat(loanDetails.dailyRate) * 100}%
    - Loan Term: ${loanDetails.termDays} days
    - Total Payment: ${loanDetails.totalPayment} UAH

    Detected Violations according to Ukrainian Law:
    ${violationDetails}

    Based on these violations, please draft a complaint letter addressed to the National Bank of Ukraine (НБУ).
    The letter should include:
    1. A clear statement of the purpose of the complaint.
    2. A summary of the loan details.
    3. A detailed description of the detected violations with reference to the illegal nature of the interest rates or total payment amount.
    4. A request for the NBU to investigate the MFO's practices and take appropriate action.
    5. A concluding sentence stating that the user will seek further legal action if necessary.

    Provide only the text of the complaint letter, ready to be copied. Do not add any introductory or concluding remarks outside the letter itself. Start with "Голові Національного банку України". Use placeholders like "[Ваше ПІБ]", "[Ваша адреса]", "[Дата]" for user-specific information.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Під час створення проекту скарги сталася помилка. Будь ласка, спробуйте пізніше.";
  }
};
