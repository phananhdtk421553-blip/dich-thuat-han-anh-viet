// ==========================================================================
// APP.JS - BỘ ĐIỀU KHIỂN CHÍNH (CONTROLLER) CHO WEB DỊCH THUẬT TECHTRANS
// (Tương thích 100% khi mở trực tiếp file:// lẫn chạy qua HTTP/Vercel)
// ==========================================================================

class TechTransApp {
  constructor() {
    this.speech = new window.SpeechManager();
    this.currentMode = null; // 'single' | 'bilingual'
    this.currentSingleLang = 'ko';
    this.currentSingleResult = '';
    this.currentBilingualResult = { korean: '', english: '' };
    this.isTranslating = false;
    this.deferredInstallPrompt = null;

    this.initDOMElements();
    this.initEventListeners();
    this.loadSavedSettings();
    this.registerServiceWorker();
    this.renderHistory();

    // Khởi tạo đếm ký tự ban đầu nếu đã có sẵn text
    this.updateCharCount();
    this.autoResizeTextarea();
  }

  initDOMElements() {
    // API Key Banner
    this.apiKeyBanner = document.getElementById('apiKeyBanner');
    this.btnOpenKeyFromBanner = document.getElementById('btnOpenKeyFromBanner');

    // Inputs & Toolbar
    this.sourceText = document.getElementById('sourceText');
    this.selectSpeechLang = document.getElementById('selectSpeechLang');
    this.btnMic = document.getElementById('btnMic');
    this.micText = document.getElementById('micText');
    this.btnPaste = document.getElementById('btnPaste');
    this.btnClear = document.getElementById('btnClear');
    this.charCount = document.getElementById('charCount');

    // Main Actions
    this.btnTranslateKo = document.getElementById('btnTranslateKo');
    this.btnTranslateEn = document.getElementById('btnTranslateEn');
    this.btnTranslateVi = document.getElementById('btnTranslateVi');
    this.btnTranslateBilingual = document.getElementById('btnTranslateBilingual');

    // Output Elements
    this.targetLangBadge = document.getElementById('targetLangBadge');
    this.elapsedBadge = document.getElementById('elapsedBadge');
    this.singleControls = document.getElementById('singleControls');
    this.btnSpeak = document.getElementById('btnSpeak');
    this.speakText = document.getElementById('speakText');
    this.btnCopySingle = document.getElementById('btnCopySingle');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.loadingText = document.getElementById('loadingText');
    this.singleOutputContainer = document.getElementById('singleOutputContainer');
    this.outputContent = document.getElementById('outputContent');
    this.bilingualOutputContainer = document.getElementById('bilingualOutputContainer');
    this.textBilingualKo = document.getElementById('textBilingualKo');
    this.textBilingualEn = document.getElementById('textBilingualEn');
    this.btnSpeakKo = document.getElementById('btnSpeakKo');
    this.btnCopyKo = document.getElementById('btnCopyKo');
    this.btnSpeakEn = document.getElementById('btnSpeakEn');
    this.btnCopyEn = document.getElementById('btnCopyEn');
    this.btnCopyBoth = document.getElementById('btnCopyBoth');
    this.outputPlaceholder = document.getElementById('outputPlaceholder');

    // Settings Modal
    this.settingsModal = document.getElementById('settingsModal');
    this.btnSettings = document.getElementById('btnSettings');
    this.btnCloseSettings = document.getElementById('btnCloseSettings');
    this.btnCancelSettings = document.getElementById('btnCancelSettings');
    this.btnSaveSettings = document.getElementById('btnSaveSettings');
    this.inputApiKey = document.getElementById('inputApiKey');
    this.btnToggleKeyVisibility = document.getElementById('btnToggleKeyVisibility');
    this.selectModel = document.getElementById('selectModel');
    this.inputCustomModel = document.getElementById('inputCustomModel');
    this.btnTestApiKey = document.getElementById('btnTestApiKey');
    this.testKeyStatus = document.getElementById('testKeyStatus');
    this.systemPromptPreview = document.getElementById('systemPromptPreview');

    // History Modal
    this.historyModal = document.getElementById('historyModal');
    this.btnHistory = document.getElementById('btnHistory');
    this.btnCloseHistory = document.getElementById('btnCloseHistory');
    this.btnCloseHistoryFooter = document.getElementById('btnCloseHistoryFooter');
    this.historyList = document.getElementById('historyList');
    this.btnClearHistory = document.getElementById('btnClearHistory');

    // PWA & Toast
    this.btnInstallPwa = document.getElementById('btnInstallPwa');
    this.toastContainer = document.getElementById('toastContainer');
    this.chipButtons = document.querySelectorAll('.chip-btn');
  }

