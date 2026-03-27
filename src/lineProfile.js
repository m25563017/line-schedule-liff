import { ref, computed } from "vue";

/** 與 App.vue 的 profile 同步，供 router 守衛等無法 inject 處使用 */
export const lineProfileRef = ref(null);
export const isLineLoggedIn = computed(() => !!lineProfileRef.value);
