// ===== npc.js — NPC & Village 시스템 =====

const Village = (() => {
  function enter() {
    renderVillage();
    UI.showScreen('screen-village');
    setLocationInfo('🏘️ Hollow 마을에 돌아왔습니다. NPC에게 말을 걸거나 장소를 조사하세요.');
    setActions([
      { label: '🌫️ 안개 던전 입장', fn: 'Dungeon.enter()' },
      { label: '📜 기억 양피지', fn: 'UI.showParchment()' },
      { label: '🔷 룬 관리', fn: 'UI.showInventory()' }
    ]);
  }

  function renderVillage() {
    const grid = document.getElementById('village-grid');
    if (!grid) return;
    const gs = Game.getState();

    grid.innerHTML = DATA.locations.map(loc => {
      const npc = loc.npcId ? DATA.npcs.find(n => n.id === loc.npcId) : null;
      const talked = gs.talkedNPCs.has(loc.npcId || loc.id);
      const hasClue = !talked && npc;
      return `
        <div class="village-card ${hasClue ? 'has-clue' : ''}" onclick="Village.visitLocation('${loc.id}')">
          <div class="vc-icon">${loc.icon}</div>
          <div class="vc-name">${loc.name}</div>
          ${npc ? `<div class="vc-sub">${npc.name}</div>
            <div class="vc-role-badge role-${talked ? 'ally' : 'unknown'}">
              ${talked ? '대화함' : '?'}
            </div>` : '<div class="vc-sub">탐험 가능</div>'}
        </div>
      `;
    }).join('');
  }

  function visitLocation(locationId) {
    const loc = DATA.locations.find(l => l.id === locationId);
    if (!loc) return;
    const npc = loc.npcId ? DATA.npcs.find(n => n.id === loc.npcId) : null;
    const gs = Game.getState();

    setLocationInfo(`📍 ${loc.name}${npc ? ` — ${npc.name}` : ''}`);

    const actions = [];

    if (npc) {
      actions.push({ label: `💬 ${npc.name}에게 말 걸기`, fn: `Village.talkToNPC('${npc.id}')` });
      actions.push({ label: `🔍 주변 조사`, fn: `Village.examineLocation('${loc.id}')` });
    } else {
      actions.push({ label: `🔍 조사하기`, fn: `Village.examineLocation('${loc.id}')` });
    }
    actions.push({ label: '🔙 광장으로', fn: 'Village.enter()' });

    setActions(actions);
  }

  function talkToNPC(npcId) {
    const gs = Game.getState();
    const npc = DATA.npcs.find(n => n.id === npcId);
    if (!npc) return;

    const role = gs.npcRoles[npcId] || 'ally';
    const dialogues = npc.dialogues[role] || npc.dialogues['ally'];
    const line = dialogues[Math.floor(Math.random() * dialogues.length)];

    // 처음 대화면 단서 기록
    const firstTalk = !gs.talkedNPCs.has(npcId);
    if (firstTalk) {
      gs.talkedNPCs.add(npcId);
      Game.addShards(1);
      Parchment.addEntry(npc.clueOnTalk, npc.clueTag, gs.runNum);
    }

    UI.showModal(
      npc.icon,
      npc.name,
      `<div class="npc-dialogue">「${line}」</div>
       ${firstTalk ? `<p style="color:var(--accent3);margin-top:10px;font-size:0.82rem;">📜 단서가 양피지에 기록되었습니다. 🔮 +1</p>` : ''}`,
      [
        { label: '계속 대화', fn: `Village.talkToNPC('${npcId}')` },
        { label: '닫기', fn: 'UI.closeModal()' }
      ]
    );

    renderVillage();
    updateHUD();
  }

  function examineLocation(locationId) {
    const loc = DATA.locations.find(l => l.id === locationId);
    if (!loc) return;
    const gs = Game.getState();
    const npc = loc.npcId ? DATA.npcs.find(n => n.id === loc.npcId) : null;
    const examineText = npc ? npc.examineClue : loc.examine;

    const alreadyExamined = gs.examinedLocations.has(locationId);
    let bonus = '';
    if (!alreadyExamined) {
      gs.examinedLocations.add(locationId);
      Game.addShards(1);
      Parchment.addEntry(examineText, loc.name, gs.runNum);
      bonus = '<p style="color:var(--accent3);font-size:0.82rem;margin-top:8px;">📜 단서 기록됨. 🔮 +1</p>';
    }

    UI.showModal(
      '🔍', `${loc.name} 조사`,
      `<p>${examineText}</p>${bonus}`,
      [{ label: '닫기', fn: 'UI.closeModal()' }]
    );
    renderVillage();
    updateHUD();
  }

  function updateHUD() {
    const gs = Game.getState();
    const el = document.getElementById('hud-shards');
    if (el) el.textContent = gs.memoryShards;
  }

  function setLocationInfo(msg) {
    const el = document.getElementById('location-info');
    if (el) el.innerHTML = `<p>${msg}</p>`;
  }

  function setActions(actions) {
    const el = document.getElementById('action-buttons');
    if (!el) return;
    el.innerHTML = actions.map(a =>
      `<button class="btn-action" onclick="${a.fn}">${a.label}</button>`
    ).join('');
  }

  return { enter, visitLocation, talkToNPC, examineLocation, renderVillage };
})();

// ── NPC 역할 할당기 ──────────────────────────────────────────────
const NPCManager = {
  assignRoles(runNum, parchment) {
    const roles = {};
    const npcIds = DATA.npcs.map(n => n.id);
    const shuffled = [...npcIds].sort(() => Math.random() - 0.5);

    // 1명은 배신자, 2명은 희생자, 나머지는 협력자
    shuffled.forEach((id, i) => {
      if (i === 0) roles[id] = 'traitor';
      else if (i <= 2) roles[id] = 'victim';
      else roles[id] = 'ally';
    });

    return roles;
  },

  getTraitorId(roles) {
    return Object.keys(roles).find(id => roles[id] === 'traitor');
  }
};
