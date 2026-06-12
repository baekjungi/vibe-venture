// ===== parchment.js — 기억의 양피지 시스템 =====

const Parchment = (() => {
  const FADE_AFTER_RUNS = 5;

  function load() {
    return JSON.parse(localStorage.getItem('hh_parchment') || '[]');
  }
  function save(entries) {
    localStorage.setItem('hh_parchment', JSON.stringify(entries));
  }

  function addEntry(text, tag, runNum) {
    const entries = load();
    entries.unshift({ text, tag, runNum, locked: false, id: Date.now() });
    save(entries);
  }

  function tickFade(currentRun) {
    const entries = load();
    entries.forEach(e => {
      if (!e.locked && currentRun - e.runNum >= FADE_AFTER_RUNS) {
        e.faded = true;
      }
    });
    save(entries);
  }

  function lockEntry(id, memoryShards) {
    if (memoryShards < 10) return false;
    const entries = load();
    const e = entries.find(x => x.id === id);
    if (e) { e.locked = true; e.faded = false; }
    save(entries);
    return true;
  }

  function getAll() { return load(); }

  function clear() { localStorage.removeItem('hh_parchment'); }

  return { addEntry, tickFade, lockEntry, getAll, clear };
})();
