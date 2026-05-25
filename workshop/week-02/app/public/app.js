/**
 * 학교 급식 정보 검색 앱 - 클라이언트 스크립트
 *
 * 보안 원칙:
 *  - NEIS API를 직접 호출하지 않습니다.
 *  - 모든 외부 API 호출은 /api/* 서버 프록시를 통해 이루어집니다.
 *  - API 키는 서버 환경 변수에만 존재하며 이 파일에 포함되지 않습니다.
 */

"use strict";

// ── 상수 ────────────────────────────────────────────────────
const ALLERGY_MAP = {
  1: "난류", 2: "우유", 3: "메밀", 4: "땅콩", 5: "대두", 6: "밀",
  7: "고등어", 8: "게", 9: "새우", 10: "돼지고기", 11: "복숭아",
  12: "토마토", 13: "아황산류", 14: "호두", 15: "닭고기", 16: "쇠고기",
  17: "오징어", 18: "조개류",
};

// 한국 음식명 → Unsplash 검색 키워드 (대표 이미지용)
const FOOD_IMAGE_KEYWORDS = {
  "김치찌개":"kimchi,stew",
  "된장찌개":"miso,soup",
  "순두부찌개":"tofu,soup",
  "부대찌개":"stew,korean",
  "비빔밥":"bibimbap,rice",
  "볶음밥":"friedrice,korean",
  "잡채":"noodles,korean",
  "떡볶이":"tteokbokki,spicy",
  "김밥":"gimbap,korean",
  "라면":"ramen,noodle",
  "우동":"udon,noodle",
  "냉면":"noodles,cold",
  "짜장면":"noodles,sauce",
  "스파게티":"spaghetti,pasta",
  "카레":"curry,rice",
  "돈가스":"pork,cutlet",
  "치킨":"fried,chicken",
  "닭갈비":"chicken,spicy",
  "불고기":"bulgogi,beef",
  "제육볶음":"pork,stirfry",
  "삼겹살":"pork,grill",
  "갈비탕":"beef,soup",
  "육개장":"beef,spicy,soup",
  "미역국":"seaweed,soup",
  "된장국":"miso,soup",
  "북엇국":"fish,soup",
  "콩나물국":"sprout,soup",
  "김치":"kimchi",
  "깍두기":"kimchi,radish",
  "배추김치":"kimchi,cabbage",
  "나물":"vegetables,korean",
  "시금치나물":"spinach,korean",
  "콩나물":"beansprout",
  "멸치볶음":"anchovy,stirfry",
  "계란말이":"egg,roll",
  "계란후라이":"fried,egg",
  "두부조림":"tofu,braised",
  "두부":"tofu",
  "어묵":"fishcake,korean",
  "감자조림":"potato,braised",
  "고구마":"sweet,potato",
  "브로콜리":"broccoli",
  "샐러드":"salad",
  "고등어":"mackerel,grilled",
  "삼치":"fish,grilled",
  "동태":"fish,soup",
  "오징어":"squid",
  "새우":"shrimp",
  "만두":"dumpling,korean",
  "오므라이스":"omurice,egg",
  "소시지":"sausage",
  "핫도그":"hotdog",
  "햄버거":"hamburger",
  "피자":"pizza",
  "빵":"bread,bakery",
  "케이크":"cake,dessert",
  "아이스크림":"icecream",
  "요구르트":"yogurt",
  "우유":"milk",
  "과일":"fruit",
  "흰쌀밥":"rice,bowl",
  "쌀밥":"rice,bowl",
  "잡곡밥":"grain,rice",
};

// 음식명에서 키워드 찾기 (부분 매칭) → loremflickr 쉼표 형식
function getFoodImageKeyword(name) {
  const clean = name.replace(/\s*\([\d.,\s]+\.\)\s*/g, "").trim();
  if (FOOD_IMAGE_KEYWORDS[clean]) return FOOD_IMAGE_KEYWORDS[clean];
  for (const [key, val] of Object.entries(FOOD_IMAGE_KEYWORDS)) {
    if (clean.includes(key)) return val;
  }
  return "korean,food";
}

