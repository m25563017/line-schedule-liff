<script setup>
    import { ref, onMounted, inject, watch } from 'vue';
    import { db } from '../utils/firebase';
    import { collection, query, where, getDocs } from 'firebase/firestore';
    
    const userProfile = inject('userProfile');
    const groups = ref([]);
    const loading = ref(true);
    
    const fetchGroups = async () => {
      if (!userProfile.value) return;
      try {
        // 查詢 "memberIds" 陣列中包含我的 ID 的群組
        const q = query(
          collection(db, "groups"),
          where("memberIds", "array-contains", userProfile.value.userId)
        );
        const querySnapshot = await getDocs(q);
        
        // 整理資料，按照建立時間排序 (前端排序)
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // 讓新建立的排在最上面
        groups.value = data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    
      } catch (e) {
        console.error("讀取群組失敗", e);
      } finally {
        loading.value = false;
      }
    };
    
    onMounted(() => { if (userProfile.value) fetchGroups(); });
    watch(userProfile, (val) => { if (val) fetchGroups(); });
    </script>
    
    <template>
      <div class="tw:h-full tw:bg-gray-50">
        <div class="tw:bg-white tw:p-4 tw:sticky tw:top-0 tw:z-10 tw:shadow-sm">
          <h1 class="tw:text-xl tw:font-bold tw:text-gray-800">我的群組</h1>
        </div>
    
        <div class="tw:p-4 tw:space-y-4">
          
          <div v-if="loading" class="tw:text-center tw:text-gray-400 tw:mt-10">載入中...</div>
          
          <div v-else-if="groups.length === 0" class="tw:text-center tw:mt-10">
            <p class="tw:text-gray-400 tw:mb-4">還沒有參加任何群組</p>
            <router-link to="/create" class="tw:text-[#06C755] tw:font-bold tw:underline">
              建立第一個群組
            </router-link>
          </div>
    
          <router-link 
            v-for="group in groups" 
            :key="group.id"
            :to="`/group/${group.id}`"
            class="tw:block tw:bg-white tw:rounded-xl tw:shadow-sm tw:overflow-hidden tw:border tw:border-gray-100 active:tw:scale-[0.98] tw:transition"
          >
            <div class="tw:h-24 tw:bg-gray-100 tw:relative">
              <img 
                v-if="group.coverUrl" 
                :src="group.coverUrl" 
                class="tw:w-full tw:h-full tw:object-cover"
              >
              <div v-else class="tw:w-full tw:h-full tw:bg-green-50 tw:flex tw:items-center tw:justify-center tw:text-green-200">
                <span class="tw:text-4xl">👥</span>
              </div>
            </div>
            
            <div class="tw:p-4 tw:flex tw:justify-between tw:items-center">
              <div>
                <h3 class="tw:font-bold tw:text-gray-800 tw:text-lg">{{ group.name }}</h3>
                <p class="tw:text-xs tw:text-gray-400 tw:mt-1">
                  成員 {{ Object.keys(group.members || {}).length }} 人
                </p>
              </div>
              <span class="tw:text-gray-300">➜</span>
            </div>
          </router-link>
    
        </div>
    
        <router-link 
          to="/create"
          class="tw:fixed tw:bottom-6 tw:right-6 tw:w-14 tw:h-14 tw:bg-[#06C755] tw:text-white tw:rounded-full tw:flex tw:items-center tw:justify-center tw:shadow-lg tw:text-3xl tw:hover:scale-105 tw:transition"
        >
          +
        </router-link>
      </div>
    </template>
