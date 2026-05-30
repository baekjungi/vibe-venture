"use strict";

/**
 * getCategoryFallback() 단위 테스트
 *
 * 분기 우선순위(regex 순서)와 기본값(side) 분기를 중점 테스트한다.
 * 각 카테고리 대표 1개로 분기 연결 확인 + regex 순서로 인한 edge case 명시.
 */

const { getCategoryFallback } = require("../../server");

describe("getCategoryFallback() — 카테고리 분기", () => {
  const BASE = "https://www.themealdb.com/images/category";

  // 각 카테고리별 대표 입력 1개로 분기 연결 확인
  test.each([
    ["불고기",     "beef"],
    ["닭볶음탕",   "chicken"],
    ["삼겹살",     "pork"],
    ["김치찌개",   "pork"],       // 찌개 전용 패턴으로 pork 분기
    ["고등어구이", "seafood"],
    ["라면",       "pasta"],
    ["케이크",     "dessert"],
    ["김치",       "vegetarian"],
    ["쌀밥",       "side"],       // 기본값 분기
  ])("%s → %s", (name, category) => {
    expect(getCategoryFallback(name)).toBe(`${BASE}/${category}.png`);
  });
});

describe("getCategoryFallback() — regex 순서 edge case", () => {
  const BASE = "https://www.themealdb.com/images/category";

  // beef 패턴(/소고기|쇠고기|불고기|갈비|육/)이 chicken·pork보다 앞에 정의되어 있어
  // 직관과 다른 카테고리로 분류되는 케이스를 명시적으로 문서화한다.

  test("'닭갈비' → beef ('갈비'가 beef 패턴에 먼저 매치)", () => {
    // FIXME: 추후 regex 순서 조정 시 chicken으로 변경 필요
    expect(getCategoryFallback("닭갈비")).toBe(`${BASE}/beef.png`);
  });

  test("'제육볶음' → beef ('육'이 beef 패턴에 먼저 매치)", () => {
    // FIXME: 추후 regex 순서 조정 시 pork으로 변경 필요
    expect(getCategoryFallback("제육볶음")).toBe(`${BASE}/beef.png`);
  });

  test("어떤 패턴도 매치 안 되면 → side(기본값)", () => {
    expect(getCategoryFallback("미역국")).toBe(`${BASE}/side.png`);
    expect(getCategoryFallback("알수없는음식xyz")).toBe(`${BASE}/side.png`);
  });
});
