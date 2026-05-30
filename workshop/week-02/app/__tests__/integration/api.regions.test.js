"use strict";

const request = require("supertest");
const app     = require("../../server");

describe("GET /api/regions", () => {
  test("200 응답 + 배열 반환", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("17개 시도 교육청 반환", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.body).toHaveLength(17);
  });

  test("각 항목에 code, name, sido 필드 존재", async () => {
    const res = await request(app).get("/api/regions");
    res.body.forEach((region) => {
      expect(region).toHaveProperty("code");
      expect(region).toHaveProperty("name");
      expect(region).toHaveProperty("sido");
    });
  });

  test("code 형식 — 대문자+2자리 숫자", async () => {
    const res = await request(app).get("/api/regions");
    res.body.forEach(({ code }) => {
      expect(code).toMatch(/^[A-Z][0-9]{2}$/);
    });
  });

  test("Content-Type이 application/json", async () => {
    const res = await request(app).get("/api/regions");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });
});