// 청소년 권장 칼로리 (참고용)
const RECOMMENDED_CALORIES = 2400;

const LS_KEYS = {
  theme: "meal-app-theme",
  favorites: "meal-app-favorites",
};

// ── 상태 ────────────────────────────────────────────────────
const state = {
  regions: [],
  schools: [],
  filteredSchools: [],
  selectedRegion: null,
  selectedSchool: null,
  selectedDate: null,
  mode: "day",
  favorites: [],
};

// ── DOM 참조 ─────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const regionSelect   = $("region-select");
const stepRegion     = $("step-region");
const stepSchool     = $("step-school");
const schoolSearch   = $("school-search");
const schoolListWrap = $("school-list-wrap");
const schoolCountEl  = $("school-count");
const stepDate       = $("step-date");
const dateInput      = $("date-input");
const prevDateBtn    = $("prev-date-btn");
const nextDateBtn    = $("next-date-btn");
const searchBtn      = $("search-btn");
const selSummary     = $("selection-summary");
const resultSection  = $("result");
const resultTitle    = $("result-title");
const mealCards      = $("meal-cards");
const loadingEl      = $("loading");
const errorEl        = $("error-msg");
const modeDayBtn     = $("mode-day");
const modeWeekBtn    = $("mode-week");
const weekRangeLabel = $("week-range-label");
const themeToggle    = $("theme-toggle");
const favoritesBar   = $("favorites-bar");
const favoritesList  = $("favorites-list");
const printBtn       = $("print-btn");
const shareBtn       = $("share-btn");
const allergyGrid    = $("allergy-grid");
const toastEl        = $("toast");

// ── 초기화 ───────────────────────────────────────────────────
(async function init() {
  initTheme();
  initAllergyLegend();
  loadFavorites();
  renderFavorites();

  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
  dateInput.max   = today;

  await loadRegions();

  // 딥링크 처리 (?region=D10&school=7281013&date=20260521&mode=week)
  handleDeepLink();
})();

// ── 테마 ─────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem(LS_KEYS.theme);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);

  themeToggle.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "dark" ? "light" : "dark");
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(LS_KEYS.theme, theme);
  themeToggle.querySelector(".theme-icon").textContent = theme === "dark" ? "☀️" : "🌙";
}

// ── 알레르기 범례 ─────────────────────────────────────────────
function initAllergyLegend() {
  allergyGrid.innerHTML = Object.entries(ALLERGY_MAP)
    .map(([num, name]) => `
      <div class="allergy-item">
        <span class="allergy-num">${num}</span>
        <span>${escHtml(name)}</span>
      </div>`)
    .join("");
}

function allergyTooltip(numsStr) {
  // "(5.6.)" → "5,6" → "대두, 밀"
  const nums = numsStr.match(/\d+/g) || [];
  const names = nums.map((n) => ALLERGY_MAP[parseInt(n, 10)]).filter(Boolean);
  return names.length ? `알레르기: ${names.join(", ")}` : "";
}

// ── 즐겨찾기 ─────────────────────────────────────────────────
function loadFavorites() {
  try {
    state.favorites = JSON.parse(localStorage.getItem(LS_KEYS.favorites) || "[]");
  } catch { state.favorites = []; }
}

function saveFavorites() {
  localStorage.setItem(LS_KEYS.favorites, JSON.stringify(state.favorites));
}

function isFavorite(schoolCode) {
  return state.favorites.some((f) => f.schoolCode === schoolCode);
}

function toggleFavorite(school, regionCode, regionSido) {
  const exists = isFavorite(school.schoolCode);
  if (exists) {
    state.favorites = state.favorites.filter((f) => f.schoolCode !== school.schoolCode);
    showToast(`⭐ 즐겨찾기에서 삭제: ${school.schoolName}`);
  } else {
    state.favorites.unshift({
      schoolCode: school.schoolCode,
      schoolName: school.schoolName,
      schoolType: school.schoolType,
      regionCode,
      regionSido,
    });
    state.favorites = state.favorites.slice(0, 10); // 최대 10개
    showToast(`⭐ 즐겨찾기에 추가: ${school.schoolName}`);
  }
  saveFavorites();
  renderFavorites();
  // 학교 리스트에 별 상태 반영
  document.querySelectorAll(`.fav-star[data-code="${school.schoolCode}"]`)
    .forEach((s) => s.classList.toggle("active", isFavorite(school.schoolCode)));
}

