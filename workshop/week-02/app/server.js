/**
 * 전국 학교 급식 정보 검색 웹앱 - Express 서버
 *
 * API 키는 오직 서버 환경 변수(NEIS_API_KEY)에서만 읽히며,
 * 절대로 클라이언트(브라우저)로 전달되지 않습니다.
 *
 * 실행:
 *   cp .env.example .env  # .env에 실제 키 입력
 *   npm install
 *   npm start
 */

"use strict";

const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const express = require("express");
const XLSX = require("xlsx");

// ── 환경 변수 로드 (.env 파일이 있으면 직접 파싱) ──────────────────────────
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8")
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    });
}

const PORT = process.env.PORT || 3000;

// ── NEIS 시도교육청 목록 (API 코드 기준) ────────────────────────────────────
const REGIONS = [
  { code: "B10", name: "서울특별시교육청", sido: "서울" },
  { code: "C10", name: "부산광역시교육청", sido: "부산" },
  { code: "D10", name: "대구광역시교육청", sido: "대구" },
  { code: "E10", name: "인천광역시교육청", sido: "인천" },
  { code: "F10", name: "광주광역시교육청", sido: "광주" },
  { code: "G10", name: "대전광역시교육청", sido: "대전" },
  { code: "H10", name: "울산광역시교육청", sido: "울산" },
  { code: "I10", name: "세종특별자치시교육청", sido: "세종" },
  { code: "J10", name: "경기도교육청", sido: "경기" },
  { code: "K10", name: "강원특별자치도교육청", sido: "강원" },
  { code: "M10", name: "충청북도교육청", sido: "충북" },
  { code: "N10", name: "충청남도교육청", sido: "충남" },
  { code: "P10", name: "전북특별자치도교육청", sido: "전북" },
  { code: "Q10", name: "전라남도교육청", sido: "전남" },
  { code: "R10", name: "경상북도교육청", sido: "경북" },
  { code: "S10", name: "경상남도교육청", sido: "경남" },
  { code: "T10", name: "제주특별자치도교육청", sido: "제주" },
];

// ── Excel 학교 데이터 로드 (서버 시작 시 1회) ────────────────────────────────
const EXCEL_PATH = path.resolve(
  __dirname,
  "../data/학교기본정보.xlsx"
);

/** regionCode → [{schoolCode, schoolName, schoolType}] */
const excelSchoolMap = new Map();

function loadExcelSchools() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.warn("[경고] 학교기본정보.xlsx 파일을 찾을 수 없습니다:", EXCEL_PATH);
    return;
  }
  try {
    const wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    for (const row of rows) {
      const regionCode = String(row["시도교육청코드"] || "").trim();
      const schoolCode = String(row["행정표준코드"] || "").trim();
      const schoolName = String(row["학교명"] || "").trim();
      const schoolType = String(row["학교종류명"] || "").trim();
      if (!regionCode || !schoolCode || !schoolName) continue;
      if (!excelSchoolMap.has(regionCode)) excelSchoolMap.set(regionCode, []);
      excelSchoolMap.get(regionCode).push({ schoolCode, schoolName, schoolType });
    }
    const total = [...excelSchoolMap.values()].reduce((s, a) => s + a.length, 0);
    console.log(`[초기화] Excel에서 ${total}개 학교 로드 완료 (${excelSchoolMap.size}개 지역)`);
  } catch (err) {
    console.error("[오류] Excel 파일 로드 실패:", err.message);
  }
}

// ── NEIS API 호출 헬퍼 ───────────────────────────────────────────────────────

/**
 * NEIS API를 호출하고 JSON을 반환합니다.
 * API 키는 서버 환경 변수에서만 읽히며 응답에 포함되지 않습니다.
 */
