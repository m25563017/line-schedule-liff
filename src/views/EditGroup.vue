<script setup>
import { ref, inject, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db, storage } from "../utils/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
} from "firebase/storage";

const route = useRoute();
const router = useRouter();
const userProfile = inject("userProfile");
const groupId = route.params.id;

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
                alert("您沒有權限編輯此群組！");
                router.push(`/group/${groupId}`);
                return;
            }

            // 載入資料
            groupName.value = data.name;
            previewImage.value = data.coverUrl;

            // 將 members 的 Object Map 轉回 Array 方便在畫面上跑 v-for
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
    } finally {
        loading.value = false;
    }
});

// 處理圖片變更
const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    groupImageFile.value = file;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
        previewImage.value = e.target.result;
    };
};

// 新增虛擬成員
const addVirtualMember = () => {
    if (!newMemberName.value.trim()) return alert("請輸入成員名字");
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
    if (confirm("確定要移除此成員嗎？")) {
        members.value.splice(index, 1);
    }
};

// 💾 儲存變更
const handleUpdate = async () => {
    if (!groupName.value.trim()) return alert("請輸入群組名稱");
    isSubmitting.value = true;

    try {
        let imageUrl = previewImage.value; // 預設用原本的圖

        // 如果有選新圖片，就上傳
        if (groupImageFile.value) {
            const fileName = `group_covers/${Date.now()}_${groupImageFile.value.name}`;
            const imageRef = storageRef(storage, fileName);
            const snapshot = await uploadBytes(imageRef, groupImageFile.value);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        // 轉換成員陣列回 Object Map
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

        alert("更新成功！");
        router.push(`/group/${groupId}`);
    } catch (e) {
        console.error("更新失敗", e);
        alert("更新失敗");
    } finally {
        isSubmitting.value = false;
    }
};

// 🗑️ 刪除群組
const handleDeleteGroup = async () => {
    if (confirm("⚠️ 警告：確定要刪除整個群組嗎？此操作無法復原！")) {
        isSubmitting.value = true;
        try {
            await deleteDoc(doc(db, "groups", groupId));
            alert("群組已刪除");
            router.push("/list");
        } catch (e) {
            console.error("刪除失敗", e);
            alert("刪除失敗");
            isSubmitting.value = false;
        }
    }
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
                ⬅
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
                        class="tw:block tw:w-full tw:h-32 tw:border-2 tw:border-dashed tw:border-gray-300 tw:rounded-xl tw:flex tw:flex-col tw:justify-center tw:items-center tw:cursor-pointer hover:tw:bg-gray-50 tw:transition tw:relative tw:overflow-hidden"
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
                            <span class="tw:text-2xl tw:block tw:mb-1">☁️</span
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
                                🗑️
                            </button>
                            <span
                                v-else
                                class="tw:text-green-500 tw:p-2 tw:text-sm"
                                >🔒</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            <button
                @click="handleDeleteGroup"
                :disabled="isSubmitting"
                class="tw:w-full tw:bg-red-50 tw:text-red-600 tw:border tw:border-red-200 tw:py-3 tw:rounded-xl tw:font-bold tw:mb-6 active:tw:scale-95 tw:transition"
            >
                🗑️ 刪除此群組
            </button>
        </div>

        <div
            class="tw:fixed tw:bottom-0 tw:left-0 tw:w-full tw:bg-white tw:border-t tw:shadow-lg tw:p-4 tw:z-50"
        >
            <button
                @click="handleUpdate"
                :disabled="isSubmitting"
                class="tw:w-full tw:bg-[#06C755] tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:text-lg tw:shadow-md active:tw:scale-95 tw:transition disabled:tw:opacity-50"
            >
                {{ isSubmitting ? "儲存中..." : "儲存變更" }}
            </button>
        </div>
    </div>
</template>
