<script setup>
import { ref, watch } from "vue";

// 接收外部傳進來的資料
const props = defineProps({
    show: Boolean, // 控制是否顯示
    topDates: {
        // 接收 Top 3 日期陣列
        type: Array,
        default: () => [],
    },
    isFinalizing: Boolean, // 接收是否正在儲存中的狀態
});

// 定義要傳回給父元件的事件
const emit = defineEmits(["close", "confirm"]);

// 元件內部的狀態：目前選中的日期
const finalDateInput = ref("");

// 🌟 智慧監聽：當彈窗打開時，自動幫主揪選中第 1 名的日期
watch(
    () => props.show,
    (newVal) => {
        if (newVal) {
            if (props.topDates && props.topDates.length > 0) {
                finalDateInput.value = props.topDates[0].date;
            } else {
                finalDateInput.value = "";
            }
        }
    },
);

// 按下確認定案
const handleConfirm = () => {
    if (!finalDateInput.value) {
        alert("請選擇一個日期！");
        return;
    }
    // 把選中的日期傳回給父元件
    emit("confirm", finalDateInput.value);
};
</script>

<template>
    <div
        v-if="show"
        class="tw:fixed tw:inset-0 tw:bg-black/50 tw:z-[100] tw:flex tw:items-center tw:justify-center tw:p-4 tw:animate-fade-in"
    >
        <div
            class="tw:bg-white tw:rounded-2xl tw:w-full tw:max-w-sm tw:p-6 tw:shadow-xl tw:animate-slide-up"
        >
            <h2 class="tw:text-xl tw:font-bold tw:text-gray-800 tw:mb-2">
                拍板定案！
            </h2>
            <p class="tw:text-sm tw:text-gray-500 tw:mb-5">
                決定後，成員將無法再更改自己的空擋。
            </p>

            <div class="tw:mb-6">
                <div v-if="topDates.length > 0" class="tw:space-y-2 tw:mb-3">
                    <label
                        class="tw:block tw:text-xs tw:font-bold tw:text-gray-400 tw:mb-2"
                        >最多人有空的日期：</label
                    >
                    <button
                        v-for="(item, index) in topDates"
                        :key="index"
                        @click="finalDateInput = item.date"
                        class="tw:w-full tw:flex tw:justify-between tw:items-center tw:p-3 tw:rounded-xl tw:border-2 tw:transition"
                        :class="
                            finalDateInput === item.date
                                ? 'tw:border-orange-500 tw:bg-orange-50'
                                : 'tw:border-gray-100 tw:bg-white hover:tw:border-orange-200'
                        "
                    >
                        <div class="tw:flex tw:items-center tw:gap-2">
                            <div
                                class="tw:w-5 tw:h-5 tw:rounded-full tw:border-2 tw:flex tw:items-center tw:justify-center"
                                :class="
                                    finalDateInput === item.date
                                        ? 'tw:border-orange-500 tw:bg-orange-500'
                                        : 'tw:border-gray-300'
                                "
                            >
                                <svg
                                    v-if="finalDateInput === item.date"
                                    class="tw:w-3 tw:h-3 tw:text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="3"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M4.5 12.75l6 6 9-13.5"
                                    />
                                </svg>
                            </div>
                            <span
                                class="tw:font-bold"
                                :class="
                                    finalDateInput === item.date
                                        ? 'tw:text-orange-700'
                                        : 'tw:text-gray-700'
                                "
                            >
                                {{ item.date.replace(/-/g, " / ") }}
                            </span>
                        </div>
                        <span
                            class="tw:text-xs tw:font-bold tw:bg-orange-100 tw:text-orange-600 tw:px-2 tw:py-1 tw:rounded-full"
                        >
                            {{ item.count }} 人
                        </span>
                    </button>
                </div>

                <div class="tw:pt-2">
                    <label
                        class="tw:block tw:text-xs tw:font-bold tw:text-gray-400 tw:mb-2"
                        >或選擇其他日期：</label
                    >
                    <div
                        class="tw:flex tw:items-center tw:p-1 tw:rounded-xl tw:border-2 tw:transition"
                        :class="
                            !topDates.find((d) => d.date === finalDateInput)
                                ? 'tw:border-orange-500 tw:bg-orange-50'
                                : 'tw:border-gray-100 tw:bg-white'
                        "
                    >
                        <input
                            v-model="finalDateInput"
                            type="date"
                            class="tw:w-full tw:p-2 tw:bg-transparent tw:outline-none tw:text-gray-700 tw:font-medium cursor-pointer"
                            @click="finalDateInput = ''"
                        />
                    </div>
                </div>
            </div>

            <div class="tw:flex tw:gap-3">
                <button
                    @click="$emit('close')"
                    class="tw:flex-1 tw:bg-gray-100 tw:text-gray-700 tw:py-3 tw:rounded-xl tw:font-bold"
                >
                    取消
                </button>
                <button
                    @click="handleConfirm"
                    :disabled="isFinalizing || !finalDateInput"
                    class="tw:flex-1 tw:bg-orange-500 tw:text-white tw:py-3 tw:rounded-xl tw:font-bold tw:shadow-md disabled:tw:opacity-50"
                >
                    {{ isFinalizing ? "處理中..." : "確認定案" }}
                </button>
            </div>
        </div>
    </div>
</template>
