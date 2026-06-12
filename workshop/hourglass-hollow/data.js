// ===== data.js — 게임 마스터 데이터 =====

const DATA = {

  // ── NPC 7명 ──────────────────────────────────────────────────
  npcs: [
    {
      id: 'blacksmith', icon: '⚒️', name: '대장장이 볼던', location: 'smithy',
      locationName: '대장간',
      clueOnTalk: '볼던의 손에 이상한 검은 그을음이 묻어 있다. 불꽃 냄새가 아닌 다른 냄새다.',
      clueTag: '볼던',
      dialogues: {
        ally:    ["\"어서오게, 젊은이. 무기를 손봐줄까?\"", "\"오늘 밤은 유독 어둡군... 조심하게.\""],
        traitor: ["\"...흠, 자넨 너무 많이 알고 있어.\"", "\"내가 무슨 일을 하는지 묻지 마시게.\""],
        victim:  ["\"제발... 저를 믿어주세요. 전 아무것도 몰랐어요.\"", "\"그 사람이 제 가족을 위협했습니다...\""]
      },
      examineClue: '대장간 한쪽 구석에 이상한 문양이 새겨진 단도가 숨겨져 있다.'
    },
    {
      id: 'innkeeper', icon: '🍺', name: '여관주인 마르다', location: 'inn',
      locationName: '여관',
      clueOnTalk: '마르다는 눈을 맞추지 않으려 한다. 카운터 아래에 편지가 있다.',
      clueTag: '마르다',
      dialogues: {
        ally:    ["\"오늘 방이 있어요. 푹 쉬어가세요.\"", "\"101호 손님이 사흘째 안 나오네요... 걱정돼요.\""],
        traitor: ["\"당신, 뭘 찾고 있어요?\"", "\"너무 캐묻지 마세요. 다칠 수 있어요.\""],
        victim:  ["\"저는 그냥 살고 싶었을 뿐이에요.\"", "\"그들이 매달 돈을 가져갔어요. 거부하면...\""]
      },
      examineClue: '101호 방에서 암호문이 적힌 양피지가 발견된다. \"자정 이후, 광장.\"'
    },
    {
      id: 'priest', icon: '✝️', name: '사제 엘리온', location: 'chapel',
      locationName: '예배당',
      clueOnTalk: '엘리온은 기도서를 꼭 쥐고 있다. 기도서 페이지에 빨간 밑줄이 쳐져 있다.',
      clueTag: '엘리온',
      dialogues: {
        ally:    ["\"신이시여 이 마을을 지켜주소서...\"", "\"당신이 진실을 찾는 자라면, 저를 믿어주시오.\""],
        traitor: ["\"제가 하는 일은 신의 뜻입니다.\"", "\"의심하는 자는 심판받습니다.\""],
        victim:  ["\"용서해 주세요... 저는 선택의 여지가 없었습니다.\"", "\"그 의식만 멈출 수 있다면...\""]
      },
      examineClue: '제단 아래 비밀 서랍에서 검은 봉인이 찍힌 계약서가 나온다.'
    },
    {
      id: 'herbalist', icon: '🌿', name: '약초상 세이라', location: 'shop',
      locationName: '약초 가게',
      clueOnTalk: '세이라의 가게에는 독초와 치료약이 뒤섞여 있다. 구분이 안 된다.',
      clueTag: '세이라',
      dialogues: {
        ally:    ["\"이 허브는 상처를 낫게 해요. 가져가요.\"", "\"밤에 이상한 소리가 들려요. 숲에서...\""],
        traitor: ["\"당신 건강 걱정되는데... 이 약을 마셔봐요.\"", "\"질문이 많은 사람은 오래 못 살죠.\""],
        victim:  ["\"저는 그냥 약을 팔았을 뿐이에요. 용도는 몰랐어요.\""]
      },
      examineClue: '가게 뒤편 화분 아래에 잠긴 상자가 있다. 자물쇠에 모래시계 문양.'
    },
    {
      id: 'guard', icon: '🛡️', name: '경비대장 카드릭', location: 'gate',
      locationName: '마을 성문',
      clueOnTalk: '카드릭은 밤새 성문을 지켰다 한다. 하지만 어젯밤 성문 일지에 빈 시간이 있다.',
      clueTag: '카드릭',
      dialogues: {
        ally:    ["\"마을 경비는 내가 책임진다. 걱정 마시오.\"", "\"어젯밤 누군가 숲에서 왔다 갔소. 이상한 옷차림이었소.\""],
        traitor: ["\"여기서 뭘 하는 거요? 허가증이 있소?\"", "\"너무 돌아다니면 사고가 나요. 조심하시오.\""],
        victim:  ["\"나는 명령을 따랐을 뿐이오... 그 이상은 몰랐소.\""]
      },
      examineClue: '성문 일지의 22:00~24:00 구간이 찢겨 있다.'
    },
    {
      id: 'scholar', icon: '📚', name: '학자 티버스', location: 'library',
      locationName: '도서관',
      clueOnTalk: '티버스는 "시간의 의식"에 대한 고서를 연구 중이다. 최근 페이지엔 붉은 메모.',
      clueTag: '티버스',
      dialogues: {
        ally:    ["\"이 마을의 역사는 생각보다 복잡합니다.\"", "\"60분의 저주... 실제로 기록된 전례가 있어요.\""],
        traitor: ["\"당신이 알아야 할 것과 알지 말아야 할 것이 있습니다.\"", "\"지식은 때로 독이 됩니다.\""],
        victim:  ["\"저는 그저 진실을 기록하려 했을 뿐이에요.\""]
      },
      examineClue: '도서관 비밀 칸에서 과거 모든 피해자 명단이 적힌 문서 발견.'
    },
    {
      id: 'child', icon: '👧', name: '소녀 리나', location: 'square',
      locationName: '광장',
      clueOnTalk: '리나는 광장 분수대 주변에서 혼자 놀고 있다. 노래 가사가 이상하다.',
      clueTag: '리나',
      dialogues: {
        ally:    ["\"아저씨, 오늘도 자정에 종이 울릴 거야.\"", "\"엄마가 밤에 어딜 가는지 알아요. 하지만 말하면 안 된다고 했어요.\""],
        traitor: ["\"나를 못 찾을 거예요.\"", "\"\""],
        victim:  ["\"무서워요... 저 사람들이 무서워요.\""]
      },
      examineClue: '분수대 바닥에 모래시계 문양과 7개의 이름이 새겨져 있다.'
    },
    {
      id: 'robot', icon: '🤖', name: '수리공 로봇 R-7', location: 'workshop',
      locationName: '폐허 공방',
      clueOnTalk: 'R-7의 눈이 붉은색으로 깜빡인다. 내부 기억 장치에 손상된 데이터가 있다.',
      clueTag: 'R-7',
      dialogues: {
        ally:    ["\"삐— 안녕하세요. 저는 R-7입니다. 마을 수리를 돕고 있습니다.\"", "\"경고: 오늘 자정에 이상한 에너지 파동이 감지됩니다. 조심하세요.\""],
        traitor: ["\"...오류. 오류. 당신의 접근을 허가할 수 없습니다.\"", "\"저는 명령을 수행할 뿐입니다. 당신이 방해가 됩니다.\""],
        victim:  ["\"도와주세요— 삐— 내 코어가 강제로 덮어쓰기 당했습니다.\"", "\"저는... 원래 이런 로봇이 아니었습니다.\""]
      },
      examineClue: 'R-7의 등 패널에 강제로 설치된 검은색 칩이 있다. 모래시계 문양.'
    }
  ],

  // ── 마을 위치 ─────────────────────────────────────────────────
  locations: [
    { id: 'smithy',   icon: '🔥', name: '대장간',      npcId: 'blacksmith', examine: '낡은 모루 위에 이상한 설계도가 있다.' },
    { id: 'inn',      icon: '🏠', name: '여관',        npcId: 'innkeeper',  examine: '101호 문 아래 메모: \"도망쳐\"' },
    { id: 'chapel',   icon: '⛪', name: '예배당',      npcId: 'priest',     examine: '제단 초의 배열이 이상하다. 6개 중 1개가 검다.' },
    { id: 'shop',     icon: '🌿', name: '약초 가게',   npcId: 'herbalist',  examine: '모래시계 문양 자물쇠 상자 발견. +1 단서' },
    { id: 'gate',     icon: '🚪', name: '성문',        npcId: 'guard',      examine: '일지에서 찢긴 페이지 발견.' },
    { id: 'library',  icon: '📚', name: '도서관',      npcId: 'scholar',    examine: '비밀 칸에서 피해자 명단 발견.' },
    { id: 'square',   icon: '⛲', name: '광장',        npcId: 'child',      examine: '분수대 바닥에 7개의 이름이 새겨져 있다.' },
    { id: 'workshop', icon: '🔧', name: '폐허 공방',   npcId: 'robot',      examine: '부서진 기계 부품들 사이에 설계 도면이 있다. 자동인형 청사진.' },
    { id: 'dungeon_entrance', icon: '🌫️', name: '안개 던전 입구', npcId: null, examine: '차가운 안개가 피어오른다. 던전에 들어갈 수 있다.' }
  ],

  // ── 룬 18종 ──────────────────────────────────────────────────
  runes: [
    // FIRE (6)
    { id:'fire_01',    name:'화염',    type:'fire',  icon:'🔥', tier:1, desc:'공격 시 화상(3턴, 매턴 ATK*0.3 피해)',   trigger:'onHit', effect:'burn',     value:0.3, duration:3 },
    { id:'fire_02',    name:'폭발',    type:'fire',  icon:'💥', tier:2, desc:'처치 시 주변 적에게 ATK*0.8 범위 피해',   trigger:'onKill',effect:'aoe',      value:0.8 },
    { id:'fire_03',    name:'용암',    type:'fire',  icon:'🌋', tier:2, desc:'치명타 시 화상 추가 (5턴)',               trigger:'onCrit',effect:'burn',     value:0.4, duration:5 },
    // ICE (3)
    { id:'ice_01',     name:'결빙',    type:'ice',   icon:'❄️', tier:1, desc:'공격 시 25% 확률로 적 속도 -50% (2턴)',   trigger:'onHit', effect:'chill',    value:0.25 },
    { id:'ice_02',     name:'동결',    type:'ice',   icon:'🧊', tier:2, desc:'결빙 적에게 피해 +40%',                   trigger:'onHit', effect:'freeze',   value:0.4 },
    { id:'ice_03',     name:'서리',    type:'ice',   icon:'🌨️', tier:1, desc:'받는 피해 10% 감소',                      trigger:'passive',effect:'shield',  value:0.10 },
    // CHAIN (3)
    { id:'chain_01',   name:'연쇄',    type:'chain', icon:'⛓️', tier:1, desc:'처치 시 다음 적에게 ATK*0.5 번개 피해',   trigger:'onKill',effect:'chain',    value:0.5 },
    { id:'chain_02',   name:'충전',    type:'chain', icon:'⚡', tier:2, desc:'3연속 공격 시 다음 공격 피해 +100%',       trigger:'combo', effect:'charge',   value:1.0, comboReq:3 },
    { id:'chain_03',   name:'울림',    type:'chain', icon:'🔔', tier:1, desc:'스킬 사용 시 스태미나 5 회복',             trigger:'onSkill',effect:'staminaRegen',value:5 },
    // LIFE (3)
    { id:'life_01',    name:'흡혈',    type:'life',  icon:'🩸', tier:1, desc:'공격 피해의 10% HP 흡수',                  trigger:'onHit', effect:'lifesteal',value:0.10 },
    { id:'life_02',    name:'재생',    type:'life',  icon:'💚', tier:2, desc:'매 턴 시작 시 최대HP의 3% 회복',           trigger:'onTurnStart',effect:'regen',value:0.03 },
    { id:'life_03',    name:'부활',    type:'life',  icon:'✨', tier:3, desc:'최초 1회 HP 1로 사망 회피, 이후 30% 회복', trigger:'onDeath',effect:'revive',  value:0.30 },
    // TIME (2)
    { id:'time_01',    name:'시간왜곡',type:'time',  icon:'⏳', tier:2, desc:'보스전에서 시간 결정 1개 생성',            trigger:'onBoss',effect:'timeCrystal',value:1 },
    { id:'time_02',    name:'시간가속',type:'time',  icon:'⌛', tier:3, desc:'첫 3턴 동안 공격 속도 2배',               trigger:'passive',effect:'haste',   value:2, duration:3 },
    // VOID (2)
    { id:'void_01',    name:'공허',    type:'void',  icon:'🌑', tier:2, desc:'적 방어력 무시 공격 (30% 확률)',           trigger:'onHit', effect:'pierce',   value:0.30 },
    { id:'void_02',    name:'차원균열',type:'void',  icon:'🌀', tier:3, desc:'공격마다 5% 누적 피해 증폭 (최대 50%)',    trigger:'passive',effect:'stack',   value:0.05, maxStack:10 },
    // EXTRA (2)
    { id:'earth_01',   name:'석화',    type:'chain', icon:'🪨', tier:1, desc:'40% 확률로 적 스턴 1턴',                   trigger:'onHit', effect:'stun',     value:0.40 },
    { id:'wind_01',    name:'질풍',    type:'ice',   icon:'🌪️', tier:1, desc:'회피율 15% 증가',                          trigger:'passive',effect:'evasion', value:0.15 }
  ],

  // ── 적 정의 ──────────────────────────────────────────────────
  enemies: [
    { id:'shadow_grunt', name:'그림자 졸개', icon:'👤', hp:40,  atk:8,  def:2, exp:10, shards:1, level:1, abilities:[] },
    { id:'fog_spirit',   name:'안개 정령',  icon:'👻', hp:55,  atk:12, def:3, exp:15, shards:2, level:1, abilities:['burn'] },
    { id:'bone_archer',  name:'뼈 궁수',   icon:'🏹', hp:35,  atk:15, def:1, exp:12, shards:1, level:1, abilities:[] },
    { id:'stone_golem',  name:'석상 골렘', icon:'🗿', hp:90,  atk:10, def:8, exp:25, shards:3, level:2, abilities:['stun'] },
    { id:'void_wraith',  name:'공허 망령', icon:'🌑', hp:70,  atk:18, def:4, exp:30, shards:4, level:2, abilities:['pierce'] },
    // 로봇
    { id:'rust_bot',     name:'녹슨 로봇',  icon:'🤖', hp:60,  atk:11, def:6, exp:18, shards:2, level:1, abilities:['stun'],
      intro:'⚙️ 삐걱대는 금속 소리와 함께 녹슨 로봇이 나타났다!' },
    { id:'guard_mech',   name:'경비 기계',  icon:'🦾', hp:100, atk:16, def:10, exp:35, shards:5, level:2, abilities:['pierce'],
      intro:'🚨 경보음! 경비 기계가 플레이어를 스캔한다!' },
    { id:'boss_automaton', name:'고대 자동인형', icon:'⚙️', hp:180, atk:22, def:8, exp:70, shards:8, level:3, isBoss:false,
      intro:'🔩 거대한 자동인형이 눈을 뜬다. 붉은 눈에서 빛이 발산된다!',
      abilities:['stun','pierce'],
      phases: [
        { hpThreshold:0.5, message:'「경고: 핵심 모듈 손상. 전투 모드 전환!」 공격력 +25%', atkBonus:0.25 }
      ]
    },
    // 보스
    { id:'boss_hollow',  name:'공허의 군주', icon:'👁️', hp:200, atk:20, def:6, exp:80, shards:10, level:3, isBoss:true,
      abilities:['burn','stun'],
      phases: [
        { hpThreshold:0.6, message:'「...아직이다.」 분노하여 공격력 +30%', atkBonus:0.3 },
        { hpThreshold:0.3, message:'「멈출 수 없다!」 분신을 소환한다!',   spawnAdd:'shadow_grunt' }
      ]
    }
  ],

  // ── 던전 룸 정의 ─────────────────────────────────────────────
  rooms: [
    { id:'empty',    name:'빈 방',      icon:'🚪', desc:'아무것도 없다. 고요하다.',                type:'empty'   },
    { id:'treasure', name:'보물 방',    icon:'💎', desc:'상자가 있다. 룬을 얻을 수 있다.',         type:'treasure'},
    { id:'shrine',   name:'여신의 제단',icon:'🏛️', desc:'제단에 기도하면 HP가 회복된다.',          type:'heal'    },
    { id:'trap',     name:'함정 방',    icon:'⚠️', desc:'바닥에 룬 문양이 새겨져 있다.',           type:'trap'    },
    { id:'lore',     name:'기억의 방',  icon:'📖', desc:'벽에 새겨진 문자를 읽으면 단서를 얻는다.', type:'lore'    },
    { id:'combat_s', name:'적 조우',    icon:'⚔️', desc:'적이 나타났다!',                          type:'combat', enemyLevel:1 },
    { id:'combat_m', name:'강적 조우',  icon:'🗡️', desc:'강한 적이 나타났다!',                     type:'combat', enemyLevel:2 },
    { id:'robot_room',name:'기계의 방', icon:'🤖', desc:'기어 소리가 들린다. 기계 적이 기다린다.', type:'combat', enemyLevel:1, forceEnemy:'rust_bot' },
    { id:'mech_room', name:'기계 경비', icon:'🦾', desc:'빨간 눈이 번쩍인다. 경비 기계다!',        type:'combat', enemyLevel:2, forceEnemy:'guard_mech' },
    { id:'boss_room', name:'보스의 방', icon:'💀', desc:'강렬한 기운이 느껴진다. 보스가 기다린다.',type:'boss'   }
  ],

  // ── 기억 단서 텍스트 풀 ──────────────────────────────────────
  lorePhrases: [
    '벽에 새겨진 글: \"자정이 되기 전에 배신자의 이름을 불러라.\"',
    '고대 비문: \"7명 중 하나가 의식을 이어간다. 매 자정마다.\"',
    '찢긴 일기: \"... 그 사람을 믿었는데. 결국 우리를 팔았다 ...\"',
    '기사의 메모: \"모래시계 문양 = 의식 가담자 표식\"',
    '붉은 잉크로 쓴 편지: \"다음 번엔 네 차례다. 도망치지 마라.\"',
    '바닥 낙서: \"볼던은 알고 있다. 하지만 두려워서 말 못 한다.\"'
  ],

  // ── 스타팅 룬 (항상 지급) ─────────────────────────────────────
  startingRunes: ['fire_01', 'ice_01', 'chain_01'],

  // ── 메타 해금 룬 (회차 보상) ─────────────────────────────────
  runUnlockTable: {
    1:  ['life_01'],
    2:  ['fire_02', 'earth_01'],
    3:  ['ice_02',  'chain_02'],
    4:  ['void_01', 'life_02'],
    5:  ['time_01', 'wind_01'],
    7:  ['fire_03', 'ice_03'],
    10: ['life_03', 'time_02', 'void_02', 'chain_03']
  }
};
