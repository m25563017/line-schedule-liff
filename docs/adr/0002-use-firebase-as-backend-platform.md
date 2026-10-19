---
status: accepted
date: 2026-10-19
decision-makers: 專案作者
---

# ADR-0002：以 Firebase 作為後端平台（BaaS）

> **關於本文件**：此決策在專案初期就已做出，本文件為事後補寫。作者當時的主要考量是「想要免費額度、不用管伺服器」；「考慮過的選項」中的其他方案，是事後補充的評估。

## 背景與問題陳述

「揪吉」需要儲存群組、活動與每位成員的空檔資料，需要託管前端網頁（LIFF 要求 HTTPS 網址），也需要一個能接收 LINE Webhook 的端點，並能儲存群組封面圖。

專案由一人開發與維運，沒有預算也不想花時間管理伺服器（作業系統更新、部署、備份、擴充）。需要決定：後端要用什麼方式提供？

## 決策驅動因素

- 有免費額度，個人專案的初期成本接近零
- 不需要自己管理伺服器
- 資料庫、檔案儲存、網頁託管、函式最好由同一平台提供，減少整合工作
- 前端工程師（作者）能快速上手，不必先寫一整套 API

## 考慮過的選項

- **A. Firebase（Firestore + Hosting + Cloud Functions + Storage）**
- **B. 自建後端（Node.js API + 關聯式資料庫，部署在 VPS 或 PaaS）**
- **C. 其他 BaaS（例如 Supabase）**
- **D. 試算表型後端（例如 Google Sheets 或 Airtable 當資料庫）**

## 決策結果

選擇 **A. Firebase**，因為它把五個需求（資料庫、檔案、託管、函式、匿名驗證）放在同一個平台，免維運，且前端可以直接使用官方 SDK 存取資料，不需要先建置一層自己的 API。

### 後果

**好處**

- 無需管理伺服器；Hosting 自帶 HTTPS，符合 LIFF 的 Endpoint 要求
- 前端以 Firebase SDK 直接讀寫 Firestore，開發速度快，後端程式碼只剩 LINE Webhook 一個函式
- Firestore 支援游標分頁與聚合計數（`getCountFromServer`），活動列表因此不必一次讀完所有資料
- 同一專案內整合 Storage（封面圖）與匿名登入（通過上傳規則）
- 有本機模擬器可供開發（`firebase.json` 已設定 emulators）

**代價與限制**

- **平台綁定**：資料模型與 SDK 都是 Firebase 專屬，日後遷移成本高
- **NoSQL 資料建模限制**：沒有 JOIN，需以反正規化設計，例如同時存 `memberIds` 與 `members`，並自行維持兩者同步（見 [資料模型](../data-model.md)）
- **商業邏輯在前端**：沒有自己的 API 層，權限判斷與資料一致性（例如認領虛擬成員要同時改多個文件）都由前端程式負責，缺乏伺服器端的把關。資料存取安全須依賴 Firestore Security Rules 與日後補強的驗證機制
- **費用隨使用量增加**：Firestore 依讀寫次數計費，免費額度用完後需付費
- **免費方案的範圍**：Cloud Functions 等部分功能依 Firebase 現行方案規定，可能需要綁定帳單（Blaze 方案，仍含免費額度）。請以官方定價頁為準

### 驗證方式

部署後以 `firebase deploy` 發佈 Hosting 與 Functions；於 LIFF 內建立群組與活動，確認資料寫入 Firestore，且 LINE Webhook 能回覆訊息。

## 各選項的優缺點

### A. Firebase（採用）

- 好：免維運、整合度高、前端直連、有免費額度
- 好：Hosting 與 Functions 部署指令統一
- 壞：平台綁定、NoSQL 建模限制、邏輯集中在前端

### B. 自建後端（Node.js API + 關聯式資料庫）

- 好：完整控制商業邏輯與權限；關聯式資料庫能用 JOIN 與交易，資料一致性更容易處理
- 好：不綁定特定雲端
- 壞：要自己設計與維護 API、驗證、部署、備份與監控
- 壞：需要主機或 PaaS，持續營運成本與維運負擔，不符合「免費、不管伺服器」

### C. 其他 BaaS（例如 Supabase）

- 好：以 PostgreSQL 為基礎，支援關聯式查詢與 SQL，同樣免維運
- 壞：需另外評估託管與 LIFF Endpoint 的整合；對作者而言是不熟悉的平台，學習成本較高

### D. 試算表型後端

- 好：設定最簡單，資料可直接用表格檢視
- 壞：API 速率與並行寫入限制明顯，不適合多人同時填寫；缺乏權限控管與檔案託管

## 更多資訊

- 相關設定：`firebase.json`、`.firebaserc`、`storage.rules`、`src/utils/firebase.js`、`functions/index.js`
- 系統架構見 [`../architecture.md`](../architecture.md)；資料結構見 [`../data-model.md`](../data-model.md)
