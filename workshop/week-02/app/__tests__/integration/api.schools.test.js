"use strict";

const request = require("supertest");
const app     = require("../../server");

describe("GET /api/schools", () => {
  test("regionCode 누락 → 400", async () => {
    const res = await request(app).get("/api/schools");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("소문자 regionCode → 400", async () => {
    const res = await request(app).get("/api/schools?regionCode=b10");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/regionCode/);
  });

  test("숫자만인 regionCode → 400", async () => {
    const res = await request(app).get("/api/schools?regionCode=123");
    expect(res.status).toBe(400);
  });

  test("특수문자 regionCode → 400 (XSS 방어)", async () => {
    const res = await request(app).get("/api/schools?regionCode=<script>");
    expect(res.status).toBe(400);
  });

  test("유효한 regionCode(Excel D10, 대구) → 200 + 배열", async () => {
    // 테스트 데이터 Excel에는 D10(대구) 데이터만 있음
    const res = await request(app).get("/api/schools?regionCode=D10");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("Excel 데이터 있을 때 각 학교에 schoolCode·schoolName 존재", async () => {
    const res = await request(app).get("/api/schools?regionCode=D10");
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("schoolCode");
      expect(res.body[0]).toHaveProperty("schoolName");
    }
  });
});