function callNeisApi(endpoint, params) {
  const apiKey = process.env.NEIS_API_KEY;
  if (!apiKey || apiKey === "your_neis_api_key_here") {
    return Promise.reject(new Error("NEIS_API_KEY 환경 변수가 설정되지 않았습니다."));
  }
  const qs = new URLSearchParams({ KEY: apiKey, Type: "json", pIndex: "1", pSize: "1000", ...params });
  const url = `https://open.neis.go.kr/hub/${endpoint}?${qs}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "school-meal-webapp/1.0" } }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("응답 파싱 실패"));
          }
        });
      })
      .on("error", reject);
  });
}

/** NEIS 응답에서 결과 코드와 row 배열 추출 */
function extractRows(data, key) {
  if (!data[key]) {
    const result = data.RESULT || {};
    if (result.CODE === "INFO-200") return { rows: [], empty: true };
    if (result.CODE) throw Object.assign(new Error(result.MESSAGE || "알 수 없는 오류"), { neisCode: result.CODE });
    return { rows: [], empty: true };
  }
  const blocks = data[key];
  let rows = [];
  for (const block of blocks) {
    if (block.row) rows = rows.concat(block.row);
  }
  return { rows, empty: rows.length === 0 };
}

// ── Express 앱 설정 ──────────────────────────────────────────────────────────
const app = express();
app.use(express.static(path.join(__dirname, "public")));

// 시도교육청 목록 반환 (정적, API 키 불필요)
app.get("/api/regions", (_req, res) => {
  res.json(REGIONS);
});

/**
 * 학교 목록 반환
 * ?regionCode=B10
 * Excel 데이터 우선, 없으면 NEIS schoolInfo API 호출
 */
app.get("/api/schools", async (req, res) => {
  const { regionCode } = req.query;
  if (!regionCode || !/^[A-Z][0-9]{2}$/.test(regionCode)) {
    return res.status(400).json({ error: "유효하지 않은 regionCode입니다." });
  }

  // Excel에 해당 지역 데이터가 있으면 바로 반환
  if (excelSchoolMap.has(regionCode)) {
    return res.json(excelSchoolMap.get(regionCode));
  }

  // Excel에 없으면 NEIS schoolInfo API로 조회
  try {
    const data = await callNeisApi("schoolInfo", { ATPT_OFCDC_SC_CODE: regionCode });
    const { rows, empty } = extractRows(data, "schoolInfo");
    if (empty) return res.json([]);
    const schools = rows.map((r) => ({
      schoolCode: r.SD_SCHUL_CODE,
      schoolName: r.SCHUL_NM,
      schoolType: r.SCHUL_KND_SC_NM || "",
    }));
    return res.json(schools);
  } catch (err) {
    console.error("[/api/schools]", err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 급식 정보 반환
 * ?atptCode=D10&schoolCode=7281014&date=20240304
 */
app.get("/api/meal", async (req, res) => {
  const { atptCode, schoolCode, date } = req.query;

  if (!atptCode || !/^[A-Z][0-9]{2}$/.test(atptCode)) {
    return res.status(400).json({ error: "유효하지 않은 atptCode입니다." });
  }
  if (!schoolCode || !/^\d{7,8}$/.test(schoolCode)) {
    return res.status(400).json({ error: "유효하지 않은 schoolCode입니다." });
  }
  if (!date || !/^\d{8}$/.test(date)) {
    return res.status(400).json({ error: "날짜 형식이 올바르지 않습니다 (YYYYMMDD)." });
  }

  try {
    const data = await callNeisApi("mealServiceDietInfo", {
      ATPT_OFCDC_SC_CODE: atptCode,
      SD_SCHUL_CODE: schoolCode,
      MLSV_YMD: date,
    });

    const { rows, empty } = extractRows(data, "mealServiceDietInfo");
    if (empty) return res.json([]);

    const meals = rows.map((r) => ({
      mealType: r.MMEAL_SC_NM || "",        // 조식/중식/석식
      date: r.MLSV_YMD || "",
      schoolName: r.SCHUL_NM || "",
      dishes: (r.DDISH_NM || "").split("<br/>").map((s) => s.trim()).filter(Boolean),
      calories: r.CAL_INFO || "",
      nutrition: (r.NTR_INFO || "").split("<br/>").map((s) => s.trim()).filter(Boolean),
      origin: (r.ORPLC_INFO || "").split("<br/>").map((s) => s.trim()).filter(Boolean),
      headcount: r.MLSV_FGR || "",
    }));

    return res.json(meals);
  } catch (err) {
    console.error("[/api/meal]", err.message);
    // API 키나 내부 오류 메시지를 클라이언트에 그대로 노출하지 않음
    const safe = err.neisCode
      ? `NEIS 오류 (${err.neisCode}): ${err.message}`
      : "급식 정보를 가져오는 중 오류가 발생했습니다.";
    return res.status(500).json({ error: safe });
  }
});

// ── 서버 시작 ────────────────────────────────────────────────────────────────
loadExcelSchools();
app.listen(PORT, () => {
  const hasKey = !!(process.env.NEIS_API_KEY && process.env.NEIS_API_KEY !== "your_neis_api_key_here");
  console.log(`\n🍱 학교 급식 정보 검색 앱`);
  console.log(`   URL  : http://localhost:${PORT}`);
  console.log(`   NEIS 키 : ${hasKey ? "✅ 설정됨" : "❌ 미설정 (.env 파일에 NEIS_API_KEY 입력 필요)"}`);
  console.log();
});
