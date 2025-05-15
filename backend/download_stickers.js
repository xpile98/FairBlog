const axios = require('axios');
const Tesseract = require('tesseract.js');

// 공정위 관련 키워드 (포함 시 "정책 지킴")
const fairTextKeywords = [
  "제공받", "광고", "협찬", "무상", "제품", "업체로부터",
  "파트너스", "이벤트", "유료광고", "원고료", "수수료",
  "숙박권", "체험단", "체험"
];

// 제외 키워드 (포함 시 "정책 아님")
const exclusionKeywords = ["내돈내산", "솔직후기"];

// OCR 후 텍스트에서 공정위 문구 판단
function checkFairPolicy(text) {
  const clean = text.toLowerCase().replace(/\s+/g, '');

  // 제외 키워드 먼저 확인
  for (const excl of exclusionKeywords) {
    if (clean.includes(excl)) return "❌ 제외 키워드 포함 (정책 아님)";
  }

  // 공정위 키워드 확인
  for (const fair of fairTextKeywords) {
    if (clean.includes(fair)) return "🟢 정책 지킴 (공정위 문구 감지)";
  }

  return "⚪ 불분명 (공정위 문구 없음)";
}

// 이미지 URL에서 OCR 실행
const runOCR = async (url, index) => {
  try {
    const { data } = await axios.get(url, { responseType: 'arraybuffer' });

    const result = await Tesseract.recognize(data, 'kor+eng');
    const rawText = result.data.text;
    const cleanText = rawText.replace(/\s+/g, ''); // 띄어쓰기/줄바꿈 제거

    const policyCheck = checkFairPolicy(cleanText);

    console.log(`🔤 OCR: ${cleanText}`);
    //console.log(`🔎 판단: ${policyCheck}`);
    //console.log('--------------------------');

  } catch (err) {
    console.error(`❌ original_${index}.png OCR 실패:`, err.message);
  }
};

// 메인 실행
(async () => {
  const imageIds = [
    "63395b92e902d",
    "63136bca438ca",
    "6269eb6f1046a",
    "6346495684c89",
    "62b8ded19222c",
    "6267b48849dfb",
    "634889481e2b4",
    "63305b17cb638",
    "632426bcb122d",
    "5a5ff364e96bc",
    "634ebaac6ec9b",
    "6338748de6a18",
    "62d469f24cc6c",
    "5ca845bf97841",
    "5b7813b4be670",
    "62dff857fe7ef",
    "5b3ff57de426b",
    "5a558da2e2a83",
    "634ea596ad62d",
    "6340575e72111",
    "633c28517ac5a",
    "63389674524fe",
    "63122a828f956",
    "630d196777b95",
    "62d4d31819238",
    "62b08102f9476",
    "60b5aaca54f25",
    "6079269d8fbea",
    "5db07acaaea31",
    "631d4a9ceeb92",
    // 필요한 만큼 추가하세요
  ];

  for (const imageId of imageIds) {
    const baseUrl = `https://storep-phinf.pstatic.net/ogq_${imageId}/original_`;

    for (let i = 1; i <= 24; i++) {
      const url = `${baseUrl}${i}.png?type=m240_240`;
      await runOCR(url, i);
    }
  }
})();
