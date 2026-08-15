import { describe, expect, it } from "vitest";

import { renderEmailDelivery } from "@/modules/email/infrastructure/email-template";

describe("renderEmailDelivery", () => {
  it("제목·본문을 escape하고 안전한 절대 PMS 링크와 안정적인 Message-ID를 만든다", () => {
    const rendered = renderEmailDelivery({
      id: "delivery-1",
      kind: "TASK_ASSIGNMENT",
      recipientUserId: "student-1",
      recipientType: "REGISTERED",
      recipientEmail: "student@pusan.ac.kr",
      locale: "ko",
      title: "<새 할 일>",
      body: "<script>alert('x')</script>",
      titleEn: "New task assigned",
      bodyEn: "Review the task in PMS.",
      href: "/projects/project-1/tasks",
      optional: false,
      allowInactiveRecipient: false,
      lockedBy: "worker-1",
      attempts: 1,
    }, "https://pms.example.pusan.ac.kr/");

    expect(rendered.subject).toBe("[PNU PMS] <새 할 일>");
    expect(rendered.html).toContain("&lt;새 할 일&gt;");
    expect(rendered.html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(rendered.html).toContain("https://pms.example.pusan.ac.kr/projects/project-1/tasks");
    expect(rendered.messageId).toBe("<pms-delivery-1@pms.example.pusan.ac.kr>");
  });

  it("영어 locale에서는 실제 업무 요약을 유지하고 외부 링크를 허용하지 않는다", () => {
    const rendered = renderEmailDelivery({
      id: "delivery-2",
      kind: "DISCUSSION",
      recipientUserId: "student-1",
      recipientType: "REGISTERED",
      recipientEmail: "student@pusan.ac.kr",
      locale: "en-US",
      title: "새 토론",
      body: "본문",
      titleEn: "New project discussion",
      bodyEn: "A new discussion was posted. Review it in PMS.",
      href: "https://outside.example/unsafe",
      optional: true,
      allowInactiveRecipient: false,
      lockedBy: "worker-1",
      attempts: 1,
    }, "https://pms.example.pusan.ac.kr");

    expect(rendered.subject).toBe("[PNU PMS] New project discussion");
    expect(rendered.text).toContain("New project discussion\n\nA new discussion was posted. Review it in PMS.");
    expect(rendered.html).toContain("New project discussion");
    expect(rendered.text).toContain("Open PMS: https://pms.example.pusan.ac.kr/dashboard");
  });
});
