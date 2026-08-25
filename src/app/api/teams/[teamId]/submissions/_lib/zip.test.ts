import { describe, expect, it } from "vitest";

import { buildZip, crc32, safeFileName, submissionEntryName, uniqueZipName } from "@/app/api/teams/[teamId]/submissions/_lib/zip";

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

describe("safeFileName", () => {
  it("경로를 벗어나게 하는 이름에서 폴더 부분을 버린다", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("..\\..\\Windows\\System32\\evil.dll")).toBe("evil.dll");
    expect(safeFileName("/absolute/report.pdf")).toBe("report.pdf");
    expect(safeFileName("C:\\Users\\me\\report.pdf")).toBe("report.pdf");
  });

  it("이름만 남으면 그대로 두고 공백과 한글도 지킨다", () => {
    expect(safeFileName("최종 발표자료 v2.pdf")).toBe("최종 발표자료 v2.pdf");
    expect(safeFileName("보고서-1차.hwp")).toBe("보고서-1차.hwp");
  });

  it("파일 이름에 못 쓰는 글자를 밑줄로 바꾼다", () => {
    expect(safeFileName('a:b*c?d"e<f>g|h.txt')).toBe("a_b_c_d_e_f_g_h.txt");
  });

  it("남는 이름이 없으면 기본 이름을 쓴다", () => {
    expect(safeFileName("..")).toBe("file");
    expect(safeFileName("dir/")).toBe("file");
    expect(safeFileName("   ")).toBe("file");
  });
});

describe("submissionEntryName", () => {
  it("결과물 이름이 폴더를 벗어나지 못한다", () => {
    const name = submissionEntryName({ originalName: "../../evil.sh", reportVersion: null });
    expect(name).toBe("artifacts/evil.sh");
  });

  it("보고서 이름도 폴더를 벗어나지 못한다", () => {
    const name = submissionEntryName({
      originalName: "../../evil.sh",
      reportVersion: { version: 2, report: { titleSnapshot: "중간 보고서" } },
    });
    expect(name).toBe("reports/중간 보고서_v2_evil.sh");
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
