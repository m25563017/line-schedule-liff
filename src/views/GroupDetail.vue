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

import InviteModal from "../components/InviteModal.vue";
import EventCard from "../components/EventCard.vue";
import MemberListItem from "../components/MemberListItem.vue";

const route = useRoute();
const groupId = route.params.id;
const userProfile = inject("userProfile");
const group = ref(null);
const events = ref([]);
const loading = ref(true);

const $notify = useNotify();

// 控制 InviteModal 是否顯示
const showInviteModal = ref(false);

// 產生專屬邀請網址 (給 InviteModal 用)
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
                    <img
                        class="tw:w-4 tw:h-4"
                        src="../assets/img/link.png"
                        alt="invite"
                    />
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
                    <EventCard
                        v-for="evt in events"
                        :key="evt.id"
                        :event="evt"
                        :members="group.members"
                        :groupId="groupId"
                    />
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
                    <MemberListItem
                        v-for="(member, uid) in group.members"
                        :key="uid"
                        :member="member"
                    />
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
