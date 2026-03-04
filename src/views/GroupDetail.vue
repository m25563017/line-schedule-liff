<script setup>
import { ref, onMounted, inject } from "vue";
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
const $notify = useNotify();
const copyInviteLink = async () => {
    // 產生專屬邀請網址 (例如: http://localhost:5173/group/123/join)
    const link = `${window.location.origin}/group/${groupId}/join`;

    try {
        await navigator.clipboard.writeText(link);
        $notify.alert({
            title: "系統通知",
            message: "邀請連結已複製！快去貼給 LINE 的朋友吧！\n\n" + link,
            variant: "success",
        });
    } catch (err) {
        $notify.alert({
            title: "系統通知",
            message: "",
            variant: "error",
        });
    }
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
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div v-if="group" class="tw:min-h-full tw:bg-gray-50 tw:pb-20">
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
                class="tw:w-full tw:h-full tw:bg-linear-to-br tw:from-green-400 tw:to-blue-500"
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
                                class="tw:bg-primary/10 tw:text-primary tw:border tw:border-primary/30 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap"
                            >
                                已定案
                            </span>

                            <span
                                v-else
                                class="tw:bg-accent/10 tw:text-accent tw:border tw:border-accent/30 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap"
                            >
                                選擇中
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
                                    class="tw:font-bold tw:text-orange-600 tw:flex tw:items-center tw:gap-1"
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
                                    <span>
                                        決定日期：{{
                                            evt.finalDate.replace(/-/g, " / ")
                                        }}
                                    </span>
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
                                    <span>
                                        開放區間：{{ evt.targetMonths.length }}
                                        個月
                                    </span>
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
    </div>

    <div v-else class="tw:text-center tw:mt-20 tw:text-gray-400">載入中...</div>
</template>
