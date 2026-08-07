import { describe, expect, it } from "vitest";

import { buildZip, crc32, uniqueZipName } from "@/app/api/teams/[teamId]/submissions/_lib/zip";

const encode = (text: string) => new TextEncoder().encode(text);

describe("crc32", () => {
  it("표준 CRC-32 값을 계산한다", () => {
    // Known CRC-32 of ASCII "hello".
    expect(crc32(encode("hello"))).toBe(0x3610a686);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("buildZip", () => {
  it("store 방식 ZIP 컨테이너를 만든다", () => {
    const zip = buildZip([{ name: "a.txt", data: encode("hello") }]);
    const view = new DataView(zip.buffer);

    // Local file header + end-of-central-directory signatures.
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    // EOCD records exactly one entry.
    expect(view.getUint16(zip.length - 22 + 8, true)).toBe(1);
  });

  it("여러 항목의 개수를 EOCD에 기록한다", () => {
    const zip = buildZip([
      { name: "a.txt", data: encode("one") },
      { name: "b.txt", data: encode("two") },
    ]);
    const view = new DataView(zip.buffer);
    expect(view.getUint16(zip.length - 22 + 10, true)).toBe(2);
  });
});

describe("uniqueZipName", () => {
  it("이름 충돌 시 확장자 앞에 번호를 붙인다", () => {
    const taken = new Set<string>();
    expect(uniqueZipName(taken, "report.pdf")).toBe("report.pdf");
    expect(uniqueZipName(taken, "report.pdf")).toBe("report (2).pdf");
    expect(uniqueZipName(taken, "report.pdf")).toBe("report (3).pdf");
    expect(uniqueZipName(taken, "notes")).toBe("notes");
    expect(uniqueZipName(taken, "notes")).toBe("notes (2)");
  });
});
