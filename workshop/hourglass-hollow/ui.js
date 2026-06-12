// ===== ui.js — UI 시스템 =====

const UI = (() => {
  let prevScreen = null;
  let runeSelectingSlot = null;

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
    });
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'flex';
      requestAnimationFrame(() => el.classList.add('active'));
    }
  }

  function showModal(icon, title, body, actions = []) {
    document.getElementById('modal-icon').textContent = icon;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-actions').innerHTML = actions.map(a =>
      `<button class="btn-action" onclick="${a.fn}">${a.label}</button>`
    ).join('');
    document.getElementById('modal-overlay').classList.add('active');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
  }

  function showParchment() {
    const entries = Parchment.getAll();
    const container = document.getElementById('parchment-entries');
    if (!container) return;
    if (entries.length === 0) {
      container.innerHTML = '<div class="parchment-empty">아직 아무 단서도 없습니다.</div>';
    } else {
      container.innerHTML = entries.map(e => `
        <div class="parchment-entry ${e.faded ? 'faded' : ''} ${e.locked ? 'locked' : ''}">
          <div class="pe-run">제 ${e.runNum}회차 · ${e.tag}</div>
          <div class="pe-text">${e.text}</div>
          ${e.locked
            ? '<span class="pe-tag locked-tag">🔒 확정됨</span>'
            : e.faded
              ? '<span class="pe-tag">바래짐</span>'
              : `<span class="pe-tag" onclick="UI.tryLockEntry(${e.id})" style="cursor:pointer" title="10 기억 조각 소모">🔒 확정 (10🔮)</span>`
          }
        </div>
      `).join('');
    }
    showScreen('screen-parchment-full');
  }

  function tryLockEntry(id) {
    const gs = Game.getState();
    if (gs.memoryShards < 10) {
      alert('기억 조각이 부족합니다! (필요: 10개)');
      return;
    }
    const ok = Parchment.lockEntry(id, gs.memoryShards);
    if (ok) {
      Game.spendShards(10);
      showParchment();
    }
  }

  function closeParchment() {
    showScreen('screen-village');
    Village.enter();
  }

  function showInventory() {
    const gs = Game.getState();
    // 슬롯 UI
    const slotsEl = document.getElementById('rune-slots-ui');
    slotsEl.innerHTML = [0,1,2].map(i => {
      const rune = gs.equippedRunes[i];
      return `
        <div class="rune-slot ${rune ? 'filled' : ''}" onclick="UI.selectSlot(${i})">
          <div class="rs-icon">${rune ? rune.icon : '＋'}</div>
          <div class="rs-name">${rune ? rune.name : `슬롯 ${i+1}`}</div>
        </div>
      `;
    }).join('');

    // 보유 룬 목록
    const listEl = document.getElementById('rune-list-ui');
    const owned = DATA.runes.filter(r => gs.ownedRunes.includes(r.id));
    if (owned.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-dim);font-size:0.82rem;">보유한 룬이 없습니다.</p>';
    } else {
      listEl.innerHTML = owned.map(r => {
        const isEquipped = gs.equippedRunes.some(e => e && e.id === r.id);
        return `
          <div class="rune-item rune-${r.type} ${isEquipped ? 'equipped' : ''}" onclick="UI.equipRune('${r.id}')">
            <div class="ri-icon">${r.icon}</div>
            <div class="ri-name">${r.name}</div>
            <div class="ri-desc">${r.desc}</div>
            <span class="ri-badge">${r.type.toUpperCase()}</span>
            ${isEquipped ? '<div style="font-size:0.65rem;color:var(--accent3);margin-top:3px;">장착됨</div>' : ''}
          </div>
        `;
      }).join('');
    }

    document.getElementById('rune-overlay').classList.add('active');
  }

  function closeRuneModal() {
    document.getElementById('rune-overlay').classList.remove('active');
    runeSelectingSlot = null;
  }

  function selectSlot(slotIdx) {
    runeSelectingSlot = slotIdx;
    // 슬롯에 이미 장착된 룬이 있으면 해제
    const gs = Game.getState();
    if (gs.equippedRunes[slotIdx]) {
      Game.unequipRune(slotIdx);
      showInventory();
    }
  }

  function equipRune(runeId) {
    const gs = Game.getState();
    if (gs.equippedRunes.some(e => e && e.id === runeId)) {
      // 이미 장착됨 — 해제
      const idx = gs.equippedRunes.findIndex(e => e && e.id === runeId);
      Game.unequipRune(idx);
    } else {
      // 비어있는 슬롯 찾기
      const emptyIdx = runeSelectingSlot !== null ? runeSelectingSlot :
                       gs.equippedRunes.findIndex(e => !e);
      if (emptyIdx === -1) {
        alert('슬롯이 꽉 찼습니다! 기존 룬을 먼저 해제하세요.');
        return;
      }
      Game.equipRune(runeId, emptyIdx);
    }
    runeSelectingSlot = null;
    showInventory();
  }

  return {
    showScreen, showModal, closeModal,
    showParchment, tryLockEntry, closeParchment,
    showInventory, closeRuneModal, selectSlot, equipRune
  };
})();
