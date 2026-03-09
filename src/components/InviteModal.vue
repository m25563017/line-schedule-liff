<script setup>
import { useNotify } from "@pieda/core";

const props = defineProps({
    show: Boolean, // 控制是否顯示
    groupName: String, // 群組名稱 (分享文字會用到)
    inviteLink: String, // 邀請連結
    coverUrl: String, // 群組封面 (LINE Flex Message 會用到)
});

const emit = defineEmits(["close"]);

const $notify = useNotify();

// 1. 複製純文字連結
const copyInviteLink = async () => {
    try {
        await navigator.clipboard.writeText(props.inviteLink);
        $notify.alert({
            title: "系統通知",
            message: "邀請連結已複製！快去貼給 LINE 的朋友吧！",
            variant: "success",
        });
        emit("close"); // 成功後自動關閉視窗
    } catch (err) {
        $notify.alert({
            title: "請手動複製",
            message:
                "您的裝置不支援自動複製，請手動複製以下連結：\n\n" +
                props.inviteLink,
            variant: "warning",
        });
    }
};

// 2. 傳送 LINE Flex Message
const shareToLine = async () => {
    if (window.liff && window.liff.isApiAvailable("shareTargetPicker")) {
        try {
            await window.liff.shareTargetPicker([
                {
                    type: "flex",
                    altText: `邀請您加入 ${props.groupName}`,
                    contents: {
                        type: "bubble",
                        hero: {
                            type: "image",
                            url:
                                props.coverUrl ||
                                "https://via.placeholder.com/800x400/508974/FFFFFF?text=Join+Group",
                            size: "full",
                            aspectRatio: "20:13",
                            aspectMode: "cover",
                        },
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: props.groupName,
                                    weight: "bold",
                                    size: "xl",
                                },
                                {
                                    type: "text",
                                    text: "趕緊加入群組來快速排行程，將下面連結設成群組公告更加方便！",
                                    wrap: true,
                                    color: "#666666",
                                    size: "sm",
                                    margin: "md",
                                },
                            ],
                        },
                        footer: {
                            type: "box",
                            layout: "vertical",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "button",
                                    style: "primary",
                                    color: "#508974",
                                    height: "sm",
                                    action: {
                                        type: "uri",
                                        label: "加入群組",
                                        uri: props.inviteLink,
                                    },
                                },
                            ],
                            flex: 0,
                        },
                    },
                },
            ]);
            emit("close");
        } catch (error) {
            console.error("分享失敗", error);
            fallbackShare();
        }
    } else {
        fallbackShare();
    }
};

// 3. 降級純文字分享
const fallbackShare = () => {
    const text = `邀請你加入「${props.groupName}」！快點擊連結加入吧：`;
    const lineShareUrl = `https://lineit.line.me/share/ui?text=${encodeURIComponent(text)}&url=${encodeURIComponent(props.inviteLink)}`;
    window.open(lineShareUrl, "_blank");
    emit("close");
};
</script>

<template>
    <div
        v-if="show"
        class="tw:fixed tw:inset-0 tw:bg-black/50 tw:z-[100] tw:flex tw:items-end tw:justify-center tw:animate-fade-in"
        @click.self="$emit('close')"
    >
        <div
            class="tw:bg-white tw:w-full tw:max-w-md tw:rounded-t-3xl tw:p-6 tw:shadow-xl tw:animate-slide-up"
        >
            <div
                class="tw:w-12 tw:h-1.5 tw:bg-gray-200 tw:rounded-full tw:mx-auto tw:mb-6"
            ></div>
            <h2
                class="tw:text-xl tw:font-bold tw:text-gray-800 tw:mb-4 tw:text-center"
            >
                邀請朋友加入群組
            </h2>

            <div class="tw:space-y-3">
                <button
                    @click="shareToLine"
                    class="tw:w-full tw:flex tw:items-center tw:justify-center tw:gap-2 tw:bg-[#06C755] tw:text-white tw:py-3.5 tw:rounded-xl tw:font-bold tw:shadow-md active:tw:scale-95 tw:transition"
                >
                    <svg
                        class="tw:w-5 tw:h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            d="M24 10.3c0-5.7-5.4-10.3-12-10.3S0 4.6 0 10.3c0 5.1 4.3 9.4 10.1 10.2.4.1.9.3 1 .7l.3 1.9c0 .1.1.2.2.2.1 0 .2 0 .2-.1.9-.6 5-3.3 7.5-5.5 2.9-2.3 4.7-5 4.7-7.4z"
                        />
                    </svg>
                    傳送 LINE 邀請卡片
                </button>
                <button
                    @click="copyInviteLink"
                    class="tw:w-full tw:flex tw:items-center tw:justify-center tw:gap-2 tw:bg-gray-100 tw:text-gray-700 tw:py-3.5 tw:rounded-xl tw:font-bold active:tw:scale-95 tw:transition"
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
                            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                        />
                    </svg>
                    複製連結
                </button>
            </div>
        </div>
    </div>
</template>
