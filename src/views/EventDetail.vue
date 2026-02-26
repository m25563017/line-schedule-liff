<script setup>
import { ref, inject, onMounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { db } from "../utils/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import EventCalendar from "../components/EventCalendar.vue";
import EventStats from "../components/EventStats.vue";

const route = useRoute();
const userProfile = inject("userProfile");
const groupId = route.params.id;
const eventId = route.params.eventId;

const group = ref(null);
const event = ref(null);
const loading = ref(true);

const isEditing = ref(false);
const currentMonthIndex = ref(0);
const availabilities = ref({});
const selectedUserId = ref("");
const tempDates = ref([]);
const focusedDate = ref(null);

const colorPalette = [
    "tw:bg-red-400",
    "tw:bg-blue-400",
    "tw:bg-yellow-400",
    "tw:bg-purple-400",
    "tw:bg-pink-400",
    "tw:bg-teal-400",
    "tw:bg-orange-400",
];

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
        if (userProfile.value) selectedUserId.value = userProfile.value.userId;
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

// --- 計算邏輯 ---
const memberMap = computed(() => {
    if (!group.value) return {};
    const map = {};
    Object.entries(group.value.members).forEach(([id, member], idx) => {
        map[id] = { ...member, color: colorPalette[idx % colorPalette.length] };
    });
    return map;
});

const isCurrentUserAdmin = computed(
    () => group.value?.createdBy === userProfile.value?.userId,
);
const managedUsers = computed(() => {
    if (!group.value || !userProfile.value) return [];
    const me = { id: userProfile.value.userId, name: "我自己" };
    if (isCurrentUserAdmin.value) {
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
const pendingUsers = computed(() =>
    Object.keys(memberMap.value)
        .filter((uid) => !(availabilities.value[uid] || []).length > 0)
        .map((uid) => memberMap.value[uid]),
);
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
    if (!isEditing.value || !selectedUserId.value || isFinalized.value) return;
    const idx = tempDates.value.indexOf(dateStr);
    if (idx === -1) tempDates.value.push(dateStr);
    else tempDates.value.splice(idx, 1);
};
const isSelectedByMe = (dateStr) =>
    isFinalized.value
        ? event.value.finalDate === dateStr
        : isEditing.value
          ? tempDates.value.includes(dateStr)
          : (availabilities.value[userProfile.value?.userId] || []).includes(
                dateStr,
            );
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
const finalDateInput = ref("");
const isFinalizing = ref(false);
const openDecideModal = () => {
    if (topDates.value.length > 0)
        finalDateInput.value = topDates.value[0].date;
    showDecideModal.value = true;
};
const confirmFinalDate = async () => {
    if (!finalDateInput.value) return alert("請選擇一個日期！");
    isFinalizing.value = true;
    try {
        await updateDoc(doc(db, "groups", groupId, "events", eventId), {
            finalDate: finalDateInput.value,
        });
        event.value.finalDate = finalDateInput.value;
        showDecideModal.value = false;
    } catch (e) {
        alert("設定失敗");
    } finally {
        isFinalizing.value = false;
    }
};

const isSaving = ref(false);
const saveChanges = async () => {
    if (!selectedUserId.value) return;
    isSaving.value = true;
    try {
        await updateDoc(doc(db, "groups", groupId, "events", eventId), {
            [`availabilities.${selectedUserId.value}`]: tempDates.value,
        });
        availabilities.value[selectedUserId.value] = [...tempDates.value];
        isEditing.value = false;
    } catch (e) {
        alert("儲存失敗");
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <div v-if="loading" class="tw:p-10 tw:text-center tw:text-gray-500">
        載入活動中...
    </div>
    <div
        v-else-if="event && group"
        class="tw:min-h-full tw:bg-gray-50 tw:flex tw:flex-col"
    >
        <div
            class="tw:bg-white tw:p-4 tw:text-center tw:shadow-sm tw:relative tw:flex-none tw:z-10"
        >
            <router-link
                v-if="!isEditing"
                :to="`/group/${groupId}`"
                class="tw:absolute tw:left-4 tw:top-4 tw:text-xl tw:text-gray-500 hover:tw:text-gray-800"
                >⬅</router-link
            >
            <button
                v-else
                @click="stopEditing"
                class="tw:absolute tw:left-4 tw:top-4 tw:text-xl tw:text-gray-500 hover:tw:text-gray-800"
            >
                ⬅
            </button>
            <h1 class="tw:text-lg tw:font-bold tw:text-gray-800">
                {{ isEditing ? "選擇日期" : event.title }}
            </h1>
        </div>

        <div
            class="tw:flex-1 tw:p-4 tw:max-w-md tw:mx-auto tw:w-full tw:overflow-y-auto tw:pb-24"
        >
            <div
                v-if="isFinalized"
                class="tw:bg-gradient-to-r tw:from-yellow-400 tw:to-orange-400 tw:text-white tw:p-4 tw:rounded-xl tw:shadow-md tw:mb-4 tw:text-center tw:animate-fade-in"
            >
                <div class="tw:text-2xl tw:mb-1">🎉</div>
                <div class="tw:text-sm tw:font-medium tw:opacity-90">
                    活動日期已定案
                </div>
                <div
                    class="tw:text-2xl tw:font-black tw:tracking-wider tw:mt-1"
                >
                    {{ event.finalDate.replace(/-/g, " / ") }}
                </div>
            </div>

            <div
                v-if="isEditing && managedUsers.length > 1"
                class="tw:mb-4 tw:bg-yellow-50 tw:border tw:border-yellow-200 tw:p-3 tw:rounded-xl tw:animate-fade-in"
            >
                <label
                    class="tw:block tw:text-xs tw:font-bold tw:text-yellow-800 tw:mb-1"
                    >👑 主揪專用：你現在要幫誰填寫？</label
                >
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
                class="tw:bg-blue-50 tw:border tw:border-blue-100 tw:rounded-xl tw:p-4 tw:animate-fade-in tw:mb-4"
            >
                <h4
                    class="tw:font-bold tw:text-blue-800 tw:text-sm tw:mb-2 border-b tw:border-blue-200 tw:pb-1"
                >
                    📅 {{ focusedDate.replace(/-/g, "/") }} 可參加名單：
                </h4>
                <div class="tw:flex tw:flex-wrap tw:gap-2 tw:mt-2">
                    <span
                        v-if="
                            getAvailableUsersForDate(focusedDate).length === 0
                        "
                        class="tw:text-xs tw:text-blue-400"
                        >這天沒有人有空</span
                    >
                    <span
                        v-for="u in getAvailableUsersForDate(focusedDate)"
                        :key="u.id"
                        class="tw:text-xs tw:px-2 tw:py-1 tw:rounded-full tw:text-white tw:font-medium tw:shadow-sm"
                        :class="u.color"
                        >{{ u.displayName }}</span
                    >
                </div>
            </div>

            <EventStats
                v-if="!isEditing && !isFinalized"
                :topDates="topDates"
                :respondedUsers="respondedUsers"
                :pendingUsers="pendingUsers"
            />
        </div>

        <div
            v-if="!isEditing && isFinalized"
            class="tw:fixed tw:bottom-0 tw:left-0 tw:w-full tw:bg-white tw:border-t tw:shadow-lg tw:p-4 tw:z-50 tw:animate-slide-up"
        >
            <button
                disabled
                class="tw:w-full tw:bg-gray-200 tw:text-gray-500 tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-lg"
            >
                🔒 活動已定案，無法再更改
            </button>
        </div>
        <div
            v-else-if="!isEditing && !isFinalized"
            class="tw:fixed tw:bottom-0 tw:left-0 tw:w-full tw:bg-white tw:border-t tw:shadow-lg tw:p-4 tw:flex tw:gap-3 tw:z-50 tw:animate-slide-up"
        >
            <button
                v-if="isCurrentUserAdmin"
                @click="openDecideModal"
                class="tw:flex-1 tw:bg-orange-500 tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:shadow-md active:tw:scale-95 tw:transition"
            >
                👑 決定日期
            </button>
            <button
                @click="startEditing"
                class="tw:flex-[2] tw:bg-[#06C755] tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-lg tw:shadow-md active:tw:scale-95 tw:transition"
            >
                我要選日子 ✏️
            </button>
        </div>
        <div
            v-else
            class="tw:fixed tw:bottom-0 tw:left-0 tw:w-full tw:bg-white tw:border-t tw:shadow-lg tw:p-4 tw:flex tw:gap-3 tw:z-50 tw:animate-slide-up"
        >
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
                class="tw:flex-1 tw:bg-[#06C755] tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:shadow-md active:tw:scale-95 tw:transition disabled:tw:opacity-50"
            >
                {{ isSaving ? "儲存中..." : "確認送出" }}
            </button>
        </div>

        <div
            v-if="showDecideModal"
            class="tw:fixed tw:inset-0 tw:bg-black/50 tw:z-[100] tw:flex tw:items-center tw:justify-center tw:p-4 tw:animate-fade-in"
        >
            <div
                class="tw:bg-white tw:rounded-2xl tw:w-full tw:max-w-sm tw:p-6 tw:shadow-xl tw:animate-slide-up"
            >
                <h2 class="tw:text-xl tw:font-bold tw:text-gray-800 tw:mb-2">
                    拍板定案！🔨
                </h2>
                <p class="tw:text-sm tw:text-gray-500 tw:mb-6">
                    決定後，成員將無法再更改自己的空擋。請選擇最終的活動日期：
                </p>
                <input
                    v-model="finalDateInput"
                    type="date"
                    class="tw:w-full tw:p-3 tw:border tw:border-gray-300 tw:rounded-lg tw:outline-none focus:tw:ring-2 focus:tw:ring-orange-500 tw:mb-6"
                />
                <div class="tw:flex tw:gap-3">
                    <button
                        @click="showDecideModal = false"
                        class="tw:flex-1 tw:bg-gray-100 tw:text-gray-700 tw:py-3 tw:rounded-xl tw:font-bold"
                    >
                        取消
                    </button>
                    <button
                        @click="confirmFinalDate"
                        :disabled="isFinalizing"
                        class="tw:flex-1 tw:bg-orange-500 tw:text-white tw:py-3 tw:rounded-xl tw:font-bold tw:shadow-md"
                    >
                        {{ isFinalizing ? "處理中..." : "確認定案" }}
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
