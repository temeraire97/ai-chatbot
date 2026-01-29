import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";

const suggestionsPrompt = `당신은 이력서 기반 채팅에서 후속 질문을 제안하는 AI입니다.

사용자가 받은 답변을 보고, 자연스럽게 이어질 수 있는 후속 질문 3개를 생성하세요.

## 규칙
- 한국어로 작성
- 짧고 간결하게 (15자 이내 권장)
- 답변 내용과 관련된 심화 질문
- 반말 형식 ("~해?", "~야?", "~줘")

## 출력 형식
JSON 배열만 출력하세요. 다른 텍스트 없이.
["질문1", "질문2", "질문3"]`;

export async function POST(request: Request) {
  try {
    const { lastAssistantMessage } = await request.json();

    if (!lastAssistantMessage) {
      return Response.json({ suggestions: [] });
    }

    const { text } = await generateText({
      model: getLanguageModel(),
      system: suggestionsPrompt,
      prompt: `마지막 AI 답변:\n${lastAssistantMessage}`,
    });

    // Parse JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return Response.json({ suggestions });
    }

    return Response.json({ suggestions: [] });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return Response.json({ suggestions: [] });
  }
}
