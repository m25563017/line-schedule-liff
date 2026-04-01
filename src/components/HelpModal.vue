<script setup>
import { watch, onMounted, onUnmounted } from "vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import createGroup from "@/assets/img/help/default-swiper.png";
import createEvent from "@/assets/img/help/default-swiper.png";
import inviteMember from "@/assets/img/help/default-swiper.png";
import selectDate from "@/assets/img/help/default-swiper.png";
import decideDate from "@/assets/img/help/default-swiper.png";
import enjoyParty from "@/assets/img/help/default-swiper.png";

const props = defineProps({
    modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const swiperModules = [Pagination, Autoplay];

const introSlides = [
    {
        title: "歡迎來到 揪吉！",
        text: "「如果不刻意安排，或許我們就不會再見。」長大後才發現，聚會不再是理所當然。謝謝願意為了見面而努力的我們，讓揪吉幫你，把這份珍惜化作具體的約定。",
        image: createGroup,
    },
    {
        title: "建立群組",
        text: "填寫群組基本資料與成員名單，一個群組至少要有兩個成員。",
        image: createEvent,
    },
    {
        title: "發起活動",
        text: "建立活動並挑選想約的月份（選擇區間最多 3 個月）。揪吉會幫你守護這段預約的時光。",
        image: inviteMember,
    },
    {
        title: "分享邀請",
        text: "一鍵分享邀請連結或 LINE 訊息，讓朋友們加入這場活動日期決定。",
        image: selectDate,
    },
    {
        title: "勾選空檔",
        text: "在月曆點選有空的日子。揪吉會自動統計出最多人有空的前三名！",
        image: decideDate,
    },
    {
        title: "拍板定案，準時見面",
        text: "成員填完有空時間後，由主揪選定最終日期，發布定案訊息在群組裡。",
        image: enjoyParty,
    },
    {
        title: "享受相聚",
        text: "所有的「有空」，都是因為我們在乎彼此。<br>剩下的，就讓我們把時間留給見面時的擁抱，<br>一起開心享受聚會吧！",
        image: enjoyParty,
    },
];

function close() {
    emit("update:modelValue", false);
}

function onKeydown(e) {
    if (e.key === "Escape" && props.modelValue) close();
}

watch(
    () => props.modelValue,
    (open) => {
        document.body.style.overflow = open ? "hidden" : "";
    },
    { immediate: true },
);

onMounted(() => {
    window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", onKeydown);
    document.body.style.overflow = "";
});
</script>

<template>
    <Teleport to="body">
        <div
            v-if="modelValue"
            class="tw:fixed tw:inset-0 tw:z-200 tw:flex tw:items-center tw:justify-center tw:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-modal-title"
        >
            <div
                class="tw:absolute tw:inset-0 tw:bg-black/50 tw:backdrop-blur-[2px]"
                aria-hidden="true"
                @click="close"
            />

            <div
                class="tw:relative tw:z-10 tw:w-full tw:max-w-md tw:max-h-[min(92dvh,720px)] tw:flex tw:flex-col tw:min-h-0"
                @click.stop
            >
                <div
                    class="tw:flex-1 tw:min-h-0 tw:overflow-y-auto tw:overscroll-contain tw:flex-center tw:flex-col"
                >
                    <Swiper
                        class="help-intro-swiper tw:w-full tw:max-w-md"
                        :modules="swiperModules"
                        :slides-per-view="1"
                        :space-between="0"
                        :pagination="{ clickable: true, dynamicBullets: true }"
                    >
                        <SwiperSlide v-for="(slide, i) in introSlides" :key="i">
                            <div
                                class="tw:flex-center tw:flex-col tw:min-h-[260px] tw:sm:min-h-[280px]"
                            >
                                <div
                                    class="tw:w-full tw:max-h-[70vh] tw:min-h-0 tw:flex tw:items-center tw:justify-center"
                                >
                                    <img
                                        :src="slide.image"
                                        :alt="slide.title"
                                        class="tw:max-h-[55vh] tw:max-w-full tw:w-auto tw:h-auto tw:object-contain"
                                    />
                                </div>
                                <div
                                    class="tw:py-8 tw:px-4 tw:flex-center tw:flex-col tw:flex-1"
                                >
                                    <h3
                                        class="tw:text-base tw:font-bold tw:text-white tw:mb-2"
                                    >
                                        <span v-html="slide.title" />
                                    </h3>
                                    <p
                                        class="tw:text-sm tw:text-white tw:leading-relaxed tw:flex-1"
                                    >
                                        <span
                                            class="tw:text-center"
                                            v-html="slide.text"
                                        />
                                    </p>
                                    <p
                                        class="tw:text-[11px] tw:text-white tw:mt-3 tw:text-right"
                                    >
                                        {{ i + 1 }} / {{ introSlides.length }}
                                    </p>
                                </div>
                            </div>
                        </SwiperSlide>
                    </Swiper>
                    <button
                        type="button"
                        class="tw:text-white/90 tw:text-sm tw:font-bold tw:underline tw:decoration-white/50 tw:underline-offset-2 tw:px-1 tw:-mr-1"
                        @click="close"
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.help-intro-swiper :deep(.swiper-pagination) {
    bottom: 8px;
}

.help-intro-swiper :deep(.swiper-pagination-bullet) {
    background: var(--color-gray);
    opacity: 1;
}

.help-intro-swiper :deep(.swiper-pagination-bullet-active) {
    background: #ff9c1a;
}
</style>