function renderFavorites() {
  if (!state.favorites.length) {
    favoritesBar.classList.add("hidden");
    return;
  }
  favoritesBar.classList.remove("hidden");
  favoritesList.innerHTML = state.favorites
    .map((f) => `
      <button class="fav-chip" data-code="${f.schoolCode}" data-region="${f.regionCode}" title="${escHtml(f.regionSido)} ${escHtml(f.schoolName)}">
        ${escHtml(f.schoolName)}
      </button>`)
    .join("");

  favoritesList.querySelectorAll(".fav-chip").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const fav = state.favorites.find((f) => f.schoolCode === btn.dataset.code);
      if (!fav) return;
      regionSelect.value = fav.regionCode;
      regionSelect.dispatchEvent(new Event("change"));
      // 학교 로드 후 자동 선택
      setTimeout(() => {
        const item = document.querySelector(`.school-item[data-code="${fav.schoolCode}"]`);
        if (item) {
          item.click();
          item.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    });
  });
}

// ── 지역 목록 로드 ───────────────────────────────────────────
async function loadRegions() {
  try {
    const data = await apiFetch("/api/regions");
    state.regions = data;
    regionSelect.innerHTML = '<option value="">-- 시·도 교육청을 선택하세요 --</option>';
    for (const r of data) {
      const opt = document.createElement("option");
      opt.value = r.code;
      opt.textContent = r.sido;
      regionSelect.appendChild(opt);
    }
  } catch (err) {
    showError("지역 목록을 불러오지 못했습니다: " + err.message);
  }
}

// ── 지역 선택 ────────────────────────────────────────────────
regionSelect.addEventListener("change", async () => {
  const code = regionSelect.value;
  if (!code) {
    state.selectedRegion = null;
    resetFrom("region");
    return;
  }

  state.selectedRegion = state.regions.find((r) => r.code === code) || null;
  resetFrom("region");
  stepRegion.classList.add("done");
  showLoading(true);

  try {
    const data = await apiFetch(`/api/schools?regionCode=${code}`);
    state.schools = data;
    state.filteredSchools = data;
    schoolCountEl.textContent = `${data.length.toLocaleString()}개`;
    renderSchoolList(data);
    enableStep("school");
  } catch (err) {
    showError("학교 목록을 불러오지 못했습니다: " + err.message);
  } finally {
    showLoading(false);
  }
});

// ── 학교 검색 필터 ───────────────────────────────────────────
schoolSearch.addEventListener("input", () => {
  const q = schoolSearch.value.trim().toLowerCase();
  state.filteredSchools = q
    ? state.schools.filter((s) => s.schoolName.toLowerCase().includes(q))
    : state.schools;
  schoolCountEl.textContent = `${state.filteredSchools.length.toLocaleString()}개`;
  renderSchoolList(state.filteredSchools);
});

// ── 학교 목록 렌더 ───────────────────────────────────────────
function renderSchoolList(schools) {
  if (!schools.length) {
    schoolListWrap.innerHTML = '<div class="hint">🔍 검색 결과가 없습니다</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  for (const school of schools) {
    const div = document.createElement("div");
    div.className = "school-item";
    div.tabIndex = 0;
    div.dataset.code = school.schoolCode;
    const starActive = isFavorite(school.schoolCode);
    div.innerHTML = `
      <span class="school-name">${escHtml(school.schoolName)}</span>
      <span class="school-type">${escHtml(school.schoolType || "")}</span>
      <button class="fav-star ${starActive ? "active" : ""}" data-code="${school.schoolCode}" title="즐겨찾기 토글" aria-label="즐겨찾기">★</button>
    `;
    div.addEventListener("click", (e) => {
      if (e.target.closest(".fav-star")) return;
      selectSchool(school, div);
    });
    div.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectSchool(school, div); } });
    div.querySelector(".fav-star").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(school, state.selectedRegion.code, state.selectedRegion.sido);
    });
    frag.appendChild(div);
  }

  schoolListWrap.innerHTML = "";
  schoolListWrap.appendChild(frag);
}

