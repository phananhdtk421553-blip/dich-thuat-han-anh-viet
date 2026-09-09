// ==========================================================================
// CONFIG.JS - HỆ THỐNG CẤU HÌNH & SYSTEM PROMPT CHUYÊN GIA DỊCH THUẬT PE/QC
// (Cập nhật Model mới nhất theo Google AI Studio: gemini-3.6-flash)
// ==========================================================================

window.APP_CONFIG = {
  APP_NAME: "TechTrans K-E-V",
  APP_SUBTITLE: "Hệ thống dịch thuật kỹ thuật công nghiệp (Hàn - Anh - Việt)",
  APP_VERSION: "1.0.2",

  // Gemini API Configuration - Mặc định gemini-3.6-flash theo chuẩn mới nhất
  DEFAULT_MODEL: "gemini-3.6-flash",
  AVAILABLE_MODELS: [
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash (Chuẩn mới nhất của Google - Khuyên dùng)" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash (Tốc độ cao nhất)" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Bản ổn định)" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Bản cũ)" }
  ],
  GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/models",

  // Storage Keys (localStorage)
  STORAGE_KEYS: {
    API_KEY: "techtrans_gemini_api_key",
    MODEL: "techtrans_selected_model",
    INPUT_LANG: "techtrans_input_speech_lang",
    HISTORY: "techtrans_translation_history",
    THEME: "techtrans_ui_theme"
  },

  // Supported Speech Languages
  SPEECH_LANGS: [
    { code: "vi-VN", name: "Tiếng Việt (vi-VN)", flag: "🇻🇳" },
    { code: "ko-KR", name: "Tiếng Hàn (ko-KR)", flag: "🇰🇷" },
    { code: "en-US", name: "Tiếng Anh (en-US)", flag: "🇺🇸" }
  ],

  // Strict Industrial System Instruction (Quy tắc kỹ thuật bắt buộc)
  SYSTEM_INSTRUCTION: `Bạn là chuyên gia dịch thuật kỹ thuật cao cấp với 20 năm kinh nghiệm trong ngành sản xuất công nghiệp, cơ khí chính xác và lắp ráp pin/điện tử Hàn Quốc (PE, QC, R&D, Production).
QUY TẮC BẮT BUỘC:
1. Độ chính xác kỹ thuật: Dịch sát ngữ cảnh nhà máy và dây chuyền sản xuất.
2. Thuật ngữ quốc tế: Luôn giữ lại thuật ngữ kỹ thuật tiếng Anh phổ biến và đặt trong ngoặc đơn ở lần xuất hiện đầu tiên (ví dụ: Swelling, Relief, Jig, Clearance, Defect, Pack, Cell...).
3. Văn phong tiếng Hàn: Sử dụng kính ngữ công sở chuẩn mực doanh nghiệp Hàn Quốc (đuôi câu ~합니다/습니다, ~바랍니다, chức danh + 님).
4. Định dạng: Trả lời trực tiếp nội dung đã dịch, định dạng gạch đầu dòng rõ ràng nếu là nội dung liệt kê/hướng dẫn. Tuyệt đối không thêm lời chào hỏi, mở bài hoặc kết luận rườm rà.`
};
