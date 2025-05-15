const axios = require('axios');
const cheerio = require('cheerio');

async function parseBlogPostContent(postUrl, fairTradeImageLinks) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0'
    };

    const res = await axios.get(postUrl, { headers });
    const $ = cheerio.load(res.data);

    const title = $('meta[property="og:title"]').attr('content') || '';

    // 날짜 추출
    let date = $('p.blog_date').text().trim();
    if (!date) date = $('span[class*="date"]').first().text().trim();

    const contentDiv = $('div.se-main-container').first();
    if (!contentDiv || contentDiv.length === 0) {
      console.warn(`❌ 본문 블럭이 없습니다: ${postUrl}`);
      return null;
    }

    const images = contentDiv.find('img');
    let firstImageUrl = '';
    let fairTradeImgUrl = '';
    let fairTradeImgPosition = 0;

    //console.log(`🔍 [${postUrl}] 이미지 수: ${images.length}`);

    images.each((i, el) => {
    const src = $(el).attr('src') || '';
    // console.log(`🔎 이미지 ${i + 1}: ${src}`);

    if (!src.startsWith('http')) {
      console.log(`⛔ 무시 (http로 시작하지 않음): ${src}`);
      return;
    }

    if (!firstImageUrl) {
      firstImageUrl = src;
      console.log(`📌 첫 번째 이미지로 등록됨: ${firstImageUrl}`);
    }

    for (const domain of fairTradeImageLinks) {
      if (src.includes(domain)) {
        fairTradeImgUrl = src;
        fairTradeImgPosition = i + 1;
        console.log(`✅ 공정위 이미지 발견: ${src} (도메인: ${domain}, 위치: ${fairTradeImgPosition})`);
        return false; // break
      }
    }
  });

    const allText = contentDiv.text().replace(/\s+/g, '').trim();
    const first100Chars = allText.slice(0, 200);

    const result = {
      title,
      url: postUrl,
      date,
      fair_trade_img_url: fairTradeImgUrl,
      fair_trade_img_position: fairTradeImgPosition,
      first_image_url: firstImageUrl,
      first_100_chars: first100Chars
    };

    console.log("📤 분석 결과 반환:", result);
    console.log("\n\n");

    return result;

  } catch (error) {
    const statusCode = error?.response?.status;

    if (statusCode === 429) {
      console.error(`❌ 429 감지됨: ${postUrl}`);
      const err = new Error("RATE_LIMITED");
      err.code = 429; // ✅ index.js에서 감지용
      throw err;
    }

    console.error(`⚠️ ${postUrl} 파싱 실패: ${error.message}`);
    return null;
  }
}

module.exports = { parseBlogPostContent };
