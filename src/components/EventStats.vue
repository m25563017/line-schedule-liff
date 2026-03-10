<script setup>
defineProps({
    topDates: { type: Array, default: () => [] },
    respondedUsers: { type: Array, default: () => [] },
    pendingUsers: { type: Array, default: () => [] },
});
</script>

<template>
    <div class="tw:space-y-4">
        <div
            class="tw:bg-white tw:border tw:border-gray-200 tw:rounded-xl tw:p-4"
        >
            <h3
                class="tw:flex tw:items-center tw:gap-2 tw:font-bold tw:text-gray-800 tw:text-lg tw:mb-4"
            >
                <svg
                    class="tw:w-5 tw:h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                最多人有空的日期
            </h3>

            <div
                v-if="topDates.length === 0"
                class="tw:text-center tw:text-gray-400 tw:py-4 tw:text-sm"
            >
                目前還沒有人選擇
            </div>

            <div v-else class="tw:space-y-2">
                <div
                    v-for="(item, index) in topDates"
                    :key="index"
                    class="tw:flex tw:justify-between tw:items-center tw:bg-orange-50 tw:px-4 tw:py-3 tw:rounded-lg tw:border tw:border-orange-100"
                >
                    <span class="tw:font-bold tw:text-orange-800">{{
                        item.date.replace(/-/g, " / ")
                    }}</span>
                    <span
                        class="tw:bg-orange-500 tw:text-white tw:text-xs tw:font-bold tw:px-3 tw:py-1 tw:rounded-full"
                    >
                        {{ item.count }} 人
                    </span>
                </div>
            </div>
        </div>

        <div
            class="tw:bg-white tw:border tw:border-gray-200 tw:rounded-xl tw:p-4"
        >
            <h3 class="tw:font-bold tw:text-gray-800 tw:text-lg tw:mb-4">
                填寫狀況
            </h3>

            <div class="tw:mb-4">
                <h4 class="tw:text-sm tw:font-bold tw:text-primary tw:mb-2">
                    已填寫 ({{ respondedUsers.length }})
                </h4>
                <div class="tw:flex tw:flex-wrap tw:gap-2">
                    <span
                        v-for="user in respondedUsers"
                        :key="user.id"
                        class="tw:inline-flex tw:items-center tw:text-xs tw:font-medium tw:bg-gray-100 tw:text-gray-700 tw:px-2.5 tw:py-1.5 tw:rounded-lg"
                    >
                        {{ user.displayName }}
                    </span>
                </div>
            </div>

            <div>
                <h4 class="tw:text-sm tw:font-bold tw:text-gray-400 tw:mb-2">
                    尚未填寫 ({{ pendingUsers.length }})
                </h4>
                <div class="tw:flex tw:flex-wrap tw:gap-2">
                    <span
                        v-for="user in pendingUsers"
                        :key="user.id"
                        class="tw:text-xs tw:font-medium tw:text-gray-500 tw:px-1"
                    >
                        {{ user.displayName }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
