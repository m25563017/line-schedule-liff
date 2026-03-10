<script setup>
import { ref, inject, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db } from "../utils/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNotify } from "@pieda/core";
import EventCalendar from "../components/EventCalendar.vue";
import EventStats from "../components/EventStats.vue";
import DecideModal from "../components/DecideModal.vue";

const route = useRoute();
const router = useRouter();
const userProfile = inject("userProfile");
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
    Object.entries(group.value.members).forEach(([id, member]) => {
        map[id] = { ...member };
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

// 🌟 未填寫名單 (待會防呆會用到)
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
const isFinalizing = ref(false);

const openDecideModal = () => {
    showDecideModal.value = true;
};

// 🚀 新增：點擊「決定日期」時的防呆檢查
const handleDecideClick = () => {
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

// selectedDate
const confirmFinalDate = async (selectedDate) => {
    isFinalizing.value = true;
    try {
        await updateDoc(doc(db, "groups", groupId, "events", eventId), {
            finalDate: selectedDate,
        });
        event.value.finalDate = selectedDate;
        showDecideModal.value = false;
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
                v-if="isCurrentUserAdmin && !isEditing"
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
            class="tw:flex-1 tw:p-4 tw:max-w-md tw:mx-auto tw:w-full tw:overflow-y-auto tw:pb-24"
        >
            <div
                v-if="isFinalized"
                class="tw:bg-accent tw:text-white tw:p-4 tw:rounded-xl tw:shadow-md tw:mb-4 tw:text-center tw:animate-fade-in"
            >
                <svg
                    class="tw:w-6 tw:h-6 tw:mx-auto tw:mb-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M5.8 11.3L2 22l10.7-3.79M4 3h.01M22 8h.01M15 2h.01M22 20h.01M20 2.75a2.9 2.9 0 00-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10m8 3l-.82-.33c-.86-.36-1.82.14-2.08 1.02a1.94 1.94 0 01-2.42 1.34h0a1.95 1.95 0 00-2.46 1.3l-.33.83m-3.03 2.03l-3.14 3.14a2 2 0 01-2.82 0l-1.18-1.18a2 2 0 010-2.82L7 12m4.5-.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"
                    />
                </svg>
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
                            getAvailableUsersForDate(focusedDate).length === 0
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
        </div>

        <div
            v-if="!isEditing && isFinalized"
            class="tw:fixed tw:bottom-0 tw:left-0 tw:w-full tw:bg-white tw:border-t tw:shadow-lg tw:p-4 tw:z-50 tw:animate-slide-up"
        >
            <button
                disabled
                class="tw:w-full tw:bg-gray-200 tw:text-gray-500 tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-lg tw:flex tw:items-center tw:justify-center"
            >
                <div class="tw:flex tw:items-center tw:gap-2">
                    <svg
                        class="tw:w-4 tw:h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2.5"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                        />
                    </svg>
                    <span>活動已定案，無法再更改</span>
                </div>
            </button>
        </div>

        <div
            v-else-if="!isEditing && !isFinalized"
            class="tw:fixed tw:bottom-0 tw:left-0 tw:w-full tw:bg-white tw:border-t tw:border-gray-200 tw:shadow-lg tw:p-4 tw:flex tw:gap-3 tw:z-50 tw:animate-slide-up"
        >
            <button
                v-if="isCurrentUserAdmin"
                @click="handleDecideClick"
                class="tw:flex-1 tw:bg-accent tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:shadow-md active:tw:scale-95 tw:transition"
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
                class="tw:flex-[2] tw:bg-primary tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-lg tw:shadow-md active:tw:scale-95 tw:transition"
            >
                <span class="tw:inline-flex tw:items-center tw:gap-2">
                    <span>我要選日子</span>
                    <svg
                        class="tw:w-4 tw:h-4"
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
                class="tw:flex-1 tw:bg-primary tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:shadow-md active:tw:scale-95 tw:transition disabled:tw:opacity-50"
            >
                {{ isSaving ? "儲存中..." : "確認送出" }}
            </button>
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
