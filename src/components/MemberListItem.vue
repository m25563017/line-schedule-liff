<script setup>
defineProps({
    member: { type: Object, required: true },
});
</script>

<template>
    <div class="tw:flex tw:items-center tw:gap-3">
        <div
            class="tw:w-10 tw:h-10 tw:rounded-full tw:bg-gray-200 tw:animate-pulse tw:relative tw:overflow-hidden tw:shrink-0 tw:border tw:border-gray-200"
        >
            <img
                :src="
                    member.pictureUrl || 'https://via.placeholder.com/40?text=V'
                "
                class="tw:absolute tw:inset-0 tw:w-full tw:h-full tw:object-cover tw:opacity-0 tw:transition-opacity tw:duration-300"
                @load="
                    $event.target.classList.remove('tw:opacity-0');
                    $event.target.parentElement.classList.remove(
                        'tw:animate-pulse',
                    );
                "
            />
        </div>
        <div class="tw:flex-1">
            <div class="tw:flex tw:items-center tw:gap-2">
                <span class="tw:text-sm tw:font-bold tw:text-gray-800">{{
                    member.displayName
                }}</span>
                <span
                    v-if="member.role === 'admin'"
                    class="tw:text-[10px] tw:bg-yellow-100 tw:text-yellow-700 tw:px-1.5 tw:rounded"
                    >建立者</span
                >
                <span
                    v-if="member.isVirtual"
                    class="tw:text-[10px] tw:bg-gray-100 tw:text-gray-500 tw:px-1.5 tw:rounded"
                    >虛擬</span
                >
            </div>
        </div>
    </div>
</template>
