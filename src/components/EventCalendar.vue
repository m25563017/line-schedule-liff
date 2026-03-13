<script setup>
import { computed } from "vue";
import { taiwanHolidays } from "../utils/holidays";

const props = defineProps({
    months: Array,
    monthIndex: Number,
    days: Array,
    isEditing: Boolean,
    isFinalized: Boolean,
    checkSelected: Function,
    getUsers: Function,
});

defineEmits(["prev", "next", "date-click"]);

const localDays = computed(() => {
    if (!props.months) return [];
    const monthStr = props.months[props.monthIndex];
    if (!monthStr) return [];

    const [year, month] = monthStr.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();
    const daysArray = Array(firstDay).fill({ isBlank: true });

    for (let i = 1; i <= totalDays; i++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;

        // 算出這天是星期幾 (0 ：日，6 ：六)
        const dayOfWeek = new Date(dateStr).getDay();

        // 尋找連假區間
        const holiday = taiwanHolidays.find((h) => h.dates.includes(dateStr));
        let holidayInfo = null;

        if (holiday) {
            holidayInfo = {
                name: holiday.name,
                isStart:
                    holiday.dates[0] === dateStr || dayOfWeek === 0 || i === 1,
                isEnd:
                    holiday.dates[holiday.dates.length - 1] === dateStr ||
                    dayOfWeek === 6 ||
                    i === totalDays,
            };
        }

        daysArray.push({
            isBlank: false,
            dateStr,
            dayNum: i,
            holidayInfo,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6, // 判斷這天是不是週末
        });
    }
    return daysArray;
});
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
                v-if="monthIndex > 0"
                @click="$emit('prev')"
                class="tw:p-2 tw:text-gray-400 hover:tw:text-gray-700"
            >
                &lt;
            </button>
            <div v-else class="tw:w-8"></div>

            <span class="tw:font-bold"
                >{{ months[monthIndex].replace("-", " 年 ") }} 月</span
            >

            <button
                v-if="monthIndex < months.length - 1"
                @click="$emit('next')"
                class="tw:p-2 tw:text-gray-400 hover:tw:text-gray-700"
            >
                &gt;
            </button>
            <div v-else class="tw:w-8"></div>
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

        <div class="tw:grid tw:grid-cols-7 tw:p-2 tw:gap-x-0 tw:gap-y-1">
            <div
                v-for="(day, idx) in localDays"
                :key="idx"
                class="tw:relative tw:py-1 tw:h-[60px] tw:border-b tw:border-gray-50 tw:flex tw:flex-col tw:items-center tw:justify-start"
                @click="!day.isBlank && $emit('date-click', day.dateStr)"
            >
                <template v-if="!day.isBlank">
                    <div
                        v-if="checkSelected && checkSelected(day.dateStr)"
                        class="tw:absolute tw:top-1 tw:w-7 tw:h-7 tw:rounded-full tw:border-2 tw:border-primary tw:z-10"
                        :class="isFinalized ? 'tw:bg-primary' : ''"
                    ></div>

                    <span
                        class="tw:text-sm tw:font-medium tw:relative tw:z-20 tw:mt-[5px]"
                        :class="[
                            checkSelected &&
                            checkSelected(day.dateStr) &&
                            isFinalized
                                ? 'tw:text-white'
                                : day.holidayInfo || day.isWeekend
                                  ? 'tw:text-red-500'
                                  : 'tw:text-gray-800',
                        ]"
                    >
                        {{ day.dayNum }}
                    </span>

                    <div
                        v-if="day.holidayInfo"
                        class="tw:absolute tw:bottom-[16px] tw:h-[16px] tw:bg-red-50 tw:text-red-500 tw:flex tw:items-center tw:z-0"
                        :class="[
                            day.holidayInfo.isStart
                                ? 'tw:left-1 tw:rounded-l-md tw:pl-1'
                                : 'tw:-left-px tw:pl-0',
                            day.holidayInfo.isEnd
                                ? 'tw:right-1 tw:rounded-r-md'
                                : 'tw:-right-px',
                        ]"
                    >
                        <span
                            v-if="day.holidayInfo.isStart"
                            class="tw:text-[10px] tw:font-bold tw:scale-[0.8] tw:origin-left tw:tracking-tighter tw:whitespace-nowrap"
                        >
                            {{ day.holidayInfo.name }}
                        </span>
                    </div>

                    <div
                        class="tw:w-full tw:flex tw:justify-center tw:mt-auto tw:relative tw:z-20 tw:pb-1"
                    >
                        <div
                            v-if="getUsers && getUsers(day.dateStr).length > 0"
                            class="tw:w-1.5 tw:h-1.5 tw:bg-orange-400 tw:rounded-full"
                        ></div>
                    </div>
                </template>
            </div>
        </div>
        <div
            class="tw:flex tw:items-center tw:justify-center tw:gap-6 tw:py-3 tw:bg-gray-50 tw:border-t tw:text-xs tw:font-medium tw:text-gray-500"
        >
            <div class="tw:flex tw:items-center tw:gap-1.5">
                <div
                    class="tw:w-3.5 tw:h-3.5 tw:rounded-full tw:border-2 tw:border-primary"
                ></div>
                <span>我的選擇</span>
            </div>

            <div class="tw:flex tw:items-center tw:gap-1.5">
                <div
                    class="tw:w-1.5 tw:h-1.5 tw:bg-orange-400 tw:rounded-full"
                ></div>
                <span>有被選擇的日期</span>
            </div>
        </div>
    </div>
</template>
