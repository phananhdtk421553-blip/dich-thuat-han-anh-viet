// ==========================================================================
// GEMINI_API.JS - MODULE KẾT NỐI GEMINI REST API (V1BETA) TỐC ĐỘ CAO
// ==========================================================================

window.GeminiService = class GeminiService {
  /**
   * Kiểm tra nhanh API Key có hoạt động hay không
   */
  static async testConnection(apiKey, model = window.APP_CONFIG.DEFAULT_MODEL) {
    if (!apiKey) {
      throw new Error("Vui lòng nhập Gemini API Key trước khi kiểm tra!");
    }

    const url = `${window.APP_CONFIG.GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: "Trả lời ngắn gọn chữ 'OK'" }]
        }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message = errData.error?.message || `Mã lỗi HTTP: ${response.status}`;
      throw new Error(message);
    }

    return true;
  }

  /**
   * Dịch văn bản đơn ngữ (Hàn, Anh hoặc Việt)
   */
  static async translate({ text, targetLang, apiKey, model = window.APP_CONFIG.DEFAULT_MODEL }) {
    if (!apiKey) {
      throw new Error("Chưa cấu hình Gemini API Key. Vui lòng bấm biểu tượng Cài đặt ⚙️ ở góc trên để nhập Key!");
    }

    if (!text || !text.trim()) {
      throw new Error("Nội dung dịch không được để trống!");
    }

    const langNames = {
      ko: "TIẾNG HÀN (Korean)",
      en: "TIẾNG ANH (English)",
      vi: "TIẾNG VIỆT (Vietnamese)"
    };

    const targetName = langNames[targetLang] || targetLang;
    const userPrompt = `Hãy dịch chính xác đoạn văn bản kỹ thuật sau sang ${targetName}.\n\nNội dung cần dịch:\n"""\n${text.trim()}\n"""`;

    const url = `${window.APP_CONFIG.GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
    const payload = {
      systemInstruction: {
        parts: [{ text: window.APP_CONFIG.SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2, // Nhiệt độ thấp để đảm bảo dịch kỹ thuật chuẩn xác, nhất quán
        maxOutputTokens: 2048
      }
    };

    const startTime = performance.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      let msg = errData.error?.message || `Lỗi máy chủ (${response.status})`;
      if (response.status === 400 && msg.includes("API key not valid")) {
        msg = "Gemini API Key không hợp lệ. Vui lòng kiểm tra lại trong phần Cài đặt!";
      } else if (response.status === 429) {
        msg = "Vượt quá hạn ngạch (Rate limit / Quota). Vui lòng thử lại sau giây lát!";
      }
      throw new Error(msg);
    }

    const data = await response.json();
    const rawResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return {
      result: rawResult.trim(),
      elapsedMs,
      model
    };
  }

  /**
   * Dịch TỰ ĐỘNG SONG NGỮ (Hàn + Anh) tối ưu gửi email, chat Teams, KakaoTalk
   */
  static async translateBilingual({ text, apiKey, model = window.APP_CONFIG.DEFAULT_MODEL }) {
    if (!apiKey) {
      throw new Error("Chưa cấu hình Gemini API Key. Vui lòng bấm biểu tượng Cài đặt ⚙️ ở góc trên để nhập Key!");
    }

    if (!text || !text.trim()) {
      throw new Error("Nội dung dịch không được để trống!");
    }

    const userPrompt = `Hãy dịch văn bản kỹ thuật dưới đây sang CẢ HAI NGÔN NGỮ: TIẾNG HÀN và TIẾNG ANH.
Định dạng bắt buộc trả về đúng 2 khối được ngăn cách bởi các thẻ sau (không thêm bất kỳ văn bản nào khác bên ngoài 2 thẻ):

---KOREAN---
[Bản dịch tiếng Hàn, kính ngữ công sở chuẩn mực ~합니다/습니다, ~바랍니다]

---ENGLISH---
[Bản dịch tiếng Anh kỹ thuật, chuẩn thuật ngữ quốc tế]

Văn bản cần dịch:
"""
${text.trim()}
"""`;

    const url = `${window.APP_CONFIG.GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
    const payload = {
      systemInstruction: {
        parts: [{ text: window.APP_CONFIG.SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 3072
      }
    };

    const startTime = performance.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      let msg = errData.error?.message || `Lỗi máy chủ (${response.status})`;
      if (response.status === 400 && msg.includes("API key not valid")) {
        msg = "Gemini API Key không hợp lệ. Vui lòng kiểm tra lại trong phần Cài đặt!";
      } else if (response.status === 429) {
        msg = "Vượt quá hạn ngạch (Rate limit / Quota). Vui lòng thử lại sau giây lát!";
      }
      throw new Error(msg);
    }

    const data = await response.json();
    const rawResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Phân tích tách khối KOREAN và ENGLISH
    let korean = "";
    let english = "";

    const koreanMatch = rawResult.match(/---KOREAN---([\s\S]*?)(?=---ENGLISH---|$)/i);
    const englishMatch = rawResult.match(/---ENGLISH---([\s\S]*?)$/i);

    if (koreanMatch && koreanMatch[1]) {
      korean = koreanMatch[1].trim();
    }
    if (englishMatch && englishMatch[1]) {
      english = englishMatch[1].trim();
    }

    if (!korean && !english) {
      korean = rawResult.trim();
      english = "";
    }

    return {
      korean,
      english,
      rawResult,
      elapsedMs,
      model
    };
  }
};
