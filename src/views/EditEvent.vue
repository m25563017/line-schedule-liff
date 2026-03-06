<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db } from "../utils/firebase";
import {
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    deleteField,
} from "firebase/firestore";
import { useNotify } from "@pieda/core";

const route = useRoute();
const router = useRouter();
const groupId = route.params.id;
const eventId = route.params.eventId;
const $notify = useNotify();

const loading = ref(true);
const isSaving = ref(false);
const isDeleting = ref(false);

const title = ref("");
const startMonth = ref("");
const monthCount = ref(1);
const event = ref(null);

// 🌟 記錄原本的月份，用來做比對
const originalMonths = ref([]);
// 🌟 是否清除現有資料的選項綁定
const clearData = ref(false);

onMounted(async () => {
    try {
        const eventRef = doc(db, "groups", groupId, "events", eventId);
        const docSnap = await getDoc(eventRef);

        if (docSnap.exists()) {
            event.value = docSnap.data();
            title.value = event.value.title;

            if (
                event.value.targetMonths &&
                event.value.targetMonths.length > 0
            ) {
                originalMonths.value = [...event.value.targetMonths];
                startMonth.value = event.value.targetMonths[0];

                const currentCount = event.value.targetMonths.length;
                monthCount.value = currentCount > 3 ? 3 : currentCount;
            }
        } else {
            $notify.alert({
                title: "系統通知",
                message: "找不到此活動",
                variant: "error",
            });
            router.push(`/group/${groupId}`);
        }
    } catch (e) {
        console.error("讀取失敗:", e);
    } finally {
        loading.value = false;
    }
});

// 🌟 即時計算出「新的月份陣列」
const newMonths = computed(() => {
    if (!startMonth.value) return [];
    const months = [];
    const [yearStr, monthStr] = startMonth.value.split("-");
    let y = parseInt(yearStr);
    let m = parseInt(monthStr);

    for (let i = 0; i < monthCount.value; i++) {
        months.push(`${y}-${String(m).padStart(2, "0")}`);
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
    }
    return months;
});

// 🌟 判斷：主揪是否有改動到日期？
const isDateChanged = computed(() => {
    if (originalMonths.value.length === 0) return false;
    if (originalMonths.value.length !== newMonths.value.length) return true;
    return !originalMonths.value.every((m, i) => m === newMonths.value[i]);
});

// 🌟 判斷：新的區間是不是「漏掉」了原本的某些月份？
const isMissingOriginalMonths = computed(() => {
    if (originalMonths.value.length === 0) return false;
    return originalMonths.value.some((m) => !newMonths.value.includes(m));
});

// 🌟 監聽：如果漏掉了原本的月份，就自動幫主揪打勾「清除資料」
watch(isMissingOriginalMonths, (missing) => {
    clearData.value = missing;
});

// 💾 儲存變更
const updateEvent = async () => {
    if (!title.value.trim()) {
        return $notify.alert({
            title: "提示",
            message: "請輸入活動名稱喔！",
            variant: "warning",
        });
    }
    if (!startMonth.value) {
        return $notify.alert({
            title: "提示",
            message: "請選擇開始月份！",
            variant: "warning",
        });
    }

    isSaving.value = true;
    try {
        const payload = {
            title: title.value,
            targetMonths: newMonths.value,
        };

        // 如果日期有變，且主揪勾選了「清除資料」，就把原本的填寫紀錄刪掉！
        if (isDateChanged.value && clearData.value) {
            payload.availabilities = deleteField();
        }

        const eventRef = doc(db, "groups", groupId, "events", eventId);
        await updateDoc(eventRef, payload);

        $notify.alert({
            title: "成功",
            message: "活動內容已更新！",
            variant: "success",
        });
        router.push(`/group/${groupId}/event/${eventId}`);
    } catch (e) {
        console.error("更新失敗:", e);
        $notify.alert({
            title: "錯誤",
            message: "更新失敗，請稍後再試",
            variant: "error",
        });
    } finally {
        isSaving.value = false;
    }
};

// 🗑️ 刪除活動
const handleDeleteEvent = () => {
    $notify
        .alert({
            title: "危險操作",
            message:
                "確定要刪除此活動嗎？\n刪除後所有成員的填寫紀錄將無法復原！",
            variant: "error",
            confirm: true,
        })
        .then(async (result) => {
            if (!result.isConfirmed) return;

            isDeleting.value = true;
            try {
                const eventRef = doc(db, "groups", groupId, "events", eventId);
                await deleteDoc(eventRef);

                $notify.alert({
                    title: "成功",
                    message: "活動已刪除",
                    variant: "success",
                });
                router.push(`/group/${groupId}`);
            } catch (e) {
                console.error("刪除失敗", e);
                $notify.alert({
                    title: "錯誤",
                    message: "刪除失敗，請稍後再試。",
                    variant: "error",
                });
                isDeleting.value = false;
            }
        });
};
</script>

