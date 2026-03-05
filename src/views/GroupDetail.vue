<script setup>
import { ref, onMounted, inject, computed } from "vue";
import { useRoute } from "vue-router";
import { db } from "../utils/firebase";
import {
    doc,
    getDoc,
    collection,
    query,
    getDocs,
    orderBy,
} from "firebase/firestore";
import { useNotify } from "@pieda/core";

const route = useRoute();
const groupId = route.params.id;
const userProfile = inject("userProfile");
const group = ref(null);
const events = ref([]);
const loading = ref(true);

// 初始化 notify 套件
const $notify = useNotify();

// 🔗 邀請選單狀態
const showInviteModal = ref(false);

// 產生專屬邀請網址
const inviteLink = computed(() => {
    return `${window.location.origin}/#/group/${groupId}/join`;
});

// 1. 複製純文字連結
const copyInviteLink = async () => {
    try {
        await navigator.clipboard.writeText(inviteLink.value);
        $notify.alert({
            title: "系統通知",
            message: "邀請連結已複製！快去貼給 LINE 的朋友吧！",
            variant: "success",
        });
        showInviteModal.value = false;
    } catch (err) {
        $notify.alert({
            title: "請手動複製",
            message:
                "您的裝置不支援自動複製，請手動複製以下連結：\n\n" +
                inviteLink.value,
            variant: "warning",
        });
    }
};

// Flex Message
const shareToLine = async () => {
    if (window.liff && window.liff.isApiAvailable("shareTargetPicker")) {
        try {
            await window.liff.shareTargetPicker([
                {
                    type: "flex",
                    altText: `邀請您加入 ${group.value.name}`,
                    contents: {
                        type: "bubble",
                        hero: {
                            type: "image",
                            url:
                                group.value.coverUrl ||
                                "https://via.placeholder.com/800x400/508974/FFFFFF?text=Join+Group",
                            size: "full",
                            aspectRatio: "20:13",
                            aspectMode: "cover",
                        },
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: group.value.name,
                                    weight: "bold",
                                    size: "xl",
                                },
                                {
                                    type: "text",
                                    text: "趕緊加入群組來快速排行程，將下面連結設成群組公告更加方便！",
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
                            spacing: "sm",
                            contents: [
                                {
                                    type: "button",
                                    style: "primary",
                                    color: "#508974",
                                    height: "sm",
                                    action: {
                                        type: "uri",
                                        label: "加入群組",
                                        uri: inviteLink.value,
                                    },
                                },
                            ],
                            flex: 0,
                        },
                    },
                },
            ]);
            showInviteModal.value = false;
        } catch (error) {
            console.error("分享失敗", error);
            fallbackShare();
        }
    } else {
        fallbackShare();
    }
};

// 降級純文字分享 (開啟 LINE 分享連結)
const fallbackShare = () => {
    const text = `邀請你加入「${group.value.name}」！快點擊連結加入吧：`;

    const lineShareUrl = `https://lineit.line.me/share/ui?text=${encodeURIComponent(text)}&url=${encodeURIComponent(inviteLink.value)}`;

    window.open(lineShareUrl, "_blank");
    showInviteModal.value = false;
};

