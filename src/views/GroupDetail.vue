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
    limit,
} from "firebase/firestore";
import { useNotify } from "@pieda/core";

import InviteModal from "../components/InviteModal.vue";
import EventCard from "../components/EventCard.vue";

const route = useRoute();
const groupId = route.params.id;
const userProfile = inject("userProfile");
const group = ref(null);
const events = ref([]);
const loading = ref(true);

const $notify = useNotify();

const showInviteModal = ref(false);

// 動作紀錄
const activityLogs = ref([]);
const logsLoading = ref(true);
const logActionText = (log) => {
    const actorName = log.actor?.displayName || "有人";
    const targetTitle = log.target?.title ? `「${log.target.title}」` : "";
    const meta = log.meta || {};
    switch (log.action) {
        case "event.create":
            return `${actorName} 建立了活動 ${targetTitle}`;
        case "event.update": {
            const titleChanged =
                meta.titleChanged && meta.oldTitle !== undefined;
            const timeRangeChanged = meta.timeRangeChanged;
            if (titleChanged && timeRangeChanged) {
                return `${actorName} 更新了活動 ${targetTitle}：活動名稱「${meta.oldTitle}」→「${meta.newTitle}」、更新時間選擇區間`;
            }
            if (titleChanged) {
                return `${actorName} 更新活動名稱「${meta.oldTitle}」→「${meta.newTitle}」`;
            }
            if (timeRangeChanged) {
                return `${actorName} 更新了活動 ${targetTitle} 的時間選擇區間`;
            }
            return `${actorName} 更新了活動 ${targetTitle}`;
        }
        case "event.delete":
            return `${actorName} 刪除了活動 ${targetTitle}`;
        case "event.finalize":
            return `${actorName} 定案了活動 ${targetTitle}`;
        case "event.remind":
            return `${actorName} 發送了填寫提醒 ${targetTitle}`;
        case "event.fillForVirtual": {
            const forName = meta.forDisplayName || "某位虛擬成員";
            return `${actorName} 代替 ${forName} 填寫了活動 ${targetTitle} 的空檔`;
        }
        default:
            return `${actorName} 進行了一個操作`;
    }
};
const formatLogTime = (ts) => {
    const seconds = ts?.seconds;
    if (!seconds) return "";
    const d = new Date(seconds * 1000);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
};

// 活動列表分頁：all / ongoing / finalized
const activeEventTab = ref("all");
const filteredEvents = computed(() => {
    if (activeEventTab.value === "finalized")
        return events.value.filter((e) => !!e.finalDate);
    if (activeEventTab.value === "ongoing")
        return events.value.filter((e) => !e.finalDate);
    return events.value;
});
const eventTabCounts = computed(() => ({
    all: events.value.length,
    ongoing: events.value.filter((e) => !e.finalDate).length,
    finalized: events.value.filter((e) => !!e.finalDate).length,
}));

// 成員人數（按鈕顯示用）
const memberCount = computed(
    () => Object.keys(group.value?.members || {}).length,
);

// 統一 userProfile (可能是 ref 或一般物件)
const currentUserId = computed(() => {
    if (!userProfile) return "";
    const raw = userProfile.value ?? userProfile;
    return raw?.userId || "";
});

const currentMemberRole = computed(() => {
    if (!group.value || !currentUserId.value) return "viewer";
    return group.value.members?.[currentUserId.value]?.role || "viewer";
});

const isGroupOwner = computed(
    () => !!group.value && group.value.createdBy === currentUserId.value,
);

const canCreateEvent = computed(() => {
    if (!group.value || !currentUserId.value) return false;
    if (isGroupOwner.value) return true;
    const role = currentMemberRole.value;
    return role === "editor" || role === "admin";
});

