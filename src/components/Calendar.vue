<script setup>
import { ref, computed } from "vue";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getDay,
    addMonths,
    subMonths,
    isSameDay,
} from "date-fns";
import { zhTW } from "date-fns/locale";

// 接收父元件傳來的 v-model 資料
const props = defineProps({
    modelValue: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(["update:modelValue"]);

// 狀態
const currentMonth = ref(new Date());

// 計算屬性：當前月份的標題
const monthTitle = computed(() => {
    return format(currentMonth.value, "yyyy年 M月", { locale: zhTW });
});

// 計算屬性：算出這個月所有的日子
const daysInMonth = computed(() => {
    const start = startOfMonth(currentMonth.value);
    const end = endOfMonth(currentMonth.value);
    return eachDayOfInterval({ start, end });
});

// 計算屬性：1號前面要補幾個空白 (0=週日, 1=週一...)
const startDayIndex = computed(() => {
    return getDay(startOfMonth(currentMonth.value));
});

// 方法：切換月份
const prevMonth = () => (currentMonth.value = subMonths(currentMonth.value, 1));
const nextMonth = () => (currentMonth.value = addMonths(currentMonth.value, 1));

// 方法：點選日期
const toggleDate = (dateObj) => {
    const dateStr = format(dateObj, "yyyy-MM-dd");
    const newSelection = [...props.modelValue];

    if (newSelection.includes(dateStr)) {
        // 移除
        const index = newSelection.indexOf(dateStr);
        newSelection.splice(index, 1);
    } else {
        // 加入
        newSelection.push(dateStr);
    }

    // 通知父元件更新 (Vue 的單向資料流)
    emit("update:modelValue", newSelection);
};

// Helper: 檢查是否被選取
const isSelected = (dateObj) => {
    const dateStr = format(dateObj, "yyyy-MM-dd");
    return props.modelValue.includes(dateStr);
};
</script>

<template>
    <div class="calendar-container">
        <div class="header">
            <button @click="prevMonth">&lt;</button>
            <h2>{{ monthTitle }}</h2>
            <button @click="nextMonth">&gt;</button>
        </div>

        <div class="grid-header">
            <span
                v-for="day in ['日', '一', '二', '三', '四', '五', '六']"
                :key="day"
            >
                {{ day }}
            </span>
        </div>

        <div class="grid-body">
            <div
                v-for="n in startDayIndex"
                :key="`empty-${n}`"
                class="empty-cell"
            ></div>

            <button
                v-for="date in daysInMonth"
                :key="date.toISOString()"
                @click="toggleDate(date)"
                class="date-cell"
                :class="{ active: isSelected(date) }"
            >
                {{ format(date, "d") }}
            </button>
        </div>
    </div>
</template>

<style scoped>
/* 簡單寫一點 CSS 讓它能看 (你可以之後換成 Tailwind) */
.calendar-container {
    max-width: 350px;
    margin: 0 auto;
    background: white;
    padding: 1rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}
.grid-header,
.grid-body {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    text-align: center;
}
.grid-header {
    margin-bottom: 0.5rem;
    font-weight: bold;
    color: #666;
}
.date-cell {
    aspect-ratio: 1; /* 保持正方形 */
    border: none;
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
}
.date-cell:hover {
    background-color: #f0f0f0;
}
.date-cell.active {
    background-color: #42b883; /* Vue Green! */
    color: white;
}
</style>