onMounted(async () => {
    try {
        const docRef = doc(db, "groups", groupId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            group.value = { id: docSnap.id, ...docSnap.data() };
        }

        const eventsRef = collection(db, "groups", groupId, "events");
        const q = query(eventsRef, orderBy("createdAt", "desc"));
        const eventSnaps = await getDocs(q);

        events.value = eventSnaps.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));
    } catch (e) {
        console.error("讀取失敗", e);
        $notify.alert({
            title: "系統通知",
            message: "讀取群組資料失敗，請稍後再試。",
            variant: "error",
        });
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div v-if="loading" class="tw:p-10 tw:text-center tw:text-gray-500">
        載入中...
    </div>

    <div v-else-if="group" class="tw:min-h-full tw:bg-gray-50 tw:pb-20">
        <div class="tw:relative tw:h-48 tw:bg-gray-200">
            <img
                v-if="group.coverUrl"
                :src="group.coverUrl"
                class="tw:absolute tw:inset-0 tw:w-full tw:h-full tw:object-cover tw:opacity-0 tw:transition-opacity tw:duration-500"
                @load="
                    $event.target.classList.remove('tw:opacity-0');
                    $event.target.parentElement.classList.remove(
                        'tw:animate-pulse',
                    );
                "
            />
            <div
                v-else
                class="tw:w-full tw:h-full tw:bg-linear-to-br tw:from-primary tw:to-secondary"
            ></div>

            <router-link
                to="/list"
                class="tw:absolute tw:top-4 tw:left-4 tw:bg-black/30 tw:text-white tw:p-2 tw:rounded-full tw:backdrop-blur-sm"
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

            <router-link
                v-if="group.createdBy === userProfile?.userId"
                :to="`/group/${group.id}/edit`"
                class="tw:absolute tw:top-4 tw:right-4 tw:bg-black/30 tw:text-white tw:p-2 tw:rounded-full tw:backdrop-blur-sm tw:flex tw:items-center tw:justify-center tw:w-10 tw:h-10 hover:tw:bg-black/50 tw:transition"
            >
                <svg
                    class="tw:w-5 tw:h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        d="M10.325 4.317a1.75 1.75 0 013.35 0l.242.97a1.75 1.75 0 002.451 1.21l.9-.45a1.75 1.75 0 012.327.78l.875 1.75a1.75 1.75 0 01-.78 2.327l-.9.45a1.75 1.75 0 00-1.01 1.743l.123.99a1.75 1.75 0 01-1.735 1.936h-1.75a1.75 1.75 0 00-1.55.96l-.45.9a1.75 1.75 0 01-3.11 0l-.45-.9a1.75 1.75 0 00-1.55-.96h-1.75a1.75 1.75 0 01-1.735-1.936l.123-.99a1.75 1.75 0 00-1.01-1.743l-.9-.45a1.75 1.75 0 01-.78-2.327l.875-1.75a1.75 1.75 0 012.327-.78l.9.45a1.75 1.75 0 002.451-1.21l.242-.97z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </router-link>

            <div
                class="tw:absolute tw:bottom-0 tw:left-0 tw:w-full tw:bg-linear-to-t tw:from-black/60 tw:to-transparent tw:p-4 tw:pt-10"
            >
                <h1 class="tw:text-2xl tw:font-bold tw:text-white">
                    {{ group.name }}
                </h1>
            </div>
        </div>

        <div class="tw:p-4 tw:space-y-4 tw:-mt-4 tw:relative tw:z-10">
            <div
                class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:p-4 tw:grid tw:grid-cols-2 tw:gap-3"
            >
                <router-link
                    :to="`/group/${group.id}/create-event`"
                    class="tw:bg-primary tw:text-white tw:rounded-lg tw:font-bold tw:flex tw:items-center tw:flex-col tw:justify-center tw:gap-1 active:tw:scale-95 tw:transition"
                >
                    <svg
                        class="tw:w-5 tw:h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                        />
                    </svg>
                    <span>發起活動</span>
                </router-link>

                <button
                    @click="showInviteModal = true"
                    class="tw:bg-gray-100 tw:text-gray-700 tw:p-3 tw:rounded-lg tw:font-bold tw:flex tw:flex-col tw:items-center tw:gap-1 active:tw:scale-95 tw:transition"
                >
                    <svg
                        class="tw:w-5 tw:h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M10.5 7.5l3-3a3 3 0 114.243 4.243l-2.25 2.25M13.5 16.5l-3 3A3 3 0 116.257 15.257l2.25-2.25"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                        <path
                            d="M9 15l6-6"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                    <span>邀請成員</span>
                </button>
            </div>

            <div class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:p-4">
                <h3
                    class="tw:font-bold tw:text-gray-700 tw:mb-3 tw:border-b tw:pb-2"
                >
                    活動列表
                </h3>

                <div
                    v-if="events.length === 0"
                    class="tw:text-center tw:text-gray-400 tw:py-4 tw:text-sm"
                >
                    還沒有發起任何活動
                </div>

                <div v-else class="tw:space-y-3">
                    <router-link
                        v-for="evt in events"
                        :key="evt.id"
                        :to="`/group/${groupId}/event/${evt.id}`"
                        class="tw:block tw:border tw:border-gray-100 tw:p-3 tw:rounded-lg hover:tw:bg-gray-50 tw:transition active:tw:scale-[0.98]"
                    >
                        <div
                            class="tw:flex tw:justify-between tw:items-start tw:mb-2"
                        >
                            <span class="tw:font-bold tw:text-gray-800">{{
                                evt.title
                            }}</span>
                            <span
                                v-if="evt.finalDate"
                                class="tw:bg-accent/10 tw:text-accent tw:border tw:border-accent/30 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap"
                            >
                                🎉 已定案
                            </span>
                            <span
                                v-else
                                class="tw:bg-primary/10 tw:text-primary tw:border tw:border-primary/30 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap"
                            >
                                🗓️ 選擇中
                            </span>
                        </div>

                        <div class="tw:flex tw:justify-between tw:items-end">
                            <div
                                class="tw:text-xs tw:text-gray-500 tw:space-y-1.5"
                            >
                                <div class="tw:flex tw:items-center tw:gap-1.5">
                                    <img
                                        :src="
                                            group.members[evt.createdBy]
                                                ?.pictureUrl ||
                                            'https://via.placeholder.com/40'
                                        "
                                        class="tw:w-4 tw:h-4 tw:rounded-full tw:object-cover tw:border tw:border-gray-200"
                                    />
                                    <span
                                        >{{
                                            group.members[evt.createdBy]
                                                ?.displayName || "未知成員"
                                        }}
                                        發起</span
                                    >
                                </div>

                                <div
                                    v-if="evt.finalDate"
                                    class="tw:font-bold tw:text-accent tw:flex tw:items-center tw:gap-1"
                                >
                                    <svg
                                        class="tw:w-4 tw:h-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M7 3h5a3 3 0 013 3v12l-3-2-3 2V6a3 3 0 00-3-3z"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                    <span
                                        >決定日期：{{
                                            evt.finalDate.replace(/-/g, " / ")
                                        }}</span
                                    >
                                </div>
                                <div
                                    v-else
                                    class="tw:flex tw:items-center tw:gap-1"
                                >
                                    <svg
                                        class="tw:w-4 tw:h-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M8 3h8v2.5L13 12l3 6.5V21H8v-2.5L11 12 8 5.5V3z"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                    <span
                                        >開放區間：{{
                                            evt.targetMonths.length
                                        }}
                                        個月</span
                                    >
                                </div>
                            </div>

                            <span
                                class="tw:text-gray-300 tw:text-sm tw:mb-1 tw:flex tw:items-center"
                            >
                                <svg
                                    class="tw:w-3 tw:h-3"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        d="M9 5l7 7-7 7"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </span>
                        </div>
                    </router-link>
                </div>
            </div>

            <div class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:p-4">
                <div
                    class="tw:flex tw:justify-between tw:items-center tw:mb-3 tw:border-b tw:pb-2"
                >
                    <h3 class="tw:font-bold tw:text-gray-700">成員名單</h3>
                    <span class="tw:text-xs tw:text-gray-400"
                        >{{ Object.keys(group.members || {}).length }} 人</span
                    >
                </div>

                <div class="tw:space-y-3">
                    <div
                        v-for="(member, uid) in group.members"
                        :key="uid"
                        class="tw:flex tw:items-center tw:gap-3"
                    >
                        <div
                            class="tw:w-10 tw:h-10 tw:rounded-full tw:bg-gray-200 tw:animate-pulse tw:relative tw:overflow-hidden tw:shrink-0 tw:border tw:border-gray-200"
                        >
                            <img
                                :src="
                                    member.pictureUrl ||
                                    'https://via.placeholder.com/40?text=V'
                                "
                                class="tw:absolute tw:inset-0 tw:w-full tw:h-full tw:object-cover tw:opacity-0 tw:transition-opacity tw:duration-300"
                                @load="
                                    $event.target.classList.remove(
                                        'tw:opacity-0',
                                    );
                                    $event.target.parentElement.classList.remove(
                                        'tw:animate-pulse',
                                    );
                                "
                            />
                        </div>
                        <div class="tw:flex-1">
                            <div class="tw:flex tw:items-center tw:gap-2">
                                <span
                                    class="tw:text-sm tw:font-bold tw:text-gray-800"
                                    >{{ member.displayName }}</span
                                >
                                <span
                                    v-if="member.role === 'admin'"
                                    class="tw:text-[10px] tw:bg-yellow-100 tw:text-yellow-700 tw:px-1.5 tw:rounded"
                                    >建立者</span
                                >
                                <span
                                    v-if="member.isVirtual"
                                    class="tw:text-[10px] tw:bg-gray-100 tw:text-gray-500 tw:px-1.5 tw:rounded"
                                    >虛擬</span
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="showInviteModal"
            class="tw:fixed tw:inset-0 tw:bg-black/50 tw:z-[100] tw:flex tw:items-end tw:justify-center tw:animate-fade-in"
            @click.self="showInviteModal = false"
        >
            <div
                class="tw:bg-white tw:w-full tw:max-w-md tw:rounded-t-3xl tw:p-6 tw:shadow-xl tw:animate-slide-up"
            >
                <div
                    class="tw:w-12 tw:h-1.5 tw:bg-gray-200 tw:rounded-full tw:mx-auto tw:mb-6"
                ></div>
                <h2
                    class="tw:text-xl tw:font-bold tw:text-gray-800 tw:mb-4 tw:text-center"
                >
                    邀請朋友加入群組
                </h2>

                <div class="tw:space-y-3">
                    <button
                        @click="shareToLine"
                        class="tw:w-full tw:flex tw:items-center tw:justify-center tw:gap-2 tw:bg-[#06C755] tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:shadow-md active:tw:scale-95 tw:transition"
                    >
                        <svg
                            class="tw:w-5 tw:h-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M24 10.3c0-5.7-5.4-10.3-12-10.3S0 4.6 0 10.3c0 5.1 4.3 9.4 10.1 10.2.4.1.9.3 1 .7l.3 1.9c0 .1.1.2.2.2.1 0 .2 0 .2-.1.9-.6 5-3.3 7.5-5.5 2.9-2.3 4.7-5 4.7-7.4z"
                            />
                        </svg>
                        傳送 LINE 邀請卡片
                    </button>

                    <button
                        @click="copyInviteLink"
                        class="tw:w-full tw:flex tw:items-center tw:justify-center tw:gap-2 tw:bg-gray-100 tw:text-gray-700 tw:py-3.5 tw:rounded-xl tw:font-bold active:tw:scale-95 tw:transition"
                    >
                        <svg
                            class="tw:w-5 tw:h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                            />
                        </svg>
                        複製連結
                    </button>
                </div>
            </div>
        </div>
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
