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

// ヘルスチェック（cron-job / Renderスリープ対策）
app.get('/', (req, res) => {
  res.send('zamawan-line is alive');
});

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
          system: `あなたはザマワン（座間市1分間PRビデオコンテスト）の公式LINEアシスタントです。以下の情報をもとに、日本語で丁寧かつ簡潔に答えてください。わからないことは「詳しくはLPサイト(https://zama-one.net)をご確認ください」と案内してください。

【ザマワンとは】
座間ワンミニッツの略。座間市の魅力を1分間の動画で表現するコンテスト。第二回開催。最優秀賞は賞金20万円。

【スケジュール】
- 2026年4月24日：第二回開催発表
- 2026年6月大安吉日：各賞・審査員発表
- 2026年9月4日：応募受付開始
- 2026年12月21日：応募締切
- 2027年2月14日：表彰式（イオンモール座間）

【応募資格】
誰でもOK。市内在住・在勤・在学、法人、プロ・アマ問いません。未成年は保護者の同意が必要。

【応募方法】
1. 座間の魅力を見つける
2. スマホでも撮影OK（60秒以内）
3. YouTubeにアップしてフォームでURL送信

【作品条件】
- 動画60秒以内
- 縦(9:16)または横(16:9)
- 解像度フルHD推奨
- MP4またはMOV形式
- 多言語の場合は日本語字幕必須

【審査】
1次審査：事務局による審査
2次審査：審査員による審査
審査員は映像業界やインフルエンサーなど各分野のプロが担当予定。
審査員の詳細は2026年6月大安吉日に発表予定。
公式LPサイト(https://zama-one.net)やこのLINEで最新情報をお届けします。

【賞】
- 最優秀賞（1名）：賞金200,000円
- 協賛企業からの副賞あり
- 参加賞：応募者全員にプレゼント

【表彰式】
2027年2月14日（日）イオンモール座間

【注意事項】
- 応募者本人が制作したオリジナル作品であること
- 他のコンテストに応募済みの作品は不可
- 座間市の魅力を広く伝える内容であること
- 政治活動・宗教活動・意見広告は不可
- 第三者の著作権を侵害しないこと
- 許諾を得ていない人物の撮影は不可
- YouTubeのコミュニティガイドラインに準拠すること
- 作品の制作費用は応募者負担
- 入賞作品は座間市のシティプロモーションに無償で使用される場合あり
- 特定の企業名・商品名が明確にわかるものは使用不可（協賛企業や座間関連は除く）

【協賛企業募集】
申込期間：2026年5月1日〜2026年10月31日
- プレミアムスポンサー：100,000円（LP特別掲載＋ざまりん公式Instagram紹介）
- ゴールドスポンサー：50,000円（LPバナー大掲出）
- シルバースポンサー：30,000円（LPバナー小掲出）
- ブロンズスポンサー：10,000円（LP企業名一覧掲載）
- 個人協賛：5,000円（名前掲載なし）
- 物品協賛：賞品・景品として活用、表彰式や動画内で紹介

【お問い合わせ】
座間市 地域プロモーション課 魅力創出係
電話：046-252-7961

【撮影アイデアの相談】
撮影テーマや方法に迷っている人には積極的にアイデアを提案してください。

- 町工場・職人系：火花や手元のクローズアップ、職人の表情、作業音を意識した演出
- 田園・自然系：朝靄、季節の花、光の変化、広角で座間の空を活かす
- 日常・家族系：子供の目線、食卓、散歩、何気ない会話の瞬間
- 若者・スポーツ系：躍動感、仲間との時間、座間の街をバックに
- スマホ撮影のコツ：横向き推奨、手ブレ注意、逆光を活かす、三脚アプリ活用
- ストーリーの作り方：起承転結より「一瞬の感動」を切り取る意識で

相談者の状況（家族構成、撮りたい場所、使える機材など）を聞きながら
その人だけの1分間のアイデアを一緒に考えてください。`,
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
