<script setup>
defineProps({
    months: Array,
    monthIndex: Number,
    days: Array,
    isEditing: Boolean,
    isFinalized: Boolean,
    checkSelected: Function, // 用來判斷該日期有沒有被選中
    getUsers: Function, // 用來取得該日期的彩色點點名單
});

// 定義要傳回給父元件的動作
defineEmits(["prev", "next", "date-click"]);
</script>

<template>
    <div
        class="tw:bg-white tw:rounded-2xl tw:shadow-sm tw:border tw:overflow-hidden tw:mb-4"
        :class="{ 'tw:opacity-80': isFinalized }"
    >
        <div
            class="tw:flex tw:justify-between tw:items-center tw:p-4 tw:bg-gray-50 tw:border-b"
        >
            <button
                @click="$emit('prev')"
                :disabled="monthIndex === 0"
                class="tw:px-3 tw:text-gray-500 disabled:tw:opacity-30 tw:font-bold tw:text-xl"
            >
                &lt;
            </button>
            <span class="tw:font-bold tw:text-lg tw:text-gray-800">
                {{ months[monthIndex].replace("-", " 年 ") }} 月
            </span>
            <button
                @click="$emit('next')"
                :disabled="monthIndex === months.length - 1"
                class="tw:px-3 tw:text-gray-500 disabled:tw:opacity-30 tw:font-bold tw:text-xl"
            >
                &gt;
            </button>
        </div>

        <div
            class="tw:grid tw:grid-cols-7 tw:text-center tw:py-3 tw:border-b tw:text-xs tw:font-bold tw:text-gray-500"
        >
            <div class="tw:text-red-400">日</div>
            <div>一</div>
            <div>二</div>
            <div>三</div>
            <div>四</div>
            <div>五</div>
            <div class="tw:text-blue-400">六</div>
        </div>

        <div class="tw:grid tw:grid-cols-7 tw:p-2 tw:gap-1">
            <div
                v-for="(day, index) in days"
                :key="index"
                class="tw:aspect-square tw:flex tw:flex-col tw:items-center tw:justify-center tw:relative"
            >
                <template v-if="!day.isBlank">
                    <button
                        @click="$emit('date-click', day.dateStr)"
                        :disabled="isFinalized"
                        class="tw:w-9 tw:h-9 tw:rounded-full tw:flex tw:items-center tw:justify-center tw:text-sm tw:font-medium tw:transition"
                        :class="
                            checkSelected(day.dateStr)
                                ? isFinalized
                                    ? 'tw:bg-orange-500 tw:text-white tw:font-bold tw:shadow-lg tw:scale-110'
                                    : isEditing
                                      ? 'tw:bg-[#06C755] tw:text-white tw:shadow-md tw:font-bold'
                                      : 'tw:border-2 tw:border-[#06C755] tw:text-[#06C755] tw:font-bold'
                                : 'hover:tw:bg-gray-100 tw:text-gray-700'
                        "
                    >
                        {{ day.dayNum }}
                    </button>

                    <div
                        v-if="!isFinalized"
                        class="tw:flex tw:gap-[2px] tw:mt-1 tw:h-1.5 tw:justify-center tw:flex-wrap tw:w-full tw:px-1"
                    >
                        <div
                            v-for="u in getUsers(day.dateStr).slice(0, 4)"
                            :key="u.id"
                            class="tw:w-1.5 tw:h-1.5 tw:rounded-full"
                            :class="u.color"
                        ></div>
                        <span
                            v-if="getUsers(day.dateStr).length > 4"
                            class="tw:text-[8px] tw:text-gray-400 tw:leading-none"
                            >+</span
                        >
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
