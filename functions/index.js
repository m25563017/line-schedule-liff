// functions/index.js
const functions = require("firebase-functions");
const line = require("@line/bot-sdk");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

require("dotenv").config();

const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

exports.lineWebhook = functions.https.onRequest(async (req, res) => {
    // 1. 簽章驗證 (略，同前一次教學)

    const events = req.body.events;
    const results = await Promise.all(
        events.map(async (event) => {
            if (event.type === "message" && event.message.type === "text") {
                const userText = event.message.text;

                // 當使用者輸入 "/約 [活動名稱]"
                if (userText.startsWith("/約 ")) {
                    const title = userText.replace("/約 ", "").trim();

                    // 1. 在 Firestore 建立一個「虛擬群組 (Event)」
                    const docRef = await db.collection("events").add({
                        title: title,
                        hostId: event.source.userId, // 發起人
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        // 設定 3 個月後自動刪除 (TTL 欄位)
                        expireAt: admin.firestore.Timestamp.fromDate(
                            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                        ),
                        participants: {}, // 準備存大家的空檔
                    });

                    // 2. 產生邀請連結 (這就是 Lightsplit 模式的靈魂！)
                    // 把 eventId 帶在 URL 參數裡
                    const liffUrl = `https://liff.line.me/你的_LIFF_ID?eventId=${docRef.id}`;

                    // 3. 回傳漂亮的卡片給使用者
                    return client.replyMessage(event.replyToken, {
                        type: "flex",
                        altText: "邀請您填寫時間",
                        contents: {
                            type: "bubble",
                            body: {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: "📅 新活動建立囉！",
                                        weight: "bold",
                                        color: "#1DB446",
                                    },
                                    {
                                        type: "text",
                                        text: title,
                                        size: "xl",
                                        weight: "bold",
                                        margin: "md",
                                    },
                                    {
                                        type: "text",
                                        text: "請將下方連結分享給朋友，大家一起來填寫有空的時間。",
                                        wrap: true,
                                        color: "#aaaaaa",
                                        size: "sm",
                                        margin: "md",
                                    },
                                ],
                            },
                            footer: {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "button",
                                        style: "primary",
                                        color: "#1DB446",
                                        action: {
                                            type: "uri",
                                            label: "👉 點我填寫時間",
                                            uri: liffUrl,
                                        },
                                    },
                                ],
                            },
                        },
                    });
                }
            }
            return Promise.resolve(null);
        })
    );

    res.json(results);
});
