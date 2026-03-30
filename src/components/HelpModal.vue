<script setup>
import { watch, onMounted, onUnmounted } from "vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import createGroup from "@/assets/img/help/1.png";
import createEvent from "@/assets/img/help/2.png";
import inviteMember from "@/assets/img/help/3.png";
import selectDate from "@/assets/img/help/4.jpg";
import decideDate from "@/assets/img/help/5.jpg";
import enjoyParty from "@/assets/img/help/6.jpg";

const props = defineProps({
    modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const swiperModules = [Pagination, Autoplay];

const introSlides = [
    {
        title: "建立群組",
        text: "在「我的群組」點右下角建立，設定名稱、封面與成員名額，先把常用成員加好更方便。",
        image: createGroup,
    },
    {
        title: "發起活動",
        text: "進入群組後點「發起活動」，選擇可投票的月份或範圍，建立後會產生邀請連結。",
        image: createEvent,
    },
    {
        title: "邀請加入",
        text: "把連結傳給成員，在 LINE 內開啟後選擇或認領身分，即可加入同一個群組。",
        image: inviteMember,
    },
    {
        title: "月曆填空",
        text: "在月曆上點選有空的日期；若要修改，再點一次即可取消。定案前都可調整。",
        image: selectDate,
    },
    {
        title: "統計與定案",
        text: "主揪查看最多人有空的日期（Top 3），確認後按「一鍵定案」鎖定日期。",
        image: decideDate,
    },
    {
        title: "一起開心享受聚會",
        text: "一起開心享受聚會，不用再為了約時間而煩惱。",
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
                        :loop="introSlides.length > 1"
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
                                        {{ slide.title }}
                                    </h3>
                                    <p
                                        class="tw:text-sm tw:text-white tw:leading-relaxed tw:flex-1"
                                    >
                                        {{ slide.text }}
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
