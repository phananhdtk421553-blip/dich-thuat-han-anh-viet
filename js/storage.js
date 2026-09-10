// ==========================================================================
// STORAGE.JS - QUẢN LÝ LƯU TRỮ LOCALSTORAGE AN TOÀN TRÊN TRÌNH DUYỆT
// ==========================================================================

window.StorageManager = {
  // Lấy API Key
  getApiKey() {
    try {
      return localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.API_KEY) || "";
    } catch (e) {
      console.error("Lỗi khi đọc API Key từ localStorage:", e);
      return "";
    }
  },

  // Lưu API Key
  setApiKey(key) {
    try {
      localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.API_KEY, (key || "").trim());
      return true;
    } catch (e) {
      console.error("Lỗi khi lưu API Key vào localStorage:", e);
      return false;
    }
  },

  // Lấy Model được chọn
  getSelectedModel() {
    try {
      return localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.MODEL) || window.APP_CONFIG.DEFAULT_MODEL;
    } catch (e) {
      return window.APP_CONFIG.DEFAULT_MODEL;
    }
  },

  // Lưu Model được chọn
  setSelectedModel(modelId) {
    try {
      localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.MODEL, modelId);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Lấy ngôn ngữ giọng nói đầu vào
  getInputSpeechLang() {
    try {
      return localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.INPUT_LANG) || "vi-VN";
    } catch (e) {
      return "vi-VN";
    }
  },

  // Lưu ngôn ngữ giọng nói đầu vào
  setInputSpeechLang(lang) {
    try {
      localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.INPUT_LANG, lang);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Lấy danh sách lịch sử dịch (tối đa 30 mục)
  getHistory() {
    try {
      const raw = localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Lỗi khi đọc lịch sử dịch:", e);
      return [];
    }
  },

  // Thêm một mục vào lịch sử
  addHistory(item) {
    try {
      let history = this.getHistory();
      const newItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
        ...item
      };
      history.unshift(newItem);
      if (history.length > 30) {
        history = history.slice(0, 30);
      }
      localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(history));
      return history;
    } catch (e) {
      console.error("Lỗi khi ghi lịch sử dịch:", e);
      return [];
    }
  },

  // Xóa toàn bộ lịch sử
  clearHistory() {
    try {
      localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.HISTORY);
      return true;
    } catch (e) {
      return false;
    }
  }
};
