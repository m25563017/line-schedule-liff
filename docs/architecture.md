# 系統架構（C4 Model）

本文件以 [C4 Model](https://c4model.com/) 的 Level 1（System Context）與 Level 2（Container）描述「揪吉 JiuJi」。圖以 Mermaid 繪製，可直接在 GitHub 上渲染。

> **說明**：LINE Developers Console 內的設定（LIFF Endpoint URL、Webhook URL 指向哪裡）不在程式碼庫中，下列相關箭頭是依程式行為與 Firebase 慣例推論，標註為「（設定於 LINE Console）」。

---

## Level 1：System Context（系統情境圖）

回答「這個系統是給誰用的？它和哪些外部系統互動？」

```mermaid
C4Context
    title 揪吉 JiuJi — System Context

    Person(organizer, "主揪", "建立群組與活動、代填虛擬成員空檔、決定最終日期")
    Person(member, "成員", "透過邀請連結加入群組、在月曆上勾選有空的日期")

    System(jiuji, "揪吉 JiuJi", "在 LINE 內開啟的群組排時間工具：蒐集空檔、統計最多人有空的日期、定案")

    System_Ext(line, "LINE 平台", "LIFF（網頁嵌入與使用者身分）、Messaging API（官方帳號機器人）、分享目標選擇器")
    System_Ext(firebase, "Firebase（Google Cloud）", "資料庫、檔案儲存、網頁託管、雲端函式")

    Rel(organizer, jiuji, "建立活動、定案", "LINE 內建瀏覽器")
    Rel(member, jiuji, "填寫有空日期", "LINE 內建瀏覽器")
    Rel(jiuji, line, "取得使用者身分、分享訊息到聊天室", "LIFF SDK")
    Rel(line, jiuji, "加好友／傳訊息事件通知", "Webhook")
    Rel(jiuji, firebase, "儲存與讀取所有資料、部署於其上", "Firebase SDK")
```

**閱讀重點**

- 使用者**只在 LINE 裡**操作；LINE 同時扮演「入口」和「身分提供者」。
- 機器人**不進入任何 LINE 群組**。分享訊息是由主揪透過 LIFF 的 `shareTargetPicker` 自己選聊天室送出。

---

## Level 2：Container（容器圖）

回答「系統由哪些可獨立執行／部署的單元組成？它們怎麼溝通？」
（C4 的 Container 指「執行中的程式或資料儲存」，不是 Docker 容器。）

```mermaid
C4Container
    title 揪吉 JiuJi — Container Diagram

    Person(user, "使用者", "主揪／成員")

    System_Ext(line, "LINE 平台", "LIFF、Messaging API")

    System_Boundary(jiuji, "揪吉 JiuJi") {
        Container(spa, "前端 SPA", "Vue 3, Vue Router, Vite, Tailwind", "在手機 LINE 內建瀏覽器執行；所有畫面與業務邏輯（權限判斷、Top 3 統計、定案）都在這裡")
        Container(hosting, "Firebase Hosting", "靜態網站託管", "存放 vite build 產出的 dist/，所有路徑導回 index.html")
        Container(fn, "lineWebhook", "Cloud Functions (Node.js 24)", "收到加好友／文字訊息時，回覆「打開排程」Flex 按鈕")
        ContainerDb(firestore, "Firestore", "NoSQL 文件資料庫", "groups、events、activityLogs")
        ContainerDb(storage, "Cloud Storage", "物件儲存", "群組封面圖 group_covers/")
    }

    Rel(user, spa, "使用", "HTTPS（LIFF 網址）")
    Rel(hosting, spa, "提供靜態檔", "HTTPS")
    Rel(spa, line, "登入、取得 profile、shareTargetPicker", "LIFF SDK")
    Rel(spa, firestore, "直接讀寫（不經過自建後端）", "Firebase JS SDK")
    Rel(spa, storage, "上傳封面圖（需匿名登入）", "Firebase JS SDK")
    Rel(line, fn, "推送 follow／message 事件", "HTTPS Webhook（設定於 LINE Console）")
    Rel(fn, line, "replyMessage", "LINE Messaging API")
    Rel(user, line, "加好友、傳訊息給官方帳號")
```

**閱讀重點**

1. **前端直連 Firestore**：`spa → firestore` 是主流程。沒有 REST API 層，也不經過 Cloud Functions。
2. **Cloud Functions 只服務機器人**：它被 LINE 呼叫（`line → fn`），前端程式碼中沒有任何地方呼叫它。
3. **身分來自 LIFF**：`liff.getProfile()` 取得的 `userId` 直接用作資料中的成員 id，Firebase Auth 只用匿名登入來通過 Storage 的上傳規則。
4. `remindPendingUsers`、`notifyEventFinalized` 兩個函式目前沒有實際功能，也無人呼叫，因此未畫入圖中。

---

## 容器清單

| 容器 | 技術 | 職責 | 對應位置 |
|---|---|---|---|
| 前端 SPA | Vue 3 + Vite | 全部 UI 與業務邏輯 | `src/` |
| Firebase Hosting | Firebase Hosting | 託管靜態前端 | `firebase.json` 的 `hosting` |
| lineWebhook | Cloud Functions | 機器人自動回覆 | `functions/index.js` |
| Firestore | Cloud Firestore | 主要資料儲存 | 由前端程式建立（見資料模型文件） |
| Cloud Storage | Firebase Storage | 封面圖 | `storage.rules` |
