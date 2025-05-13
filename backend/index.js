const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { parseBlogPostContent } = require('./parsePost'); // 반드시 존재해야 함

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // ✅ JSON 요청 파싱

console.log("✅ Express 앱 준비됨");

app.post('/analyze_blog', async (req, res) => {
  const { blogId, numPages = 1, fairTradeImageLinks = [] } = req.body;

  if (!blogId || !Array.isArray(fairTradeImageLinks)) {
    return res.status(400).json({ error: "잘못된 요청입니다 (blogId 또는 링크 리스트 없음)" });
  }

  try {
    const allPosts = [];

    for (let page = numPages; page <= numPages; page++) {
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

      const parsePromises = items.map(item => {
        const logNo = item.logNo;
        const domainId = item.domainIdOrBlogId;
        const postUrl = `https://m.blog.naver.com/${domainId}/${logNo}`;
        return parseBlogPostContent(postUrl, fairTradeImageLinks);
      });

      const results = await Promise.allSettled(parsePromises);

      for (const result of results) {
        if (result.status === "rejected" && result.reason?.code === 429) {
          console.error("❌ 429 감지됨: 분석 중단");
          return res.status(429).json({
            error: "요청이 너무 많아 분석이 차단되었습니다. 잠시 후 다시 시도해주세요."
          });
        }

        if (result.status === "fulfilled" && result.value) {
          allPosts.push(result.value);
        }
      }
    }

    res.json({ posts: allPosts });

  } catch (err) {
    console.error("❌ 분석 중 오류:", err.message);
    res.status(500).json({ error: "블로그 분석 실패" });
  }
});

// 게시글 메타만 가져오는 API
app.post('/analyze_blog_meta', async (req, res) => {
  const { blogId, numPages = 1 } = req.body;

  if (!blogId) {
    return res.status(400).json({ error: "blogId가 없습니다" });
  }

  try {
    const allItems = [];
    for (let page = 1; page <= numPages; page++) {
      const url = `https://m.blog.naver.com/api/blogs/${blogId}/post-list?categoryNo=0&itemCount=24&page=${page}&userId=${blogId}`;
      const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Referer': `https://m.blog.naver.com/${blogId}`
      };

      const response = await axios.get(url, { headers });
      const items = response.data.result?.items || [];
      if (items.length === 0) break;

      allItems.push(...items.map(item => ({
        logNo: item.logNo,
        domainId: item.domainIdOrBlogId
      })));
    }

    res.json({ items: allItems });

  } catch (err) {
    console.error("메타 로딩 실패:", err.message);
    res.status(500).json({ error: "메타 요청 실패" });
  }
});


app.post('/get_post_list', async (req, res) => {
  const { blogId, pageNum = 1 } = req.body;

  // ✅ 여기에 로그 추가!
  console.log(`📥 [post-list 요청] blogId=${blogId}, pageNum=${pageNum}`);
  
  if (!blogId) {
    return res.status(400).json({ error: "블로그 ID가 없습니다" });
  }

  try {
    const url = `https://m.blog.naver.com/api/blogs/${blogId}/post-list?categoryNo=0&itemCount=24&page=${pageNum}&userId=${blogId}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'Referer': `https://m.blog.naver.com/${blogId}`
    };

    const response = await axios.get(url, { headers });
    const items = response.data.result?.items || [];

    res.json({ items });
  } catch (err) {
    console.error("🛑 목록 가져오기 실패:", err.message);
    res.status(500).json({ error: "블로그 목록 가져오기 실패" });
  }
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

// 하나의 포스트 URL을 분석하는 API
app.post('/analyze_single', async (req, res) => {
  const { postUrl, fairTradeImageLinks } = req.body;

  if (!postUrl || !Array.isArray(fairTradeImageLinks)) {
    return res.status(400).json({ error: "잘못된 요청입니다 (postUrl 또는 링크 없음)" });
  }

  try {
    const parsed = await parseBlogPostContent(postUrl, fairTradeImageLinks);
    if (!parsed) return res.status(204).send(); // 파싱 실패 시 응답 없음
    res.json(parsed);
  } catch (err) {
    console.error("단일 분석 실패:", err.message);
    res.status(500).json({ error: "단일 포스트 분석 실패" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
