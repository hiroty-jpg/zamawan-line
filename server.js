const express = require("express");
const crypto = require("crypto");

const app = express();

const CHANNEL_SECRET = "386ffcf066658de55bf2724e1deab131";
const ACCESS_TOKEN = "4c+gYwk/KoCpNcgZUAmEgHBiFt+tr2JAr/IKSD2UlMkkWnjeb6xntooijmq+y+SzUnVyRjMngxuvsmqhyuKsDIRJhz4OM/5KYp81HsEk1g9mXzc7X+sa6fTQx3mRvrXHRNfzciiwni8XhEpQthwCLgdB04t89/1O/w1cDnyiIFU=";
const CLAUDE_API_KEY = "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";

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

app.post("/webhook", async (req, res) => {
  const signature = req.headers["x-line-signature"];
  const hmac = crypto.createHmac("sha256", CHANNEL_SECRET);
  hmac.update(req.rawBody);
  const digest = hmac.digest("base64");
  if (signature !== digest) return res.status(403).send("Forbidden");

  res.status(200).send("OK");

  const events = req.body.events;
  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;

    const userMessage = event.message.text;
    const replyToken = event.replyToken;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `あなたはザマワン（座間市1分間PRビデオコンテスト）の公式アシスタントです。応募方法、スケジュール、審査基準などの質問に日本語で簡潔に答えてください。わからないことは「詳しくはLPサイト(https://zama-one.net)をご確認ください」と案内してください。`,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const claudeData = await claudeRes.json();
    const replyText = claudeData.content[0].text;

    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text: replyText }]
      })
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
