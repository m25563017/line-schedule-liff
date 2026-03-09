<script setup>
import { computed } from "vue";

const props = defineProps({
    event: { type: Object, required: true },
    members: { type: Object, required: true },
    groupId: { type: String, required: true },
});

// 計算發起人的資料
const creator = computed(() => {
    return props.members[props.event.createdBy] || {};
});
</script>

<template>
    <router-link
        :to="`/group/${groupId}/event/${event.id}`"
        class="tw:block tw:border tw:border-gray-100 tw:p-3 tw:rounded-lg hover:tw:bg-gray-50 tw:transition active:tw:scale-[0.98]"
    >
        <div class="tw:flex tw:justify-between tw:items-start tw:mb-2">
            <span class="tw:font-bold tw:text-gray-800">{{ event.title }}</span>
            <div class="tw:flex tw:items-center tw:gap-2">
                <span
                    v-if="event.finalDate"
                    class="tw:bg-accent/10 tw:text-accent tw:border tw:border-accent/30 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap"
                >
                    🎉 已定案
                </span>
                <span
                    v-else
                    class="tw:bg-primary/10 tw:text-primary tw:border tw:border-primary/30 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap"
                >
                    🗓️ 選擇中
                </span>
            </div>
        </div>

        <div class="tw:flex tw:justify-between tw:items-end">
            <div class="tw:text-xs tw:text-gray-500 tw:space-y-1.5">
                <div class="tw:flex tw:items-center tw:gap-1.5">
                    <img
                        :src="
                            creator.pictureUrl ||
                            'https://via.placeholder.com/40'
                        "
                        class="tw:w-4 tw:h-4 tw:rounded-full tw:object-cover tw:border tw:border-gray-200"
                    />
                    <span>{{ creator.displayName || "未知成員" }} 發起</span>
                </div>
                <div
                    v-if="event.finalDate"
                    class="tw:font-bold tw:text-accent tw:flex tw:items-center tw:gap-1"
                >
                    <svg
                        class="tw:w-4 tw:h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M7 3h5a3 3 0 013 3v12l-3-2-3 2V6a3 3 0 00-3-3z"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                    <span
                        >決定日期：{{
                            event.finalDate.replace(/-/g, " / ")
                        }}</span
                    >
                </div>
                <div v-else class="tw:flex tw:items-center tw:gap-1">
                    <svg
                        class="tw:w-4 tw:h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M8 3h8v2.5L13 12l3 6.5V21H8v-2.5L11 12 8 5.5V3z"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                    <span
                        >開放區間：{{
                            event.targetMonths?.length || 0
                        }}
                        個月</span
                    >
                </div>
            </div>
        </div>
    </router-link>
</template>
