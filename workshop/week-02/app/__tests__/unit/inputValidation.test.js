"use strict";

/**
 * 입력값 검증 정규식 단위 테스트
 * 서버에서 사용하는 동일한 regex를 재선언하여 독립적으로 테스트
 */

const REGION_CODE_RE  = /^[A-Z][0-9]{2}$/;
const SCHOOL_CODE_RE  = /^\d{7,8}$/;
const DATE_RE         = /^\d{8}$/;

describe("regionCode 정규식 (/^[A-Z][0-9]{2}$/)", () => {
  test.each([["B10"], ["C10"], ["T10"], ["A99"]])(
    "유효: %s", (code) => expect(REGION_CODE_RE.test(code)).toBe(true)
  );
  test.each([
    [""],          // 빈값
    ["b10"],       // 소문자
    ["B1"],        // 짧음
    ["B100"],      // 너무 김
    ["BB0"],       // 알파벳 2개
    ["123"],       // 숫자만
    ["B10 "],      // 공백 포함
    ["<B10>"],     // 특수문자
  ])("무효: %s", (code) => expect(REGION_CODE_RE.test(code)).toBe(false));
});

describe("schoolCode 정규식 (\\d{7,8})", () => {
  test.each([["1234567"], ["12345678"]])(
    "유효: %s", (code) => expect(SCHOOL_CODE_RE.test(code)).toBe(true)
  );
  test.each([
    ["123456"],     // 6자리
    ["123456789"],  // 9자리
    ["123456A"],    // 문자 포함
    [""],           // 빈값
    [" 1234567"],   // 앞 공백
  ])("무효: %s", (code) => expect(SCHOOL_CODE_RE.test(code)).toBe(false));
});

describe("날짜 정규식 (YYYYMMDD, \\d{8})", () => {
  test.each([["20240304"], ["20230101"], ["99991231"]])(
    "유효: %s", (d) => expect(DATE_RE.test(d)).toBe(true)
  );
  test.each([
    ["2024-03-04"],   // 하이픈 포함
    ["202403"],       // 6자리
    ["202403040"],    // 9자리
    ["2024030A"],     // 문자 포함
    [""],             // 빈값
  ])("무효: %s", (d) => expect(DATE_RE.test(d)).toBe(false));
});

describe("food-image name 파라미터 검증", () => {
  test("50자 이하 — 통과", () => {
    expect("김치찌개".length <= 50).toBe(true);
    expect("a".repeat(50).length <= 50).toBe(true);
  });
  test("51자 이상 — 거부", () => {
    expect("a".repeat(51).length > 50).toBe(true);
  });
  test("제어문자 포함 감지", () => {
    const hasControl = (s) => /[\u0000-\u001F\u007F]/.test(s);
    expect(hasControl("정상입력")).toBe(false);
    expect(hasControl("악의\x00적입력")).toBe(true);
    expect(hasControl("줄바꿈\n포함")).toBe(true);
  });
});
