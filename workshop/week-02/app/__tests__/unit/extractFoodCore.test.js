"use strict";

const { extractFoodCore } = require("../../server");

describe("extractFoodCore()", () => {
  test("괄호 내용 제거 — (자율)", () => {
    expect(extractFoodCore("작은밥(자율)")).toBe("작은밥");
  });

  test("괄호 내용 제거 — (완)", () => {
    expect(extractFoodCore("볶음밥(완)")).toBe("볶음밥");
  });

  test("괄호 내용 제거 — (대)", () => {
    expect(extractFoodCore("돈까스(대)")).toBe("돈까스");
  });

  test("알레르기 번호 괄호 제거 — (1.2.13.)", () => {
    expect(extractFoodCore("김치찌개(1.2.13.)")).toBe("김치찌개");
  });

  test("여러 괄호 모두 제거", () => {
    expect(extractFoodCore("잡채(소)(완)(5.6.)")).toBe("잡채");
  });

  test("괄호 없는 일반 음식명은 그대로", () => {
    expect(extractFoodCore("제육볶음")).toBe("제육볶음");
  });

  test("앞뒤 공백 trim", () => {
    expect(extractFoodCore("  된장찌개  ")).toBe("된장찌개");
  });

  test("연속 공백 → 단일 공백 정규화", () => {
    expect(extractFoodCore("깍두기   김치")).toBe("깍두기 김치");
  });

  test("빈 문자열 → 빈 문자열 반환", () => {
    expect(extractFoodCore("")).toBe("");
  });

  test("괄호만 있을 때 → 빈 문자열", () => {
    expect(extractFoodCore("(자율)")).toBe("");
  });

  test("영문+한글 혼합 보존", () => {
    expect(extractFoodCore("BBQ치킨(소스포함)")).toBe("BBQ치킨");
  });

  test("특수문자 제거 (한글·영문·숫자만 보존)", () => {
    expect(extractFoodCore("김치&나물!")).toBe("김치나물");
  });
});
