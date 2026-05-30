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
// Vercel/Render 배포 시 ./data/, 로컬 개발 시 ../data/ 순으로 탐색
const EXCEL_PATH = (() => {
  const localPath = path.resolve(__dirname, "./data/학교기본정보.xlsx");
  const fallback  = path.resolve(__dirname, "../data/학교기본정보.xlsx");
  return fs.existsSync(localPath) ? localPath : fallback;
})();

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
  const TIMEOUT_MS = 7000;
  const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB 응답 크기 상한 (메모리 보호)

  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": "school-meal-webapp/1.0" }, timeout: TIMEOUT_MS },
      (res) => {
        let body = "";
        let bytes = 0;
        res.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > MAX_BODY_BYTES) {
            res.destroy();
            reject(new Error("응답이 너무 큽니다."));
            return;
          }
          body += chunk;
        });
        res.on("end", () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error("응답 파싱 실패")); }
        });
        res.on("error", reject);
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("NEIS API 응답 시간 초과"));
    });
    req.on("error", reject);
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

// ── 간단한 인메모리 Rate Limiter ─────────────────────────────────────────────
const rateStore = new Map(); // ip → { count, resetAt }
const RATE_WINDOW_MS = 60_000; // 1분
const RATE_LIMIT_API  = 60;    // API 엔드포인트: 분당 60회
const RATE_LIMIT_MEAL = 20;    // /api/meal: 분당 20회 (NEIS 키 보호)

function rateLimiter(maxPerWindow) {
  return (req, res, next) => {
    // Render/Vercel 등 리버스 프록시 뒤에서는 req.ip(=X-Forwarded-For 첫 번째)를 사용해야
    // 클라이언트 IP별로 정확히 카운트된다. trust proxy 설정과 함께 동작.
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const entry = rateStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateStore.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxPerWindow) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." });
    }
    next();
  };
}

// 메모리 누수 방지: 만료된 항목 주기적 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateStore) {
    if (now > val.resetAt) rateStore.delete(key);
  }
}, RATE_WINDOW_MS);

// ── Express 앱 설정 ──────────────────────────────────────────────────────────
const app = express();

// 리버스 프록시(Render/Vercel) 뒤에서 실제 클라이언트 IP를 인식하도록 설정.
// rate limiter가 req.ip를 통해 X-Forwarded-For 첫 번째 IP를 사용하여
// 단일 게이트웨이 IP로 모든 사용자가 한 카운터를 공유하는 문제를 방지한다.
// 값 1 = 바로 앞 프록시 1단계만 신뢰 (위조 방지).
app.set("trust proxy", 1);

// 보안 HTTP 헤더 (helmet 미사용, 직접 설정)
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  // CSP: 외부 리소스 차단 (폰트 허용, 인라인 스타일/스크립트 불허)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "script-src 'self'; " +
    "img-src 'self' data: https: blob: https://search.pstatic.net https://image.pollinations.ai; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );
  next();
});

app.use(express.static(path.join(__dirname, "public")));

// 시도교육청 목록 반환 (정적, API 키 불필요)
app.get("/api/regions", rateLimiter(RATE_LIMIT_API), (_req, res) => {
  res.json(REGIONS);
});

/**
 * 학교 목록 반환
 * ?regionCode=B10
 * Excel 데이터 우선, 없으면 NEIS schoolInfo API 호출
 */
