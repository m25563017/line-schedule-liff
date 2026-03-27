/** 與 LINE Developers Console、App.vue 的 liff.init 使用同一個 LIFF ID */
export const LIFF_ID = "2008922865-iLv6kFaA";

/**
 * 對外分享用的 LIFF 網址（必須用 liff.line.me，否則在一般瀏覽器開啟會無法帶入 LINE 登入狀態）
 * @param {string} hashRoute 例如 `/group/abc/join`（可含或不含開頭 `/`）
 */
export function liffShareUrl(hashRoute) {
    const path = hashRoute.startsWith("/") ? hashRoute : `/${hashRoute}`;
    return `https://liff.line.me/${LIFF_ID}#${path}`;
}
