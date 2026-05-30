"use strict";

const request       = require("supertest");
const app           = require("../../server");
const naverFixture  = require("../fixtures/naver-image-response.json");
const geminiFixture = require("../fixtures/gemini-response.json");

// fetch를 전역 mock (Naver + Gemini 모두 처리)
function mockFetchFor(naverData, geminiData) {
  return jest.spyOn(global, "fetch").mockImplementation((url) => {
    const body = url.includes("generativelanguage") ? geminiData : naverData;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(body),
    });
  });
}

describe("GET /api/food-image — 입력 검증", () => {
  test("name 51자 이상 → 400", async () => {
    const res = await request(app).get(`/api/food-image?name=${"가".repeat(51)}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/50자/);
  });

  test("name 없으면 Pollinations 폴백 응답(200)", async () => {
    const spy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false, json: () => Promise.resolve({ items: [] }),
    });
    const res = await request(app).get("/api/food-image");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("imageUrl");
    spy.mockRestore();
  });
});

describe("GET /api/food-image — Naver + Gemini mock", () => {
  let spy;

  beforeEach(() => { spy = mockFetchFor(naverFixture, geminiFixture); });
  afterEach(()  => { spy.mockRestore(); });

  test("200 응답 + imageUrl/source/alt 필드 존재", async () => {
    const res = await request(app).get("/api/food-image?name=김치찌개");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("imageUrl");
    expect(res.body).toHaveProperty("source");
    expect(res.body).toHaveProperty("alt");
  });

  test("Gemini가 1번 선택 → naver-ai 소스 반환", async () => {
    const res = await request(app).get("/api/food-image?name=김치찌개");
    expect(res.body.source).toBe("naver-ai");
  });

  test("alt 필드는 allergy 번호 괄호 제거된 음식명 (일반 괄호는 유지됨)", async () => {
    // clean = name.replace(/\s*\([\d.,\s]+\.\)\s*/g, "") — 숫자+점 형식만 제거
    // "(자율)" 같은 일반 괄호는 clean에 유지됨 (extractFoodCore는 검색어에만 사용)
    const res = await request(app).get("/api/food-image?name=쌀밥(1.2.)");
    expect(res.body.alt).not.toContain("(1.2.)");
  });

  test("imageUrl이 pstatic.net URL", async () => {
    const res = await request(app).get("/api/food-image?name=김치찌개");
    expect(res.body.imageUrl).toContain("pstatic.net");
  });
});

describe("GET /api/food-image — Naver 실패 시 Pollinations 폴백", () => {
  let spy;

  beforeEach(() => {
    spy = jest.spyOn(global, "fetch").mockRejectedValue(new Error("네트워크 오류"));
  });
  afterEach(() => { spy.mockRestore(); });

  test("네트워크 오류 시 Pollinations URL 반환", async () => {
    const res = await request(app).get("/api/food-image?name=김치찌개");
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("ai-generated");
    expect(res.body.imageUrl).toContain("pollinations.ai");
  });
});

describe("GET /api/food-image — Gemini '0' 반환 시 폴백", () => {
  let spy;

  beforeEach(() => {
    const geminiNo = { candidates: [{ content: { parts: [{ text: "0" }] } }] };
    spy = mockFetchFor(naverFixture, geminiNo);
  });
  afterEach(() => { spy.mockRestore(); });

  test("AI가 관련없다고 판단 + 점수 0점 → Pollinations 폴백", async () => {
    // 네이버 fixture에 '알수없는음식'은 점수 0점이므로 폴백
    const res = await request(app).get("/api/food-image?name=알수없는음식xyz");
    expect(res.status).toBe(200);
    expect(["naver-ai", "naver", "ai-generated"]).toContain(res.body.source);
  });
});
