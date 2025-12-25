
import { GoogleGenAI } from "@google/genai";
import { MixInputs, MixStep } from "../types";

export async function getAIEngineeringExplanation(step: MixStep, inputs: MixInputs): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a senior Civil Engineering materials expert. 
    Explain Step ${step.id}: "${step.title}" in an ACI 211.1 Concrete Mix Design.
    
    Current Mix Design context:
    - Target Strength: ${inputs.strength} psi
    - Concrete Type: ${inputs.concreteType}
    - Exposure: ${inputs.exposure}
    - Step Result Value: ${step.value}
    - Step Calculation: ${step.calculation}

    Rules:
    1. Reference ACI 211.1 principles clearly.
    2. Use professional yet educational language suitable for engineering students.
    3. Explain the "Why" behind this specific value (e.g., how w/c impacts strength or how FM impacts workability).
    4. Keep the explanation concise (max 3-4 sentences).
    5. Be precise about terminology.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No explanation available.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Error fetching AI explanation. Please check your connectivity.";
  }
}
