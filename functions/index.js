// functions/index.js
// 透過聊天室打開 LIFF 服務頁面，不在聊天室建立活動
// 主揪可發送 LINE Flex：提醒尚未填寫的成員、定案時通知所有成員（不需機器人進群組）
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

const LIFF_ID = process.env.LIFF_ID || "2008922865-iLv6kFaA";

function eventPageUrl(groupId, eventId) {
    return `https://liff.line.me/${LIFF_ID}#/group/${groupId}/event/${eventId}`;
}

const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;

function createOpenServiceMessage() {
    return {
        type: "flex",
        altText: "打開共編排程",
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "共編排程",
                        weight: "bold",
                        size: "xl",
                        color: "#1DB446",
                    },
                    {
                        type: "text",
                        text: "點擊下方按鈕開啟服務，建立群組、發起活動、與朋友一起喬時間。",
                        wrap: true,
                        color: "#666666",
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
                            label: "打開排程",
                            uri: LIFF_URL,
                        },
                    },
                ],
            },
        },
    };
}

// Flex：提醒尚未填寫空檔
function createRemindFillFlex(eventTitle, groupId, eventId) {
    const uri = eventPageUrl(groupId, eventId);
    return {
        type: "flex",
        altText: "請填寫活動空檔",
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: "共編排程 提醒", weight: "bold", size: "sm", color: "#1DB446" },
                    { type: "text", text: eventTitle, weight: "bold", size: "xl", margin: "md" },
                    { type: "text", text: "主揪提醒你填寫有空的日期，點下方按鈕前往填寫。", wrap: true, color: "#666666", size: "sm", margin: "md" },
                ],
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "button", style: "primary", color: "#1DB446", action: { type: "uri", label: "去填寫", uri } },
                ],
            },
        },
    };
}

// Flex：定案日期＋時間通知
function createFinalizedFlex(eventTitle, finalDate, finalTime, groupId, eventId) {
    const uri = eventPageUrl(groupId, eventId);
    const displayDate = finalDate.replace(/-/g, " / ");
    const dateTimeText = finalTime
        ? `定案：${displayDate} ${finalTime}`
        : `定案日期：${displayDate}`;
    return {
        type: "flex",
        altText: "活動日期已定案",
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: "共編排程 定案通知", weight: "bold", size: "sm", color: "#1DB446" },
                    { type: "text", text: eventTitle, weight: "bold", size: "xl", margin: "md" },
                    { type: "text", text: dateTimeText, weight: "bold", size: "lg", margin: "md" },
                    { type: "text", text: "已由主揪拍板，點下方可查看活動。", wrap: true, color: "#666666", size: "sm", margin: "sm" },
                ],
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "button", style: "primary", color: "#1DB446", action: { type: "uri", label: "查看活動", uri } },
                ],
            },
        },
    };
}

function setCors(res, req) {
    const origin = (req && req.headers && req.headers.origin) || "";
    res.set("Access-Control-Allow-Origin", origin.startsWith("https://liff.line.me") ? origin : "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
}

exports.lineWebhook = functions.https.onRequest(async (req, res) => {
    const events = req.body.events || [];
    const results = await Promise.all(
        events.map(async (event) => {
            try {
                // 加好友時：歡迎訊息 + 打開服務按鈕
                if (event.type === "follow") {
                    return client.replyMessage(
                        event.replyToken,
                        createOpenServiceMessage(),
                    );
                }
                // 收到文字訊息時：引導用戶點按鈕打開 LIFF 服務頁面
                if (event.type === "message" && event.message.type === "text") {
                    return client.replyMessage(
                        event.replyToken,
                        createOpenServiceMessage(),
                    );
                }
            } catch (err) {
                console.error("Webhook reply error", err);
            }
            return Promise.resolve(null);
        }),
    );
    res.json(results);
});

// 不再使用 pushMessage；保留 API 僅回傳成功，方便前端相容或日後改為「複製文字」流程
exports.remindPendingUsers = functions.https.onRequest(async (req, res) => {
    setCors(res, req);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    let body;
    try {
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    } catch {
        return res.status(400).json({ error: "Invalid JSON" });
    }
    const { userId, groupId, eventId } = body;
    if (!userId || !groupId || !eventId) return res.status(400).json({ error: "Missing required fields" });
    try {
        const eventSnap = await db.doc(`groups/${groupId}/events/${eventId}`).get();
        if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });
        if (eventSnap.data().createdBy !== userId) return res.status(403).json({ error: "Only the event host can use this" });
        return res.json({ success: true, sent: 0 });
    } catch (err) {
        console.error("remindPendingUsers error", err);
        return res.status(500).json({ error: err.message || "Failed" });
    }
});

exports.notifyEventFinalized = functions.https.onRequest(async (req, res) => {
    setCors(res, req);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    let body;
    try {
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    } catch {
        return res.status(400).json({ error: "Invalid JSON" });
    }
    const { userId, groupId, eventId } = body;
    if (!userId || !groupId || !eventId) return res.status(400).json({ error: "Missing required fields" });
    try {
        const eventSnap = await db.doc(`groups/${groupId}/events/${eventId}`).get();
        if (!eventSnap.exists) return res.status(404).json({ error: "Event not found" });
        if (eventSnap.data().createdBy !== userId) return res.status(403).json({ error: "Only the event host can use this" });
        return res.json({ success: true, sent: 0 });
    } catch (err) {
        console.error("notifyEventFinalized error", err);
        return res.status(500).json({ error: err.message || "Failed" });
    }
});
