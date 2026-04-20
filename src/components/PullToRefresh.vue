<script setup>
import { ref, onUnmounted } from "vue";

const props = defineProps({
    refreshing: Boolean, // 父元件控制是否正在加載中
    distance: { type: Number, default: 70 }, // 觸發刷新的距離
});

const emit = defineEmits(["refresh"]);

const startY = ref(0);
const pullDistance = ref(0);
const isPulling = ref(false);

const handleTouchStart = (e) => {
    // 只有在頁面頂部時才允許下拉
    if (window.scrollY <= 0) {
        startY.value = e.touches[0].pageY;
        isPulling.value = true;
    }
};

const handleTouchMove = (e) => {
    if (!isPulling.value || props.refreshing) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.value;

    if (diff > 0) {
        // 使用阻尼效果，讓下拉越來越沉
        pullDistance.value = Math.pow(diff, 0.8);

        // 如果正在下拉，阻止瀏覽器預設滾動行為（避免橡皮筋效果干擾）
        if (pullDistance.value > 10) {
            if (e.cancelable) e.preventDefault();
        }
    }
};

const handleTouchEnd = () => {
    if (!isPulling.value) return;

    if (pullDistance.value >= props.distance) {
        emit("refresh");
    }

    // 重置位置
    pullDistance.value = 0;
    isPulling.value = false;
};

// 確保組件卸載時狀態重置
onUnmounted(() => {
    isPulling.value = false;
});
</script>

<template>
    <div
        class="tw:relative tw:min-h-screen tw:overflow-hidden"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
    >
        <div
            class="tw:absolute tw:left-0 tw:right-0 tw:flex tw:items-center tw:justify-center tw:overflow-hidden tw:transition-all tw:z-20"
            :class="{ 'tw:duration-300': !isPulling }"
            :style="{
                height: (refreshing ? 50 : pullDistance) + 'px',
                top: '0px',
                opacity: refreshing || pullDistance > 0 ? 1 : 0,
            }"
        >
            <div
                class="tw:flex tw:items-center tw:gap-2 tw:text-gray-500 tw:text-sm"
            >
                <svg
                    class="tw:w-5 tw:h-5"
                    :class="{ 'tw:animate-spin': refreshing }"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        v-if="!refreshing && pullDistance < distance"
                        d="M12 5v14m-7-7l7 7 7-7"
                    />
                    <path
                        v-else
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
                <span>{{
                    refreshing
                        ? "整理中..."
                        : pullDistance > distance
                          ? "放開以刷新"
                          : "下拉刷新"
                }}</span>
            </div>
        </div>

        <div
            class="tw:transition-transform"
            :class="{ 'tw:duration-300': !isPulling }"
            :style="{
                transform: `translateY(${refreshing ? 50 : pullDistance}px)`,
            }"
        >
            <slot />
        </div>
    </div>
</template>
