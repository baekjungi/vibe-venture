// ===== dungeon.js — 던전 & 룸 시스템 =====

const Dungeon = (() => {
  let dungeonState = null;

  const FLOOR_LAYOUTS = [
    // 1층: 로봇 & 일반 혼합
    ['combat_s','robot_room','treasure','shrine','lore','combat_m'],
    // 2층: 기계 경비 + 보스
    ['mech_room','trap','lore','robot_room','shrine','boss_room']
  ];

  function enter() {
    const gs = Game.getState();
    dungeonState = {
      floor: 1,
      rooms: buildFloor(0),
      currentRoomIndex: null,
      cleared: new Set()
    };
    document.getElementById('dungeon-floor').textContent = dungeonState.floor;
    renderDungeon();
    UI.showScreen('screen-dungeon');
    setInfo('🌫️ 안개 던전에 들어왔습니다. 방을 탐험하세요.');
  }

  function buildFloor(floorIdx) {
    const layout = FLOOR_LAYOUTS[floorIdx] || FLOOR_LAYOUTS[0];
    return layout.map(roomId => {
      const template = DATA.rooms.find(r => r.id === roomId);
      return { ...template, instanceId: roomId + '_' + Math.random().toString(36).slice(2) };
    });
  }

  function renderDungeon() {
    const grid = document.getElementById('dungeon-room');
    if (!grid) return;
    grid.innerHTML = dungeonState.rooms.map((room, idx) => {
      const isCleared = dungeonState.cleared.has(room.instanceId);
      const isBoss = room.type === 'boss';
      return `
        <div class="room-card ${isCleared ? 'cleared' : ''}" onclick="Dungeon.enterRoom(${idx})">
          <div class="rc-icon">${room.icon}</div>
          <div class="rc-name">${room.name}</div>
          <div class="rc-desc">${isCleared ? '✅ 완료' : room.desc.slice(0,20)+'...'}</div>
        </div>
      `;
    }).join('');
  }

  function enterRoom(idx) {
    const room = dungeonState.rooms[idx];
    if (!room) return;
    dungeonState.currentRoomIndex = idx;
    document.getElementById('room-info').textContent = `룸 ${idx+1}`;

    if (dungeonState.cleared.has(room.instanceId) && room.type !== 'boss') {
      setInfo('이미 탐험한 방입니다.');
      setDungeonActions([{ label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }]);
      return;
    }

    switch (room.type) {
      case 'empty':
        setInfo('📭 ' + room.desc);
        clearRoom(room);
        setDungeonActions([{ label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }]);
        break;

      case 'treasure':
        setInfo('💎 ' + room.desc);
        setDungeonActions([
          { label: '📦 상자 열기', fn: 'Dungeon.openTreasure()' },
          { label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }
        ]);
        break;

      case 'heal':
        setInfo('🏛️ ' + room.desc);
        setDungeonActions([
          { label: '🙏 제단에 기도 (+30 HP)', fn: 'Dungeon.useShrine()' },
          { label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }
        ]);
        break;

      case 'trap':
        setInfo('⚠️ ' + room.desc + ' 룬 문양을 밟으면 피해를 입는다!');
        setDungeonActions([
          { label: '😤 그냥 밟는다 (-15 HP)', fn: 'Dungeon.triggerTrap()' },
          { label: '🤔 우회한다', fn: 'Dungeon.dodgeTrap()' }
        ]);
        break;

      case 'lore':
        setInfo('📖 ' + room.desc);
        setDungeonActions([
          { label: '📖 문자 해독 (+단서)', fn: 'Dungeon.readLore()' },
          { label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }
        ]);
        break;

      case 'combat':
        const introMsg = room.forceEnemy
          ? (DATA.enemies.find(e => e.id === room.forceEnemy)?.intro || '⚔️ 적이 나타났다!')
          : '⚔️ 적이 나타났다!';
        setInfo(introMsg);
        clearRoom(room);
        const enemyId = room.forceEnemy || (() => {
          const enemies = getEnemiesForLevel(room.enemyLevel || 1);
          return enemies[Math.floor(Math.random() * enemies.length)];
        })();
        setTimeout(() => {
          Combat.startBattle(
            enemyId,
            (enemy) => { returnFromCombat(true, enemy); },
            () => { returnFromCombat(false); }
          );
        }, 300);
        break;

      case 'boss':
        setInfo('💀 보스의 방 — 공허의 군주가 기다린다!');
        setDungeonActions([
          { label: '⚔️ 보스에게 도전!', fn: 'Dungeon.fightBoss()' },
          { label: '🔙 물러간다', fn: 'Dungeon.leaveRoom()' }
        ]);
        break;
    }
  }

  function getEnemiesForLevel(level) {
    return DATA.enemies.filter(e => e.level === level && !e.isBoss).map(e => e.id);
  }

  function openTreasure() {
    const gs = Game.getState();
    const unowned = DATA.runes.filter(r => !gs.ownedRunes.includes(r.id));
    if (unowned.length === 0) {
      Game.addShards(5);
      clearRoom(dungeonState.rooms[dungeonState.currentRoomIndex]);
      setInfo('🔷 이미 모든 룬을 보유 중입니다. 기억 조각 +5 획득!');
      setDungeonActions([{ label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }]);
      return;
    }
    const rune = unowned[Math.floor(Math.random() * unowned.length)];
    Game.addRune(rune.id);
    clearRoom(dungeonState.rooms[dungeonState.currentRoomIndex]);
    setInfo(`✨ 룬 획득: ${rune.icon} ${rune.name}! — ${rune.desc}`);
    setDungeonActions([{ label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }]);
  }

  function useShrine() {
    const gs = Game.getState();
    const healAmt = Math.floor(gs.player.maxHp * 0.3);
    Game.healPlayer(healAmt);
    clearRoom(dungeonState.rooms[dungeonState.currentRoomIndex]);
    setInfo(`💚 HP +${healAmt} 회복! (현재 HP: ${Game.getState().player.hp}/${gs.player.maxHp})`);
    setDungeonActions([{ label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }]);
  }

  function triggerTrap() {
    Game.damagePlayer(15);
    clearRoom(dungeonState.rooms[dungeonState.currentRoomIndex]);
    setInfo('💥 함정! -15 HP');
    setDungeonActions([{ label: '😣 돌아가기', fn: 'Dungeon.leaveRoom()' }]);
  }

  function dodgeTrap() {
    clearRoom(dungeonState.rooms[dungeonState.currentRoomIndex]);
    setInfo('🌪️ 교묘하게 우회했다. 피해 없음.');
    setDungeonActions([{ label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }]);
  }

  function readLore() {
    const phrase = DATA.lorePhrases[Math.floor(Math.random() * DATA.lorePhrases.length)];
    Game.addShards(2);
    Parchment.addEntry(phrase, '던전단서', Game.getState().runNum);
    clearRoom(dungeonState.rooms[dungeonState.currentRoomIndex]);
    setInfo(`📖 단서 발견: "${phrase}" — 기억 조각 +2`);
    setDungeonActions([{ label: '🔙 돌아가기', fn: 'Dungeon.leaveRoom()' }]);
  }

  function fightBoss() {
    setInfo('💀 공허의 군주와 전투 시작!');
    dungeonState.currentRoomIndex = dungeonState.rooms.findIndex(r => r.type === 'boss');
    Combat.startBattle(
      'boss_hollow',
      (enemy) => {
        Game.addShards(enemy.shards || 10);
        Game.addTimeCrystal(2);
        clearRoom(dungeonState.rooms.find(r => r.type === 'boss'));
        UI.showScreen('screen-dungeon');
        setInfo('🏆 보스 처치! 시간 결정 +2, 기억 조각 +10 획득. 마을로 돌아가세요.');
        setDungeonActions([{ label: '🏘️ 마을로 귀환', fn: 'Dungeon.exitDungeon()' }]);
      },
      () => {
        UI.showScreen('screen-dungeon');
        setInfo('💀 쓰러졌다... 마을로 돌아가야 한다.');
        setDungeonActions([{ label: '🏘️ 마을로 귀환', fn: 'Dungeon.exitDungeon()' }]);
      }
    );
  }

  function returnFromCombat(won, enemy) {
    UI.showScreen('screen-dungeon');
    renderDungeon();
    if (won && enemy) {
      Game.addShards(enemy.shards || 1);
      setInfo(`✅ 전투 승리! 기억 조각 +${enemy.shards || 1}`);
    } else {
      setInfo('💀 전투에서 패배... 체력이 1로 회복됩니다.');
      Game.healPlayer(1);
    }
    setDungeonActions([{ label: '🔙 던전 탐험 계속', fn: '' }]);
  }

  function leaveRoom() {
    renderDungeon();
    setInfo('방을 선택하여 탐험하세요.');
    setDungeonActions([{ label: '🏘️ 마을로 귀환', fn: 'Dungeon.exitDungeon()' }]);
  }

  function exitDungeon() {
    dungeonState = null;
    Village.enter();
  }

  function clearRoom(room) {
    if (room) dungeonState.cleared.add(room.instanceId);
    renderDungeon();
  }

  function setInfo(msg) {
    const el = document.getElementById('combat-log');
    if (el) el.textContent = msg;
  }

  function setDungeonActions(actions) {
    const el = document.getElementById('dungeon-actions');
    if (!el) return;
    el.innerHTML = actions.map(a =>
      `<button class="btn-action" onclick="${a.fn}">${a.label}</button>`
    ).join('');
  }

  return { enter, enterRoom, openTreasure, useShrine, triggerTrap, dodgeTrap, readLore, fightBoss, leaveRoom, exitDungeon, returnFromCombat };
})();
