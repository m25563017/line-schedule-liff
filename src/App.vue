<script setup>
    import { ref, onMounted, provide } from 'vue';
    import liff from '@line/liff';
    import { useRouter, useRoute } from 'vue-router';
    
    const profile = ref(null);
    const isLiffReady = ref(false); // 是否準備好 (成功)
    const errorMessage = ref('');   // 錯誤訊息 (如果有值代表出錯了)
    const router = useRouter();
    const route = useRoute();
    
    provide('userProfile', profile);
    
    const isDev = import.meta.env.DEV;
    
    onMounted(async () => {
      try {
        // 1. 開發模式邏輯
        if (isDev) {
          console.log("🔧 開發模式：使用模擬帳號");
          // 模擬網路延遲
          setTimeout(() => {
            // 測試錯誤畫面：解除下面這行的註解試試看
            // errorMessage.value = "模擬連線逾時，請檢查網路";
            
            if (!errorMessage.value) {
              profile.value = {
                userId: "test_user_001",
                displayName: "開發者小明",
                pictureUrl: "https://via.placeholder.com/150/06C755/FFFFFF?text=Dev",
                statusMessage: "測試中..."
              };
              isLiffReady.value = true;
            }
          }, 800);
          return;
        }
    
        // 2. 正式環境 LIFF 初始化
        await liff.init({ liffId: "你的_LIFF_ID" });
    
        // 處理路由 hash (解決 LIFF 轉址問題)
        const path = window.location.pathname;
        if (path && path !== '/' && !window.location.hash) {
           window.location.hash = path;
        }
    
        if (liff.isLoggedIn()) {
          profile.value = await liff.getProfile();
        } else {
          liff.login();
        }
    
        // 初始化成功
        isLiffReady.value = true;
    
      } catch (err) {
        // 3. 捕捉錯誤
        console.error('LIFF Init Error', err);
        errorMessage.value = "發生錯誤，無法啟動 LIFF。請稍後再試。";
      }
    });
    </script>
    
    <template>
      <div class="tw:h-screen tw:w-full tw:flex tw:flex-col tw:bg-gray-50 tw:overflow-hidden">
        
        <div v-if="errorMessage" class="tw:flex-1 tw:flex tw:flex-col tw:justify-center tw:items-center tw:p-6 tw:text-center">
           <div class="tw:text-6xl tw:mb-4">😵</div>
           <h3 class="tw:text-xl tw:font-bold tw:text-gray-800 tw:mb-2">糟糕，出錯了</h3>
           <p class="tw:text-gray-500 tw:mb-6">{{ errorMessage }}</p>
           
           <button 
             @click="window.location.reload()" 
             class="tw:bg-gray-800 tw:text-white tw:px-6 tw:py-2 tw:rounded-full tw:font-bold active:tw:scale-95 tw:transition"
           >
             重新整理
           </button>
        </div>
    
        <div v-else-if="!isLiffReady" class="tw:flex-1 tw:flex tw:flex-col tw:justify-center tw:items-center tw:text-gray-500">
           <div class="tw:animate-spin tw:rounded-full tw:h-10 tw:w-10 tw:border-b-2 tw:border-green-500 tw:mb-4"></div>
           <p class="tw:animate-pulse">系統載入中...</p>
        </div>
    
        <div v-else class="tw:flex-1 tw:flex tw:flex-col tw:overflow-hidden">
           
           <header v-if="profile" class="tw:flex-none tw:bg-white tw:shadow-sm tw:p-3 tw:flex tw:items-center tw:gap-3 tw:z-10">
             <img :src="profile.pictureUrl" class="tw:w-8 tw:h-8 tw:rounded-full tw:border">
             <span class="tw:font-bold tw:text-gray-700">{{ profile.displayName }}</span>
             <span v-if="isDev" class="tw:text-xs tw:bg-yellow-200 tw:text-yellow-800 tw:px-2 tw:py-0.5 tw:rounded">DEV</span>
           </header>
    
           <main class="tw:flex-1 tw:overflow-y-auto tw:relative tw:w-full">
             <router-view></router-view>
           </main>
    
        </div>
    
        <div v-if="isDev && !errorMessage" class="tw:flex-none tw:bg-gray-800 tw:text-white tw:p-3 tw:flex tw:justify-around tw:border-t tw:border-gray-600 tw:z-20">
          <router-link to="/create" active-class="tw:text-green-400" class="tw:flex tw:flex-col tw:items-center">
            <span>➕</span>
            <span class="tw:text-xs">建立群組</span>
          </router-link>
          
          <router-link to="/list" active-class="tw:text-green-400" class="tw:flex tw:flex-col tw:items-center">
            <span>📂</span>
            <span class="tw:text-xs">我的群組</span>
          </router-link>
        </div>
    
      </div>
    </template>
