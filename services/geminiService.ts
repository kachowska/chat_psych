import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, PsychologicalProfile, CompatibilityAnalysis, ChatMessage } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Use Gemini 3 Flash - extremely fast when thinking is disabled
const MODEL_NAME = "gemini-3-flash-preview";

// Helper to normalize scores to 0-100
const normalizeScore = (val: any): number => {
    let num = Number(val);
    if (isNaN(num)) return 50;
    
    // AI sometimes returns 0.1-0.9 instead of 10-90.
    // If value is small (<= 1) and not exactly 0 (unless it's 0.0), scale it up.
    // We assume nobody scores exactly "1" out of 100 in this context usually.
    if (num > 0 && num <= 1) {
        return Math.round(num * 100);
    }
    return Math.round(num);
};

// Helper to ensure profile has all required fields
const sanitizeProfile = (data: any): PsychologicalProfile => {
    // Helper to safely extract trait data whether it comes as number or object
    const extractTrait = (source: any, defaultText: string) => {
        const val = source?.score !== undefined ? source.score : source;
        const text = source?.explanation || defaultText;
        return {
            score: normalizeScore(val),
            explanation: text
        };
    };

    return {
        archetype: data.archetype || "Аноним",
        archetypeDescription: data.archetypeDescription || "Не удалось определить.",
        personalityTraits: Array.isArray(data.personalityTraits) ? data.personalityTraits : [],
        mbti: data.mbti || "Unknown",
        bigFive: {
            openness: extractTrait(data.bigFive?.openness, "Уровень открытости опыту."),
            conscientiousness: extractTrait(data.bigFive?.conscientiousness, "Уровень организованности."),
            extraversion: extractTrait(data.bigFive?.extraversion, "Уровень общительности."),
            agreeableness: extractTrait(data.bigFive?.agreeableness, "Уровень доброжелательности."),
            neuroticism: extractTrait(data.bigFive?.neuroticism, "Уровень эмоциональной стабильности."),
        },
        communicationStyle: {
            tone: data.communicationStyle?.tone || "Neutral",
            speed: data.communicationStyle?.speed || "Moderate",
            complexity: data.communicationStyle?.complexity || "Average",
            vocabulary: data.communicationStyle?.vocabulary || "Standard"
        },
        emotionalProfile: {
            positivity: normalizeScore(data.emotionalProfile?.positivity),
            toxicity: normalizeScore(data.emotionalProfile?.toxicity),
            empathy: normalizeScore(data.emotionalProfile?.empathy)
        },
        toxicityAnalysis: {
            score: normalizeScore(data.toxicityAnalysis?.score || data.emotionalProfile?.toxicity),
            level: data.toxicityAnalysis?.level || "Не определен",
            traits: Array.isArray(data.toxicityAnalysis?.traits) ? data.toxicityAnalysis.traits : [],
            explanation: data.toxicityAnalysis?.explanation || "Анализ не предоставлен.",
            specificForms: Array.isArray(data.toxicityAnalysis?.specificForms) ? data.toxicityAnalysis.specificForms : []
        },
        hiddenDrives: Array.isArray(data.hiddenDrives) ? data.hiddenDrives : [],
        summary: data.summary || "Анализ не завершен.",
        systemInstruction: data.systemInstruction || "You are a generic assistant."
    };
};

