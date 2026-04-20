<script setup>
import { ref, onMounted, inject, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import HelpModal from "../components/HelpModal.vue";
import { db } from "../utils/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNotify } from "@pieda/core";

const userProfile = inject("userProfile");
const isLineLoggedIn = inject("isLineLoggedIn");
const loginLine = inject("loginLine");
const $notify = useNotify();
const route = useRoute();
const router = useRouter();
const groups = ref([]);
const loading = ref(true);
const helpOpen = ref(false);

watch(
    () => route.query.help,
    (v) => {
        if (v === "1") helpOpen.value = true;
    },
    { immediate: true },
);

watch(helpOpen, (open) => {
    if (!open && route.query.help === "1") {
        router.replace({ path: "/list", query: {} });
    }
});

const fetchGroups = async () => {
    if (!userProfile.value) return;
    try {
        // 查詢 "memberIds" 陣列中包含我的 ID 的群組
        const q = query(
            collection(db, "groups"),
            where("memberIds", "array-contains", userProfile.value.userId),
        );
        const querySnapshot = await getDocs(q);

        // 按照建立時間排序
        const data = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // 讓新建立的排在最上面
        groups.value = data.sort(
            (a, b) => b.createdAt?.seconds - a.createdAt?.seconds,
        );
    } catch (e) {
        console.error("讀取群組失敗", e);
        $notify.alert({
            title: "系統通知",
            message: "讀取群組失敗",
            variant: "error",
        });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    if (userProfile.value) fetchGroups();
    else loading.value = false;
});
watch(userProfile, (val) => {
    if (val) {
        loading.value = true;
        fetchGroups();
    }
});
</script>

<template>
    <div
        class="tw:h-full tw:min-h-0 tw:bg-gray-50 tw:flex tw:flex-col tw:overflow-hidden"
    >
        <div
            class="header-container tw:bg-primary tw:text-white tw:p-4 tw:flex-none tw:shrink-0"
        >
            <h1 class="tw:text-xl tw:text-center tw:font-bold tw:text-white">
                我的群組
            </h1>
        </div>

        <div
            class="body-container tw:flex-1 tw:min-h-0 tw:w-full tw:overflow-hidden tw:px-4 tw:pt-4"
        >
            <div
                class="body-container-inner tw:h-full tw:min-h-0 tw:space-y-4 tw:overflow-y-auto"
            >
                <div
                    v-if="loading"
                    class="tw:text-center tw:text-gray-400 tw:mt-10"
                >
                    載入中...
                </div>

                <div
                    v-else-if="groups.length === 0"
                    class="tw:text-center tw:mt-10 tw:px-4"
                >
                    <template v-if="!isLineLoggedIn">
                        <p class="tw:text-gray-600 tw:mb-2">
                            未登入 LINE：無法列出你參與的群組
                        </p>
                        <p class="tw:text-sm tw:text-gray-400 tw:mb-4">
                            若你有邀請連結，可直接開啟連結瀏覽該群組（訪客僅能檢視）。
                        </p>
                        <button
                            type="button"
                            @click="loginLine"
                            class="tw:w-full tw:max-w-xs tw:mx-auto tw:bg-[#06C755] tw:text-white tw:py-3 tw:rounded-xl tw:font-bold"
                        >
                            使用 LINE 登入
                        </button>
                    </template>
                    <template v-else>
                        <p class="tw:text-gray-400 tw:mb-4">
                            還沒有參加任何群組
                        </p>
                        <router-link
                            to="/create"
                            class="tw:text-primary tw:font-bold tw:underline"
                        >
                            建立第一個群組
                        </router-link>
                    </template>
                </div>

                <router-link
                    v-for="group in groups"
                    :key="group.id"
                    :to="`/group/${group.id}`"
                    class="tw:block tw:bg-white tw:rounded-xl tw:shadow-sm tw:overflow-hidden tw:border tw:border-gray-100 active:tw:scale-[0.98] tw:transition"
                >
                    <div
                        v-if="group.coverUrl"
                        class="tw:w-full tw:h-32 tw:bg-gray-200 tw:animate-pulse tw:relative tw:overflow-hidden"
                    >
                        <img
                            :src="group.coverUrl"
                            class="tw:absolute tw:inset-0 tw:w-full tw:h-full tw:object-cover tw:opacity-0 tw:transition-opacity tw:duration-500"
                            @load="
                                $event.target.classList.remove('tw:opacity-0');
                                $event.target.parentElement.classList.remove(
                                    'tw:animate-pulse',
                                );
                            "
                        />
                    </div>
                    <div
                        v-else
                        class="tw:w-full tw:h-32 tw:bg-linear-to-br tw:from-primary tw:to-secondary"
                    ></div>

                    <div
                        class="tw:p-4 tw:flex tw:justify-between tw:items-center"
                    >
                        <div>
                            <h3
                                class="tw:font-bold tw:text-gray-800 tw:text-lg"
                            >
                                {{ group.name }}
                            </h3>
                            <p class="tw:text-xs tw:text-gray-400 tw:mt-1">
                                成員
                                {{ Object.keys(group.members || {}).length }} 人
                            </p>
                        </div>
                        <span class="tw:text-gray-300 tw:flex tw:items-center">
                            <svg
                                class="tw:w-3 tw:h-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    d="M9 5l7 7-7 7"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </span>
                    </div>
                </router-link>
            </div>
        </div>

        <div
            class="footer-container tw:flex-none tw:shrink-0 tw:shadow-sm tw:w-full"
        >
            <router-link
                to="/create"
                class="tw:w-full tw:flex-center tw:bg-primary tw:text-white tw:py-4 tw:font-bold"
            >
                建立群組 +
            </router-link>
        </div>
        <div
            class="tw:fixed tw:bottom-[10%] tw:right-6 tw:flex tw:flex-col tw:items-end tw:gap-3"
        >
            <button
                type="button"
                class="tw:px-4 tw:py-3 tw:bg-white tw:text-gray-700 tw:rounded-full tw:flex tw:items-center tw:justify-center tw:shadow-lg tw:border tw:border-gray-200 active:tw:scale-[0.98] tw:transition"
                @click="helpOpen = true"
            >
                <span class="tw:font-bold tw:text-sm">幫助</span>
            </button>
        </div>

        <HelpModal v-model="helpOpen" />
    </div>
</template>