app.get("/api/schools", rateLimiter(RATE_LIMIT_API), async (req, res) => {
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
 * 단일 날짜:  ?atptCode=D10&schoolCode=7281014&date=20240304
 * 날짜 범위:  ?atptCode=D10&schoolCode=7281014&fromDate=20240304&toDate=20240308
 */
app.get("/api/meal", rateLimiter(RATE_LIMIT_MEAL), async (req, res) => {
  const { atptCode, schoolCode, date, fromDate, toDate } = req.query;

  if (!atptCode || !/^[A-Z][0-9]{2}$/.test(atptCode)) {
    return res.status(400).json({ error: "유효하지 않은 atptCode입니다." });
  }
  if (!schoolCode || !/^\d{7,8}$/.test(schoolCode)) {
    return res.status(400).json({ error: "유효하지 않은 schoolCode입니다." });
  }

  // 날짜 파라미터 결정: 범위(fromDate+toDate) 우선, 없으면 단일 date
  const useRange = fromDate && toDate;
  if (useRange) {
    if (!/^\d{8}$/.test(fromDate) || !/^\d{8}$/.test(toDate)) {
      return res.status(400).json({ error: "날짜 형식이 올바르지 않습니다 (YYYYMMDD)." });
    }
  } else {
    if (!date || !/^\d{8}$/.test(date)) {
      return res.status(400).json({ error: "날짜 형식이 올바르지 않습니다 (YYYYMMDD)." });
    }
  }

  try {
    const params = {
      ATPT_OFCDC_SC_CODE: atptCode,
      SD_SCHUL_CODE: schoolCode,
    };
    if (useRange) {
      params.MLSV_FROM_YMD = fromDate;
      params.MLSV_TO_YMD   = toDate;
    } else {
      params.MLSV_YMD = date;
    }

    const data = await callNeisApi("mealServiceDietInfo", params);
    const { rows, empty } = extractRows(data, "mealServiceDietInfo");
    if (empty) return res.json([]);

    const meals = rows.map((r) => ({
      mealType:   r.MMEAL_SC_NM || "",
      date:       r.MLSV_YMD   || "",
      schoolName: r.SCHUL_NM   || "",
      dishes:     (r.DDISH_NM  || "").split("<br/>").map((s) => s.trim()).filter(Boolean),
      calories:   r.CAL_INFO   || "",
      nutrition:  (r.NTR_INFO  || "").split("<br/>").map((s) => s.trim()).filter(Boolean),
      origin:     (r.ORPLC_INFO|| "").split("<br/>").map((s) => s.trim()).filter(Boolean),
      headcount:  r.MLSV_FGR   || "",
    }));

    return res.json(meals);
  } catch (err) {
    console.error("[/api/meal]", err.message);
    const safe = err.neisCode
      ? `NEIS 오류 (${err.neisCode}): ${err.message}`
      : "급식 정보를 가져오는 중 오류가 발생했습니다.";
    return res.status(500).json({ error: safe });
  }
});

// ── 음식 이미지 검색 (TheMealDB 프록시) ─────────────────────────────────────
// 한국 음식명 → TheMealDB 검색어 매핑
const MEAL_DB_KEYWORDS = {
  "rice": "rice", "beef": "beef", "pork": "pork", "chicken": "chicken",
  "soup": "soup", "noodle": "noodle", "tofu": "tofu", "fish": "fish",
  "egg": "egg", "shrimp": "shrimp", "dumpling": "dumpling",
  "curry": "curry", "pizza": "pizza", "pasta": "pasta", "salad": "salad",
  "stew": "stew", "bread": "bread", "cake": "cake", "icecream": "ice cream",
};
const KOREAN_TO_SEARCH = {
  "김치":"kimchi", "김치찌개":"pork kimchi", "된장":"tofu miso",
  "된장찌개":"tofu miso", "순두부":"tofu", "부대찌개":"sausage pork",
  "비빔밥":"rice beef", "볶음밥":"fried rice", "잡채":"noodle beef",
  "떡볶이":"rice cake spicy", "김밥":"rice roll", "라면":"ramen noodle",
  "우동":"udon noodle", "냉면":"cold noodle", "짜장면":"noodle sauce",
  "스파게티":"spaghetti", "카레":"curry rice", "돈가스":"tonkatsu pork",
  "치킨":"chicken", "닭갈비":"chicken spicy", "불고기":"beef bulgogi",
  "제육볶음":"pork stirfry", "삼겹살":"pork belly", "갈비탕":"beef soup",
  "육개장":"beef spicy", "미역국":"seaweed soup", "된장국":"miso soup",
  "북엇국":"fish soup", "콩나물국":"bean sprout soup",
  "배추김치":"kimchi cabbage", "깍두기":"kimchi radish",
  "나물":"vegetables", "시금치":"spinach", "콩나물":"bean sprout",
  "멸치":"anchovy", "계란":"egg", "두부":"tofu", "어묵":"fish cake",
  "감자":"potato", "고구마":"sweet potato", "브로콜리":"broccoli",
  "고등어":"mackerel fish", "삼치":"fish grilled", "동태":"fish soup",
  "오징어":"squid seafood", "새우":"shrimp", "만두":"dumpling",
  "오므라이스":"omurice egg rice", "소시지":"sausage",
  "핫도그":"hot dog", "햄버거":"hamburger beef", "피자":"pizza",
  "빵":"bread", "케이크":"cake dessert", "아이스크림":"ice cream",
  "과일":"fruit", "쌀밥":"steamed rice", "잡곡밥":"grain rice",
};

// 카테고리별 TheMealDB 이미지 (안정적 폴백)
const CATEGORY_IMAGES = {
  "beef": "https://www.themealdb.com/images/category/beef.png",
  "chicken": "https://www.themealdb.com/images/category/chicken.png",
  "pork": "https://www.themealdb.com/images/category/pork.png",
  "seafood": "https://www.themealdb.com/images/category/seafood.png",
  "pasta": "https://www.themealdb.com/images/category/pasta.png",
  "vegetarian": "https://www.themealdb.com/images/category/vegetarian.png",
  "dessert": "https://www.themealdb.com/images/category/dessert.png",
  "side": "https://www.themealdb.com/images/category/side.png",
  "starter": "https://www.themealdb.com/images/category/starter.png",
  "miscellaneous": "https://www.themealdb.com/images/category/miscellaneous.png",
};

function getCategoryFallback(korName) {
  if (/소고기|쇠고기|불고기|갈비|육/.test(korName)) return CATEGORY_IMAGES.beef;
  if (/닭|치킨/.test(korName)) return CATEGORY_IMAGES.chicken;
  if (/돼지|삼겹|제육|돈|베이컨/.test(korName)) return CATEGORY_IMAGES.pork;
  if (/김치찌개|돼지찌개|부대찌개/.test(korName)) return CATEGORY_IMAGES.pork;
  if (/생선|고등어|삼치|동태|오징어|새우|어묵|해물|조개/.test(korName)) return CATEGORY_IMAGES.seafood;
  if (/라면|우동|냉면|국수|파스타|스파게티/.test(korName)) return CATEGORY_IMAGES.pasta;
  if (/케이크|아이스크림|디저트|과자|빵/.test(korName)) return CATEGORY_IMAGES.dessert;
  if (/김치|된장|순두부|두부|나물|샐러드|채소|야채|브로콜리|시금치|콩나물/.test(korName)) return CATEGORY_IMAGES.vegetarian;
  return CATEGORY_IMAGES.side;
}

// ── 음식명 핵심어 추출 ────────────────────────────────────────
function extractFoodCore(raw) {
  return raw
    .replace(/\([^)]*\)/g, "")           // 모든 괄호 내용 제거: (자율), (완), (대)
    .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Gemini AI 이미지 관련성 평가 ─────────────────────────────
async function pickBestImageWithAI(foodName, candidates) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || candidates.length === 0) return null;

  const top = candidates.slice(0, 10);
  const titleList = top.map((item, i) => {
    const title = (item.title || "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/<[^>]+>/g, "").trim();
    return `${i + 1}. ${title}`;
  }).join("\n");

  // AI에게 "관련 없으면 0 반환"하도록 변경
  const prompt = `다음은 네이버 이미지 검색 결과 제목 목록입니다.
음식 이름: "${foodName}"

${titleList}

위 제목 중에서 "${foodName}" 음식 사진으로 가장 적합한 항목의 번호(숫자만)를 답하세요.
단, 음식과 전혀 관련 없는 항목이면 0을 답하세요.
반드시 숫자 하나만 답하세요.`;

  try {
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 5, temperature: 0 },
        }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!aiRes.ok) return null;
    const aiData = await aiRes.json();
    const answer = (aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    const idx = parseInt(answer, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= top.length) {
      return top[idx - 1];
    }
    // 0 또는 범위 외 → 관련 없음
    return null;
  } catch (err) {
    console.warn("Gemini AI 평가 실패:", err.message);
  }
  return null;
}

