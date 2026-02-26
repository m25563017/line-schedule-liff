<script setup>
import { ref, onMounted } from "vue";
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

const route = useRoute();
const groupId = route.params.id;
const group = ref(null);
const events = ref([]);
const loading = ref(true);

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
                class="tw:w-full tw:h-full tw:object-cover"
            />
            <div
                v-else
                class="tw:w-full tw:h-full tw:bg-gradient-to-br tw:from-green-400 tw:to-blue-500"
            ></div>

            <router-link
                to="/list"
                class="tw:absolute tw:top-4 tw:left-4 tw:bg-black/30 tw:text-white tw:p-2 tw:rounded-full tw:backdrop-blur-sm"
            >
                ⬅
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
                    class="tw:bg-[#06C755] tw:text-white tw:p-3 tw:rounded-lg tw:font-bold tw:flex tw:flex-col tw:items-center tw:gap-1 active:tw:scale-95 tw:transition"
                >
                    <span class="tw:text-xl">📅</span>
                    <span>發起活動</span>
                </router-link>

                <button
                    class="tw:bg-gray-100 tw:text-gray-700 tw:p-3 tw:rounded-lg tw:font-bold tw:flex tw:flex-col tw:items-center tw:gap-1 active:tw:scale-95 tw:transition"
                >
                    <span class="tw:text-xl">🔗</span>
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
                                class="tw:bg-orange-100 tw:text-orange-700 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap"
                            >
                                🎉 已定案
                            </span>
                            <span
                                v-else
                                class="tw:bg-green-100 tw:text-green-700 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap"
                            >
                                🗓️ 選擇中
                            </span>
                        </div>

                        <div class="tw:flex tw:justify-between tw:items-end">
                            <div class="tw:text-xs tw:text-gray-500">
                                <div
                                    v-if="evt.finalDate"
                                    class="tw:font-bold tw:text-orange-600"
                                >
                                    日期：{{
                                        evt.finalDate.replace(/-/g, " / ")
                                    }}
                                </div>
                                <div v-else>
                                    開放區間：{{ evt.targetMonths.length }} 個月
                                </div>
                            </div>
                            <span class="tw:text-gray-300 tw:text-sm">➜</span>
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
                        <img
                            :src="
                                member.pictureUrl ||
                                'https://via.placeholder.com/40'
                            "
                            class="tw:w-10 tw:h-10 tw:rounded-full tw:bg-gray-200 tw:object-cover tw:border"
                        />
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
