// ===== combat.js — 전투 시스템 =====

const Combat = (() => {
  let state = null;
  let resolvePromise = null;

  // ── 전투 초기화 ─────────────────────────────────
  function startBattle(enemyId, onWin, onLose) {
    const enemyData = DATA.enemies.find(e => e.id === enemyId);
    if (!enemyData) return;

    const gs = Game.getState();
    state = {
      enemy: {
        ...enemyData,
        currentHp: enemyData.hp,
        maxHp: enemyData.hp,
        statuses: [],
        comboCounter: 0,
        phaseIndex: 0
      },
      player: {
        hp: gs.player.hp,
        maxHp: gs.player.maxHp,
        atk: gs.player.atk,
        def: gs.player.def,
        statuses: [],
        voidStacks: 0,
        comboCount: 0,
        hasRevived: false
      },
      turn: 1,
      onWin,
      onLose
    };

    renderCombat();
    UI.showScreen('screen-combat');
    addLog(`⚔️ ${enemyData.name}와(과) 전투 시작!`);
    renderActions();
  }

  // ── 플레이어 공격 ────────────────────────────────
  function playerAttack(isSkill = false) {
    if (!state) return;
    disableActions();

    const gs = Game.getState();
    let dmg = state.player.atk;
    const crits = [];
    const procs = [];
    let totalDmg = dmg;

    // 시간가속 룬 (첫 3턴 2배)
    const hasteRune = gs.equippedRunes.find(r => r && r.effect === 'haste');
    if (hasteRune && state.turn <= hasteRune.duration) totalDmg *= hasteRune.value;

    // void 스택 누적 피해
    const voidStack = gs.equippedRunes.find(r => r && r.effect === 'stack');
    if (voidStack) {
      totalDmg *= (1 + voidStack.value * state.player.voidStacks);
      if (state.player.voidStacks < (voidStack.maxStack || 10)) state.player.voidStacks++;
    }

    // 결빙 보너스
    const iceFreeze = gs.equippedRunes.find(r => r && r.effect === 'freeze');
    if (iceFreeze && state.enemy.statuses.some(s => s.type === 'chill')) {
      totalDmg *= (1 + iceFreeze.value);
      procs.push('❄️+40%');
    }

    // 공허 (방어 무시)
    const pierceRune = gs.equippedRunes.find(r => r && r.effect === 'pierce');
    let ignoreDef = false;
    if (pierceRune && Math.random() < pierceRune.value) {
      ignoreDef = true;
      procs.push('🌑방어무시');
    }

    // 치명타 (15% 기본)
    const isCrit = Math.random() < 0.15;
    if (isCrit) { totalDmg *= 2; crits.push('💥치명타'); }

    // 방어 적용
    const effectiveDef = ignoreDef ? 0 : state.enemy.def;
    const finalDmg = Math.max(1, Math.floor(totalDmg - effectiveDef));

    state.enemy.currentHp -= finalDmg;
    state.player.comboCount++;

    showDmgNum(finalDmg, true, isCrit);
    animateCombat(isCrit ? '💥' : '⚔️');

    const msgParts = [`🗡️ ${finalDmg} 피해`];
    if (crits.length) msgParts.push(...crits);
    if (procs.length) msgParts.push(...procs);
    addLog(msgParts.join(' · '));

    // 룬 온히트 효과 적용
    applyOnHitRunes(gs, finalDmg);

    // 충전 룬 (3콤보)
    const chargeRune = gs.equippedRunes.find(r => r && r.effect === 'charge');
    if (chargeRune && state.player.comboCount > 0 && state.player.comboCount % chargeRune.comboReq === 0) {
      addLog('⚡ 충전 발동! 다음 공격 +100%');
      state.player.chargeReady = true;
    }

    // 흡혈
    const lifeRune = gs.equippedRunes.find(r => r && r.effect === 'lifesteal');
    if (lifeRune) {
      const heal = Math.floor(finalDmg * lifeRune.value);
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
      if (heal > 0) { showDmgNum(heal, false, false, true); addLog(`🩸 흡혈 +${heal} HP`); }
    }

    // 보스 페이즈 체크
    checkBossPhase();

    setTimeout(() => {
      if (state.enemy.currentHp <= 0) {
        enemyDead();
      } else {
        setTimeout(() => enemyTurn(), 500);
      }
    }, 400);
  }

  function playerSkill() {
    const gs = Game.getState();
    const chainRune = gs.equippedRunes.find(r => r && r.effect === 'staminaRegen');
    if (chainRune) {
      addLog('🔔 울림 발동! 스태미나 회복');
    }
    // 스킬 = 강화 공격 (1.5배)
    const dmg = Math.floor(state.player.atk * 1.5);
    state.enemy.currentHp -= Math.max(1, dmg - state.enemy.def);
    showDmgNum(Math.max(1, dmg - state.enemy.def), true);
    animateCombat('✨');
    addLog(`✨ 강격! ${Math.max(1, dmg - state.enemy.def)} 피해`);
    applyOnHitRunes(gs, dmg);
    setTimeout(() => {
      if (state.enemy.currentHp <= 0) enemyDead();
      else setTimeout(() => enemyTurn(), 500);
    }, 400);
  }

  // ── 룬 온히트 효과 ────────────────────────────────
  function applyOnHitRunes(gs, dmg) {
    gs.equippedRunes.forEach(rune => {
      if (!rune) return;
      if (rune.trigger === 'onHit') {
        if (rune.effect === 'burn') {
          const existing = state.enemy.statuses.find(s => s.type === 'burn');
          if (!existing) {
            state.enemy.statuses.push({ type:'burn', dmgPercent: rune.value, duration: rune.duration || 3 });
            addLog(`🔥 화상 적용! ${rune.duration}턴`);
          }
        }
        if (rune.effect === 'chill' && Math.random() < rune.value) {
          if (!state.enemy.statuses.find(s => s.type === 'chill')) {
            state.enemy.statuses.push({ type:'chill', duration: 2 });
            addLog('❄️ 결빙 적용!');
          }
        }
        if (rune.effect === 'stun' && Math.random() < rune.value) {
          if (!state.enemy.statuses.find(s => s.type === 'stun')) {
            state.enemy.statuses.push({ type:'stun', duration: 1 });
            addLog('🪨 스턴!');
          }
        }
      }
    });
    renderCombat();
  }

  // ── 적 처치 ───────────────────────────────────────
  function enemyDead() {
    state.enemy.currentHp = 0;
    renderCombat();
    animateCombat('🎉');
    addLog(`✅ ${state.enemy.name} 처치!`);

    // 처치 룬 효과
    const gs = Game.getState();
    gs.equippedRunes.forEach(rune => {
      if (!rune) return;
      if (rune.trigger === 'onKill') {
        if (rune.effect === 'aoe') addLog(`💥 폭발 연쇄! (다음 적 예비 피해)`);
        if (rune.effect === 'chain') addLog(`⛓️ 연쇄 번개!`);
      }
    });

    // 보스 룬
    gs.equippedRunes.forEach(rune => {
      if (rune && rune.effect === 'timeCrystal' && state.enemy.isBoss) {
        Game.addTimeCrystal(1);
        addLog('⏳ 시간 결정 획득!');
      }
    });

    setTimeout(() => {
      // HP 동기화
      Game.updatePlayerHp(state.player.hp);
      if (state.onWin) state.onWin(state.enemy);
    }, 600);
  }

  // ── 적 턴 ──────────────────────────────────────────
  function enemyTurn() {
    if (!state) return;

    // 스턴 체크
    const stun = state.enemy.statuses.find(s => s.type === 'stun');
    if (stun) {
      addLog('🪨 적이 스턴 상태! 행동 불가');
      stun.duration--;
      if (stun.duration <= 0) state.enemy.statuses = state.enemy.statuses.filter(s => s.type !== 'stun');
      processStatusTick();
      renderCombat();
      enableActions();
      return;
    }

    // 결빙 (속도 감소 — 50% 확률로 공격 스킵)
    const chill = state.enemy.statuses.find(s => s.type === 'chill');
    if (chill && Math.random() < 0.5) {
      addLog('❄️ 결빙 상태 — 적 행동 지연!');
      chill.duration--;
      if (chill.duration <= 0) state.enemy.statuses = state.enemy.statuses.filter(s => s.type !== 'chill');
      processStatusTick();
      renderCombat();
      enableActions();
      return;
    }

    // 적 공격
    const gs = Game.getState();
    let enemyAtk = state.enemy.atk;

    // 회피 (wind_01)
    const evasionRune = gs.equippedRunes.find(r => r && r.effect === 'evasion');
    if (evasionRune && Math.random() < evasionRune.value) {
      addLog('🌪️ 회피!');
      processStatusTick();
      enableActions();
      return;
    }

    // 방패 룬 (ice_03)
    const shieldRune = gs.equippedRunes.find(r => r && r.effect === 'shield');
    if (shieldRune) enemyAtk *= (1 - shieldRune.value);

    const dmgToPlayer = Math.max(1, Math.floor(enemyAtk - state.player.def));
    state.player.hp -= dmgToPlayer;
    showDmgNum(dmgToPlayer, false);
    addLog(`💢 ${state.enemy.name}의 공격! ${dmgToPlayer} 피해`);

    // 부활 룬
    if (state.player.hp <= 0) {
      const reviveRune = gs.equippedRunes.find(r => r && r.effect === 'revive');
      if (reviveRune && !state.player.hasRevived) {
        state.player.hp = Math.floor(state.player.maxHp * reviveRune.value);
        state.player.hasRevived = true;
        animateCombat('✨');
        addLog('✨ 부활! HP 30% 회복!');
      }
    }

    processStatusTick();
    renderCombat();

    if (state.player.hp <= 0) {
      state.player.hp = 0;
      addLog('💀 사망...');
      animateCombat('💀');
      Game.updatePlayerHp(0);
      setTimeout(() => { if (state.onLose) state.onLose(); }, 800);
    } else {
      state.turn++;
      enableActions();
    }
  }

  // ── 상태이상 틱 ──────────────────────────────────
  function processStatusTick() {
    const gs = Game.getState();
    // 재생 룬
    const regenRune = gs.equippedRunes.find(r => r && r.effect === 'regen');
    if (regenRune) {
      const heal = Math.floor(state.player.maxHp * regenRune.value);
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
      if (heal > 0) addLog(`💚 재생 +${heal} HP`);
    }
    // 화상 틱
    state.enemy.statuses.forEach(s => {
      if (s.type === 'burn') {
        const burnDmg = Math.max(1, Math.floor(state.player.atk * s.dmgPercent));
        state.enemy.currentHp -= burnDmg;
        addLog(`🔥 화상 피해 ${burnDmg}`);
        s.duration--;
      }
    });
    state.enemy.statuses = state.enemy.statuses.filter(s => s.duration > 0);
    if (state.enemy.currentHp <= 0 && state.enemy.currentHp !== undefined) {
      // 화상으로 처치
      setTimeout(() => enemyDead(), 100);
    }
  }

  // ── 보스 페이즈 ───────────────────────────────────
  function checkBossPhase() {
    if (!state.enemy.phases) return;
    const hpRatio = state.enemy.currentHp / state.enemy.maxHp;
    const phase = state.enemy.phases[state.enemy.phaseIndex];
    if (phase && hpRatio <= phase.hpThreshold) {
      state.enemy.phaseIndex++;
      addLog(`⚠️ ${phase.message}`);
      if (phase.atkBonus) state.enemy.atk = Math.floor(state.enemy.atk * (1 + phase.atkBonus));
      animateCombat('⚠️');
    }
  }

  // ── 도주 ─────────────────────────────────────────
  function playerFlee() {
    addLog('🏃 도주!');
    animateCombat('💨');
    Game.updatePlayerHp(state.player.hp);
    setTimeout(() => {
      state = null;
      Dungeon.returnFromCombat(false);
    }, 500);
  }

  // ── UI 렌더 ──────────────────────────────────────
  function renderCombat() {
    if (!state) return;
    // 적 HP
    const eRatio = Math.max(0, state.enemy.currentHp / state.enemy.maxHp) * 100;
    document.getElementById('enemy-hp-bar').style.width = eRatio + '%';
    document.getElementById('enemy-hp-text').textContent = `${Math.max(0,state.enemy.currentHp)}/${state.enemy.maxHp}`;
    document.getElementById('enemy-name').textContent = state.enemy.name;
    document.getElementById('enemy-sprite').textContent = state.enemy.icon;
    // 상태이상
    document.getElementById('enemy-status').innerHTML = state.enemy.statuses.map(s =>
      `<span class="status-badge status-${s.type}">${s.type==='burn'?'🔥화상':s.type==='chill'?'❄️결빙':s.type==='stun'?'🪨스턴':'?'} (${s.duration}턴)</span>`
    ).join('');
    // 플레이어 HP
    const pRatio = Math.max(0, state.player.hp / state.player.maxHp) * 100;
    document.getElementById('player-hp-bar-c').style.width = pRatio + '%';
    document.getElementById('player-hp-text-c').textContent = `${Math.max(0,state.player.hp)}/${state.player.maxHp}`;
    // 장착 룬
    const gs = Game.getState();
    document.getElementById('equipped-runes').innerHTML =
      gs.equippedRunes.filter(Boolean).map(r => `<span title="${r.name}">${r.icon}</span>`).join(' ');
  }

  function renderActions() {
    document.getElementById('combat-actions').innerHTML = `
      <button class="btn-action" onclick="Combat.playerAttack()">⚔️ 공격</button>
      <button class="btn-action" onclick="Combat.playerSkill()">✨ 강격</button>
      <button class="btn-action danger" onclick="Combat.playerFlee()">💨 도주</button>
    `;
  }

  function disableActions() {
    document.querySelectorAll('#combat-actions .btn-action').forEach(b => b.disabled = true);
  }
  function enableActions() {
    document.querySelectorAll('#combat-actions .btn-action').forEach(b => b.disabled = false);
  }

  function addLog(msg) {
    const box = document.getElementById('combat-log-box');
    if (!box) return;
    box.innerHTML += `<div>${msg}</div>`;
    box.scrollTop = box.scrollHeight;
  }

  function animateCombat(emoji) {
    const el = document.getElementById('combat-anim');
    if (!el) return;
    el.textContent = emoji;
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
  }

  function showDmgNum(dmg, isEnemy, isCrit = false, isHeal = false) {
    const el = document.createElement('div');
    el.className = `dmg-num ${isHeal ? 'dmg-heal' : isEnemy ? (isCrit ? 'dmg-crit' : 'dmg-enemy') : 'dmg-player'}`;
    el.textContent = isHeal ? `+${dmg}` : `-${dmg}`;
    const baseEl = document.getElementById(isEnemy ? 'enemy-area' : 'player-area');
    if (!baseEl) return;
    const rect = baseEl.getBoundingClientRect();
    el.style.left = (rect.left + rect.width / 2 - 20 + (Math.random()-0.5)*40) + 'px';
    el.style.top = (rect.top + 20) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  return { startBattle, playerAttack, playerSkill, playerFlee, renderCombat };
})();
