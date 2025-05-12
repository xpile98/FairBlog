const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { parseBlogPostContent } = require('./parsePost'); // 반드시 존재해야 함

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json()); // ✅ JSON 요청 파싱

console.log("✅ Express 앱 준비됨");

// POST 방식으로 blogId + 공정위 도메인 리스트 수신
app.post('/analyze_blog', async (req, res) => {
  const { blogId, fairTradeImageLinks } = req.body;
  const allPosts = [];
  const maxPages = 1;

  if (!blogId || !Array.isArray(fairTradeImageLinks)) {
    return res.status(400).json({ error: "잘못된 요청입니다 (blogId 또는 링크 리스트 없음)" });
  }

  try {
    for (let page = 1; page <= maxPages; page++) {
      const url = `https://m.blog.naver.com/api/blogs/${blogId}/post-list?categoryNo=0&itemCount=24&page=${page}&userId=${blogId}`;
      const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Referer': `https://m.blog.naver.com/${blogId}`
      };

      const response = await axios.get(url, { headers });
      const items = response.data.result?.items || [];
      console.log(`📄 페이지 ${page}에서 ${items.length}건 수신됨`);

      if (items.length === 0) break;

      for (const item of items) {
        const logNo = item.logNo;
        const domainId = item.domainIdOrBlogId;
        const postUrl = `https://m.blog.naver.com/${domainId}/${logNo}`;

        const parsed = await parseBlogPostContent(postUrl, fairTradeImageLinks);
        if (parsed) allPosts.push(parsed);
      }
    }

    res.json({ posts: allPosts });

  } catch (err) {
    console.error("❌ 분석 중 오류:", err.message);
    res.status(500).json({ error: "블로그 분석 실패" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});

// Express 서버에 추가
app.get('/proxy', async (req, res) => {
  const imageUrl = decodeURIComponent(req.query.url);
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://m.blog.naver.com'
      }
    });
    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (err) {
    console.error('프록시 에러:', err.message);
    res.status(500).send('프록시 실패');
  }
});
