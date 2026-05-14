const crypto = require("crypto");

exports.handler = async (event) => {
  const CHANNEL_SECRET = "386ffcf066658de55bf2724e1deab131";
  const ACCESS_TOKEN = "4c+gYwk/KoCpNcgZUAmEgHBiFt+tr2JAr/IKSD2UlMkkWnjeb6xntooijmq+y+SzUnVyRjMngxuvsmqhyuKsDIRJhz4OM/5KYp81HsEk1g9mXzc7X+sa6fTQx3mRvrXHRNfzciiwni8XhEpQthwCLgdB04t89/1O/w1cDnyiIFU=";
  const CLAUDE_API_KEY = "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";

  // 署名検証
  const signature = event.headers["x-line-signature"];
  const hmac = crypto.createHmac("sha256", CHANNEL_SECRET);
  hmac.update(event.body);
  const digest = hmac.digest("base64");
  if (signature !== digest) {
    return { statusCode: 403, body: "Forbidden" };
  }

  const body = JSON.parse(event.body);
  const events = body.events;

  for (const lineEvent of events) {
    if (lineEvent.type !== "message" || lineEvent.message.type !== "text") continue;

    const userMessage = lineEvent.message.text;
    const replyToken = lineEvent.replyToken;

    // Claude APIに送信
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 500,
        system: `あなたはザマワン（座間市1分間PRビデオコンテスト）の公式アシスタントです。
応募方法、スケジュール、審査基準などの質問に日本語で簡潔に答えてください。
わからないことは「詳しくはLPサイトをご確認ください」と案内してください。`,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const claudeData = await claudeRes.json();
    const replyText = claudeData.content[0].text;

    // LINEに返信
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

  return { statusCode: 200, body: "OK" };
};