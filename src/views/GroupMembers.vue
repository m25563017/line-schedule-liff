<script setup>
import { ref, onMounted, inject } from "vue";
import { useRoute } from "vue-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useNotify } from "@pieda/core";
import MemberListItem from "../components/MemberListItem.vue";

const route = useRoute();
const groupId = route.params.id;
const userProfile = inject("userProfile");
const group = ref(null);
const loading = ref(true);
const $notify = useNotify();

const memberCount = ref(0);

onMounted(async () => {
    try {
        const docRef = doc(db, "groups", groupId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            group.value = { id: docSnap.id, ...docSnap.data() };
            memberCount.value = Object.keys(group.value.members || {}).length;
        } else {
            $notify.alert({
                title: "系統通知",
                message: "找不到此群組",
                variant: "error",
            });
        }
    } catch (e) {
        console.error("讀取失敗", e);
        $notify.alert({
            title: "系統通知",
            message: "讀取群組資料失敗，請稍後再試。",
            variant: "error",
        });
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div v-if="loading" class="tw:p-10 tw:text-center tw:text-gray-500">
        載入中...
    </div>

    <div v-else-if="group" class="tw:min-h-full tw:bg-gray-50">
        <div
            class="tw:bg-white tw:p-4 tw:shadow-sm tw:sticky tw:top-0 tw:z-10 tw:flex tw:items-center tw:gap-3"
        >
            <router-link
                :to="`/group/${groupId}`"
                class="tw:p-2 tw:-m-2 tw:text-gray-600 hover:tw:text-gray-900 tw:rounded-lg"
            >
                <svg
                    class="tw:w-5 tw:h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2.5"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 19.5 8.25 12l7.5-7.5"
                    />
                </svg>
            </router-link>
            <h1 class="tw:text-lg tw:font-bold tw:text-gray-800 tw:flex-1">
                成員名單
            </h1>
            <span class="tw:text-sm tw:text-gray-500">
                {{ memberCount }} 人
            </span>
        </div>

        <div class="tw:p-4">
            <div
                class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:p-4 tw:space-y-3"
            >
                <MemberListItem
                    v-for="(member, uid) in group.members"
                    :key="uid"
                    :member="member"
                />
            </div>
        </div>
    </div>
</template>
