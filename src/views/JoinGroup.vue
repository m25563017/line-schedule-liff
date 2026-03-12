<script setup>
import { ref, inject, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db } from "../utils/firebase";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    deleteField,
} from "firebase/firestore";
import { useNotify } from "@pieda/core";

const route = useRoute();
const router = useRouter();
const userProfile = inject("userProfile");
const $notify = useNotify();
const groupId = route.params.id;

console.log("目前登入的使用者：", userProfile.value);

const group = ref(null);
const loading = ref(true);
const isSubmitting = ref(false);

onMounted(async () => {
    try {
        const docRef = doc(db, "groups", groupId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            group.value = { id: docSnap.id, ...docSnap.data() };

            // 防呆檢查：如果這個人已經在群組裡了，直接踢回群組首頁
            if (group.value.members[userProfile.value.userId]) {
                alert("你已經在這個群組裡囉！");
                router.push(`/group/${groupId}`);
            }
        } else {
            alert("找不到此群組！");
            router.push("/list");
        }
    } catch (e) {
        console.error("讀取失敗", e);
    } finally {
        loading.value = false;
    }
});

// 過濾出目前群組裡所有的「虛擬成員」讓使用者認領
const virtualMembers = computed(() => {
    if (!group.value) return [];
    return Object.entries(group.value.members || {})
        .filter(([id, m]) => m.isVirtual)
        .map(([id, m]) => ({ id, ...m }));
});

const handleJoin = async (virtualId) => {
    if (!virtualId) return; // 嚴格防護：沒有選擇虛擬身分就拒絕執行

    isSubmitting.value = true;
    try {
        const groupRef = doc(db, "groups", groupId);
        const newMembersMap = { ...group.value.members };
        const newMemberIds = [...(group.value.memberIds || [])];

        const oldRole = newMembersMap[virtualId].role;

        // 1. 刪除舊的虛擬身分，換上真實使用者的身分 (繼承原本的權限)
        delete newMembersMap[virtualId];
        newMembersMap[userProfile.value.userId] = {
            displayName: userProfile.value.displayName,
            pictureUrl: userProfile.value.pictureUrl,
            role: oldRole,
            isVirtual: false,
        };

        // 2. 更新 Array 名單
        const index = newMemberIds.indexOf(virtualId);
        if (index > -1) newMemberIds.splice(index, 1);
        newMemberIds.push(userProfile.value.userId);

        // 3. 更新群組資料庫
        await updateDoc(groupRef, {
            members: newMembersMap,
            memberIds: newMemberIds,
        });

        // 4. 轉移所有活動的月曆紀錄
        const eventsRef = collection(db, "groups", groupId, "events");
        const eventSnaps = await getDocs(eventsRef);

        for (const eventDoc of eventSnaps.docs) {
            const evData = eventDoc.data();
            if (evData.availabilities && evData.availabilities[virtualId]) {
                const userDates = evData.availabilities[virtualId];
                const evRef = doc(db, "groups", groupId, "events", eventDoc.id);

                await updateDoc(evRef, {
                    [`availabilities.${userProfile.value.userId}`]: userDates,
                    [`availabilities.${virtualId}`]: deleteField(),
                });
            }
        }

        $notify.alert({
            title: "系統通知",
            message: "成功加入群組！",
            variant: "success",
        });
        router.push(`/group/${groupId}`);
    } catch (e) {
        console.error("加入失敗", e);
        alert("發生錯誤，請稍後再試");
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div v-if="loading" class="tw:p-10 tw:text-center tw:text-gray-500">
        讀取邀請中...
    </div>

    <div
        v-else-if="group"
        class="tw:min-h-full tw:bg-gray-50 tw:flex tw:flex-col tw:items-center tw:pt-10 tw:px-4"
    >
        <div
            class="tw:w-full tw:max-w-sm tw:bg-white tw:rounded-2xl tw:shadow-lg tw:overflow-hidden tw:border tw:border-gray-100"
        >
            <div class="tw:relative tw:h-40 tw:bg-gray-200">
                <img
                    v-if="group.coverUrl"
                    :src="group.coverUrl"
                    class="tw:w-full tw:h-full tw:object-cover"
                />
                <div
                    v-else
                    class="tw:w-full tw:h-full tw:bg-gradient-to-br tw:from-primary tw:to-secondary"
                ></div>
                <div class="tw:absolute tw:inset-0 tw:bg-black/40"></div>
                <div
                    class="tw:absolute tw:bottom-0 tw:left-0 tw:p-5 tw:text-white"
                >
                    <p class="tw:text-xs tw:font-bold tw:opacity-80 tw:mb-1">
                        群組邀請
                    </p>
                    <h1 class="tw:text-2xl tw:font-black">{{ group.name }}</h1>
                </div>
            </div>

            <div class="tw:p-6">
                <div v-if="virtualMembers.length > 0">
                    <h3
                        class="tw:text-sm tw:font-bold tw:text-gray-700 tw:mb-3"
                    >
                        主揪已經幫以下成員建立位置了，你是哪一位呢？
                    </h3>
                    <div class="tw:space-y-2 tw:mb-6">
                        <button
                            v-for="v in virtualMembers"
                            :key="v.id"
                            @click="handleJoin(v.id)"
                            :disabled="isSubmitting"
                            class="tw:w-full tw:flex tw:items-center tw:gap-3 tw:p-3 tw:border tw:border-primary/30 tw:rounded-xl hover:tw:bg-primary/5 tw:transition tw:text-left disabled:tw:opacity-50"
                        >
                            <div
                                class="tw:w-10 tw:h-10 tw:rounded-full tw:bg-primary/20 tw:flex tw:items-center tw:justify-center tw:text-primary tw:font-bold"
                            >
                                {{ v.displayName.charAt(0) }}
                            </div>
                            <div class="tw:flex-1">
                                <div class="tw:font-bold tw:text-gray-800">
                                    我是 {{ v.displayName }}
                                </div>
                                <div class="tw:text-xs tw:text-gray-500">
                                    點擊認領此身分與月曆紀錄
                                </div>
                            </div>
                        </button>
                    </div>

                    <div
                        class="tw:pt-4 tw:border-t tw:border-gray-100 tw:text-center tw:flex tw:items-center tw:justify-center tw:gap-2"
                    >
                        <p class="tw:text-xs tw:text-gray-400">
                            上面沒有你的名字嗎？<br />請聯繫主揪先把你加入名單喔！
                        </p>
                        <svg
                            class="tw:w-12 tw:h-12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                            />
                        </svg>
                    </div>
                </div>

                <div v-else class="tw:text-center tw:py-4">
                    <svg
                        class="tw:w-12 tw:h-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                        />
                    </svg>
                    <h3 class="tw:font-bold tw:text-gray-800 tw:mb-2">
                        目前沒有開放加入的位置
                    </h3>
                    <p class="tw:text-sm tw:text-gray-500">
                        這個群組目前受到保護，或者所有位置都已經被認領完畢。<br /><br />
                        如果你是受邀者，請聯繫主揪在「群組設定」中先幫你新增名字！
                    </p>
                    <router-link
                        to="/list"
                        class="tw:inline-block tw:mt-6 tw:bg-gray-100 tw:text-gray-700 tw:px-6 tw:py-2 tw:rounded-full tw:font-bold tw:text-sm"
                    >
                        回首頁
                    </router-link>
                </div>
            </div>
        </div>
    </div>
</template>
