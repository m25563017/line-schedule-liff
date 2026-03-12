<script setup>
import { ref, watch } from "vue";
import { useNotify } from "@pieda/core";

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

// 元件內部的狀態：日期、時間（24 小時制，分鐘 00/10/20/30）、是否展開其他日期
const finalDateInput = ref("");
const selectedHour = ref("09"); // 0–23
const selectedMinute = ref("00"); // 00, 10, 20, 30, 40, 50
const showOtherDate = ref(false);
const hourDropdownOpen = ref(false);

// 24 小時制：0–23
const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: String(i).padStart(2, "0"),
    label: `${String(i).padStart(2, "0")} 時`,
}));
// 分鐘僅 00、10、20、30
const minuteOptions = ["00", "10", "20", "30", "40", "50"];

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
            selectedHour.value = "09";
            selectedMinute.value = "00";
            showOtherDate.value = !(
                props.topDates && props.topDates.length > 0
            );
            hourDropdownOpen.value = false;
        }
    },
);

// 按下確認定案（傳回日期 + 時間 "HH:mm"，分鐘為 00/10/20/30）
const handleConfirm = () => {
    if (!finalDateInput.value) {
        $notify.alert({
            title: "系統通知",
            message: "請選擇一個日期！",
            variant: "warning",
        });
        return;
    }
    const time = `${selectedHour.value.padStart(2, "0")}:${selectedMinute.value}`;
    emit("confirm", {
        date: finalDateInput.value,
        time,
    });
};
</script>

<template>
    <div
        v-if="show"
        class="tw:fixed tw:inset-0 tw:bg-black/50 tw:z-100 tw:flex tw:items-center tw:justify-center tw:p-4 tw:animate-fade-in"
    >
        <div
            class="tw:bg-white tw:rounded-2xl tw:w-full tw:max-w-sm tw:p-6 tw:shadow-xl tw:animate-slide-up"
            @click.self="hourDropdownOpen = false"
        >
            <h2 class="tw:text-xl tw:font-bold tw:text-gray-800 tw:mb-2">
                拍板定案！
            </h2>
            <p class="tw:text-sm tw:text-gray-500 tw:mb-5">
                決定後，成員將無法再更改自己的空擋。
            </p>

            <div class="tw:mb-6">
                <div v-if="topDates.length > 0" class="tw:space-y-2 tw:mb-4">
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

                <div class="tw:mb-4">
                    <label
                        class="tw:block tw:text-xs tw:font-bold tw:text-gray-400 tw:mb-2"
                        >決定時間（24 小時制）：</label
                    >
                    <div class="tw:flex tw:gap-2">
                        <!-- 小時：自訂可捲動列表，避免原生 select 滑不到 18–23 時 -->
                        <div class="tw:flex-1 tw:relative">
                            <button
                                type="button"
                                @click="hourDropdownOpen = !hourDropdownOpen"
                                class="tw:w-full tw:p-2 tw:rounded-xl tw:border-2 tw:border-gray-100 tw:bg-white tw:text-gray-700 tw:font-medium tw:outline-none focus:tw:border-orange-200 tw:text-left tw:flex tw:items-center tw:justify-between"
                            >
                                <span
                                    >{{
                                        selectedHour.padStart(2, "0")
                                    }}
                                    時</span
                                >
                                <svg
                                    class="tw:w-4 tw:h-4 tw:shrink-0 tw:transition-transform"
                                    :class="hourDropdownOpen && 'tw:rotate-180'"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>
                            <div
                                v-show="hourDropdownOpen"
                                class="tw:absolute tw:left-0 tw:right-0 tw:top-full tw:mt-1 tw:bg-white tw:border tw:border-gray-200 tw:rounded-xl tw:shadow-lg tw:z-10 tw:max-h-48 tw:overflow-y-auto"
                            >
                                <button
                                    v-for="opt in hourOptions"
                                    :key="opt.value"
                                    type="button"
                                    @click="
                                        selectedHour = opt.value;
                                        hourDropdownOpen = false;
                                    "
                                    class="tw:w-full tw:py-2 tw:px-3 tw:text-left tw:text-gray-700 hover:tw:bg-orange-50 tw:transition tw:border-b tw:border-gray-50 last:tw:border-b-0"
                                    :class="
                                        selectedHour === opt.value &&
                                        'tw:bg-orange-50 tw:font-bold tw:text-orange-700'
                                    "
                                >
                                    {{ opt.label }}
                                </button>
                            </div>
                        </div>
                        <select
                            v-model="selectedMinute"
                            class="tw:flex-1 tw:p-2 tw:rounded-xl tw:border-2 tw:border-gray-100 tw:bg-white tw:text-gray-700 tw:font-medium tw:outline-none focus:tw:border-orange-200"
                        >
                            <option
                                v-for="m in minuteOptions"
                                :key="m"
                                :value="m"
                            >
                                {{ m }} 分
                            </option>
                        </select>
                    </div>
                </div>

                <!-- 或選擇其他日期：放在最下方，有需求才展開 -->
                <div class="tw:border-t tw:border-gray-100 tw:pt-4">
                    <button
                        type="button"
                        @click="showOtherDate = !showOtherDate"
                        class="tw:w-full tw:flex tw:items-center tw:justify-center tw:gap-2 tw:text-sm tw:text-gray-500 hover:tw:text-gray-700 tw:py-1"
                    >
                        <span>{{
                            showOtherDate ? "收合" : "需要選其他日期？"
                        }}</span>
                        <svg
                            class="tw:w-4 tw:h-4 tw:transition-transform"
                            :class="showOtherDate && 'tw:rotate-180'"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>
                    <div v-show="showOtherDate" class="tw:mt-3">
                        <label
                            class="tw:block tw:text-xs tw:font-bold tw:text-gray-400 tw:mb-2"
                            >選擇日期</label
                        >
                        <input
                            v-model="finalDateInput"
                            type="date"
                            class="tw:w-full tw:p-2 tw:rounded-xl tw:border-2 tw:border-gray-100 tw:bg-white tw:text-gray-700 tw:font-medium tw:outline-none focus:tw:border-orange-200"
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
