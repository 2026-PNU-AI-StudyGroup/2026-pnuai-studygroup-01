import type { ClaimedEmailDelivery, RenderedEmail } from "@/modules/email/application/email-delivery-ports";
import { normalizeEmailHref } from "@/modules/email/domain/email-delivery";

const MAX_TITLE_LENGTH = 180;
const MAX_BODY_LENGTH = 2_000;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function truncate(value: string, length: number) {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

export function renderEmailDelivery(input: ClaimedEmailDelivery, appUrl: string): RenderedEmail {
  const english = input.locale.toLowerCase().startsWith("en");
  const title = truncate((english ? input.titleEn ?? input.title : input.title).trim(), MAX_TITLE_LENGTH);
  const body = truncate((english ? input.bodyEn ?? input.body : input.body).trim(), MAX_BODY_LENGTH);
  const heading = title;
  const description = body;
  const href = new URL(normalizeEmailHref(input.href), appUrl).toString();
  const subject = `[PNU PMS] ${heading}`;
  const action = english ? "Open PMS" : "PMS에서 확인하기";
  const text = `${heading}\n\n${description}\n\n${action}: ${href}`;
  const html = `<!doctype html><html lang="${english ? "en" : "ko"}"><body style="margin:0;background:#f5f7fb;color:#172033;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:32px 20px"><section style="background:#ffffff;border:1px solid #dbe2ef;border-radius:12px;padding:32px"><p style="margin:0 0 12px;color:#2f5bea;font-size:14px;font-weight:700">PNU PMS</p><h1 style="margin:0 0 16px;font-size:22px;line-height:1.4">${escapeHtml(heading)}</h1><p style="margin:0 0 24px;white-space:pre-line;font-size:15px;line-height:1.7">${escapeHtml(description)}</p><a href="${escapeHtml(href)}" style="display:inline-block;background:#2f5bea;border-radius:8px;color:#ffffff;padding:12px 16px;text-decoration:none;font-weight:700">${action}</a></section><p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.5">${english ? "This is an operational notice from PNU PMS." : "부산대학교 프로젝트 관리 시스템의 업무 안내 메일입니다."}</p></main></body></html>`;
  const hostname = new URL(appUrl).hostname.replace(/[^a-z0-9.-]/gi, "") || "pms.local";
  return { subject, text, html, messageId: `<pms-${input.id}@${hostname}>` };
}