export const analyzeUserProfile = async (user: UserProfile, chatContext: string): Promise<PsychologicalProfile> => {
  
  // INCREASED LIMIT to 20,000 messages
  // Gemini 3 Flash has a massive context window, so this is safe.
  const MSG_LIMIT = 20000; 
  
  const msgs = user.messages; // Assumed sorted by date
  let sampleMessages: ChatMessage[] = [];

  if (msgs.length <= MSG_LIMIT) {
    sampleMessages = msgs;
  } else {
    // 1. Origins (First 2000 - deep dive into history)
    const start = msgs.slice(0, 2000);
    
    // 2. Current Context (Last 4000 - prioritize recent personality state)
    const end = msgs.slice(-4000);
    
    // 3. Evolution (Sample from the rest)
    const remainingSlots = MSG_LIMIT - start.length - end.length;
    
    // Safety check: ensure we don't overlap indices
    const middleStartIndex = 2000;
    const middleEndIndex = msgs.length - 4000;

    let middleSample: ChatMessage[] = [];
    
    if (remainingSlots > 0 && middleEndIndex > middleStartIndex) {
        const middleBuffer = msgs.slice(middleStartIndex, middleEndIndex);
        if (middleBuffer.length > 0) {
             const step = Math.max(1, Math.floor(middleBuffer.length / remainingSlots));
             for (let i = 0; i < middleBuffer.length; i += step) {
                 middleSample.push(middleBuffer[i]);
                 if (middleSample.length >= remainingSlots) break;
             }
        }
    }
    
    sampleMessages = [...start, ...middleSample, ...end];
  }

  // Ensure chronological order
  sampleMessages.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const sampleText = sampleMessages
    .map(m => `[${m.date.toISOString()}] ${m.content}`)
    .join('\n');

  const prompt = `
    Цель: Создать глубокий психологический портрет пользователя "${user.name}".
    Данные: Лог чата "${chatContext}" (Выборка из ${sampleMessages.length} сообщений).
    
    Пример сообщений от ${user.name}:
    ${sampleText}

    Задачи:
    1. Анализ стиля речи, лексики, эмодзи, пунктуации.
    2. Оценка MBTI.
    3. Оценка Big Five (Большая Пятерка):
       - Для каждой черты (Открытость, Добросовестность, Экстраверсия, Доброжелательность, Невротизм) дай:
       - score: число 0-100.
       - explanation: Краткое пояснение (1 предложение), что этот уровень значит для этого человека (например: "Высокая экстраверсия указывает на потребность во внимании...").
    4. Выявление скрытых мотивов.
    5. ДЕТАЛЬНЫЙ АНАЛИЗ ТОКСИЧНОСТИ:
       - Оценка 0-100.
       - Уровень и признаки.
       - Цитаты (specificForms) для пассивной агрессии, сарказма и т.д.
    6. Создание системного промта.

    ВАЖНО: ОТВЕТ СТРОГО В JSON НА РУССКОМ ЯЗЫКЕ.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        // Thinking disabled for speed, relying on raw context power of Gemini 3 Flash
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            archetype: { type: Type.STRING },
            archetypeDescription: { type: Type.STRING },
            personalityTraits: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            mbti: { type: Type.STRING },
            bigFive: {
              type: Type.OBJECT,
              properties: {
                openness: { 
                    type: Type.OBJECT, 
                    properties: { score: { type: Type.NUMBER }, explanation: { type: Type.STRING } } 
                },
                conscientiousness: { 
                    type: Type.OBJECT, 
                    properties: { score: { type: Type.NUMBER }, explanation: { type: Type.STRING } } 
                },
                extraversion: { 
                    type: Type.OBJECT, 
                    properties: { score: { type: Type.NUMBER }, explanation: { type: Type.STRING } } 
                },
                agreeableness: { 
                    type: Type.OBJECT, 
                    properties: { score: { type: Type.NUMBER }, explanation: { type: Type.STRING } } 
                },
                neuroticism: { 
                    type: Type.OBJECT, 
                    properties: { score: { type: Type.NUMBER }, explanation: { type: Type.STRING } } 
                }
              }
            },
            communicationStyle: {
              type: Type.OBJECT,
              properties: {
                tone: { type: Type.STRING },
                speed: { type: Type.STRING },
                complexity: { type: Type.STRING },
                vocabulary: { type: Type.STRING }
              }
            },
            emotionalProfile: {
              type: Type.OBJECT,
              properties: {
                positivity: { type: Type.NUMBER, description: "0-100" },
                toxicity: { type: Type.NUMBER, description: "0-100" },
                empathy: { type: Type.NUMBER, description: "0-100" }
              }
            },
            toxicityAnalysis: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER, description: "0-100" },
                    level: { type: Type.STRING, description: "Short label like 'Passive Aggressive'" },
                    traits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of toxic traits or positive traits" },
                    explanation: { type: Type.STRING, description: "Detailed analysis of toxicity" },
                    specificForms: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                form: { type: Type.STRING, description: "e.g. 'Сарказм', 'Пассивная агрессия'" },
                                example: { type: Type.STRING, description: "Direct quote from chat log" }
                            }
                        }
                    }
                }
            },
            hiddenDrives: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            summary: { type: Type.STRING },
            systemInstruction: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
      const rawData = JSON.parse(response.text);
      return sanitizeProfile(rawData);
    } else {
        throw new Error("API returned empty response.");
    }

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw new Error("Ошибка AI анализа. Возможно, слишком много данных для одного запроса.");
  }
};

export const analyzeCompatibility = async (
    userA: UserProfile, 
    profileA: PsychologicalProfile, 
    userB: UserProfile, 
    profileB: PsychologicalProfile
): Promise<CompatibilityAnalysis> => {

    const prompt = `
      Сравни двух пользователей на основе профилей.
      
      А: ${userA.name} (${profileA.archetype}, ${profileA.mbti})
      Черты: ${profileA.personalityTraits.join(', ')}
      Стиль: ${JSON.stringify(profileA.communicationStyle)}
      Big5 Scores: 
      Openness: ${profileA.bigFive.openness.score}
      Conscientiousness: ${profileA.bigFive.conscientiousness.score}
      Extraversion: ${profileA.bigFive.extraversion.score}
      Agreeableness: ${profileA.bigFive.agreeableness.score}
      Neuroticism: ${profileA.bigFive.neuroticism.score}

      Б: ${userB.name} (${profileB.archetype}, ${profileB.mbti})
      Черты: ${profileB.personalityTraits.join(', ')}
      Стиль: ${JSON.stringify(profileB.communicationStyle)}
      Big5 Scores: 
      Openness: ${profileB.bigFive.openness.score}
      Conscientiousness: ${profileB.bigFive.conscientiousness.score}
      Extraversion: ${profileB.bigFive.extraversion.score}
      Agreeableness: ${profileB.bigFive.agreeableness.score}
      Neuroticism: ${profileB.bigFive.neuroticism.score}

      Задача: Оценить совместимость (0-100%), синергию и конфликты.
      ОТВЕТ В JSON НА РУССКОМ.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                // PERFORMANCE FIX: Removed thinkingConfig
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER, description: "Compatibility 0-100" },
                        relationshipHeader: { type: Type.STRING },
                        synergy: { type: Type.ARRAY, items: { type: Type.STRING } },
                        conflicts: { type: Type.ARRAY, items: { type: Type.STRING } },
                        summary: { type: Type.STRING }
                    }
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(response.text);
            // Normalize compatibility score just in case
            if (data.score && data.score <= 1) data.score = Math.round(data.score * 100);
            return data as CompatibilityAnalysis;
        } else {
            throw new Error("Empty compatibility response");
        }
    } catch (error) {
        console.error("Compatibility Analysis Failed", error);
        throw error;
    }
}