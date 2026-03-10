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
                <div
                    v-if="event.finalDate"
                    class="tw:bg-accent/10 tw:text-accent tw:border tw:border-accent/30 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap tw:flex tw:items-center tw:gap-1"
                >
                    <svg
                        class="tw:w-3 tw:h-3"
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
                    <span>已定案</span>
                </div>
                <div
                    v-else
                    class="tw:flex tw:items-center tw:gap-1 tw:bg-primary/10 tw:text-primary tw:border tw:border-primary/30 tw:text-[10px] tw:px-2 tw:py-1 tw:rounded-full tw:font-bold tw:whitespace-nowrap"
                >
                    <svg
                        class="tw:w-3 tw:h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2.5"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>選擇中</span>
                </div>
            </div>
        </div>

        <div class="tw:flex tw:justify-between tw:items-end">
            <div class="tw:text-xs tw:text-gray-500 tw:space-y-1.5 tw:w-full">
                <div class="tw:flex tw:items-center tw:gap-1.5 tw:w-full">
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
                    class="tw:bg-orange-50 tw:w-full tw:border tw:border-orange-200 tw:rounded-lg tw:p-3 tw:flex tw:items-center tw:justify-center tw:gap-3"
                >
                    <div
                        class="tw:flex tw:items-center tw:gap-1.5 tw:text-orange-600"
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
                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25m-9 3.75h.008v.008H12v-.008z"
                            />
                        </svg>
                        <span class="tw:text-sm tw:font-bold">決定日期</span>
                    </div>
                    <div
                        class="tw:text-lg tw:font-black tw:text-orange-600 tw:tracking-wider"
                    >
                        {{ event.finalDate.replace(/-/g, " / ") }}
                    </div>
                </div>
                <div v-else class="tw:flex tw:items-center tw:gap-1">
                    <img
                        class="tw:w-4 tw:h-4"
                        src="../assets/img/calendar (1).png"
                        alt="calendar"
                    />
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