app.get("/api/food-image", rateLimiter(RATE_LIMIT_API), async (req, res) => {
  // 입력 검증: 타입·길이 제한으로 업스트림 API 비용 폭주 / DoS 방지
  let { name = "" } = req.query;
  if (typeof name !== "string") {
    return res.status(400).json({ error: "name 파라미터는 문자열이어야 합니다." });
  }
  if (name.length > 50) {
    return res.status(400).json({ error: "name 파라미터가 너무 깁니다 (최대 50자)." });
  }
  // 제어문자 제거 (인젝션/로그 위조 방지)
  name = name.replace(/[\u0000-\u001F\u007F]/g, "");
  const clean = name.replace(/\s*\([\d.,\s]+\.\)\s*/g, "").trim();
  if (!clean) {
    return res.json({ imageUrl: null, source: "none", alt: "" });
  }

  const naverClientId = process.env.NAVER_CLIENT_ID;
  const naverClientSecret = process.env.NAVER_CLIENT_SECRET;

  if (naverClientId && naverClientSecret) {
    try {
      // 핵심 음식명 추출 (괄호 내용 전체 제거)
      const foodName = extractFoodCore(clean);
      if (!foodName) {
        return res.json({ imageUrl: null, source: "none", alt: clean });
      }

      const nameChars = foodName.replace(/\s/g, "");

      // 후보 이미지 수집 (3가지 쿼리로 다양한 후보 확보)
      const queries = [
        `${foodName} 음식`,
        `${foodName} 레시피`,
        foodName,
      ];
      const seen = new Set();
      const candidates = [];

      for (const q of queries) {
        const naverRes = await fetch(
          `https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(q)}&display=10&sort=sim&filter=medium`,
          {
            headers: {
              "X-Naver-Client-Id": naverClientId,
              "X-Naver-Client-Secret": naverClientSecret,
            },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (!naverRes.ok) continue;
        const data = await naverRes.json();
        for (const item of (data.items || [])) {
          if (item.thumbnail && !seen.has(item.thumbnail)) {
            seen.add(item.thumbnail);
            candidates.push(item);
          }
        }
        if (candidates.length >= 20) break;
      }

      if (candidates.length > 0) {
        // 1차: Gemini AI 평가로 최적 선택
        const aiPick = await pickBestImageWithAI(foodName, candidates);
        if (aiPick) {
          return res.json({ imageUrl: aiPick.thumbnail, source: "naver-ai", alt: clean });
        }

        // AI가 관련없다고 판단하면 제목 점수 기반으로 한 번 더 시도
        const score = (item) => {
          const title = (item.title || "")
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/<[^>]+>/g, "");
          let s = 0;
          if (title.includes(foodName)) s += 3;
          if (nameChars.length >= 2 && title.includes(nameChars.slice(0, 2))) s += 2;
          if (nameChars.length >= 4 && title.includes(nameChars.slice(0, 4))) s += 1;
          return s;
        };
        const best = candidates.sort((a, b) => score(b) - score(a))[0];
        // 점수가 0점이면 완전 관련없음 → Pollinations 폴백으로 넘어감
        if (score(best) > 0) {
          return res.json({ imageUrl: best.thumbnail, source: "naver", alt: clean });
        }
      }
    } catch (err) {
      console.warn("네이버 이미지 검색 실패:", err.message);
    }
  }

  // 폴백: Pollinations.ai AI 이미지
  let searchTerm = "";
  const sortedKeys = Object.keys(KOREAN_TO_SEARCH).sort((a, b) => b.length - a.length);
  for (const ko of sortedKeys) {
    if (clean.includes(ko)) { searchTerm = KOREAN_TO_SEARCH[ko]; break; }
  }
  if (!searchTerm) searchTerm = "korean food dish";

  const prompt = encodeURIComponent(`${searchTerm}, korean food, delicious, top view, food photography, realistic, high quality`);
  const seed = Math.floor(Date.now() / 86400000);
  const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=400&height=300&seed=${seed}&nologo=true`;

  return res.json({ imageUrl, source: "ai-generated", alt: clean });
});

// ── 서버 시작 (로컬/Render) 또는 서버리스 export (Vercel) ────────────────────
loadExcelSchools();

if (require.main === module) {
  app.listen(PORT, () => {
    const hasKey = !!(process.env.NEIS_API_KEY && process.env.NEIS_API_KEY !== "your_neis_api_key_here");
    console.log(`\n🍱 학교 급식 정보 검색 앱`);
    console.log(`   URL  : http://localhost:${PORT}`);
    console.log(`   NEIS 키 : ${hasKey ? "✅ 설정됨" : "❌ 미설정 (.env 파일에 NEIS_API_KEY 입력 필요)"}`);
    console.log();
  });
}

module.exports = app;