// 產生邀請網址 (InviteModal)
const inviteLink = computed(() => {
    return `${window.location.origin}/#/group/${groupId}/join`;
});

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

        const logsRef = collection(db, "groups", groupId, "activityLogs");
        const logsQ = query(logsRef, orderBy("createdAt", "desc"), limit(20));
        const logsSnap = await getDocs(logsQ);
        activityLogs.value = logsSnap.docs.map((d) => ({
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
        logsLoading.value = false;
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
                class="tw:w-full tw:h-full tw:bg-gradient-to-br tw:from-primary tw:to-secondary"
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
                <img
                    class="tw:w-5 tw:h-5"
                    src="../assets/img/setting.png"
                    alt="setting"
                />
            </router-link>

            <div
                class="tw:absolute tw:bottom-0 tw:left-0 tw:w-full tw:bg-gradient-to-t tw:from-black/60 tw:to-transparent tw:p-4 tw:pt-10"
            >
                <h1 class="tw:text-2xl tw:font-bold tw:text-white">
                    {{ group.name }}
                </h1>
            </div>
        </div>

        <div class="tw:p-4 tw:space-y-4 tw:-mt-4 tw:relative tw:z-10">
            <div
                class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:p-4 tw:grid tw:grid-cols-3 tw:gap-3"
            >
                <router-link
                    v-if="canCreateEvent"
                    :to="`/group/${group.id}/create-event`"
                    class="tw:bg-primary tw:text-white tw:rounded-lg tw:font-bold tw:flex tw:items-center tw:flex-col tw:justify-center tw:gap-1 tw:py-3 active:tw:scale-95 tw:transition"
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
                    class="tw:bg-gray-100 tw:text-gray-700 tw:rounded-lg tw:font-bold tw:flex tw:flex-col tw:items-center tw:justify-center tw:gap-1 tw:py-3 active:tw:scale-95 tw:transition"
                >
                    <img
                        class="tw:w-4 tw:h-4"
                        src="../assets/img/link.png"
                        alt="invite"
                    />
                    <span>邀請成員</span>
                </button>
                <router-link
                    :to="`/group/${group.id}/members`"
                    class="tw:bg-gray-100 tw:text-gray-700 tw:rounded-lg tw:font-bold tw:flex tw:flex-col tw:items-center tw:justify-center tw:gap-1 tw:py-3 active:tw:scale-95 tw:transition"
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
                            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                        />
                    </svg>
                    <span>成員 ({{ memberCount }})</span>
                </router-link>
            </div>

            <div class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:p-4">
                <h3
                    class="tw:font-bold tw:text-gray-700 tw:mb-3 tw:border-b tw:pb-2"
                >
                    活動列表
                </h3>

                <div class="tw:flex tw:gap-2 tw:mb-3">
                    <button
                        type="button"
                        @click="activeEventTab = 'all'"
                        class="tw:flex-1 tw:py-2 tw:rounded-lg tw:text-sm tw:font-bold tw:border tw:transition"
                        :class="
                            activeEventTab === 'all'
                                ? 'tw:bg-secondary tw:text-white tw:border-secondary'
                                : 'tw:bg-white tw:text-gray-700 tw:border-gray-200 hover:tw:bg-gray-50'
                        "
                    >
                        所有活動
                        <span class="tw:ml-1 tw:text-xs tw:opacity-80"
                            >({{ eventTabCounts.all }})</span
                        >
                    </button>
                    <button
                        type="button"
                        @click="activeEventTab = 'ongoing'"
                        class="tw:flex-1 tw:py-2 tw:rounded-lg tw:text-sm tw:font-bold tw:border tw:transition"
                        :class="
                            activeEventTab === 'ongoing'
                                ? 'tw:bg-primary tw:text-white tw:border-primary'
                                : 'tw:bg-white tw:text-gray-700 tw:border-gray-200 hover:tw:bg-gray-50'
                        "
                    >
                        選擇中
                        <span class="tw:ml-1 tw:text-xs tw:opacity-80"
                            >({{ eventTabCounts.ongoing }})</span
                        >
                    </button>
                    <button
                        type="button"
                        @click="activeEventTab = 'finalized'"
                        class="tw:flex-1 tw:py-2 tw:rounded-lg tw:text-sm tw:font-bold tw:border tw:transition"
                        :class="
                            activeEventTab === 'finalized'
                                ? 'tw:bg-accent tw:text-white tw:border-accent'
                                : 'tw:bg-white tw:text-gray-700 tw:border-gray-200 hover:tw:bg-gray-50'
                        "
                    >
                        已定案
                        <span class="tw:ml-1 tw:text-xs tw:opacity-80"
                            >({{ eventTabCounts.finalized }})</span
                        >
                    </button>
                </div>

                <div
                    v-if="filteredEvents.length === 0"
                    class="tw:text-center tw:text-gray-400 tw:py-4 tw:text-sm"
                >
                    <span v-if="events.length === 0">還沒有發起任何活動</span>
                    <span v-else>此分類目前沒有活動</span>
                </div>
                <div v-else class="tw:space-y-3">
                    <EventCard
                        v-for="evt in filteredEvents"
                        :key="evt.id"
                        :event="evt"
                        :members="group.members"
                        :groupId="groupId"
                    />
                </div>
            </div>

            <div class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:p-4">
                <div
                    class="tw:flex tw:items-center tw:justify-between tw:mb-3 tw:border-b tw:pb-2"
                >
                    <h3 class="tw:font-bold tw:text-gray-700">動作紀錄</h3>
                    <span class="tw:text-xs tw:text-gray-400"
                        >最新 {{ activityLogs.length }} 則</span
                    >
                </div>

                <div
                    v-if="logsLoading"
                    class="tw:text-center tw:text-gray-400 tw:py-4 tw:text-sm"
                >
                    載入中...
                </div>
                <div
                    v-else-if="activityLogs.length === 0"
                    class="tw:text-center tw:text-gray-400 tw:py-4 tw:text-sm"
                >
                    目前還沒有動作紀錄
                </div>
                <div v-else class="tw:space-y-3">
                    <div
                        v-for="log in activityLogs"
                        :key="log.id"
                        class="tw:flex tw:gap-3 tw:text-sm"
                    >
                        <div
                            class="tw:w-9 tw:h-9 tw:rounded-full tw:bg-gray-100 tw:overflow-hidden tw:shrink-0 tw:border tw:border-gray-200"
                        >
                            <img
                                v-if="log.actor?.pictureUrl"
                                :src="log.actor.pictureUrl"
                                class="tw:w-full tw:h-full tw:object-cover"
                            />
                        </div>
                        <div class="tw:flex-1">
                            <div class="tw:text-gray-800 tw:font-medium">
                                {{ logActionText(log) }}
                            </div>
                            <div class="tw:text-xs tw:text-gray-400 tw:mt-0.5">
                                {{ formatLogTime(log.createdAt) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <InviteModal
            :show="showInviteModal"
            :groupName="group.name"
            :inviteLink="inviteLink"
            :coverUrl="group.coverUrl"
            @close="showInviteModal = false"
        />
    </div>
</template>
