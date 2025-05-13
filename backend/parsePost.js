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

    const images = contentDiv.find('img').toArray();
    let firstImageUrl = '';
    let fairTradeImgUrl = '';
    let fairTradeImgPosition = 0;

    console.log(`🔍 [${postUrl}] 이미지 수: ${images.length}`);

    for (let i = 0; i < images.length; i++) {
      const src = $(images[i]).attr('src') || '';
      if (!src.startsWith('http')) continue;

      if (!firstImageUrl) firstImageUrl = src;

      if (fairTradeImageLinks.some(domain => src.includes(domain))) {
        fairTradeImgUrl = src;
        fairTradeImgPosition = i + 1;
        break; // ✅ 첫 공정위 이미지만 찾으면 종료
      }
    }

    const allText = contentDiv.text().replace(/\s+/g, '').trim();
    const first100Chars = allText.slice(0, 100);

    return {
      title,
      url: postUrl,
      date,
      fair_trade_img_url: fairTradeImgUrl,
      fair_trade_img_position: fairTradeImgPosition,
      first_image_url: firstImageUrl,
      first_100_chars: first100Chars
    };

  } catch (error) {
    console.error(`❌ ${postUrl} 파싱 중 오류:`, error.message);
    return null;
  }
}

module.exports = { parseBlogPostContent };