  initEventListeners() {
    // 0. Banner mở cấu hình
    if (this.btnOpenKeyFromBanner) {
      this.btnOpenKeyFromBanner.addEventListener('click', () => this.openSettingsModal());
    }

    // 1. Textarea Auto-resize & Char Count
    this.sourceText.addEventListener('input', () => {
      this.updateCharCount();
      this.autoResizeTextarea();
    });

    // 2. Keyboard Shortcut: Ctrl+Enter hoặc Cmd+Enter để dịch nhanh
    this.sourceText.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.handleTranslateBilingual();
      }
    });

    // 3. Clear & Paste Buttons
    this.btnClear.addEventListener('click', () => {
      this.sourceText.value = '';
      this.updateCharCount();
      this.autoResizeTextarea();
      this.sourceText.focus();
    });

    this.btnPaste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          this.sourceText.value = (this.sourceText.value ? this.sourceText.value + "\n" : "") + text;
          this.updateCharCount();
          this.autoResizeTextarea();
          this.showToast("Đã dán văn bản từ clipboard!", "success");
        }
      } catch (err) {
        this.showToast("Trình duyệt chặn đọc tự động. Hãy dùng Ctrl+V để dán!", "info");
      }
    });

    // 4. Quick Industry Chip Preset
    this.chipButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        if (text) {
          this.sourceText.value = text;
          this.updateCharCount();
          this.autoResizeTextarea();
          this.showToast("Đã áp dụng mẫu kỹ thuật!", "info");
        }
      });
    });

    // 5. STT Micro Toggle
    this.btnMic.addEventListener('click', () => this.toggleSpeechRecognition());
    this.selectSpeechLang.addEventListener('change', (e) => {
      window.StorageManager.setInputSpeechLang(e.target.value);
    });

    // 6. Action Translation Buttons
    this.btnTranslateKo.addEventListener('click', () => this.handleTranslateSingle('ko'));
    this.btnTranslateEn.addEventListener('click', () => this.handleTranslateSingle('en'));
    this.btnTranslateVi.addEventListener('click', () => this.handleTranslateSingle('vi'));
    this.btnTranslateBilingual.addEventListener('click', () => this.handleTranslateBilingual());

    // 7. TTS & Copy Controls (Single Mode)
    this.btnSpeak.addEventListener('click', () => this.toggleSingleTTS());
    this.btnCopySingle.addEventListener('click', () => this.copyToClipboard(this.currentSingleResult));

    // 8. TTS & Copy Controls (Bilingual Mode)
    this.btnSpeakKo.addEventListener('click', () => this.speakText(this.currentBilingualResult.korean, 'ko-KR', this.btnSpeakKo));
    this.btnSpeakEn.addEventListener('click', () => this.speakText(this.currentBilingualResult.english, 'en-US', this.btnSpeakEn));
    this.btnCopyKo.addEventListener('click', () => this.copyToClipboard(this.currentBilingualResult.korean));
    this.btnCopyEn.addEventListener('click', () => this.copyToClipboard(this.currentBilingualResult.english));
    this.btnCopyBoth.addEventListener('click', () => {
      const fullText = `[BẢN DỊCH TIẾNG HÀN]\n${this.currentBilingualResult.korean}\n\n[ENGLISH TRANSLATION]\n${this.currentBilingualResult.english}`;
      this.copyToClipboard(fullText, "Đã sao chép cả hai bản dịch vào bộ nhớ tạm!");
    });

    // 9. Settings Modal Controls
    this.btnSettings.addEventListener('click', () => this.openSettingsModal());
    this.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());
    this.btnCancelSettings.addEventListener('click', () => this.closeSettingsModal());
    this.btnSaveSettings.addEventListener('click', () => this.saveSettings());
    this.btnToggleKeyVisibility.addEventListener('click', () => {
      const type = this.inputApiKey.type === 'password' ? 'text' : 'password';
      this.inputApiKey.type = type;
      this.btnToggleKeyVisibility.textContent = type === 'password' ? '👁️' : '🔒';
    });
    this.btnTestApiKey.addEventListener('click', () => this.testApiKeyConnection());
    this.selectModel.addEventListener('change', () => {
      if (this.selectModel.value === 'custom') {
        this.inputCustomModel.style.display = 'block';
        this.inputCustomModel.focus();
      } else {
        this.inputCustomModel.style.display = 'none';
      }
    });

    // 10. History Modal Controls
    this.btnHistory.addEventListener('click', () => this.openHistoryModal());
    this.btnCloseHistory.addEventListener('click', () => this.closeHistoryModal());
    this.btnCloseHistoryFooter.addEventListener('click', () => this.closeHistoryModal());
    this.btnClearHistory.addEventListener('click', () => {
      if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử dịch không?")) {
        window.StorageManager.clearHistory();
        this.renderHistory();
        this.showToast("Đã xóa sạch lịch sử dịch!", "info");
      }
    });

    // 11. PWA Install Banner Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (this.btnInstallPwa) {
        this.btnInstallPwa.style.display = 'flex';
      }
    });

    if (this.btnInstallPwa) {
      this.btnInstallPwa.addEventListener('click', async () => {
        if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          const choiceResult = await this.deferredInstallPrompt.userChoice;
          if (choiceResult.outcome === 'accepted') {
            this.showToast("Cảm ơn bạn đã cài đặt ứng dụng!", "success");
          }
          this.deferredInstallPrompt = null;
          this.btnInstallPwa.style.display = 'none';
        }
      });
    }
  }

  loadSavedSettings() {
    const apiKey = window.StorageManager.getApiKey();
    this.inputApiKey.value = apiKey;

    let selectedModel = window.StorageManager.getSelectedModel();
    // Nếu model cũ là 1.5-flash hoặc 2.5-flash, tự động nâng cấp lên gemini-3.6-flash
    if (!selectedModel || selectedModel === 'gemini-2.5-flash' || selectedModel === 'gemini-1.5-flash') {
      selectedModel = window.APP_CONFIG.DEFAULT_MODEL; // gemini-3.6-flash
      window.StorageManager.setSelectedModel(selectedModel);
    }

    const standardModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    if (standardModels.includes(selectedModel)) {
      this.selectModel.value = selectedModel;
      if (this.inputCustomModel) this.inputCustomModel.style.display = 'none';
    } else {
      this.selectModel.value = 'custom';
      if (this.inputCustomModel) {
        this.inputCustomModel.style.display = 'block';
        this.inputCustomModel.value = selectedModel;
      }
    }

    const speechLang = window.StorageManager.getInputSpeechLang();
    this.selectSpeechLang.value = speechLang;

    this.systemPromptPreview.value = window.APP_CONFIG.SYSTEM_INSTRUCTION;

    this.checkApiKeyStatus(apiKey);
  }

  checkApiKeyStatus(apiKey) {
    if (!apiKey) {
      if (this.apiKeyBanner) this.apiKeyBanner.style.display = 'flex';
      this.btnSettings.style.borderColor = '#ef4444';
      this.btnSettings.style.color = '#ef4444';
    } else {
      if (this.apiKeyBanner) this.apiKeyBanner.style.display = 'none';
      this.btnSettings.style.borderColor = '';
      this.btnSettings.style.color = '';
    }
  }

  updateCharCount() {
    const len = this.sourceText.value.length;
    this.charCount.textContent = `${len} ký tự`;
  }

  autoResizeTextarea() {
    this.sourceText.style.height = 'auto';
    this.sourceText.style.height = Math.max(120, Math.min(380, this.sourceText.scrollHeight)) + 'px';
  }

  // ==========================================
  // SPEECH RECOGNITION (STT)
  // ==========================================
  toggleSpeechRecognition() {
    if (this.speech.isRecording) {
      this.speech.stopRecording();
      this.setMicUIState(false);
    } else {
      const lang = this.selectSpeechLang.value;
      const initialText = this.sourceText.value;

      this.speech.startRecording({
        lang,
        onStart: () => {
          this.setMicUIState(true);
          this.showToast(`Đang lắng nghe (${lang})... Hãy nói vào Micro!`, "info");
        },
        onResult: ({ final, interim }) => {
          const prefix = initialText ? initialText.trim() + " " : "";
          this.sourceText.value = prefix + (final || interim);
          this.updateCharCount();
          this.autoResizeTextarea();
        },
        onEnd: () => {
          this.setMicUIState(false);
        },
        onError: (errMessage) => {
          this.setMicUIState(false);
          this.showToast(errMessage, "error", 5000);
        }
      });
    }
  }

  setMicUIState(isRecording) {
    if (isRecording) {
      this.btnMic.classList.add('recording');
      this.micText.textContent = "Đang thu...";
    } else {
      this.btnMic.classList.remove('recording');
      this.micText.textContent = "Thu âm";
    }
  }

  // ==========================================
  // TRANSLATION DISPATCHERS
  // ==========================================
  async handleTranslateSingle(targetLang) {
    const text = this.sourceText.value.trim();
    if (!text) {
      this.showToast("Vui lòng nhập hoặc dán nội dung cần dịch!", "error");
      this.sourceText.focus();
      return;
    }

    const apiKey = window.StorageManager.getApiKey();
    if (!apiKey) {
      this.showToast("Chưa có Gemini API Key. Hãy nhập Key vào ô cài đặt!", "error", 4000);
      this.openSettingsModal();
      return;
    }

    const model = window.StorageManager.getSelectedModel();
    const langLabels = {
      ko: "TIẾNG HÀN",
      en: "TIẾNG ANH",
      vi: "TIẾNG VIỆT"
    };

    this.startLoading(`Đang dịch sang ${langLabels[targetLang]} qua ${model}...`);

    try {
      const response = await window.GeminiService.translate({
        text,
        targetLang,
        apiKey,
        model
      });

      this.currentMode = 'single';
      this.currentSingleLang = targetLang;
      this.currentSingleResult = response.result;

      // Render Single Output
      this.renderSingleOutput({
        text: response.result,
        targetLang,
        elapsedMs: response.elapsedMs,
        model: response.model
      });

      // Lưu lịch sử
      window.StorageManager.addHistory({
        sourceText: text,
        translatedText: response.result,
        targetLang,
        isBilingual: false,
        model: response.model
      });
      this.renderHistory();

    } catch (err) {
      this.showToast(err.message, "error", 6000);
      this.showPlaceholder(`Quá trình dịch gặp sự cố: ${err.message}`);
    } finally {
      this.stopLoading();
    }
  }

  async handleTranslateBilingual() {
    const text = this.sourceText.value.trim();
    if (!text) {
      this.showToast("Vui lòng nhập hoặc dán nội dung cần dịch!", "error");
      this.sourceText.focus();
      return;
    }

    const apiKey = window.StorageManager.getApiKey();
    if (!apiKey) {
      this.showToast("Chưa có Gemini API Key. Hãy nhập Key vào ô cài đặt!", "error", 4000);
      this.openSettingsModal();
      return;
    }

    const model = window.StorageManager.getSelectedModel();
    this.startLoading(`Đang xử lý song ngữ HÀN + ANH qua ${model}...`);

    try {
      const response = await window.GeminiService.translateBilingual({
        text,
        apiKey,
        model
      });

      this.currentMode = 'bilingual';
      this.currentBilingualResult = {
        korean: response.korean,
        english: response.english
      };

      // Render Bilingual Output
      this.renderBilingualOutput({
        korean: response.korean,
        english: response.english,
        elapsedMs: response.elapsedMs,
        model: response.model
      });

      // Lưu lịch sử
      window.StorageManager.addHistory({
        sourceText: text,
        translatedText: `[Hàn]: ${response.korean.substring(0, 80)}...\n[Anh]: ${response.english.substring(0, 80)}...`,
        korean: response.korean,
        english: response.english,
        targetLang: 'ko+en',
        isBilingual: true,
        model: response.model
      });
      this.renderHistory();

    } catch (err) {
      this.showToast(err.message, "error", 6000);
      this.showPlaceholder(`Quá trình dịch song ngữ gặp sự cố: ${err.message}`);
    } finally {
      this.stopLoading();
    }
  }

  // ==========================================
  // RENDER RESULTS
  // ==========================================
  renderSingleOutput({ text, targetLang, elapsedMs, model }) {
    const langNames = {
      ko: "🇰🇷 TIẾNG HÀN",
      en: "🇺🇸 TIẾNG ANH",
      vi: "🇻🇳 TIẾNG VIỆT"
    };

    this.targetLangBadge.textContent = langNames[targetLang] || targetLang;
    this.elapsedBadge.textContent = `${(elapsedMs / 1000).toFixed(1)}s • ${model}`;
    
    this.outputContent.innerHTML = this.formatHighlightedTerms(text);

    this.outputPlaceholder.style.display = 'none';
    this.bilingualOutputContainer.style.display = 'none';
    this.singleOutputContainer.style.display = 'block';
    this.singleControls.style.display = 'flex';
  }

  renderBilingualOutput({ korean, english, elapsedMs, model }) {
    this.targetLangBadge.textContent = "⚡ SONG NGỮ HÀN + ANH";
    this.elapsedBadge.textContent = `${(elapsedMs / 1000).toFixed(1)}s • ${model}`;

    this.textBilingualKo.innerHTML = this.formatHighlightedTerms(korean);
    this.textBilingualEn.innerHTML = this.formatHighlightedTerms(english);

    this.outputPlaceholder.style.display = 'none';
    this.singleOutputContainer.style.display = 'none';
    this.singleControls.style.display = 'none';
    this.bilingualOutputContainer.style.display = 'block';
  }

  formatHighlightedTerms(rawText) {
    if (!rawText) return "";
    const escaped = this.escapeHtml(rawText);
    return escaped.replace(/\(([^)]+)\)/g, '<strong style="color:#38bdf8; font-weight:600;">($1)</strong>');
  }

  escapeHtml(string) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(string).replace(/[&<>"']/g, s => entityMap[s]);
  }

  showPlaceholder(msg) {
    this.outputPlaceholder.textContent = msg;
    this.outputPlaceholder.style.display = 'flex';
    this.singleOutputContainer.style.display = 'none';
    this.bilingualOutputContainer.style.display = 'none';
    this.singleControls.style.display = 'none';
  }

  startLoading(msg) {
    this.isTranslating = true;
    this.loadingText.textContent = msg;
    this.loadingIndicator.classList.add('active');
    this.outputPlaceholder.style.display = 'none';
    this.singleOutputContainer.style.display = 'none';
    this.bilingualOutputContainer.style.display = 'none';
    this.singleControls.style.display = 'none';
  }

  stopLoading() {
    this.isTranslating = false;
    this.loadingIndicator.classList.remove('active');
  }

  // ==========================================
  // TEXT TO SPEECH (TTS)
  // ==========================================
  toggleSingleTTS() {
    if (this.speech.isSpeaking()) {
      this.speech.stopSpeaking();
      this.btnSpeak.classList.remove('speaking');
      this.speakText.textContent = "Nghe đọc";
    } else {
      const text = this.currentSingleResult;
      const langMap = {
        ko: 'ko-KR',
        en: 'en-US',
        vi: 'vi-VN'
      };
      const lang = langMap[this.currentSingleLang] || 'vi-VN';

      this.speakText(text, lang, this.btnSpeak);
    }
  }

  speakText(text, lang, targetButton) {
    if (this.speech.isSpeaking()) {
      this.speech.stopSpeaking();
      if (targetButton) targetButton.classList.remove('speaking');
      return;
    }

    if (!text) return;

    if (targetButton) targetButton.classList.add('speaking');

    this.speech.speak({
      text,
      lang,
      onStart: () => {
        if (targetButton) targetButton.classList.add('speaking');
      },
      onEnd: () => {
        if (targetButton) targetButton.classList.remove('speaking');
      },
      onError: (msg) => {
        if (targetButton) targetButton.classList.remove('speaking');
        this.showToast(msg, "error");
      }
    });
  }

  // ==========================================
  // CLIPBOARD & UTILITIES
  // ==========================================
  async copyToClipboard(text, customToast) {
    if (!text) {
      this.showToast("Không có nội dung để sao chép!", "error");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      this.showToast(customToast || "Đã sao chép vào bộ nhớ tạm!", "success");
    } catch (err) {
      this.showToast("Không thể sao chép tự động. Vui lòng bôi đen bằng tay!", "error");
    }
  }

  showToast(message, type = "info", duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ==========================================
  // SETTINGS MODAL
  // ==========================================
  openSettingsModal() {
    this.settingsModal.classList.add('active');
    this.testKeyStatus.textContent = '';
    setTimeout(() => {
      this.inputApiKey.focus();
    }, 150);
  }

  closeSettingsModal() {
    this.settingsModal.classList.remove('active');
  }

  saveSettings() {
    const key = this.inputApiKey.value.trim();
    let model = this.selectModel.value;
    if (model === 'custom') {
      model = (this.inputCustomModel ? this.inputCustomModel.value.trim() : '') || window.APP_CONFIG.DEFAULT_MODEL;
    }

    window.StorageManager.setApiKey(key);
    window.StorageManager.setSelectedModel(model);

    this.checkApiKeyStatus(key);

    this.showToast(`Đã lưu cấu hình API (${model}) thành công!`, "success");
    this.closeSettingsModal();
  }

  async testApiKeyConnection() {
    const key = this.inputApiKey.value.trim();
    let model = this.selectModel.value;
    if (model === 'custom') {
      model = (this.inputCustomModel ? this.inputCustomModel.value.trim() : '') || window.APP_CONFIG.DEFAULT_MODEL;
    }

    if (!key) {
      this.testKeyStatus.innerHTML = `<span style="color:#ef4444;">Vui lòng nhập API Key trước khi kiểm tra!</span>`;
      return;
    }

    this.testKeyStatus.innerHTML = `<span style="color:#38bdf8;">Đang kiểm tra kết nối với Google Gemini (${model})...</span>`;

    try {
      await window.GeminiService.testConnection(key, model);
      this.testKeyStatus.innerHTML = `<span style="color:#10b981; font-weight:600;">✅ Kết nối thành công! Model ${model} hoạt động tốt.</span>`;
    } catch (e) {
      this.testKeyStatus.innerHTML = `<span style="color:#ef4444; font-weight:600;">❌ Kết nối thất bại: ${e.message}</span>`;
    }
  }

  // ==========================================
  // HISTORY MODAL
  // ==========================================
  openHistoryModal() {
    this.renderHistory();
    this.historyModal.classList.add('active');
  }

  closeHistoryModal() {
    this.historyModal.classList.remove('active');
  }

  renderHistory() {
    const history = window.StorageManager.getHistory();
    if (!this.historyList) return;

    if (history.length === 0) {
      this.historyList.innerHTML = `<div style="text-align:center; color:#64748b; padding:20px 0; font-size:0.85rem;">Chưa có lịch sử dịch thuật nào.</div>`;
      return;
    }

    this.historyList.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-meta">
          <span>${item.isBilingual ? '⚡ Song ngữ' : 'Ngôn ngữ: ' + item.targetLang.toUpperCase()}</span>
          <span>${item.timestamp || ''}</span>
        </div>
        <div class="history-source">${this.escapeHtml(item.sourceText)}</div>
        <div class="history-target">${this.escapeHtml(item.translatedText)}</div>
      </div>
    `).join('');

    this.historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.getAttribute('data-id'), 10);
        const found = history.find(h => h.id === id);
        if (found) {
          this.sourceText.value = found.sourceText;
          this.updateCharCount();
          this.autoResizeTextarea();
          if (found.isBilingual && found.korean && found.english) {
            this.currentMode = 'bilingual';
            this.currentBilingualResult = { korean: found.korean, english: found.english };
            this.renderBilingualOutput({ korean: found.korean, english: found.english, elapsedMs: 0, model: found.model || 'cached' });
          } else {
            this.currentMode = 'single';
            this.currentSingleLang = found.targetLang;
            this.currentSingleResult = found.translatedText;
            this.renderSingleOutput({ text: found.translatedText, targetLang: found.targetLang, elapsedMs: 0, model: found.model || 'cached' });
          }
          this.closeHistoryModal();
          this.showToast("Đã khôi phục bản dịch từ lịch sử!", "info");
        }
      });
    });
  }

  // ==========================================
  // SERVICE WORKER & PWA
  // ==========================================
  registerServiceWorker() {
    // Chỉ kích hoạt service worker khi chạy qua HTTP hoặc HTTPS
    if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('Service Worker đã đăng ký thành công:', reg.scope);
            if (reg.update) {
              reg.update();
            }
          })
          .catch(err => {
            console.warn('Lỗi đăng ký Service Worker:', err);
          });
      });
    }
  }
}

// Khởi chạy ứng dụng
document.addEventListener('DOMContentLoaded', () => {
  window.techTransApp = new TechTransApp();
});
