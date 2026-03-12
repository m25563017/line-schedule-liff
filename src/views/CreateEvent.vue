<script setup>
import { ref, inject, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db } from "../utils/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { addGroupActivityLog } from "../utils/activityLog";

const route = useRoute();
const router = useRouter();
const userProfile = inject("userProfile");

const groupId = route.params.id;
const title = ref("");

// 1. 計算時間限制 (min 與 max)
const today = new Date();
const currentYear = today.getFullYear();
const currentMonthNum = today.getMonth() + 1;

// 🟢 最小值：這個月 (例如 "2024-03")
const minMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;

// 🔴 最大值：三年後的同一個月 (例如 "2027-03")
const maxYear = currentYear + 3;
const maxMonthStr = `${maxYear}-${String(currentMonthNum).padStart(2, "0")}`;

// 預設選擇這個月
const selectedStartMonth = ref(minMonthStr);

// 開放幾個月
const monthCount = ref(1);

// 2. 自動計算開放的月份陣列
const targetMonths = computed(() => {
    if (!selectedStartMonth.value) return [];
    const [year, month] = selectedStartMonth.value.split("-").map(Number);

    const monthsArray = [];
    for (let i = 0; i < monthCount.value; i++) {
        const d = new Date(year, month - 1 + i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        monthsArray.push(`${y}-${m}`);
    }
    return monthsArray;
});

const isSubmitting = ref(false);

const handleCreate = async () => {
    if (!title.value.trim()) return alert("請輸入活動標題");

    isSubmitting.value = true;
    try {
        const eventsRef = collection(db, "groups", groupId, "events");

        const docRef = await addDoc(eventsRef, {
            title: title.value,
            targetMonths: targetMonths.value,
            createdBy: userProfile.value.userId,
            createdAt: serverTimestamp(),
            availabilities: {},
        });

        await addGroupActivityLog({
            groupId,
            action: "event.create",
            actor: {
                userId: userProfile.value.userId,
                displayName: userProfile.value.displayName,
                pictureUrl: userProfile.value.pictureUrl,
            },
            target: { type: "event", id: docRef.id, title: title.value },
        });

        router.push(`/group/${groupId}/event/${docRef.id}`);
    } catch (e) {
        console.error("建立活動失敗", e);
        alert("發生錯誤，請稍後再試");
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div class="tw:min-h-full tw:bg-gray-50 tw:flex tw:flex-col">
        <div
            class="tw:flex tw:items-center tw:justify-center tw:bg-primary tw:text-white tw:p-4 tw:text-center tw:text-lg tw:font-bold tw:shadow-sm tw:relative"
        >
            <router-link
                :to="`/group/${groupId}`"
                class="tw:text-sm tw:absolute tw:left-4 tw:top-1/2 tw:-translate-y-1/2"
            >
                <div class="tw:flex tw:items-center tw:gap-2">
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
                    <span>返回</span>
                </div>
            </router-link>
            <h1 class="tw:text-lg tw:font-bold">發起新活動</h1>
        </div>

        <div class="tw:p-6 tw:max-w-md tw:mx-auto tw:w-full tw:flex-1">
            <div
                class="tw:bg-white tw:p-6 tw:rounded-xl tw:shadow-sm tw:border tw:space-y-6"
            >
                <div>
                    <label
                        class="tw:block tw:text-sm tw:font-bold tw:text-gray-700 tw:mb-2"
                        >活動標題</label
                    >
                    <input
                        v-model="title"
                        type="text"
                        placeholder="例如：春季日本自由行"
                        class="tw:w-full tw:p-3 tw:bg-gray-50 tw:border tw:border-gray-200 tw:rounded-lg tw:outline-none focus:tw:ring-2 focus:tw:ring-green-500 tw:transition"
                    />
                </div>

                <div class="tw:grid tw:grid-cols-2 tw:gap-3">
                    <div>
                        <label
                            class="tw:block tw:text-sm tw:font-bold tw:text-gray-700 tw:mb-2"
                            >起始月份</label
                        >
                        <input
                            v-model="selectedStartMonth"
                            type="month"
                            :min="minMonthStr"
                            :max="maxMonthStr"
                            class="tw:w-full tw:p-3 tw:bg-gray-50 tw:border tw:border-gray-200 tw:rounded-lg tw:text-sm tw:outline-none focus:tw:ring-2 focus:tw:ring-green-500 tw:transition"
                        />
                    </div>

                    <div>
                        <label
                            class="tw:block tw:text-sm tw:font-bold tw:text-gray-700 tw:mb-2"
                            >開放長度</label
                        >
                        <div class="tw:relative">
                            <select
                                v-model.number="monthCount"
                                class="tw:appearance-none tw:w-full tw:p-3 tw:bg-gray-50 tw:border tw:border-gray-200 tw:rounded-lg tw:text-sm tw:outline-none focus:tw:ring-2 focus:tw:ring-green-500 tw:transition"
                            >
                                <option value="1">1 個月</option>
                                <option value="2">2 個月</option>
                                <option value="3">3 個月</option>
                            </select>
                            <div
                                class="tw:pointer-events-none tw:absolute tw:inset-y-0 tw:right-0 tw:flex tw:items-center tw:px-3 tw:text-gray-400"
                            >
                                <svg
                                    class="tw:w-4 tw:h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 9l-7 7-7-7"
                                    ></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="tw:p-3 tw:bg-green-50 tw:rounded-lg tw:border tw:border-green-100"
                >
                    <p
                        class="tw:text-xs tw:text-green-800 tw:font-bold tw:mb-2"
                    >
                        提供成員填寫的月份：
                    </p>
                    <div class="tw:flex tw:flex-wrap tw:gap-2">
                        <span
                            v-for="m in targetMonths"
                            :key="m"
                            class="tw:bg-white tw:text-green-700 tw:text-xs tw:font-medium tw:px-2 tw:py-1 tw:rounded tw:border tw:border-green-200"
                        >
                            {{ m.replace("-", "年") }}月
                        </span>
                    </div>
                </div>

                <button
                    @click="handleCreate"
                    :disabled="isSubmitting"
                    class="tw:w-full tw:bg-primary tw:text-white tw:py-3.5 tw:rounded-lg tw:font-bold tw:text-lg tw:shadow-md active:tw:scale-95 tw:transition disabled:tw:opacity-50 mt-4"
                >
                    {{ isSubmitting ? "建立中..." : "確定發起" }}
                </button>
            </div>
        </div>
    </div>
</template>
