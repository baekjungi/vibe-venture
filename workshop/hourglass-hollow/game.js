// ===== game.js — 핵심 게임 상태 & 루프 =====

const Game = (() => {
  // ── 게임 상태 ────────────────────────────────────
  let state = null;
  let timerInterval = null;
  const TOTAL_SECONDS = 60 * 10; // 10분 (데모용; 실제는 60*60)

  function getState() { return state; }

  // ── 게임 시작 ────────────────────────────────────
  function start() {
    const saved = loadSave();
    const runNum = saved ? saved.runNum + 1 : 1;
    const ownedRunes = saved ? saved.ownedRunes : [...DATA.startingRunes];
    const unlockedThisRun = DATA.runUnlockTable[runNum] || [];
    unlockedThisRun.forEach(r => { if (!ownedRunes.includes(r)) ownedRunes.push(r); });

    const npcRoles = NPCManager.assignRoles(runNum, Parchment.getAll());

    state = {
      runNum,
      ownedRunes,
      equippedRunes: [
        DATA.runes.find(r => r.id === ownedRunes[0]) || null,
        DATA.runes.find(r => r.id === ownedRunes[1]) || null,
        null
      ],
      npcRoles,
      player: {
        hp: 100, maxHp: 100,
        atk: 14 + (runNum - 1) * 2,   // 회차마다 2씩 성장
        def: 3  + Math.floor((runNum-1)*0.5)
      },
      memoryShards: saved ? saved.memoryShards : 0,
      timeCrystals: 0,
      talkedNPCs: new Set(),
      examinedLocations: new Set(),
      timeLeft: TOTAL_SECONDS,
      isRunning: true
    };

    Parchment.tickFade(runNum);
    document.getElementById('hud-run-num').textContent = runNum;
    document.getElementById('hud-shards').textContent = state.memoryShards;

    startTimer();
    Village.enter();
  }

  // ── 타이머 ──────────────────────────────────────
  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!state || !state.isRunning) return;
      state.timeLeft = Math.max(0, state.timeLeft - 1);
      updateTimerDisplay();
      if (state.timeLeft <= 0) {
        clearInterval(timerInterval);
        triggerMidnight();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(state.timeLeft / 60);
    const secs = state.timeLeft % 60;
    const str = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    const timerEl = document.getElementById('timer');
    const barEl = document.getElementById('timer-bar');
    if (timerEl) {
      timerEl.textContent = str;
      const isUrgent = state.timeLeft < 120;
      timerEl.classList.toggle('urgent', isUrgent);
      if (barEl) {
        barEl.style.width = (state.timeLeft / TOTAL_SECONDS * 100) + '%';
        barEl.classList.toggle('urgent', isUrgent);
      }
    }
  }

  // ── 자정 의식 ────────────────────────────────────
  function triggerMidnight() {
    if (!state) return;
    state.isRunning = false;
    UI.showScreen('screen-midnight');

    const gs = state;
    const crystals = gs.timeCrystals;
    const traitorId = NPCManager.getTraitorId(gs.npcRoles);
    const traitorNPC = DATA.npcs.find(n => n.id === traitorId);
    const suspects = DATA.npcs.map(n => ({
      id: n.id, name: n.name, icon: n.icon,
      talked: gs.talkedNPCs.has(n.id)
    }));

    document.getElementById('midnight-desc').textContent =
      `자정이 되었습니다. 기억 조각: ${gs.memoryShards}개 · 시간 결정: ${crystals}개`;

    const choices = document.getElementById('midnight-choices');
    choices.innerHTML = `
      <div class="midnight-choice" onclick="Game.openAccuseMenu()">
        <div class="mc-title">👁️ 고발 — 배신자를 지목한다</div>
        <div class="mc-desc">당신이 추리한 배신자를 고발합니다. 정답이면 큰 보상을, 오답이면 무고한 자가 희생됩니다.</div>
        <div class="mc-cost">비용: 시간 결정 1개 필요 (보유: ${crystals})</div>
      </div>
      <div class="midnight-choice" onclick="Game.sealChoice()">
        <div class="mc-title">⚔️ 봉인 — 보스와 결전</div>
        <div class="mc-desc">던전으로 돌아가 공허의 군주와 즉시 결전을 펼칩니다. 위험하지만 확실합니다.</div>
        <div class="mc-cost">비용: 없음 · 체력 현재 상태 그대로</div>
      </div>
      <div class="midnight-choice" onclick="Game.fleeChoice()">
        <div class="mc-title">🏃 도주 — 이번 회차를 포기한다</div>
        <div class="mc-desc">마을을 빠져나갑니다. 보상은 없지만 페널티도 없습니다.</div>
        <div class="mc-cost">기억 조각 +${Math.floor(gs.memoryShards * 0.1)} 유지</div>
      </div>
    `;
  }

  function openAccuseMenu() {
    const gs = state;
    if (gs.timeCrystals < 1) {
      alert('시간 결정이 부족합니다! 던전에서 보스를 처치하거나 탐험하세요.');
      return;
    }
    const suspects = DATA.npcs;
    UI.showModal(
      '👁️', '배신자를 지목하라',
      `<p style="margin-bottom:12px;">당신이 수집한 단서를 바탕으로 배신자를 고발하세요.</p>
       <div style="display:flex;flex-direction:column;gap:8px;">
         ${suspects.map(n => `
           <button class="btn-action" onclick="Game.accuse('${n.id}');UI.closeModal()">
             ${n.icon} ${n.name} ${gs.talkedNPCs.has(n.id) ? '(대화함)' : '(미접촉)'}
           </button>
         `).join('')}
       </div>`,
      [{ label: '취소', fn: 'UI.closeModal()' }]
    );
  }

  function accuse(npcId) {
    const gs = state;
    gs.timeCrystals = Math.max(0, gs.timeCrystals - 1);
    const traitorId = NPCManager.getTraitorId(gs.npcRoles);
    const accused = DATA.npcs.find(n => n.id === npcId);
    const traitor = DATA.npcs.find(n => n.id === traitorId);

    if (npcId === traitorId) {
      // 정답!
      Game.addShards(15);
      showResult('🎊', '정답! 배신자를 찾았다!',
        `${accused.icon} ${accused.name}이(가) 실제 배신자였습니다!\n마을에 평화가 찾아옵니다.`,
        [{ icon:'🔮', text: '기억 조각 +15', highlight:true },
         { icon:'✅', text:'마을 구원 달성' }]
      );
    } else {
      // 오답 — 무고한 자 희생
      Game.addShards(3);
      showResult('💔', '오답... 무고한 자가 희생되었다',
        `${accused.icon} ${accused.name}은(는) 배신자가 아니었습니다.\n진짜 배신자는 ${traitor.icon} ${traitor.name}이었습니다.`,
        [{ icon:'🔮', text: '기억 조각 +3 (감소)' },
         { icon:'⚠️', text: '다음 회차 적 공격력 +10%' }]
      );
    }
  }

  function sealChoice() {
    showResult('⚔️', '봉인의 결전으로!',
      '공허의 군주와 결전을 벌이러 던전으로 돌아갑니다.',
      []);
    setTimeout(() => {
      Dungeon.enter();
    }, 2000);
    return;
  }

  function fleeChoice() {
    showResult('🏃', '도주...',
      '이번 회차를 포기하고 마을을 빠져나갑니다.\n다음 회차에 더 잘 준비해 봅시다.',
      [{ icon:'📜', text: '기억 양피지는 유지됩니다' }]
    );
  }

  // ── 결과 화면 ────────────────────────────────────
  function showResult(icon, title, desc, rewards) {
    clearInterval(timerInterval);
    UI.showScreen('screen-result');
    document.getElementById('result-icon').textContent = icon;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-desc').textContent = desc;
    document.getElementById('result-rewards').innerHTML = rewards.map(r =>
      `<div class="result-reward-item">${r.icon} <span>${r.text}</span></div>`
    ).join('') || '<div class="result-reward-item">📜 기억은 남는다</div>';

    saveMeta();
  }

  // ── 다음 회차 ────────────────────────────────────
  function nextRun() {
    clearInterval(timerInterval);
    start();
  }

  // ── 플레이어 상태 관리 ────────────────────────────
  function updatePlayerHp(hp) {
    if (!state) return;
    state.player.hp = Math.max(0, hp);
    const pRatio = state.player.hp / state.player.maxHp * 100;
    const bar = document.getElementById('hp-bar');
    const txt = document.getElementById('hp-text');
    if (bar) bar.style.width = pRatio + '%';
    if (txt) txt.textContent = `${state.player.hp}/${state.player.maxHp}`;
    if (state.player.hp <= 0) {
      clearInterval(timerInterval);
      setTimeout(() => {
        showResult('💀', '사망', '체력이 0이 되었습니다. 기억은 남습니다.',
          [{ icon:'📜', text:'기억 양피지 유지' }]);
      }, 500);
    }
  }

  function healPlayer(amount) {
    if (!state) return;
    updatePlayerHp(state.player.hp + amount);
  }

  function damagePlayer(amount) {
    if (!state) return;
    updatePlayerHp(state.player.hp - amount);
  }

  function addShards(n) {
    if (!state) return;
    state.memoryShards += n;
    const el = document.getElementById('hud-shards');
    if (el) el.textContent = state.memoryShards;
  }

  function spendShards(n) {
    if (!state) return;
    state.memoryShards = Math.max(0, state.memoryShards - n);
    const el = document.getElementById('hud-shards');
    if (el) el.textContent = state.memoryShards;
  }

  function addTimeCrystal(n) {
    if (!state) return;
    state.timeCrystals += n;
  }

  function addRune(runeId) {
    if (!state) return;
    if (!state.ownedRunes.includes(runeId)) state.ownedRunes.push(runeId);
  }

  function equipRune(runeId, slotIdx) {
    if (!state) return;
    const rune = DATA.runes.find(r => r.id === runeId);
    if (rune) state.equippedRunes[slotIdx] = rune;
  }

  function unequipRune(slotIdx) {
    if (!state) return;
    state.equippedRunes[slotIdx] = null;
  }

  // ── 저장/불러오기 ─────────────────────────────────
  function saveMeta() {
    if (!state) return;
    localStorage.setItem('hh_save', JSON.stringify({
      runNum: state.runNum,
      memoryShards: state.memoryShards,
      ownedRunes: state.ownedRunes
    }));
  }

  function loadSave() {
    try {
      return JSON.parse(localStorage.getItem('hh_save'));
    } catch { return null; }
  }

  function resetSave() {
    localStorage.removeItem('hh_save');
    Parchment.clear();
    UI.showScreen('screen-title');
  }

  return {
    start, getState, nextRun,
    updatePlayerHp, healPlayer, damagePlayer,
    addShards, spendShards, addTimeCrystal,
    addRune, equipRune, unequipRune,
    triggerMidnight, openAccuseMenu, accuse,
    sealChoice, fleeChoice,
    resetSave
  };
})();
