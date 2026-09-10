// ==========================================================================
// SPEECH.JS - MODULE NHẬN DIỆN GIỌNG NÓI (STT) & PHÁT ÂM VĂN BẢN (TTS)
// (Tối ưu hóa đa nền tảng: Hỗ trợ iOS Safari, Android, Web & Hybrid Cloud TTS)
// ==========================================================================

window.SpeechManager = class SpeechManager {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.currentLang = "vi-VN";
    this.voices = [];
    this.synth = window.speechSynthesis || null;
    this.currentUtterance = null; // Khắc phục lỗi WebKit Garbage Collection trên Safari iOS
    this.currentAudio = null;
    this.audioElement = null;

    this.initRecognition();
    this.initVoices();
    this.initAudioPlayer();
  }

  initAudioPlayer() {
    this.audioElement = document.getElementById('ttsAudio');
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.id = 'ttsAudio';
      this.audioElement.setAttribute('playsinline', '');
      this.audioElement.setAttribute('preload', 'auto');
      if (document.body) {
        document.body.appendChild(this.audioElement);
      }
    }
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
      try {
        this.voices = this.synth.getVoices();
      } catch (e) {}
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
    return true; // Luôn hỗ trợ nhờ Hybrid Cloud Audio + Web Speech API
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
   * Phát âm thanh văn bản (TTS) - Cơ chế Hybrid thông minh:
   * 1. Thử phát bằng Cloud Neural Audio (chất giọng chuẩn người bản xứ, hoạt động 100% trên iPhone không cần cài gói giọng)
   * 2. Tự động fallback sang Web Speech Synthesis cục bộ nếu offline hoặc lỗi mạng
   */
  speak({ text, lang = "vi-VN", onStart, onEnd, onError }) {
    this.stopSpeaking();

    if (!text || !text.trim()) {
      if (onError) onError("Không có nội dung để phát âm.");
      return;
    }

    // Làm sạch các ký hiệu đặc biệt, giữ lại nội dung cần đọc
    const cleanText = text
      .replace(/[#*`_~\[\]\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const shortLang = lang.split('-')[0].toLowerCase(); // 'ko', 'en', 'vi'

    // Thử phát bằng Cloud Audio trước (hoạt động tốt nhất trên iOS Safari)
    this.speakCloudAudio({
      text: cleanText,
      langCode: shortLang,
      onStart,
      onEnd,
      onErrorFallback: () => {
        // Fallback sang Web Speech API nếu cloud audio gặp lỗi hoặc offline
        this.speakWebSpeech({ text: cleanText, lang, onStart, onEnd, onError });
      }
    });
  }

  speakCloudAudio({ text, langCode, onStart, onEnd, onErrorFallback }) {
    if (!this.audioElement) {
      this.initAudioPlayer();
    }

    const chunks = this.splitIntoChunks(text, 180);
    let chunkIndex = 0;

    const playNext = () => {
      if (chunkIndex >= chunks.length) {
        this.currentAudio = null;
        if (onEnd) onEnd();
        return;
      }

      const chunk = chunks[chunkIndex++];
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(chunk)}`;

      const audio = this.audioElement || new Audio();
      this.currentAudio = audio;
      audio.src = url;

      audio.onended = () => {
        playNext();
      };

      audio.onerror = (e) => {
        console.warn("Lỗi Cloud TTS audio, chuyển sang Web Speech API:", e);
        if (onErrorFallback) onErrorFallback();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          if (chunkIndex === 1 && onStart) {
            onStart();
          }
        }).catch(err => {
          console.warn("Trình duyệt chặn tự động phát audio:", err);
          if (onErrorFallback) onErrorFallback();
        });
      }
    };

    playNext();
  }

  splitIntoChunks(text, maxLen = 180) {
    if (text.length <= maxLen) return [text];
    const sentences = text.match(/[^.!?;\n]+[.!?;\n]*/g) || [text];
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + ' ' + sentence).trim().length <= maxLen) {
        current = (current + ' ' + sentence).trim();
      } else {
        if (current) chunks.push(current);
        if (sentence.length <= maxLen) {
          current = sentence.trim();
        } else {
          const words = sentence.split(' ');
          let wordChunk = '';
          for (const word of words) {
            if ((wordChunk + ' ' + word).trim().length <= maxLen) {
              wordChunk = (wordChunk + ' ' + word).trim();
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = word;
            }
          }
          if (wordChunk) current = wordChunk;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  speakWebSpeech({ text, lang = "vi-VN", onStart, onEnd, onError }) {
    if (!this.synth) {
      if (onError) onError("Trình duyệt không hỗ trợ phát âm thanh.");
      return;
    }

    try {
      this.synth.cancel();

      // Mở khóa AudioContext cho Safari iOS nếu bị suspended
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioCtx) this.audioCtx = new AudioCtx();
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
      }

      const utterance = new SpeechSynthesisUtterance(text);
      // Giữ tham chiếu để tránh bị Safari Garbage Collector xóa giữa chừng
      this.currentUtterance = utterance;

      utterance.lang = lang;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Không ép chọn voice trên iOS để iOS tự chọn voice mặc định khả dụng
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!isIOS) {
        const matchedVoice = this.findBestVoice(lang);
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        console.error("Lỗi Web Speech Synthesis:", e);
        if (onError) onError("Không thể phát âm thanh.");
      };

      this.synth.speak(utterance);
    } catch (e) {
      this.currentUtterance = null;
      console.error("Lỗi speakWebSpeech:", e);
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
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {}
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.currentUtterance = null;
  }

  isSpeaking() {
    const isAudioPlaying = this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended;
    const isElemPlaying = this.audioElement && !this.audioElement.paused && !this.audioElement.ended && this.audioElement.currentTime > 0;
    const isSynthSpeaking = this.synth && this.synth.speaking;
    return !!(isAudioPlaying || isElemPlaying || isSynthSpeaking);
  }
};
