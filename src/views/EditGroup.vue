<script setup>
import { ref, inject, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db, storage } from "../utils/firebase";
import {
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
} from "firebase/firestore";
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
} from "firebase/storage";
import { useNotify } from "@pieda/core";

const route = useRoute();
const router = useRouter();
const userProfile = inject("userProfile");
const groupId = route.params.id;
const $notify = useNotify();
const groupName = ref("");
const groupImageFile = ref(null);
const previewImage = ref(null);
const members = ref([]);
const isSubmitting = ref(false);
const loading = ref(true);

// 新增成員專用
const newMemberName = ref("");
const newMemberRole = ref("editor");

onMounted(async () => {
    try {
        const docRef = doc(db, "groups", groupId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // 權限檢查：如果不是建立者，直接踢回首頁
            if (data.createdBy !== userProfile.value?.userId) {
                $notify.alert({
                    title: "系統通知",
                    message: "您沒有權限編輯此群組！",
                    variant: "error",
                });
                router.push(`/group/${groupId}`);
                return;
            }

            // 載入資料
            groupName.value = data.name;
            previewImage.value = data.coverUrl;

            // 將 members 的 Object Map 轉回 Array
            members.value = Object.entries(data.members || {}).map(
                ([id, m]) => ({
                    id,
                    name: m.displayName,
                    pictureUrl: m.pictureUrl,
                    role: m.role,
                    isVirtual: m.isVirtual,
                }),
            );
        }
    } catch (e) {
        console.error("讀取失敗", e);
        $notify.alert({
            title: "系統通知",
            message: "讀取失敗",
            variant: "error",
        });
    } finally {
        loading.value = false;
    }
});

// 處理圖片變更
const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        $notify.alert({
            title: "檔案太大囉",
            message: "群組封面圖片請勿超過 5MB！\n請壓縮後再重新上傳。",
            variant: "warning",
        });

        event.target.value = "";
        return;
    }

    groupImageFile.value = file;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
        previewImage.value = e.target.result;
    };
};

// 新增虛擬成員
const addVirtualMember = () => {
    if (!newMemberName.value.trim())
        return $notify.alert({
            title: "系統通知",
            message: "請輸入成員名字",
            variant: "info",
        });
    members.value.push({
        id: `virtual_${Date.now()}`,
        name: newMemberName.value.trim(),
        pictureUrl: "",
        role: newMemberRole.value,
        isVirtual: true,
    });
    newMemberName.value = "";
};

// 移除成員
const removeMember = (index) => {
    $notify
        .alert({
            title: "系統通知",
            message: "確定要移除此成員嗎？",
            variant: "question",
            confirm: true,
        })
        .then((result) => {
            if (result.isConfirmed) {
                members.value.splice(index, 1);
            }
        });
};

// 儲存變更
const handleUpdate = async () => {
    if (!groupName.value.trim())
        return $notify.alert({
            title: "系統通知",
            message: "請輸入群組名稱",
            variant: "info",
        });
    isSubmitting.value = true;

    try {
        let imageUrl = previewImage.value;

        if (groupImageFile.value) {
            const fileName = `group_covers/${Date.now()}_${groupImageFile.value.name}`;
            const imageRef = storageRef(storage, fileName);
            const snapshot = await uploadBytes(imageRef, groupImageFile.value);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        const membersMap = {};
        const memberIds = [];
        members.value.forEach((m) => {
            memberIds.push(m.id);
            membersMap[m.id] = {
                displayName: m.name,
                pictureUrl: m.pictureUrl || "",
                role: m.role,
                isVirtual: m.isVirtual,
            };
        });

        const docRef = doc(db, "groups", groupId);
        await updateDoc(docRef, {
            name: groupName.value,
            coverUrl: imageUrl,
            memberIds: memberIds,
            members: membersMap,
        });

        $notify.alert({
            title: "系統通知",
            message: "更新成功！",
            variant: "success",
        });
        router.push(`/group/${groupId}`);
    } catch (e) {
        console.error("更新失敗", e);
        $notify.alert({
            title: "系統通知",
            message: "更新失敗",
            variant: "error",
        });
    } finally {
        isSubmitting.value = false;
    }
};

async function deleteGroupSubcollections(groupId) {
    const subcollections = ["events", "activityLogs"];

    for (const sub of subcollections) {
        const colRef = collection(db, "groups", groupId, sub);
        const snap = await getDocs(colRef);
        if (snap.empty) continue;

        const deletions = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletions);
    }
}

