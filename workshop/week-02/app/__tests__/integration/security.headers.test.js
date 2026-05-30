"use strict";

const request = require("supertest");
const app     = require("../../server");

const ENDPOINTS = ["/api/regions", "/api/schools?regionCode=D10"];

describe("보안 헤더 검증", () => {
  // 모든 공개 엔드포인트에 보안 헤더 적용 확인
  test.each(ENDPOINTS)("%s — X-Content-Type-Options: nosniff", async (path) => {
    const res = await request(app).get(path);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  test.each(ENDPOINTS)("%s — X-Frame-Options: DENY", async (path) => {
    const res = await request(app).get(path);
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  test.each(ENDPOINTS)("%s — HSTS 헤더 존재", async (path) => {
    const res = await request(app).get(path);
    expect(res.headers["strict-transport-security"]).toMatch(/max-age/);
  });

  test.each(ENDPOINTS)("%s — Referrer-Policy 설정됨", async (path) => {
    const res = await request(app).get(path);
    expect(res.headers["referrer-policy"]).toBeTruthy();
  });

  test.each(ENDPOINTS)("%s — Content-Security-Policy 존재", async (path) => {
    const res = await request(app).get(path);
    expect(res.headers["content-security-policy"]).toBeTruthy();
  });

  test("CSP — default-src 'self' 포함", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
  });

  test("CSP — frame-ancestors 'none' 포함 (클릭재킹 방어)", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  test("CSP — object-src 'none' 포함 (플래시/플러그인 차단)", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.headers["content-security-policy"]).toContain("object-src 'none'");
  });

  test("CSP — img-src에 와일드카드 https: 미포함 (좁은 허용 목록)", async () => {
    const res = await request(app).get("/api/regions");
    const csp = res.headers["content-security-policy"];
    // "img-src 'self' ..." 형태지 "https:" 단독 와일드카드는 없어야 함
    const imgSrcDirective = csp.split(";").find((d) => d.trim().startsWith("img-src"));
    expect(imgSrcDirective).toBeDefined();
    expect(imgSrcDirective.trim()).not.toMatch(/img-src [^;]*\bhttps:\s/);
  });

  test("Permissions-Policy 존재", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.headers["permissions-policy"]).toBeTruthy();
  });

  test("Cross-Origin-Opener-Policy 존재", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.headers["cross-origin-opener-policy"]).toBeTruthy();
  });
});

describe("404 / 존재하지 않는 API 경로", () => {
  test("없는 API 경로 → 404 + error 필드", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  test("에러 응답에 스택 트레이스 미포함", async () => {
    const res = await request(app).get("/api/nonexistent");
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at Object\./);
    expect(body).not.toMatch(/node_modules/);
    expect(body).not.toMatch(/server\.js:\d+/);
  });
});

describe("Rate Limiter — 429 응답", () => {
  test("/api/regions: 분당 60회 초과 → 429 + Retry-After 헤더", async () => {
    // 61번째 요청이 429가 되어야 함
    const reqs = Array.from({ length: 61 }, () =>
      request(app).get("/api/regions").set("X-Forwarded-For", "10.0.0.99")
    );
    const results = await Promise.all(reqs);
    const blocked = results.filter((r) => r.status === 429);
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked[0].headers["retry-after"]).toBe("60");
  });

  test("/api/food-image: 분당 30회 초과 → 429 (meal보다 엄격)", async () => {
    const reqs = Array.from({ length: 31 }, () =>
      request(app).get("/api/food-image?name=테스트").set("X-Forwarded-For", "10.0.0.88")
    );
    const results = await Promise.all(reqs);
    const blocked = results.filter((r) => r.status === 429);
    expect(blocked.length).toBeGreaterThan(0);
  });
});
