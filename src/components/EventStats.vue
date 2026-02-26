<script setup>
// 定義接收外部傳來的資料
defineProps({
    topDates: Array,
    respondedUsers: Array,
    pendingUsers: Array,
});
</script>

<template>
    <div class="tw:space-y-4 tw:mb-4">
        <div class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:border tw:p-4">
            <h3
                class="tw:font-bold tw:text-gray-800 tw:flex tw:items-center tw:gap-2 tw:mb-3"
            >
                <span>🔥</span> 最多人有空的日期
            </h3>
            <div
                v-if="topDates.length === 0"
                class="tw:text-sm tw:text-gray-400 tw:text-center tw:py-2"
            >
                目前還沒有人選擇
            </div>
            <div v-else class="tw:space-y-2">
                <div
                    v-for="(item, idx) in topDates"
                    :key="idx"
                    class="tw:flex tw:justify-between tw:items-center tw:bg-orange-50 tw:p-3 tw:rounded-lg tw:border tw:border-orange-100"
                >
                    <span class="tw:font-bold tw:text-orange-800 tw:text-sm">{{
                        item.date.replace(/-/g, " / ")
                    }}</span>
                    <span
                        class="tw:text-xs tw:bg-orange-500 tw:text-white tw:px-2 tw:py-1 tw:rounded-full tw:font-bold"
                        >{{ item.count }} 人</span
                    >
                </div>
            </div>
        </div>

        <div class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:border tw:p-4">
            <h3 class="tw:font-bold tw:text-gray-800 tw:mb-3 border-b tw:pb-2">
                填寫狀況
            </h3>
            <div class="tw:mb-3">
                <div class="tw:text-xs tw:text-green-600 tw:font-bold tw:mb-2">
                    已填寫 ({{ respondedUsers.length }})
                </div>
                <div class="tw:flex tw:flex-wrap tw:gap-2">
                    <span
                        v-for="u in respondedUsers"
                        :key="u.id"
                        class="tw:flex tw:items-center tw:gap-1 tw:text-xs tw:bg-gray-100 tw:px-2 tw:py-1 tw:rounded-md tw:text-gray-700 border"
                    >
                        <div
                            class="tw:w-2 tw:h-2 tw:rounded-full"
                            :class="u.color"
                        ></div>
                        {{ u.displayName }}
                    </span>
                </div>
            </div>
            <div>
                <div class="tw:text-xs tw:text-gray-400 tw:font-bold tw:mb-2">
                    尚未填寫 ({{ pendingUsers.length }})
                </div>
                <div class="tw:flex tw:flex-wrap tw:gap-2">
                    <span
                        v-for="u in pendingUsers"
                        :key="u.id"
                        class="tw:text-xs tw:text-gray-400"
                        >{{ u.displayName }}</span
                    >
                </div>
            </div>
        </div>
    </div>
</template>
