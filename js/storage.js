// localStorage 관리 모듈
const Storage = {
  PREFIX: 'mission2026_',

  get(key) {
    try {
      const val = localStorage.getItem(this.PREFIX + key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  },

  // 체크리스트
  getChecklist(category) {
    return this.get('checklist_' + category) || {};
  },

  toggleCheck(category, index) {
    const data = this.getChecklist(category);
    data[index] = !data[index];
    this.set('checklist_' + category, data);
    return data;
  },

  getCheckCount(category, total) {
    const data = this.getChecklist(category);
    const checked = Object.values(data).filter(Boolean).length;
    return { checked, total };
  },

  // 선교일지
  getJournal(day) {
    return this.get('journal_' + day) || { weather: '', text: '' };
  },

  saveJournal(day, weather, text) {
    this.set('journal_' + day, { weather, text, savedAt: new Date().toISOString() });
  },

  // 기도제목 (개인)
  getPersonalPrayers() {
    return this.get('personal_prayers') || [];
  },

  addPersonalPrayer(text) {
    const prayers = this.getPersonalPrayers();
    prayers.push({ text, createdAt: new Date().toISOString() });
    this.set('personal_prayers', prayers);
    return prayers;
  },

  removePersonalPrayer(index) {
    const prayers = this.getPersonalPrayers();
    prayers.splice(index, 1);
    this.set('personal_prayers', prayers);
    return prayers;
  },

  // 일별 기도 체크
  getDailyPrayer() {
    return this.get('daily_prayer') || {};
  },

  toggleDailyPrayer(day, slot) {
    const data = this.getDailyPrayer();
    const key = day + '_' + slot;
    data[key] = !data[key];
    this.set('daily_prayer', data);
    return data;
  },

  // 평가서
  getEvaluation() {
    return this.get('evaluation') || {};
  },

  saveEvaluation(data) {
    this.set('evaluation', { ...data, savedAt: new Date().toISOString() });
  },

  // 현지어 메모
  getSavedWords() {
    return this.get('saved_words') || [];
  },

  addSavedWord(text) {
    const words = this.getSavedWords();
    words.push({ text, createdAt: new Date().toISOString() });
    this.set('saved_words', words);
    return words;
  },

  removeSavedWord(index) {
    const words = this.getSavedWords();
    words.splice(index, 1);
    this.set('saved_words', words);
    return words;
  }
};
