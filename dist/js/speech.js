// ==========================================================================
// SPEECH.JS - MODULE NHẬN DIỆN GIỌNG NÓI (STT) & PHÁT ÂM VĂN BẢN (TTS)
// ==========================================================================

window.SpeechManager = class SpeechManager {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.currentLang = "vi-VN";
    this.voices = [];
    this.synth = window.speechSynthesis || null;

    this.initRecognition();
    this.initVoices();
  }

  /**
   * Khởi tạo Web Speech Recognition (STT)
   */
  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Trình duyệt này không hỗ trợ Web Speech API Recognition.");
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
    } catch (e) {
      console.error("Không thể khởi tạo SpeechRecognition:", e);
    }
  }

  /**
   * Khởi tạo danh sách giọng đọc TTS
   */
  initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      this.voices = this.synth.getVoices();
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  isSTTSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  isTTSSupported() {
    return !!window.speechSynthesis;
  }

  /**
   * Bắt đầu thu âm giọng nói (STT)
   */
  startRecording({ lang = "vi-VN", onResult, onStart, onEnd, onError }) {
    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      if (onError) onError("Trình duyệt không hỗ trợ nhận diện giọng nói (Web Speech STT). Vui lòng dùng Chrome hoặc Edge.");
      return;
    }

    this.currentLang = lang;
    this.recognition.lang = lang;

    let finalTranscript = "";

    this.recognition.onstart = () => {
      this.isRecording = true;
      if (onStart) onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (onResult) {
        onResult({
          final: finalTranscript.trim(),
          interim: interimTranscript.trim()
        });
      }
    };

    this.recognition.onerror = (event) => {
      this.isRecording = false;
      let msg = "Lỗi nhận diện giọng nói: " + event.error;
      if (event.error === 'not-allowed') {
        if (window.location.protocol === 'file:') {
          msg = "Trình duyệt chặn Micro khi mở trực tiếp file://. Vui lòng chạy file RUN_LOCAL.bat hoặc deploy lên Vercel để dùng Micro!";
        } else {
          msg = "Quyền Micro bị từ chối. Vui lòng cho phép Micro trên thanh địa chỉ trình duyệt!";
        }
      } else if (event.error === 'no-speech') {
        msg = "Không phát hiện thấy giọng nói. Vui lòng thử nói lại!";
      }
      if (onError) onError(msg);
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      if (onEnd) onEnd(finalTranscript.trim());
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn("Recognition start error:", e);
      if (onError) onError("Không thể khởi động Micro. Vui lòng thử lại!");
    }
  }

  stopRecording() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    }
  }

  /**
   * Phát âm thanh văn bản (TTS)
   */
  speak({ text, lang = "vi-VN", onStart, onEnd, onError }) {
    if (!this.synth) {
      if (onError) onError("Trình duyệt không hỗ trợ phát âm thanh Text-To-Speech.");
      return;
    }

    this.stopSpeaking();

    if (!text || !text.trim()) {
      if (onError) onError("Không có nội dung để phát âm.");
      return;
    }

    const cleanText = text
      .replace(/[#*`_~\[\]()\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const matchedVoice = this.findBestVoice(lang);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.error("Lỗi phát âm:", e);
      if (onError) onError("Lỗi khi phát âm thanh.");
    };

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.error("Synth speak exception:", e);
      if (onError) onError("Không thể khởi động bộ phát âm.");
    }
  }

  findBestVoice(langPrefix) {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth ? this.synth.getVoices() : [];
    }

    const shortLang = langPrefix.split('-')[0].toLowerCase();
    const priorityVoices = this.voices.filter(v => 
      v.lang.toLowerCase().startsWith(shortLang)
    );

    if (priorityVoices.length === 0) return null;

    const best = priorityVoices.find(v => 
      v.name.includes("Natural") || 
      v.name.includes("Google") || 
      v.name.includes("Online") ||
      v.name.includes("Premium")
    );

    return best || priorityVoices[0];
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  isSpeaking() {
    return this.synth ? this.synth.speaking : false;
  }
};
