/**
 * Gemini API 配置和客户端
 */

import dotenv from 'dotenv';
dotenv.config();

export const geminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
};

export async function callGemini(prompt: string): Promise<string> {
  if (!geminiConfig.apiKey) {
    throw new Error('GEMINI_API_KEY 未配置');
  }

  const response = await fetch(
    `${geminiConfig.baseUrl}/${geminiConfig.model}:generateContent?key=${geminiConfig.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API 请求失败：${response.status} - ${error}`);
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
