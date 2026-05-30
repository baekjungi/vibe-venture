"use strict";

const request  = require("supertest");
const https    = require("https");
const app      = require("../../server");
const mealFixture  = require("../fixtures/neis-meal-response.json");
const emptyFixture = require("../fixtures/neis-empty-response.json");

// https.get 을 mock하여 NEIS 실 호출 차단
function mockHttpsGet(jsonBody) {
  return jest.spyOn(https, "get").mockImplementation((_url, _opts, cb) => {
    const fakeRes = {
      on: (event, handler) => {
        if (event === "data") handler(JSON.stringify(jsonBody));
        if (event === "end")  handler();
        return fakeRes;
      },
      destroy: jest.fn(),
    };
    if (typeof _opts === "function") {
      _opts(fakeRes); // opts가 없고 cb이 2번째인 경우 대비
    } else {
      cb(fakeRes);
    }
    return { on: jest.fn(), destroy: jest.fn() };
  });
}

describe("GET /api/meal — 입력 검증", () => {
  test("atptCode 누락 → 400", async () => {
    const res = await request(app).get("/api/meal?schoolCode=7010057&date=20240304");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("schoolCode 누락 → 400", async () => {
    const res = await request(app).get("/api/meal?atptCode=B10&date=20240304");
    expect(res.status).toBe(400);
  });

  test("date 누락 → 400", async () => {
    const res = await request(app).get("/api/meal?atptCode=B10&schoolCode=7010057");
    expect(res.status).toBe(400);
  });

  test("날짜 형식 오류(하이픈 포함) → 400", async () => {
    const res = await request(app).get("/api/meal?atptCode=B10&schoolCode=7010057&date=2024-03-04");
    expect(res.status).toBe(400);
  });

  test("schoolCode 형식 오류(6자리) → 400", async () => {
    const res = await request(app).get("/api/meal?atptCode=B10&schoolCode=123456&date=20240304");
    expect(res.status).toBe(400);
  });

  test("XSS 시도 atptCode → 400", async () => {
    const res = await request(app).get("/api/meal?atptCode=<script>alert(1)</script>&schoolCode=7010057&date=20240304");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/meal — 정상 응답 (NEIS mock)", () => {
  let spy;

  beforeEach(() => { spy = mockHttpsGet(mealFixture); });
  afterEach(()  => { spy.mockRestore(); });

  test("200 응답 + 배열 반환", async () => {
    const res = await request(app).get("/api/meal?atptCode=B10&schoolCode=7010057&date=20240304");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("급식 객체에 필수 필드 존재", async () => {
    const res = await request(app).get("/api/meal?atptCode=B10&schoolCode=7010057&date=20240304");
    const meal = res.body[0];
    expect(meal).toHaveProperty("mealType");
    expect(meal).toHaveProperty("date");
    expect(meal).toHaveProperty("dishes");
    expect(meal).toHaveProperty("calories");
    expect(Array.isArray(meal.dishes)).toBe(true);
  });

  test("dishes 파싱 — <br/>로 분리", async () => {
    const res = await request(app).get("/api/meal?atptCode=B10&schoolCode=7010057&date=20240304");
    expect(res.body[0].dishes.length).toBeGreaterThan(1);
  });
});

describe("GET /api/meal — 빈 데이터 (NEIS INFO-200)", () => {
  let spy;

  beforeEach(() => { spy = mockHttpsGet(emptyFixture); });
  afterEach(()  => { spy.mockRestore(); });

  test("200 응답 + 빈 배열 반환", async () => {
    const res = await request(app).get("/api/meal?atptCode=B10&schoolCode=7010057&date=20240101");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/meal — 날짜 범위(fromDate/toDate)", () => {
  let spy;

  beforeEach(() => { spy = mockHttpsGet(mealFixture); });
  afterEach(()  => { spy.mockRestore(); });

  test("fromDate+toDate 유효 → 200", async () => {
    const res = await request(app)
      .get("/api/meal?atptCode=B10&schoolCode=7010057&fromDate=20240304&toDate=20240308");
    expect(res.status).toBe(200);
  });

  test("fromDate만 있고 toDate 없음 → date 없음 400", async () => {
    const res = await request(app)
      .get("/api/meal?atptCode=B10&schoolCode=7010057&fromDate=20240304");
    expect(res.status).toBe(400);
  });

  test("fromDate 형식 오류 → 400", async () => {
    const res = await request(app)
      .get("/api/meal?atptCode=B10&schoolCode=7010057&fromDate=2024-03-04&toDate=20240308");
    expect(res.status).toBe(400);
  });
});