<template>
    <div v-if="loading" class="tw:p-10 tw:text-center tw:text-gray-500">
        載入資料中...
    </div>

    <div v-else class="tw:min-h-full tw:bg-gray-50 tw:flex tw:flex-col">
        <div
            class="tw:bg-white tw:p-4 tw:text-center tw:shadow-sm tw:relative tw:flex-none tw:z-10"
        >
            <router-link
                :to="`/group/${groupId}/event/${eventId}`"
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
            <h1 class="tw:text-lg tw:font-bold tw:text-gray-800">活動設定</h1>
        </div>

        <div class="tw:p-4 tw:flex-1 tw:max-w-md tw:mx-auto tw:w-full tw:mt-4">
            <div
                class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:p-5 tw:space-y-6 tw:mb-6"
            >
                <div>
                    <label
                        class="tw:block tw:font-bold tw:text-gray-700 tw:mb-2"
                        >活動名稱</label
                    >
                    <input
                        v-model="title"
                        type="text"
                        class="tw:w-full tw:p-3 tw:border tw:border-gray-200 tw:bg-gray-50 tw:rounded-lg tw:outline-none focus:tw:ring-2 focus:tw:ring-primary tw:transition"
                    />
                </div>

                <div>
                    <label
                        class="tw:block tw:font-bold tw:text-gray-700 tw:mb-2"
                        >開始月份</label
                    >
                    <input
                        v-model="startMonth"
                        type="month"
                        class="tw:w-full tw:p-3 tw:border tw:border-gray-200 tw:bg-gray-50 tw:rounded-lg tw:outline-none focus:tw:ring-2 focus:tw:ring-primary tw:transition"
                    />
                </div>

                <div>
                    <label
                        class="tw:block tw:font-bold tw:text-gray-700 tw:mb-2"
                        >開放選擇區間</label
                    >
                    <select
                        v-model="monthCount"
                        class="tw:w-full tw:p-3 tw:border tw:border-gray-200 tw:bg-gray-50 tw:rounded-lg tw:outline-none focus:tw:ring-2 focus:tw:ring-primary tw:transition"
                    >
                        <option :value="1">1 個月</option>
                        <option :value="2">2 個月</option>
                        <option :value="3">3 個月</option>
                    </select>
                </div>

                <div
                    v-if="isDateChanged"
                    class="tw:mt-4 tw:p-3 tw:bg-orange-50 tw:border tw:border-orange-200 tw:rounded-lg tw:animate-fade-in"
                >
                    <label
                        class="tw:flex tw:items-start tw:gap-3 tw:cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            v-model="clearData"
                            class="tw:mt-1 tw:w-4 tw:h-4 tw:text-primary tw:rounded tw:border-gray-300 focus:tw:ring-primary"
                        />
                        <div class="tw:flex-1">
                            <span
                                class="tw:text-sm tw:font-bold tw:text-orange-800"
                                >清空所有人已填寫的日期</span
                            >
                            <p class="tw:text-xs tw:text-orange-600 tw:mt-1">
                                {{
                                    isMissingOriginalMonths
                                        ? "⚠️ 新區間未包含原本的月份，強烈建議清空舊資料以免混亂。"
                                        : "您變更了選擇區間，可勾選此項讓所有成員重新填寫。"
                                }}
                            </p>
                        </div>
                    </label>
                </div>

                <button
                    @click="updateEvent"
                    :disabled="isSaving"
                    class="tw:w-full tw:bg-primary tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:shadow-md active:tw:scale-95 tw:transition disabled:tw:opacity-50"
                >
                    {{ isSaving ? "儲存中..." : "儲存變更" }}
                </button>
            </div>

            <div
                class="tw:bg-white tw:border tw:border-red-100 tw:rounded-xl tw:p-5"
            >
                <h3 class="tw:text-red-500 tw:font-bold tw:mb-2 tw:text-sm">
                    危險操作
                </h3>
                <p class="tw:text-xs tw:text-gray-500 tw:mb-4">
                    刪除後無法復原，所有成員的月曆紀錄將會消失。
                </p>
                <button
                    @click="handleDeleteEvent"
                    :disabled="isDeleting"
                    class="tw:w-full tw:bg-red-50 tw:text-red-500 tw:border tw:border-red-200 tw:py-3 tw:rounded-xl tw:font-bold hover:tw:bg-red-100 active:tw:scale-95 tw:transition disabled:tw:opacity-50 tw:flex tw:items-center tw:justify-center tw:gap-2"
                >
                    <svg
                        class="tw:w-4 tw:h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                    </svg>
                    <span>刪除此活動</span>
                </button>
            </div>
        </div>
    </div>
</template>
