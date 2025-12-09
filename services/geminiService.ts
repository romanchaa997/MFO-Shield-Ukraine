import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, LoanDetails } from "../types";

// NOTE: The API key is sourced from `process.env.API_KEY` and should be
// configured in the environment where this application is running.
// FIX: Initialize GoogleGenAI with a named apiKey object property.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Кеш для кешування результатів аналізу
const analysisCache = new Map<string, any>();

// Функція для хешування вхідних даних
function hashInput(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Маскування персональних даних перед відправкою в Gemini
export function maskSensitiveData(text: string): string {
  return text
    .replace(/\b\d{16}\b/g, '[CARD_NUMBER]')
    .replace(/\b\d{10}\b/g, '[TAX_ID]')
    .replace(/\b\d{9}\b/g, '[PASSPORT]')
    .replace(/\b\d{12}\b/g, '[ACCOUNT_NUMBER]')
    .replace(/[А-Яа-яЇїЄєҐґ\w]+@[А-Яа-яЇїЄєҐґ\w.-]+/g, '[EMAIL]');
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    is_lawful: {
      type: Type.BOOLEAN,
      description: "Is the loan agreement lawful based on Ukrainian legislation.",
    },
    violations: {
      type: Type.ARRAY,
      description: "A list of any violations found in the loan agreement.",
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: "The type of violation (e.g., 'Exceeding maximum daily interest rate').",
          },
          legal_limit: {
            type: Type.STRING,
            description: "The legal limit for this type of violation.",
          },
          actual_rate: {
            type: Type.STRING,
            description: "The actual rate or value found in the agreement.",
          },
          excess: {
            type: Type.STRING,
            description: "The amount by which the rate exceeds the legal limit.",
          },
          excess_amount: {
            type: Type.STRING,
            description: "The total monetary amount of the excess over the loan term. Can be omitted if not applicable.",
          },
        },
        required: ['type', 'legal_limit', 'actual_rate', 'excess'],
      },
    },
    recommended_action: {
      type: Type.STRING,
      description: "A recommended course of action for the user.",
    },
  },
  required: ['is_lawful', 'violations', 'recommended_action'],
};

const createPrompt = (loanDetails: LoanDetails, agreementText: string): string => {
  return `
    Analyze the following loan agreement from a Ukrainian Microfinance Organization (MFO) based on current Ukrainian legislation.

    **Loan Details:**
    - Principal Amount (Сума кредиту): ${loanDetails.principal} UAH
    - Daily Interest Rate (Денна процентна ставка): ${loanDetails.dailyRate}%
    - Loan Term (Строк кредиту): ${loanDetails.termDays} days
    - Total Repayment Amount (Загальна сума до повернення): ${loanDetails.totalPayment} UAH

    **Agreement Text:**
    \`\`\`
    ${agreementText || 'No additional text provided.'}
    \`\`\`

    **Analysis Instructions:**
    1.  **Check Daily Interest Rate:** The maximum daily interest rate is legally capped at 1% per day in Ukraine. Compare the provided rate with this limit.
    2.  **Check Total Repayment Amount:** The total cost of the loan (including interest, fees, and other charges) cannot exceed double the principal amount (2x the loan body). Verify if the 'Total Repayment Amount' violates this rule.
    3.  **Identify Other Violations:** Scan the agreement text for any hidden fees, unfair contract terms, or other violations common to Ukrainian MFOs.
    4.  **Provide a Structured Response:** Based on your analysis, provide a JSON object that conforms to the specified schema. Determine if the loan is lawful overall, list all identified violations with details, and suggest a clear recommended action. If there are no violations, return an empty 'violations' array and confirm the loan is lawful.
  `;
};

export const analyzeLoanAgreement = async (loanDetails: LoanDetails, agreementText: string): Promise<AnalysisResult> => {
    try {
        const prompt = createPrompt(loanDetails, agreementText);

        // FIX: Use ai.models.generateContent to query GenAI.
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Using gemini-2.5-flash for this task
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
                temperature: 0.1, // Lower temperature for more deterministic, factual output
            },
        });
        
        // FIX: Extract text output directly from the .text property of the response.
        const jsonText = response.text.trim();
        const result: AnalysisResult = JSON.parse(jsonText);
        return result;

    } catch (error) {
        console.error("Error analyzing loan agreement with Gemini API:", error);
        // Provide a structured error response that matches the expected return type
        return {
            is_lawful: false,
            violations: [{
                type: "API Error",
                legal_limit: "N/A",
                actual_rate: "N/A",
                excess: "N/A",
                excess_amount: "N/A",
            }],
            recommended_action: "An error occurred while analyzing the document. Please check your connection and the provided data, and try again. If the problem persists, the service may be temporarily unavailable."
        };
    }
};


// Schema for document extraction
const extractionSchema = {
    type: Type.OBJECT,
    properties: {
        principal: {
            type: Type.STRING,
            description: "The principal loan amount in UAH. Should be a number as a string."
        },
        dailyRate: {
            type: Type.STRING,
            description: "The daily interest rate as a percentage. Should be a number as a string."
        },
        termDays: {
            type: Type.STRING,
            description: "The loan term in days. Should be an integer as a string."
        }
    },
    required: ['principal', 'dailyRate', 'termDays']
};

// Аналіз кредитного договору з кешуванням
export async function analyzeLoanAgreementWithCache(
  fileData: { data: string; mimeType: string },
): Promise<AnalysisResult | null> {
  try {
    // Маскування ПД
    const maskedData = maskSensitiveData(fileData.data);
    const cacheKey = hashInput(maskedData);
    
    // Перевірка кешу
    if (analysisCache.has(cacheKey)) {
      console.log('Using cached analysis result');
      return analysisCache.get(cacheKey);
    }
    
    // Ключова відправка до Gemini
    const result = await extractionDetailsFromDocument(fileData);
    
    // Збереження в кеш
    if (result) {
      analysisCache.set(cacheKey, result);
    }
    
    return result;
  } catch (error) {
    console.error('Error analyzing loan agreement:', error);
    return null;
  }
}


export const extractLoanDetailsFromDocument = async (file: { data: string; mimeType: string; }): Promise<Partial<LoanDetails>> => {
    try {
        const prompt = "Analyze this document, which is a Ukrainian MFO loan agreement. Extract the principal amount (Сума кредиту), the daily interest rate (Денна процентна ставка), and the loan term in days (Строк кредиту). Provide the response as a JSON object matching the defined schema. If a value is not found, return an empty string for that field.";

        const imagePart = {
            inlineData: {
                mimeType: file.mimeType,
                data: file.data
            }
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // multimodal model
            contents: { parts: [{ text: prompt }, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: extractionSchema,
                temperature: 0.1
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result;

    } catch (error) {
        console.error("Error extracting details from document with Gemini API:", error);
        throw new Error("Failed to extract details from the document. The document might be unreadable or the format is not supported.");
    }
};
