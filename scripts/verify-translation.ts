import "dotenv/config";

import { TranslateTextService } from "../src/modules/translation/application/translate-text";
import { OllamaTranslationEngine } from "../src/modules/translation/infrastructure/ollama-translation-engine";

async function main() {
  const service = new TranslateTextService(new OllamaTranslationEngine());
  const english = await service.execute({
    text: "부산대학교 졸업과제 관리 시스템",
    target: "en",
  });
  const korean = await service.execute({
    text: "Students can apply to a graduation project topic during the recruitment period.",
    target: "ko",
  });

  if (!/[A-Za-z]/.test(english) || !/[가-힣]/.test(korean)) {
    throw new Error("번역 결과의 대상 언어를 확인할 수 없습니다.");
  }
  console.log(JSON.stringify({ english, korean }));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