// 刪除群組（含子集合 events、activityLogs）
const handleDeleteGroup = async () => {
    $notify
        .alert({
            title: "系統通知",
            message:
                "確定要刪除此群組嗎？\n此操作會一併刪除群組底下所有活動與動作紀錄，且無法復原！",
            variant: "question",
            confirm: true,
        })
        .then(async (result) => {
            if (!result.isConfirmed) return;

            isSubmitting.value = true;
            try {
                await deleteGroupSubcollections(groupId);
                await deleteDoc(doc(db, "groups", groupId));
                $notify.alert({
                    title: "系統通知",
                    message: "群組已刪除",
                    variant: "success",
                });
                router.push("/list");
            } catch (e) {
                console.error("刪除失敗", e);
                $notify.alert({
                    title: "系統通知",
                    message: "刪除失敗",
                    variant: "error",
                });
            } finally {
                isSubmitting.value = false;
            }
        });
};
</script>

<template>
    <div v-if="loading" class="tw:p-10 tw:text-center tw:text-gray-500">
        載入中...
    </div>

    <div v-else class="tw:min-h-full tw:bg-gray-50 tw:flex tw:flex-col">
        <div
            class="tw:bg-gray-800 tw:text-white tw:p-4 tw:text-center tw:text-lg tw:font-bold tw:shadow-sm tw:relative tw:flex-none"
        >
            <router-link
                :to="`/group/${groupId}`"
                class="tw:absolute tw:left-4 tw:top-4 tw:text-xl tw:text-gray-300 hover:tw:text-white"
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
            群組設定
        </div>

        <div
            class="tw:flex-1 tw:p-4 tw:max-w-md tw:mx-auto tw:w-full tw:overflow-y-auto tw:pb-24"
        >
            <div
                class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:border tw:overflow-hidden tw:mb-6"
            >
                <div class="tw:p-5 tw:border-b tw:border-gray-100">
                    <label
                        class="tw:block tw:mb-2 tw:text-sm tw:font-bold tw:text-gray-700"
                        >更換封面</label
                    >
                    <label
                        class="tw:w-full tw:h-32 tw:border-2 tw:border-dashed tw:border-gray-300 tw:rounded-xl tw:flex tw:flex-col tw:justify-center tw:items-center tw:cursor-pointer hover:tw:bg-gray-50 tw:transition tw:relative tw:overflow-hidden"
                    >
                        <input
                            type="file"
                            accept="image/*"
                            class="tw:hidden"
                            @change="handleFileChange"
                        />
                        <img
                            v-if="previewImage"
                            :src="previewImage"
                            class="tw:absolute tw:inset-0 tw:w-full tw:h-full tw:object-cover"
                        />
                        <div v-else class="tw:text-center tw:text-gray-400">
                            <svg
                                class="tw:w-6 tw:h-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="2"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                                />
                            </svg>
                            ><span class="tw:text-xs">上傳新圖片</span>
                        </div>
                    </label>
                </div>

                <div class="tw:p-5 tw:border-b tw:border-gray-100">
                    <label
                        class="tw:block tw:mb-2 tw:text-sm tw:font-bold tw:text-gray-700"
                        >群組名稱</label
                    >
                    <input
                        v-model="groupName"
                        type="text"
                        class="tw:w-full tw:bg-gray-50 tw:border tw:border-gray-200 tw:rounded-lg tw:p-3 tw:outline-none focus:tw:ring-2 focus:tw:ring-green-500"
                    />
                </div>

                <div class="tw:p-5 tw:bg-gray-50">
                    <label
                        class="tw:block tw:mb-3 tw:text-sm tw:font-bold tw:text-gray-700"
                        >成員管理 ({{ members.length }})</label
                    >

                    <div class="tw:flex tw:gap-2 tw:mb-4">
                        <input
                            v-model="newMemberName"
                            type="text"
                            placeholder="新增成員名字"
                            class="tw:flex-1 tw:min-w-0 tw:p-2 tw:border tw:rounded-lg tw:text-sm tw:outline-none focus:tw:ring-2 focus:tw:ring-green-500"
                            @keyup.enter="addVirtualMember"
                        />

                        <div class="tw:relative tw:shrink-0">
                            <select
                                v-model="newMemberRole"
                                class="tw:appearance-none tw:h-full tw:pl-3 tw:pr-8 tw:border tw:rounded-lg tw:text-sm tw:bg-white tw:outline-none focus:tw:ring-2 focus:tw:ring-green-500"
                            >
                                <option value="editor">可編輯</option>
                                <option value="viewer">僅查看</option>
                            </select>
                            <div
                                class="tw:pointer-events-none tw:absolute tw:inset-y-0 tw:right-0 tw:flex tw:items-center tw:px-2 tw:text-gray-500"
                            >
                                <svg
                                    class="tw:w-4 tw:h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 9l-7 7-7-7"
                                    ></path>
                                </svg>
                            </div>
                        </div>

                        <button
                            @click="addVirtualMember"
                            class="tw:shrink-0 tw:bg-gray-800 tw:text-white tw:px-4 tw:rounded-lg tw:text-sm tw:font-bold tw:whitespace-nowrap active:tw:scale-95 tw:transition"
                        >
                            新增
                        </button>
                    </div>

                    <div class="tw:space-y-2">
                        <div
                            v-for="(member, index) in members"
                            :key="member.id"
                            class="tw:flex tw:items-center tw:gap-3 tw:bg-white tw:p-2 tw:rounded-lg tw:border"
                        >
                            <img
                                :src="
                                    member.pictureUrl ||
                                    'https://via.placeholder.com/40?text=V'
                                "
                                class="tw:w-8 tw:h-8 tw:rounded-full tw:bg-gray-200 tw:object-cover"
                            />
                            <div
                                class="tw:flex-1 tw:flex tw:items-center tw:gap-2"
                            >
                                <span
                                    class="tw:text-sm tw:font-bold tw:text-gray-800"
                                    >{{ member.name }}</span
                                >
                                <span
                                    v-if="member.role === 'admin'"
                                    class="tw:text-[10px] tw:text-green-600"
                                    >(你)</span
                                >
                                <span
                                    v-if="member.isVirtual"
                                    class="tw:text-[10px] tw:bg-gray-100 tw:text-gray-500 tw:px-1.5 tw:rounded"
                                    >虛擬</span
                                >
                            </div>
                            <button
                                v-if="member.role !== 'admin'"
                                @click="removeMember(index)"
                                class="tw:text-gray-400 hover:tw:text-red-500 tw:p-2"
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
                                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                    />
                                </svg>
                            </button>
                            <span
                                v-else
                                class="tw:text-green-500 tw:p-2 tw:text-sm"
                                ><svg
                                    class="tw:w-4 tw:h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="2.5"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                    />
                                </svg>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <button
                @click="handleDeleteGroup"
                :disabled="isSubmitting"
                class="tw:w-full tw:bg-accent-50 tw:text-accent tw:border tw:border-accent tw:py-3 tw:rounded-xl tw:font-bold tw:mb-6 active:tw:scale-95 tw:transition"
            >
                <div
                    class="tw:flex tw:items-center tw:w-full tw:justify-center tw:gap-2"
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
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                    </svg>
                    <span>刪除此群組</span>
                </div>
            </button>
        </div>

        <div
            class="tw:fixed tw:bottom-0 tw:left-0 tw:w-full tw:bg-white tw:border-t tw:shadow-lg tw:p-4 tw:z-50"
        >
            <button
                @click="handleUpdate"
                :disabled="isSubmitting"
                class="tw:w-full tw:bg-primary tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-lg tw:shadow-md active:tw:scale-95 tw:transition disabled:tw:opacity-50"
            >
                {{ isSubmitting ? "儲存中..." : "儲存變更" }}
            </button>
        </div>
    </div>
</template>