// ── 학교 선택 ────────────────────────────────────────────────
function selectSchool(school, el) {
  document.querySelectorAll(".school-item").forEach((d) => d.classList.remove("selected"));
  if (el) el.classList.add("selected");

  state.selectedSchool = school;
  setStepDone("school");
  enableStep("date");
  updateSummary();
}

// ── 모드 토글 ─────────────────────────────────────────────────
modeDayBtn.addEventListener("click", () => setMode("day"));
modeWeekBtn.addEventListener("click", () => setMode("week"));

function setMode(m) {
  state.mode = m;
  modeDayBtn.classList.toggle("active", m === "day");
  modeWeekBtn.classList.toggle("active", m === "week");
  updateWeekRangeLabel();
  resultSection.classList.add("hidden");
  hideError();
}

function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  return { mon, fri };
}

function toApiDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${da}`;
}

function toDisplayMd(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }

function updateWeekRangeLabel() {
  if (state.mode === "week" && dateInput.value) {
    const { mon, fri } = getWeekRange(dateInput.value);
    weekRangeLabel.textContent = `${mon.getFullYear()}년 ${mon.getMonth()+1}월 ${mon.getDate()}일 (월) ~ ${fri.getMonth()+1}월 ${fri.getDate()}일 (금)`;
    weekRangeLabel.classList.remove("hidden");
  } else {
    weekRangeLabel.classList.add("hidden");
  }
}

// ── 날짜 변경 ────────────────────────────────────────────────
dateInput.addEventListener("change", () => {
  state.selectedDate = dateInput.value || null;
  updateSummary();
  updateWeekRangeLabel();
  searchBtn.disabled = !state.selectedDate;
});
dateInput.addEventListener("input", () => {
  searchBtn.disabled = !dateInput.value;
  updateWeekRangeLabel();
});

prevDateBtn.addEventListener("click", () => shiftDate(-1));
nextDateBtn.addEventListener("click", () => shiftDate(1));

function shiftDate(days) {
  if (!dateInput.value || dateInput.disabled) return;
  const d = new Date(dateInput.value);
  d.setDate(d.getDate() + days);
  dateInput.value = d.toISOString().slice(0, 10);
  dateInput.dispatchEvent(new Event("change"));
}

// ── 음식 이미지 모달 ─────────────────────────────────────────
const foodModal      = $("food-modal");
const foodModalImg   = $("food-modal-img");
const foodModalTitle = $("food-modal-title");
const foodModalSpinner = $("food-modal-spinner");

function openFoodModal(dishName) {
  foodModalTitle.textContent = dishName.replace(/\s*\([\d.,\s]+\.\)\s*/g, "").trim();
  foodModalImg.src = "";
  foodModalImg.classList.add("loading");
  foodModalSpinner.classList.remove("hidden");
  foodModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // 서버 API로 음식 이미지 요청 (TheMealDB 프록시)
  apiFetch(`/api/food-image?name=${encodeURIComponent(dishName)}`)
    .then(data => {
      const img = new Image();
      img.onload = () => {
        foodModalImg.src = data.imageUrl;
        foodModalImg.alt = dishName;
        foodModalImg.classList.remove("loading");
        foodModalSpinner.classList.add("hidden");
      };
      img.onerror = () => {
        foodModalImg.src = "";
        foodModalImg.classList.remove("loading");
        foodModalSpinner.classList.add("hidden");
        foodModalSpinner.textContent = "🍽️";
        foodModalSpinner.classList.remove("hidden");
      };
      img.src = data.imageUrl;
    })
    .catch(() => {
      foodModalImg.classList.remove("loading");
      foodModalSpinner.classList.add("hidden");
    });
}

function closeFoodModal() {
  foodModal.classList.add("hidden");
  document.body.style.overflow = "";
}

$("food-modal-close").addEventListener("click", closeFoodModal);
foodModal.querySelector(".food-modal-backdrop").addEventListener("click", closeFoodModal);

// meal-cards 클릭 이벤트 위임 (동적으로 생성된 dish-tag 처리)
$("meal-cards").addEventListener("click", (e) => {
  const tag = e.target.closest(".dish-tag.clickable");
  if (tag) openFoodModal(tag.dataset.dish);
});

// ── 키보드 단축키 ─────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // 모달 열려있으면 Escape로 닫기
  if (!foodModal.classList.contains("hidden")) {
    if (e.key === "Escape") closeFoodModal();
    return;
  }
  // 입력 필드 포커스 중이면 화살표는 무시 (Enter 제외)
  const inField = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);

  if (e.key === "Enter" && !searchBtn.disabled && !inField) {
    e.preventDefault();
    fetchMeal();
  }
  if (!inField || document.activeElement === dateInput) {
    if (e.key === "ArrowLeft")  { e.preventDefault(); shiftDate(state.mode === "week" ? -7 : -1); }
    if (e.key === "ArrowRight") { e.preventDefault(); shiftDate(state.mode === "week" ? 7 : 1); }
  }
});

// ── 급식 조회 ────────────────────────────────────────────────
searchBtn.addEventListener("click", fetchMeal);

async function fetchMeal() {
  if (!state.selectedRegion || !state.selectedSchool || !dateInput.value) return;

  hideError();
  showLoading(true);
  resultSection.classList.add("hidden");

  try {
    if (state.mode === "week") {
      const { mon, fri } = getWeekRange(dateInput.value);
      const meals = await apiFetch(
        `/api/meal?atptCode=${state.selectedRegion.code}&schoolCode=${state.selectedSchool.schoolCode}&fromDate=${toApiDate(mon)}&toDate=${toApiDate(fri)}`
      );
      renderWeekMeals(meals, state.selectedSchool.schoolName, mon, fri);
    } else {
      const date = dateInput.value.replace(/-/g, "");
      const meals = await apiFetch(
        `/api/meal?atptCode=${state.selectedRegion.code}&schoolCode=${state.selectedSchool.schoolCode}&date=${date}`
      );
      renderMeals(meals, state.selectedSchool.schoolName, dateInput.value);
    }
    updateUrl();
  } catch (err) {
    showError("급식 정보를 가져오지 못했습니다: " + err.message);
  } finally {
    showLoading(false);
  }
}

// ── 주간 급식표 렌더 ──────────────────────────────────────────
const DAY_NAMES = ["월", "화", "수", "목", "금"];

function renderWeekMeals(meals, schoolName, mon, fri) {
  const monStr = `${mon.getFullYear()}년 ${mon.getMonth()+1}월 ${mon.getDate()}일`;
  const friStr = `${fri.getMonth()+1}월 ${fri.getDate()}일`;
  resultTitle.textContent = `🏫 ${schoolName} · ${monStr} ~ ${friStr}`;
  mealCards.innerHTML = "";

  const byDate = {};
  for (const meal of (meals || [])) {
    if (!byDate[meal.date]) byDate[meal.date] = [];
    byDate[meal.date].push(meal);
  }

  const todayStr = toApiDate(new Date());
  const grid = document.createElement("div");
  grid.className = "week-table";

  for (let i = 0; i < 5; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const dateKey = toApiDate(d);
    const isToday = dateKey === todayStr;
    const dayMeals = byDate[dateKey] || [];

    const card = document.createElement("div");
    card.className = "week-day-card";
    card.innerHTML = `
      <div class="week-day-header ${isToday ? "today" : ""}">
        ${DAY_NAMES[i]} · ${toDisplayMd(d)}
      </div>
      <div class="week-day-meals">
        ${dayMeals.length === 0
          ? '<div class="week-no-meal">🚫 급식 없음</div>'
          : dayMeals.map((m) => `
              <div class="week-meal-block">
                <div class="week-meal-type">${escHtml(m.mealType)}</div>
                <div class="week-dish">${m.dishes.map((dd) => escHtml(dd.replace(/\([\d.,\s]+\.\)/g, "").trim())).join("<br>")}</div>
              </div>`).join("")}
      </div>`;
    grid.appendChild(card);
  }

  mealCards.appendChild(grid);
  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── 일간 급식 결과 렌더 ───────────────────────────────────────
const MEAL_ICONS = { "조식": "🌅", "중식": "🍚", "석식": "🌙" };
const MEAL_CLASSES = { "조식": "breakfast", "중식": "lunch", "석식": "dinner" };

function renderMeals(meals, schoolName, dateStr) {
  const dt = new Date(dateStr);
  const weekday = ["일","월","화","수","목","금","토"][dt.getDay()];
  const formattedDate = dateStr.replace(/(\d{4})-(\d{2})-(\d{2})/, "$1년 $2월 $3일") + ` (${weekday})`;
  resultTitle.textContent = `🏫 ${schoolName} · ${formattedDate}`;
  mealCards.innerHTML = "";

  if (!meals || meals.length === 0) {
    mealCards.innerHTML = `
      <div class="no-meal">
        <div class="icon">🤷</div>
        <div>해당 날짜의 급식 정보가 없습니다.<br>주말·공휴일·방학 기간에는 급식이 제공되지 않을 수 있습니다.</div>
      </div>`;
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  for (const meal of meals) {
    const icon = MEAL_ICONS[meal.mealType] || "🍽️";
    const headerClass = MEAL_CLASSES[meal.mealType] || "";
    const dishesHtml = meal.dishes
      .map((d) => {
        const m = d.match(/^(.+?)(\([\d.,\s]+\.\))?$/);
        const name = m ? m[1].trim() : d;
        const allergy = m && m[2]
          ? `<span class="allergy" title="${escHtml(allergyTooltip(m[2]))}">${escHtml(m[2])}</span>`
          : "";
        return `<li class="dish-tag clickable" data-dish="${escHtml(name)}">${escHtml(name)}<span class="dish-camera">📷</span>${allergy}</li>`;
      }).join("");

    // 칼로리 막대
    let calorieBarHtml = "";
    const calMatch = (meal.calories || "").match(/([\d.]+)/);
    if (calMatch) {
      const kcal = parseFloat(calMatch[1]);
      const pct = Math.min(100, Math.round((kcal / RECOMMENDED_CALORIES) * 100));
      const isHigh = pct > 40;
      calorieBarHtml = `
        <div class="calorie-bar-wrap">
          <div class="calorie-bar-label">
            <span>🔥 <strong>${escHtml(meal.calories)}</strong></span>
            <span>1일 권장 ${RECOMMENDED_CALORIES}kcal 대비 <strong>${pct}%</strong></span>
          </div>
          <div class="calorie-bar">
            <div class="calorie-bar-fill ${isHigh ? "high" : ""}" data-pct="${pct}"></div>
          </div>
        </div>`;
    }

    const ntrHtml = meal.nutrition.length
      ? `<div><strong>영양</strong> ${meal.nutrition.map(escHtml).join(" · ")}</div>` : "";
    const orHtml = meal.origin.length
      ? `<div><strong>원산지</strong> ${meal.origin.map(escHtml).join(" · ")}</div>` : "";
    const hcHtml = meal.headcount
      ? `<span class="headcount">👥 ${escHtml(meal.headcount)}명</span>` : "";

    const card = document.createElement("div");
    card.className = "meal-card";
    card.innerHTML = `
      <div class="meal-card-header ${headerClass}">
        <span class="meal-icon">${icon}</span>
        <h3>${escHtml(meal.mealType)}</h3>
        ${hcHtml}
      </div>
      <div class="meal-card-body">
        <ul class="dish-list">${dishesHtml}</ul>
        ${calorieBarHtml}
        <div class="meal-meta">${ntrHtml}${orHtml}</div>
      </div>`;
    mealCards.appendChild(card);
  }

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

  // 칼로리 막대 애니메이션
  requestAnimationFrame(() => {
    document.querySelectorAll(".calorie-bar-fill").forEach((bar) => {
      bar.style.width = bar.dataset.pct + "%";
    });
  });
}

// ── 인쇄 / 공유 ─────────────────────────────────────────────
printBtn.addEventListener("click", () => window.print());

shareBtn.addEventListener("click", async () => {
  const url = buildShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast("🔗 링크가 클립보드에 복사되었습니다");
  } catch {
    showToast("⚠️ 링크 복사에 실패했습니다");
  }
});

function buildShareUrl() {
  const u = new URL(window.location.href);
  u.search = "";
  if (state.selectedRegion) u.searchParams.set("region", state.selectedRegion.code);
  if (state.selectedSchool) u.searchParams.set("school", state.selectedSchool.schoolCode);
  if (dateInput.value)      u.searchParams.set("date", dateInput.value);
  u.searchParams.set("mode", state.mode);
  return u.toString();
}

function updateUrl() {
  window.history.replaceState(null, "", buildShareUrl());
}

async function handleDeepLink() {
  const sp = new URLSearchParams(window.location.search);
  const r = sp.get("region"), s = sp.get("school"), d = sp.get("date"), m = sp.get("mode");
  if (m === "week") setMode("week");
  if (!r) return;
  regionSelect.value = r;
  regionSelect.dispatchEvent(new Event("change"));
  if (!s) return;
  setTimeout(() => {
    const item = document.querySelector(`.school-item[data-code="${s}"]`);
    if (item) item.click();
    if (d) {
      dateInput.value = d;
      dateInput.dispatchEvent(new Event("change"));
      setTimeout(() => fetchMeal(), 200);
    }
  }, 500);
}

// ── 토스트 ───────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  requestAnimationFrame(() => toastEl.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.classList.add("hidden"), 350);
  }, 2200);
}

// ── 요약 표시 ────────────────────────────────────────────────
function updateSummary() {
  const parts = [];
  if (state.selectedRegion) parts.push(`📍 ${state.selectedRegion.sido}`);
  if (state.selectedSchool) parts.push(`🏫 ${state.selectedSchool.schoolName}`);
  if (dateInput.value)      parts.push(`📅 ${dateInput.value}`);

  if (parts.length) {
    selSummary.innerHTML = parts.map((p) => `<span>${escHtml(p)}</span>`).join(" › ");
    selSummary.classList.remove("hidden");
  } else {
    selSummary.classList.add("hidden");
  }
}

// ── 단계 UI 헬퍼 ─────────────────────────────────────────────
function enableStep(name) {
  if (name === "school") {
    stepSchool.classList.remove("disabled");
    schoolSearch.disabled = false;
  } else if (name === "date") {
    stepDate.classList.remove("disabled");
    dateInput.disabled = false;
    searchBtn.disabled = !dateInput.value;
  }
}

function setStepDone(name) {
  if (name === "school") {
    stepSchool.classList.add("done");
  }
}

function resetFrom(name) {
  if (name === "region") {
    state.selectedSchool = null;
    state.schools = [];
    state.filteredSchools = [];
    schoolSearch.value = "";
    schoolSearch.disabled = true;
    schoolCountEl.textContent = "";
    schoolListWrap.innerHTML = '<div class="hint">지역을 먼저 선택해 주세요</div>';
    stepSchool.classList.add("disabled");
    stepSchool.classList.remove("done");
    resetFrom("school");
  }
  if (name === "school" || name === "region") {
    stepDate.classList.add("disabled");
    dateInput.disabled = true;
    searchBtn.disabled = true;
  }
  resultSection.classList.add("hidden");
  hideError();
  updateSummary();
}

// ── 로딩 / 오류 ──────────────────────────────────────────────
function showLoading(on) {
  loadingEl.classList.toggle("hidden", !on);
}
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}
function hideError() {
  errorEl.classList.add("hidden");
}

// ── API 호출 헬퍼 ─────────────────────────────────────────────
async function apiFetch(url) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ── XSS 방지 ─────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
