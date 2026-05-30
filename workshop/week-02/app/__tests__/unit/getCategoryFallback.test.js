"use strict";

const { getCategoryFallback } = require("../../server");

describe("getCategoryFallback()", () => {
  const BASE = "https://www.themealdb.com/images/category";

  // 주의: 아래 regex는 순서대로 체크됨
  // beef 패턴: /소고기|쇠고기|불고기|갈비|육/
  // chicken 패턴: /닭|치킨/
  // pork 패턴: /돼지|삼겹|제육|돈|베이컨/

  test("소고기 계열 → beef", () => {
    expect(getCategoryFallback("불고기")).toBe(`${BASE}/beef.png`);
    expect(getCategoryFallback("갈비탕")).toBe(`${BASE}/beef.png`);
    expect(getCategoryFallback("육개장")).toBe(`${BASE}/beef.png`);
    expect(getCategoryFallback("소고기볶음")).toBe(`${BASE}/beef.png`);
  });

  test("닭갈비는 beef regex의 '갈비'에 먼저 매치됨 → beef", () => {
    // '닭갈비'에는 '갈비'가 포함되어 beef 패턴이 chicken보다 먼저 매치됨 (실제 동작)
    expect(getCategoryFallback("닭갈비")).toBe(`${BASE}/beef.png`);
  });

  test("닭 계열 (갈비 없음) → chicken", () => {
    expect(getCategoryFallback("치킨")).toBe(`${BASE}/chicken.png`);
    expect(getCategoryFallback("닭볶음탕")).toBe(`${BASE}/chicken.png`);
    expect(getCategoryFallback("닭강정")).toBe(`${BASE}/chicken.png`);
  });

  test("돼지 계열 → pork", () => {
    expect(getCategoryFallback("삼겹살")).toBe(`${BASE}/pork.png`);
    expect(getCategoryFallback("돈까스")).toBe(`${BASE}/pork.png`);
    expect(getCategoryFallback("베이컨에그")).toBe(`${BASE}/pork.png`);
    expect(getCategoryFallback("돼지고기볶음")).toBe(`${BASE}/pork.png`);
  });

  test("제육볶음은 beef regex의 '육'에 먼저 매치됨 → beef", () => {
    // '제육볶음'에는 '육'이 포함되어 beef 패턴이 pork보다 먼저 매치됨 (실제 동작)
    expect(getCategoryFallback("제육볶음")).toBe(`${BASE}/beef.png`);
  });

  test("찌개류(김치찌개) → pork", () => {
    expect(getCategoryFallback("김치찌개")).toBe(`${BASE}/pork.png`);
    expect(getCategoryFallback("부대찌개")).toBe(`${BASE}/pork.png`);
  });

  test("해산물 → seafood", () => {
    expect(getCategoryFallback("고등어구이")).toBe(`${BASE}/seafood.png`);
    expect(getCategoryFallback("오징어볶음")).toBe(`${BASE}/seafood.png`);
    expect(getCategoryFallback("새우튀김")).toBe(`${BASE}/seafood.png`);
    expect(getCategoryFallback("어묵국")).toBe(`${BASE}/seafood.png`);
  });

  test("면류 → pasta", () => {
    expect(getCategoryFallback("라면")).toBe(`${BASE}/pasta.png`);
    expect(getCategoryFallback("우동")).toBe(`${BASE}/pasta.png`);
    expect(getCategoryFallback("스파게티")).toBe(`${BASE}/pasta.png`);
  });

  test("디저트 → dessert", () => {
    expect(getCategoryFallback("케이크")).toBe(`${BASE}/dessert.png`);
    expect(getCategoryFallback("아이스크림")).toBe(`${BASE}/dessert.png`);
    expect(getCategoryFallback("빵")).toBe(`${BASE}/dessert.png`);
  });

  test("채소/김치/두부류 → vegetarian", () => {
    expect(getCategoryFallback("김치")).toBe(`${BASE}/vegetarian.png`);
    expect(getCategoryFallback("두부조림")).toBe(`${BASE}/vegetarian.png`);
    expect(getCategoryFallback("시금치나물")).toBe(`${BASE}/vegetarian.png`);
    expect(getCategoryFallback("콩나물무침")).toBe(`${BASE}/vegetarian.png`);
    expect(getCategoryFallback("모듬나물")).toBe(`${BASE}/vegetarian.png`); // '나물' → vegetarian
  });

  test("해당 없는 음식 → side(기본값)", () => {
    expect(getCategoryFallback("쌀밥")).toBe(`${BASE}/side.png`);
    expect(getCategoryFallback("알수없는음식")).toBe(`${BASE}/side.png`);
    expect(getCategoryFallback("미역국")).toBe(`${BASE}/side.png`);
  });
});
