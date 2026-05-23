/**
 * 학교 급식 정보 검색 앱 - 클라이언트 스크립트
 *
 * 보안 원칙:
 *  - NEIS API를 직접 호출하지 않습니다.
 *  - 모든 외부 API 호출은 /api/* 서버 프록시를 통해 이루어집니다.
 *  - API 키는 서버 환경 변수에만 존재하며 이 파일에 포함되지 않습니다.
 */

"use strict";

// ── 상태 ────────────────────────────────────────────────────
const state = {
  regions: [],
  schools: [],
  filteredSchools: [],
  selectedRegion: null,   // { code, name, sido }
  selectedSchool: null,   // { schoolCode, schoolName, schoolType }
  selectedDate: null,     // "YYYY-MM-DD"
  mode: "day",            // "day" | "week"
};

// ── DOM 참조 ─────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const regionSelect   = $("region-select");
const stepSchool     = $("step-school");
const schoolSearch   = $("school-search");
const schoolListWrap = $("school-list-wrap");
const stepDate       = $("step-date");
const dateInput      = $("date-input");
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

// ── 초기화 ───────────────────────────────────────────────────
(async function init() {
  // 날짜 기본값: 오늘
  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
  dateInput.max   = today;

  await loadRegions();
})();

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
  setStepActive("region");
  showLoading(true);

  try {
    const data = await apiFetch(`/api/schools?regionCode=${code}`);
    state.schools = data;
    state.filteredSchools = data;
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
  renderSchoolList(state.filteredSchools);
});

// ── 학교 목록 렌더 ───────────────────────────────────────────
function renderSchoolList(schools) {
  if (!schools.length) {
    schoolListWrap.innerHTML = '<div class="hint">검색 결과가 없습니다</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  for (const school of schools) {
    const div = document.createElement("div");
    div.className = "school-item";
    div.tabIndex = 0;
    div.dataset.code = school.schoolCode;
    div.innerHTML = `
      <span class="school-name">${escHtml(school.schoolName)}</span>
      <span class="school-type">${escHtml(school.schoolType || "")}</span>
    `;
    div.addEventListener("click",  () => selectSchool(school, div));
    div.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") selectSchool(school, div); });
    frag.appendChild(div);
  }

  schoolListWrap.innerHTML = "";
  schoolListWrap.appendChild(frag);
}

// ── 학교 선택 ────────────────────────────────────────────────
function selectSchool(school, el) {
  document.querySelectorAll(".school-item").forEach((d) => d.classList.remove("selected"));
  el.classList.add("selected");

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

/** 선택한 날짜가 속한 주의 월요일~금요일 반환 */
function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=일, 1=월 ... 6=토
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  return { mon, fri };
}

function toApiDate(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function toDisplayDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function updateWeekRangeLabel() {
  if (state.mode === "week" && dateInput.value) {
    const { mon, fri } = getWeekRange(dateInput.value);
    const label = `${mon.getFullYear()}년 ${mon.getMonth()+1}월 ${mon.getDate()}일 (월) ~ ${fri.getMonth()+1}월 ${fri.getDate()}일 (금)`;
    weekRangeLabel.textContent = label;
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

// 초기 오늘 날짜가 있으면 버튼 활성화 상태 유지 (학교 선택 후)
dateInput.addEventListener("input", () => {
  searchBtn.disabled = !dateInput.value;
  updateWeekRangeLabel();
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
      const fromDate = toApiDate(mon);
      const toDate   = toApiDate(fri);
      const meals = await apiFetch(
        `/api/meal?atptCode=${state.selectedRegion.code}&schoolCode=${state.selectedSchool.schoolCode}&fromDate=${fromDate}&toDate=${toDate}`
      );
      renderWeekMeals(meals, state.selectedSchool.schoolName, mon, fri);
    } else {
      const date = dateInput.value.replace(/-/g, "");
      const meals = await apiFetch(
        `/api/meal?atptCode=${state.selectedRegion.code}&schoolCode=${state.selectedSchool.schoolCode}&date=${date}`
      );
      renderMeals(meals, state.selectedSchool.schoolName, dateInput.value);
    }
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
  resultTitle.textContent = `${schoolName} · ${monStr} ~ ${friStr}`;
  mealCards.innerHTML = "";

  // 날짜별로 급식 그룹화
  const byDate = {};
  for (const meal of (meals || [])) {
    if (!byDate[meal.date]) byDate[meal.date] = [];
    byDate[meal.date].push(meal);
  }

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
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
        ${DAY_NAMES[i]} (${toDisplayDate(d)})
      </div>
      <div class="week-day-meals">
        ${dayMeals.length === 0
          ? '<div class="week-no-meal">급식 없음</div>'
          : dayMeals.map((m) => `
              <div class="week-meal-block">
                <div class="week-meal-type">${escHtml(m.mealType)}</div>
                <div class="week-dish">${m.dishes.map((d) => escHtml(d.replace(/\([\d.,\s]+\.\)/g, "").trim())).join("<br>")}</div>
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

function renderMeals(meals, schoolName, dateStr) {
  const formattedDate = dateStr.replace(/(\d{4})-(\d{2})-(\d{2})/, "$1년 $2월 $3일");
  resultTitle.textContent = `${schoolName} · ${formattedDate}`;
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
    const dishesHtml = meal.dishes
      .map((d) => {
        // 요리명에서 알레르기 번호 분리: "흰쌀밥(5.6.)" → "흰쌀밥" + "(5.6.)"
        const m = d.match(/^(.+?)(\([\d.,\s]+\.\))?$/);
        const name  = m ? m[1].trim() : d;
        const allergy = m && m[2] ? `<span class="allergy">${escHtml(m[2])}</span>` : "";
        return `<li class="dish-tag">${escHtml(name)}${allergy}</li>`;
      })
      .join("");

    const calHtml = meal.calories
      ? `<div><strong>칼로리</strong> ${escHtml(meal.calories)}</div>` : "";
    const ntrHtml = meal.nutrition.length
      ? `<div><strong>영양정보</strong> ${meal.nutrition.map(escHtml).join(" · ")}</div>` : "";
    const orHtml = meal.origin.length
      ? `<div><strong>원산지</strong> ${meal.origin.map(escHtml).join(" · ")}</div>` : "";
    const hcHtml = meal.headcount
      ? `<span class="headcount">👥 ${escHtml(meal.headcount)}명</span>` : "";

    const card = document.createElement("div");
    card.className = "meal-card";
    card.innerHTML = `
      <div class="meal-card-header">
        <span class="meal-icon">${icon}</span>
        <h3>${escHtml(meal.mealType)}</h3>
        ${hcHtml}
      </div>
      <div class="meal-card-body">
        <ul class="dish-list">${dishesHtml}</ul>
        <div class="meal-meta">${calHtml}${ntrHtml}${orHtml}</div>
      </div>`;
    mealCards.appendChild(card);
  }

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
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

function setStepActive(name) {
  if (name === "region") $("step-region").classList.add("active");
}

function setStepDone(name) {
  if (name === "school") {
    stepSchool.classList.add("done");
    stepSchool.classList.remove("active");
  }
}

function resetFrom(name) {
  if (name === "region") {
    // 학교 초기화
    state.selectedSchool = null;
    state.schools = [];
    state.filteredSchools = [];
    schoolSearch.value = "";
    schoolSearch.disabled = true;
    schoolListWrap.innerHTML = '<div class="hint">지역을 먼저 선택해 주세요</div>';
    stepSchool.classList.add("disabled");
    stepSchool.classList.remove("done", "active");
    // 날짜 초기화
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
