const express = require('express');
const crypto = require('crypto');
const app = express();

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-line-signature'];
  const hmac = crypto.createHmac('sha256', LINE_CHANNEL_SECRET);
  hmac.update(req.rawBody);
  const digest = hmac.digest('base64');
  if (digest !== signature) return res.status(401).send('Unauthorized');

  res.sendStatus(200);
  handleEvents(req.body.events);
});

async function handleEvents(events) {
  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue;

    const userMessage = event.message.text;
    const replyToken = event.replyToken;

    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 500,
          system: 'あなたはザマワン（座間市1分間PRビデオコンテスト）の公式アシスタントです。応募方法、スケジュール、審査基準などの質問に日本語で簡潔に答えてください。わからないことは「詳しくはLPサイト(https://zama-one.net)をご確認ください」と案内してください。',
          messages: [{ role: 'user', content: userMessage }]
        })
      });

      const claudeData = await claudeRes.json();
      const replyText = claudeData?.content?.[0]?.text || 'すみません、少し問題が発生しました。もう一度お試しください。';

      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: 'text', text: replyText }]
        })
      });
    } catch (err) {
      console.error('Error:', err);
    }
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
