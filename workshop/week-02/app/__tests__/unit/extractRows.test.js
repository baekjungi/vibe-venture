"use strict";

const { extractRows } = require("../../server");

describe("extractRows()", () => {
  const KEY = "mealServiceDietInfo";

  test("정상 응답 — row 배열 반환", () => {
    const data = {
      mealServiceDietInfo: [
        { head: [{ list_total_count: 1 }] },
        { row: [{ DDISH_NM: "쌀밥" }, { DDISH_NM: "김치" }] },
      ],
    };
    const { rows, empty } = extractRows(data, KEY);
    expect(empty).toBe(false);
    expect(rows).toHaveLength(2);
    expect(rows[0].DDISH_NM).toBe("쌀밥");
  });

  test("INFO-200(데이터 없음) — empty: true, rows: []", () => {
    const data = { RESULT: { CODE: "INFO-200", MESSAGE: "데이터 없음" } };
    const { rows, empty } = extractRows(data, KEY);
    expect(empty).toBe(true);
    expect(rows).toHaveLength(0);
  });

  test("키 자체가 없을 때 — empty: true", () => {
    const { rows, empty } = extractRows({}, KEY);
    expect(empty).toBe(true);
    expect(rows).toHaveLength(0);
  });

  test("NEIS 에러 코드 — 에러 throw + neisCode 프로퍼티", () => {
    const data = { RESULT: { CODE: "ERROR-300", MESSAGE: "서버 오류" } };
    expect(() => extractRows(data, KEY)).toThrow("서버 오류");
    try {
      extractRows(data, KEY);
    } catch (err) {
      expect(err.neisCode).toBe("ERROR-300");
    }
  });

  test("여러 블록에 분산된 row 합산", () => {
    const data = {
      mealServiceDietInfo: [
        { row: [{ DDISH_NM: "중식1" }] },
        { row: [{ DDISH_NM: "석식1" }, { DDISH_NM: "석식2" }] },
      ],
    };
    const { rows } = extractRows(data, KEY);
    expect(rows).toHaveLength(3);
  });

  test("row 없는 블록(head만) — empty: true", () => {
    const data = {
      mealServiceDietInfo: [{ head: [{ list_total_count: 0 }] }],
    };
    const { rows, empty } = extractRows(data, KEY);
    expect(empty).toBe(true);
    expect(rows).toHaveLength(0);
  });

  test("MESSAGE 없는 에러 코드 — 기본 메시지 사용", () => {
    const data = { RESULT: { CODE: "ERROR-999" } };
    expect(() => extractRows(data, KEY)).toThrow("알 수 없는 오류");
  });
});
