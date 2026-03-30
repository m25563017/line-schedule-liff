<script setup>
import { ref, inject, onMounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { db } from "../utils/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNotify } from "@pieda/core";
import EventCalendar from "../components/EventCalendar.vue";
import EventStats from "../components/EventStats.vue";
import DecideModal from "../components/DecideModal.vue";
import { addGroupActivityLog } from "../utils/activityLog";
import { liffShareUrl } from "../config/liff";
import {
    getGuestVirtualMemberId,
    setGuestVirtualMemberId,
    resolveGuestVirtualMemberId,
} from "../utils/guestView";

const route = useRoute();
const userProfile = inject("userProfile");
const isLineLoggedIn = inject("isLineLoggedIn");
const loginLine = inject("loginLine");
const groupId = route.params.id;
const eventId = route.params.eventId;
const $notify = useNotify();
const group = ref(null);
const event = ref(null);
const loading = ref(true);

const isEditing = ref(false);
const currentMonthIndex = ref(0);
const availabilities = ref({});
const selectedUserId = ref("");
const tempDates = ref([]);
const focusedDate = ref(null);

onMounted(async () => {
    try {
        const groupSnap = await getDoc(doc(db, "groups", groupId));
        if (groupSnap.exists())
            group.value = { id: groupSnap.id, ...groupSnap.data() };
        const eventSnap = await getDoc(
            doc(db, "groups", groupId, "events", eventId),
        );
        if (eventSnap.exists()) {
            event.value = { id: eventSnap.id, ...eventSnap.data() };
            availabilities.value = event.value.availabilities || {};
        }
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
});

watch(selectedUserId, (newId) => {
    if (newId && isEditing.value)
        tempDates.value = [...(availabilities.value[newId] || [])];
});

const isGuestMode = computed(() => !userProfile.value);

const guestViewAsId = ref("");

const virtualMembersList = computed(() => {
    if (!group.value) return [];
    return Object.entries(group.value.members || {})
        .filter(([, m]) => m.isVirtual)
        .map(([id, m]) => ({ id, displayName: m.displayName }));
});

watch(
    () => [group.value, isLineLoggedIn.value, route.query.vm],
    () => {
        if (!group.value) return;
        if (isLineLoggedIn.value && userProfile.value) {
            selectedUserId.value = userProfile.value.userId;
            return;
        }
        const q = route.query.vm;
        const preferred =
            typeof q === "string" && q ? q : getGuestVirtualMemberId(groupId);
        const resolved = resolveGuestVirtualMemberId(group.value, preferred);
        guestViewAsId.value = resolved;
        if (resolved) {
            setGuestVirtualMemberId(groupId, resolved);
            selectedUserId.value = resolved;
        }
    },
    { immediate: true },
);

/** 登入時為 LINE userId；訪客時為預覽中的虛擬成員 id */
const viewAsUserId = computed(
    () => userProfile.value?.userId || guestViewAsId.value || "",
);

function onGuestVmSelect(e) {
    const id = e.target.value;
    guestViewAsId.value = id;
    setGuestVirtualMemberId(groupId, id);
    selectedUserId.value = id;
}

// --- 計算邏輯 ---
const memberMap = computed(() => {
    if (!group.value) return {};
    const map = {};
    Object.entries(group.value.members).forEach(([id, member]) => {
        map[id] = { ...member };
    });
    return map;
});

const currentUserId = computed(() => userProfile.value?.userId || "");
const currentMemberRole = computed(() => {
    if (!group.value || !currentUserId.value) return "viewer";
    return group.value.members?.[currentUserId.value]?.role || "viewer";
});
const isGroupOwner = computed(
    () => !!userProfile.value && group.value?.createdBy === currentUserId.value,
);
const isEventOwner = computed(
    () => !!userProfile.value && event.value?.createdBy === currentUserId.value,
);
/** 訪客一律僅檢視，不因虛擬成員在 DB 中的 role 而取得管理權 */
const canManageEvent = computed(
    () => !isGuestMode.value && (isGroupOwner.value || isEventOwner.value),
);
/** 僅活動發起人可決定定案日期（群組管理員代填不代表可定案） */
const canDecideFinalDate = computed(
    () => !isGuestMode.value && isEventOwner.value,
);
const managedUsers = computed(() => {
    if (!group.value || !userProfile.value || isGuestMode.value) return [];
    const me = { id: userProfile.value.userId, name: "我自己" };
    // 群組建立者或活動建立者可以幫虛擬成員代填
    if (isGroupOwner.value || isEventOwner.value) {
        const virtuals = Object.entries(group.value.members || {})
            .filter(([id, m]) => m.isVirtual)
            .map(([id, m]) => ({ id, name: m.displayName + " (代填)" }));
        return [me, ...virtuals];
    }
    return [me];
});

const respondedUsers = computed(() =>
    Object.keys(memberMap.value)
        .filter((uid) => (availabilities.value[uid] || []).length > 0)
        .map((uid) => memberMap.value[uid]),
);

// 未填寫名單
const pendingUsers = computed(() =>
    Object.keys(memberMap.value)
        .filter((uid) => !(availabilities.value[uid] || []).length > 0)
        .map((uid) => memberMap.value[uid]),
);

// 尚未填寫且為「已認領的 LINE 用戶」（可發送 Flex 提醒；虛擬成員無 LINE userId）
const pendingUserIdsWithLine = computed(() => {
    if (!group.value) return [];
    return pendingUsers.value
        .filter((u) => !group.value.members[u.id]?.isVirtual)
        .map((u) => u.id);
});

const topDates = computed(() => {
    const counts = {};
    Object.values(availabilities.value).forEach((dates) =>
        dates.forEach((d) => {
            counts[d] = (counts[d] || 0) + 1;
        }),
    );
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([date, count]) => ({ date, count }));
});

// --- 月曆邏輯 ---
const calendarDays = computed(() => {
    if (!event.value?.targetMonths) return [];
    const monthStr = event.value.targetMonths[currentMonthIndex.value];
    if (!monthStr) return [];
    const [year, month] = monthStr.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();
    const days = Array(firstDay).fill({ isBlank: true });
    for (let i = 1; i <= totalDays; i++)
        days.push({
            isBlank: false,
            dateStr: `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
            dayNum: i,
        });
    return days;
});

const startEditing = () => {
    if (isGuestMode.value) return;
    isEditing.value = true;
    focusedDate.value = null;
    tempDates.value = [...(availabilities.value[selectedUserId.value] || [])];
};
const stopEditing = () => {
    isEditing.value = false;
    focusedDate.value = null;
};
const toggleDate = (dateStr) => {
    focusedDate.value = dateStr;
    if (
        isGuestMode.value ||
        !isEditing.value ||
        !selectedUserId.value ||
        isFinalized.value
    )
        return;
    const idx = tempDates.value.indexOf(dateStr);
    if (idx === -1) tempDates.value.push(dateStr);
    else tempDates.value.splice(idx, 1);
};
const isSelectedByMe = (dateStr) =>
    isFinalized.value
        ? event.value.finalDate === dateStr
        : isEditing.value
          ? tempDates.value.includes(dateStr)
          : (availabilities.value[viewAsUserId.value] || []).includes(dateStr);

const getAvailableUsersForDate = (dateStr) => {
    const users = [];
    Object.keys(memberMap.value).forEach((uid) => {
        const userDates =
            isEditing.value && uid === selectedUserId.value
                ? tempDates.value
                : availabilities.value[uid] || [];
        if (userDates.includes(dateStr))
            users.push({ id: uid, ...memberMap.value[uid] });
    });
    return users;
};

// --- 定案與儲存邏輯 ---
const isFinalized = computed(() => !!event.value?.finalDate);
const showDecideModal = ref(false);
const isFinalizing = ref(false);

const openDecideModal = () => {
    showDecideModal.value = true;
};

//新增：點擊「決定日期」時的防呆檢查
const handleDecideClick = () => {
    if (!canDecideFinalDate.value) return;
    if (pendingUsers.value.length > 0) {
        const names = pendingUsers.value.map((u) => u.displayName).join("、");

        $notify
            .alert({
                title: "系統通知",
                message: `還有成員尚未填寫喔！\n\n未填寫名單：${names}\n\n確定要現在就決定日子嗎？`,
                variant: "warning",
                confirm: true,
            })
            .then((result) => {
                if (result.isConfirmed) {
                    // 主揪說沒關係，強制決定
                    openDecideModal();
                }
            });
    } else {
        // 大家都填完了，直接打開定案視窗
        openDecideModal();
    }
};

// payload 為 { date, time } 或舊版字串 date
const confirmFinalDate = async (payload) => {
    if (!canDecideFinalDate.value) return;
    const date = typeof payload === "string" ? payload : payload?.date;
    const time =
        typeof payload === "object" && payload?.time != null
            ? payload.time
            : "";
    if (!date) return;
    isFinalizing.value = true;
    try {
        const updateData = { finalDate: date };
        if (time !== undefined) updateData.finalTime = time;
        await updateDoc(
            doc(db, "groups", groupId, "events", eventId),
            updateData,
        );
        event.value.finalDate = date;
        event.value.finalTime = time;
        showDecideModal.value = false;

        await addGroupActivityLog({
            groupId,
            action: "event.finalize",
            actor: {
                userId: userProfile.value?.userId,
                displayName: userProfile.value?.displayName,
                pictureUrl: userProfile.value?.pictureUrl,
            },
            target: { type: "event", id: eventId, title: event.value?.title },
            meta: { finalDate: date, finalTime: time || "" },
        });
    } catch (e) {
        $notify.alert({
            title: "系統通知",
            message: "發生錯誤，請稍後再試",
            variant: "error",
        });
    } finally {
        isFinalizing.value = false;
    }
};

function getEventPageUrl() {
    const gid = route.params.id;
    const eid = route.params.eventId;
    return liffShareUrl(`/group/${gid}/event/${eid}`);
}

function getRemindText() {
    const url = getEventPageUrl();
    return `【${event.value?.title || "活動"}】請記得填寫有空日期～\n${url}`;
}

function getFinalizedText() {
    const url = getEventPageUrl();
    const dateStr = event.value?.finalDate?.replace(/-/g, "/") || "";
    const timeStr = event.value?.finalTime ? ` ${event.value.finalTime}` : "";
    return `【${event.value?.title || "活動"}】已定案：${dateStr}${timeStr}\n${url}`;
}

/** 與 InviteModal 相同；LINE Flex 圖片須為可公開的 HTTPS */
const FLEX_HERO_PLACEHOLDER =
    "https://via.placeholder.com/800x400/508974/FFFFFF?text=Event";
const FLEX_AVATAR_PLACEHOLDER =
    "https://via.placeholder.com/80x80/508974/FFFFFF?text=U";

/** 參考付款卡版型：主按鈕與裝飾條 */
const FLEX_SHARE_GREEN = "#58C48E";
/** 大字強調區（對應參考圖金額列） */
const FLEX_DATE_ACCENT = "#EF5350";

/** 參考圖中「遞減綠條」裝飾 */
function flexShareDecoBars() {
    return {
        type: "box",
        layout: "vertical",
        spacing: "4px",
        margin: "xl",
        width: "100%",
        contents: [
            {
                type: "box",
                height: "3px",
                width: "100%",
                backgroundColor: FLEX_SHARE_GREEN,
            },
            {
                type: "box",
                height: "3px",
                width: "72%",
                backgroundColor: FLEX_SHARE_GREEN,
            },
            {
                type: "box",
                height: "3px",
                width: "48%",
                backgroundColor: FLEX_SHARE_GREEN,
            },
            {
                type: "box",
                height: "3px",
                width: "24%",
                backgroundColor: FLEX_SHARE_GREEN,
            },
        ],
    };
}

/**
 * 給 liff.shareTargetPicker 用的 Flex Message（格式同 Messaging API）。
 * 版型：群組封面 hero → 活動名稱 → 說明 → 大字日期 → 綠條 → 發送者 → 綠色主按鈕。
 */
function getFinalizedFlexMessage() {
    const url = getEventPageUrl();
    const title = event.value?.title || "活動";
    const dateStr = event.value?.finalDate?.replace(/-/g, "/") || "";
    const timeStr = event.value?.finalTime ? ` ${event.value.finalTime}` : "";
    const scheduleLine = dateStr
        ? `${dateStr}${timeStr}`.trim()
        : "（日期待確認）";
    const groupName = group.value?.name || "";
    let altText = getFinalizedText();
    if (altText.length > 400) altText = `${altText.slice(0, 397)}...`;

    const heroUrl = group.value?.coverUrl || FLEX_HERO_PLACEHOLDER;

    const senderName =
        userProfile.value?.displayName?.trim() || "成員";
    const avatarUrl =
        userProfile.value?.pictureUrl &&
        String(userProfile.value.pictureUrl).startsWith("https://")
            ? userProfile.value.pictureUrl
            : FLEX_AVATAR_PLACEHOLDER;

    const bodyContents = [
        {
            type: "text",
            text: title,
            weight: "bold",
            size: "xl",
            color: "#111111",
            wrap: true,
        },
        ...(groupName
            ? [
                  {
                      type: "text",
                      text: groupName,
                      size: "sm",
                      color: "#666666",
                      margin: "md",
                      wrap: true,
                  },
              ]
            : []),
        {
            type: "text",
            text: scheduleLine,
            size: "xxl",
            weight: "bold",
            color: FLEX_DATE_ACCENT,
            margin: "lg",
            wrap: true,
        },
        flexShareDecoBars(),
        {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
                {
                    type: "image",
                    url: avatarUrl,
                    size: "xs",
                    aspectRatio: "1:1",
                    aspectMode: "cover",
                },
                {
                    type: "text",
                    text: senderName,
                    size: "sm",
                    color: "#333333",
                    gravity: "center",
                    flex: 1,
                    wrap: true,
                },
            ],
        },
    ];

    return {
        type: "flex",
        altText,
        contents: {
            type: "bubble",
            hero: {
                type: "image",
                url: heroUrl,
                size: "full",
                aspectRatio: "20:13",
                aspectMode: "cover",
            },
            body: {
                type: "box",
                layout: "vertical",
                paddingAll: "lg",
                contents: bodyContents,
            },
            footer: {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: [
                    {
                        type: "button",
                        style: "primary",
                        color: FLEX_SHARE_GREEN,
                        height: "md",
                        action: {
                            type: "uri",
                            label: "開啟活動頁面",
                            uri: url,
                        },
                    },
                ],
                flex: 0,
            },
        },
    };
}

/** @param {import("@line/liff").ShareTargetPickerMessage[]} messages */
async function shareViaLineShareTargetPicker(messages) {
    if (
        typeof window !== "undefined" &&
        window.liff?.isApiAvailable?.("shareTargetPicker")
    ) {
        try {
            await window.liff.shareTargetPicker(messages);
            return true;
        } catch (e) {
            if (
                String(e?.message || e)
                    .toLowerCase()
                    .includes("cancel")
            )
                return false;
            throw e;
        }
    }
    return null; // 不支援時回傳 null，改為複製
}

async function copyToClipboard(text, successMessage) {
    try {
        await navigator.clipboard.writeText(text);
        $notify.alert({
            title: "系統通知",
            message: successMessage,
            variant: "success",
        });
    } catch {
        $notify.alert({
            title: "請手動複製",
            message: "無法自動複製，請手動複製以下內容：\n\n" + text,
            variant: "warning",
        });
    }
}

async function shareRemindToLine() {
    const text = getRemindText();
    try {
        const sent = await shareViaLineShareTargetPicker([
            { type: "text", text },
        ]);
        if (sent === true) {
            $notify.alert({
                title: "系統通知",
                message: "已發送到所選的聊天室。",
                variant: "success",
            });
            return;
        }
        if (sent === false) return; // 使用者取消選擇
        await copyToClipboard(
            text,
            "此環境無法開啟 LINE 選擇聊天室，已改為複製提醒文字。",
        );
    } catch (e) {
        console.error(e);
        await copyToClipboard(text, "無法開啟選擇聊天室，已改為複製提醒文字。");
    }
}

async function shareFinalizedToLine() {
    const text = getFinalizedText();
    try {
        const sent = await shareViaLineShareTargetPicker([
            getFinalizedFlexMessage(),
        ]);
        if (sent === true) {
            $notify.alert({
                title: "系統通知",
                message: "已發送到所選的聊天室（由你的帳號發出）。",
                variant: "success",
            });
            return;
        }
        if (sent === false) return;
        await copyToClipboard(
            text,
            "此環境無法開啟 LINE 選擇聊天室，已改為複製定案訊息。",
        );
    } catch (e) {
        console.error(e);
        await copyToClipboard(text, "無法開啟選擇聊天室，已改為複製定案訊息。");
    }
}

const isSaving = ref(false);
const saveChanges = async () => {
    if (isGuestMode.value || !selectedUserId.value) return;
    isSaving.value = true;
    try {
        const targetId = selectedUserId.value;
        await updateDoc(doc(db, "groups", groupId, "events", eventId), {
            [`availabilities.${targetId}`]: tempDates.value,
        });
        availabilities.value[targetId] = [...tempDates.value];

        // 若是幫虛擬成員代填，寫入動作紀錄
        const isSelf = targetId === currentUserId.value;
        const member = memberMap.value[targetId];
        if (!isSelf && member?.isVirtual) {
            await addGroupActivityLog({
                groupId,
                action: "event.fillForVirtual",
                actor: {
                    userId: userProfile.value?.userId,
                    displayName: userProfile.value?.displayName,
                    pictureUrl: userProfile.value?.pictureUrl,
                },
                target: {
                    type: "event",
                    id: eventId,
                    title: event.value?.title,
                },
                meta: {
                    forUserId: targetId,
                    forDisplayName: member.displayName || "",
                },
            });
        }

        isEditing.value = false;
    } catch (e) {
        $notify.alert({
            title: "系統通知",
            message: "儲存失敗",
            variant: "error",
        });
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <!-- 填滿 App 內 main（relative），避免 h-full 在 overflow-y-auto 祖先內失效、footer 被捲出視窗 -->
    <div
        v-if="loading"
        class="tw:absolute tw:inset-0 tw:z-0 tw:flex tw:items-center tw:justify-center tw:bg-gray-50 tw:p-10 tw:text-center tw:text-gray-500"
    >
        載入活動中...
    </div>
    <div
        v-else-if="event && group"
        class="tw:absolute tw:inset-0 tw:z-0 tw:flex tw:flex-col tw:overflow-hidden tw:bg-gray-50"
    >
        <div
            class="header-container tw:bg-white tw:p-4 tw:text-center tw:shadow-sm tw:relative tw:flex-none tw:shrink-0 tw:z-10"
        >
            <router-link
                v-if="!isEditing"
                :to="`/group/${groupId}`"
                class="tw:absolute tw:left-4 tw:top-4 tw:text-xl tw:text-gray-500 hover:tw:text-gray-800"
            >
                <svg
                    class="tw:w-5 tw:h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2.5"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 19.5 8.25 12l7.5-7.5"
                    />
                </svg>
            </router-link>
            <button
                v-else
                @click="stopEditing"
                class="tw:absolute tw:left-4 tw:top-4 tw:text-xl tw:text-gray-500 hover:tw:text-gray-800"
            >
                <svg
                    class="tw:w-5 tw:h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2.5"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 19.5 8.25 12l7.5-7.5"
                    />
                </svg>
            </button>
            <h1 class="tw:text-lg tw:font-bold tw:text-gray-800">
                {{ isEditing ? "選擇日期" : event.title }}
            </h1>

            <router-link
                v-if="canManageEvent && !isEditing && !isGuestMode"
                :to="`/group/${groupId}/event/${eventId}/edit`"
                class="tw:absolute tw:right-4 tw:top-4 tw:text-gray-400 hover:tw:text-gray-700 tw:transition active:tw:scale-90"
                title="活動設定"
            >
                <svg
                    class="tw:w-6 tw:h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
            </router-link>
        </div>

        <div
            class="body-container tw:flex-1 tw:min-h-0 tw:w-full tw:overflow-hidden"
        >
            <div
                class="body-container-inner tw:h-full tw:min-h-0 tw:overflow-y-auto tw:p-4 tw:max-w-md tw:mx-auto tw:w-full"
            >
                <div
                    v-if="isGuestMode"
                    class="tw:mb-4 tw:bg-amber-50 tw:border tw:border-amber-200 tw:rounded-xl tw:p-3 tw:text-sm tw:text-amber-900"
                >
                    <p class="tw:font-bold tw:mb-1">訪客預覽（未登入 LINE）</p>
                    <p class="tw:text-amber-800 tw:mb-2">
                        目前以虛擬名額視角檢視；無法填寫、定案或管理活動。
                    </p>
                    <div
                        v-if="virtualMembersList.length > 1"
                        class="tw:mb-2"
                    >
                        <label class="tw:block tw:text-xs tw:font-bold tw:mb-1"
                            >切換預覽身分</label
                        >
                        <select
                            :value="guestViewAsId"
                            @change="onGuestVmSelect"
                            class="tw:w-full tw:p-2 tw:rounded-lg tw:border tw:border-amber-300 tw:bg-white tw:text-sm"
                        >
                            <option
                                v-for="v in virtualMembersList"
                                :key="v.id"
                                :value="v.id"
                            >
                                {{ v.displayName }}
                            </option>
                        </select>
                    </div>
                    <router-link
                        v-if="!guestViewAsId && virtualMembersList.length === 0"
                        :to="`/group/${groupId}`"
                        class="tw:inline-block tw:text-primary tw:font-bold tw:underline"
                    >
                        回群組頁設定預覽身分
                    </router-link>
                </div>

                <div
                    v-if="isFinalized"
                    class="tw:bg-accent tw:text-white tw:p-4 tw:rounded-xl tw:shadow-md tw:mb-4 tw:text-center tw:animate-fade-in"
                >
                    <div class="tw:text-sm tw:font-medium tw:opacity-90">
                        活動日期已定案
                    </div>
                    <div
                        class="tw:text-2xl tw:font-black tw:tracking-wider tw:mt-1"
                    >
                        {{ event.finalDate.replace(/-/g, " / ") }}
                        <span
                            v-if="event.finalTime"
                            class="tw:block tw:text-lg tw:mt-1 tw:opacity-90"
                        >
                            {{ event.finalTime }}
                        </span>
                    </div>
                </div>

                <div
                    v-if="isEditing && managedUsers.length > 1"
                    class="tw:mb-4 tw:bg-yellow-50 tw:border tw:border-yellow-200 tw:p-3 tw:rounded-xl tw:animate-fade-in"
                >
                    <label
                        class="tw:block tw:text-xs tw:font-bold tw:text-yellow-800 tw:mb-1"
                    >
                        <span
                            class="tw:inline-flex tw:items-center tw:justify-center tw:w-4 tw:h-4 tw:mr-1"
                        >
                            <svg
                                class="tw:w-4 tw:h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                            >
                                <path
                                    d="M4 10l2.5-4 3 3 2.5-5 2.5 5 3-3L20 10l-2 9H6l-2-9z"
                                    fill="currentColor"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </span>
                        主揪專用：你現在要幫誰填寫？
                    </label>
                    <select
                        v-model="selectedUserId"
                        class="tw:w-full tw:p-2 tw:bg-white tw:border tw:border-yellow-300 tw:rounded-lg tw:text-sm tw:outline-none"
                    >
                        <option
                            v-for="user in managedUsers"
                            :key="user.id"
                            :value="user.id"
                        >
                            {{ user.name }}
                        </option>
                    </select>
                </div>

                <EventCalendar
                    :months="event.targetMonths"
                    :monthIndex="currentMonthIndex"
                    :days="calendarDays"
                    :isEditing="isEditing"
                    :isFinalized="isFinalized"
                    :checkSelected="isSelectedByMe"
                    :getUsers="getAvailableUsersForDate"
                    @prev="currentMonthIndex--"
                    @next="currentMonthIndex++"
                    @date-click="toggleDate"
                />

                <div
                    v-if="focusedDate && !isFinalized"
                    class="tw:bg-white tw:border tw:border-gray-200 tw:rounded-xl tw:p-4 tw:animate-fade-in tw:mb-4 tw:mt-4 tw:shadow-sm"
                >
                    <h4
                        class="tw:flex tw:items-center tw:gap-1.5 tw:font-bold tw:text-gray-700 tw:text-sm tw:mb-3 tw:border-b tw:border-gray-100 tw:pb-2"
                    >
                        <svg
                            class="tw:w-4 tw:h-4 tw:text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="2.5"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        {{ focusedDate.replace(/-/g, " / ") }} 可參加名單
                    </h4>

                    <div class="tw:flex tw:flex-wrap tw:gap-2">
                        <span
                            v-if="
                                getAvailableUsersForDate(focusedDate)
                                    .length === 0
                            "
                            class="tw:text-xs tw:text-gray-400 tw:py-1"
                        >
                            這天沒有人有空
                        </span>

                        <span
                            v-for="u in getAvailableUsersForDate(focusedDate)"
                            :key="u.id"
                            class="tw:inline-flex tw:items-center tw:text-xs tw:font-medium tw:bg-gray-100 tw:text-gray-700 tw:px-2.5 tw:py-1.5 tw:rounded-lg"
                        >
                            {{ u.displayName }}
                        </span>
                    </div>
                </div>

                <EventStats
                    v-if="!isEditing && !isFinalized"
                    class="tw:mt-4"
                    :topDates="topDates"
                    :respondedUsers="respondedUsers"
                    :pendingUsers="pendingUsers"
                />

                <!-- 主揪：發送 LINE Flex 提醒尚未填寫的成員（僅限已認領的 LINE 用戶） -->
                <div
                    v-if="
                        !isEditing &&
                        !isFinalized &&
                        canManageEvent &&
                        pendingUserIdsWithLine.length > 0
                    "
                    class="tw:mt-4 tw:bg-white tw:border tw:border-gray-200 tw:rounded-xl tw:p-4"
                >
                    <p class="tw:text-sm tw:text-gray-600 tw:mb-3">
                        尚有
                        {{ pendingUserIdsWithLine.length }}
                        位成員未填寫，點下方按鈕可選擇 LINE 聊天室或群組發送提醒
                    </p>
                    <button
                        type="button"
                        @click="shareRemindToLine"
                        class="tw:w-full tw:bg-[#06C755] tw:text-white tw:py-2.5 tw:rounded-xl tw:font-bold tw:text-sm tw:flex tw:items-center tw:justify-center tw:gap-2 active:tw:scale-95"
                    >
                        <svg
                            class="tw:w-4 tw:h-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M24 10.3c0-5.7-5.4-10.3-12-10.3S0 4.6 0 10.3c0 5.1 4.3 9.4 10.1 10.2.4.1.9.3 1 .7l.3 1.9c0 .1.1.2.2.2.1 0 .2 0 .2-.1.9-.6 5-3.3 7.5-5.5 2.9-2.3 4.7-5 4.7-7.4z"
                            />
                        </svg>
                        發送提醒到 LINE
                    </button>
                </div>
            </div>
        </div>

        <div
            class="footer-container tw:flex-none tw:shrink-0 tw:bg-white tw:border-t tw:border-gray-200 tw:shadow-lg tw:p-4 tw:pb-[max(1rem,env(safe-area-inset-bottom,0px))] tw:flex tw:gap-3 tw:w-full tw:z-20 tw:animate-slide-up"
        >
            <template v-if="!isEditing && isFinalized">
                <span
                    class="tw:flex-1 tw:bg-gray-100 tw:text-gray-500 tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-sm tw:flex tw:items-center tw:justify-center"
                >
                    活動已定案
                </span>
                <button
                    type="button"
                    @click="shareFinalizedToLine"
                    class="tw:flex-1 tw:bg-primary tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-sm tw:flex tw:items-center tw:justify-center tw:gap-2 active:tw:scale-95"
                >
                    <svg
                        class="tw:w-4 tw:h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            d="M24 10.3c0-5.7-5.4-10.3-12-10.3S0 4.6 0 10.3c0 5.1 4.3 9.4 10.1 10.2.4.1.9.3 1 .7l.3 1.9c0 .1.1.2.2.2.1 0 .2 0 .2-.1.9-.6 5-3.3 7.5-5.5 2.9-2.3 4.7-5 4.7-7.4z"
                        />
                    </svg>
                    發送定案到 LINE
                </button>
            </template>
            <template v-else-if="!isEditing && !isFinalized">
                <template v-if="!isGuestMode">
                    <button
                        type="button"
                        :disabled="!canDecideFinalDate"
                        :title="
                            canDecideFinalDate ? '' : '僅活動發起人可決定日期'
                        "
                        @click="handleDecideClick"
                        class="tw:flex-1 tw:py-3.5 tw:rounded-xl tw:font-bold tw:shadow-md tw:transition tw:flex tw:items-center tw:justify-center disabled:tw:cursor-not-allowed disabled:tw:bg-gray-200 disabled:tw:text-gray-400 disabled:tw:shadow-none tw:bg-accent tw:text-white active:tw:scale-95 disabled:active:tw:scale-100"
                    >
                        <span class="tw:inline-flex tw:items-center tw:gap-1">
                            <svg
                                class="tw:w-4 tw:h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                            >
                                <path
                                    d="M4 10l2.5-4 3 3 2.5-5 2.5 5 3-3L20 10l-2 9H6l-2-9z"
                                    fill="currentColor"
                                    stroke-linejoin="round"
                                />
                            </svg>
                            <span>決定日期</span>
                        </span>
                    </button>
                    <button
                        @click="startEditing"
                        class="tw:flex-2 tw:min-w-0 tw:bg-primary tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-lg tw:shadow-md active:tw:scale-95 tw:transition"
                    >
                        <span class="tw:inline-flex tw:items-center tw:gap-2">
                            <span>我要選日子</span>
                            <svg
                                class="tw:w-4 tw:h-4 tw:shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    d="M16.862 3.487l3.651 3.651M4 20l3.5-.5L19 8.5 15.5 5 4.5 15.5 4 20z"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </span>
                    </button>
                </template>
                <button
                    v-else
                    type="button"
                    @click="loginLine"
                    class="tw:w-full tw:bg-[#06C755] tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-lg tw:shadow-md active:tw:scale-95 tw:transition"
                >
                    登入跟朋友一起選日子！
                </button>
            </template>
            <template v-else>
                <button
                    @click="stopEditing"
                    :disabled="isSaving"
                    class="tw:flex-1 tw:bg-gray-100 tw:text-gray-700 tw:py-3.5 tw:rounded-xl tw:font-bold active:tw:scale-95 tw:transition disabled:tw:opacity-50"
                >
                    取消重填
                </button>
                <button
                    @click="saveChanges"
                    :disabled="isSaving"
                    class="tw:flex-1 tw:bg-primary tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:shadow-md active:tw:scale-95 tw:transition disabled:tw:opacity-50"
                >
                    {{ isSaving ? "儲存中..." : "確認送出" }}
                </button>
            </template>
        </div>

        <DecideModal
            :show="showDecideModal"
            :topDates="topDates"
            :isFinalizing="isFinalizing"
            @close="showDecideModal = false"
            @confirm="confirmFinalDate"
        />
    </div>
</template>

<style scoped>
.tw\:animate-fade-in {
    animation: fadeIn 0.2s ease-out;
}
.tw\:animate-slide-up {
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
@keyframes slideUp {
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
}
</style>
