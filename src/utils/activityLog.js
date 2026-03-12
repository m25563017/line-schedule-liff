import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * 寫入群組動作紀錄
 * @param {Object} params
 * @param {string} params.groupId
 * @param {string} params.action 例：event.create / event.update / event.delete / event.finalize / event.remind
 * @param {Object} params.actor 例：{ userId, displayName, pictureUrl }
 * @param {Object} params.target 例：{ type: "event", id, title }
 * @param {Object} [params.meta] 額外資訊
 */
export async function addGroupActivityLog({
    groupId,
    action,
    actor,
    target,
    meta = {},
}) {
    if (!groupId || !action || !actor?.userId) return;
    const logsRef = collection(db, "groups", groupId, "activityLogs");
    await addDoc(logsRef, {
        action,
        actor: {
            userId: actor.userId,
            displayName: actor.displayName || "",
            pictureUrl: actor.pictureUrl || "",
        },
        target: target || null,
        meta,
        createdAt: serverTimestamp(),
    });
}

