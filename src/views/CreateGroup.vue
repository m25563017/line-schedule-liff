<script setup>
    import { ref, inject, onMounted } from 'vue';
    import { useRouter } from 'vue-router';
    import { db, storage } from '../utils/firebase';
    import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
    import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
    
    const router = useRouter();
    const userProfile = inject('userProfile');
    
    const groupName = ref('');
    const groupImageFile = ref(null);
    const previewImage = ref(null);
    const isSubmitting = ref(false);
    
    // 成員管理
    const newMemberName = ref('');
    const newMemberRole = ref('editor');
    const members = ref([]);
    
    // 初始化：把自己加入名單 (作為第一個成員)
    onMounted(() => {
      if (userProfile.value) {
        members.value.push({
          id: userProfile.value.userId,
          name: userProfile.value.displayName,
          pictureUrl: userProfile.value.pictureUrl,
          role: 'admin', 
          isVirtual: false
        });
      }
    });
    
    const addVirtualMember = () => {
      if (!newMemberName.value.trim()) return alert('請輸入成員名字');
      
      members.value.push({
        id: `virtual_${Date.now()}`,
        name: newMemberName.value.trim(),
        pictureUrl: '',
        role: newMemberRole.value,
        isVirtual: true
      });
    
      newMemberName.value = ''; // 清空輸入
    };
    
    const removeMember = (index) => {
      members.value.splice(index, 1);
    };
    
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
    
    const handleCreate = async () => {
      if (!groupName.value.trim()) return alert('請輸入群組名稱');
      if (!userProfile.value) return alert('請先登入');
    
      isSubmitting.value = true;
    
      try {
        let imageUrl = '';
        if (groupImageFile.value) {
          const fileName = `group_covers/${Date.now()}_${groupImageFile.value.name}`;
          const imageRef = storageRef(storage, fileName);
          const snapshot = await uploadBytes(imageRef, groupImageFile.value);
          imageUrl = await getDownloadURL(snapshot.ref);
        }
    
        const user = userProfile.value;
        const membersMap = {};
        const memberIds = [];
    
        members.value.forEach(m => {
          memberIds.push(m.id);
          membersMap[m.id] = {
            displayName: m.name,
            pictureUrl: m.pictureUrl || '',
            role: m.role,
            isVirtual: m.isVirtual
          };
        });
    
        await addDoc(collection(db, "groups"), {
          name: groupName.value,
          coverUrl: imageUrl,
          createdBy: user.userId,
          createdAt: serverTimestamp(),
          memberIds: memberIds,
          members: membersMap
        });
    
        router.push('/list');
    
      } catch (e) {
        console.error("建立失敗", e);
        alert(`建立失敗: ${e.message}`);
      } finally {
        isSubmitting.value = false;
      }
    };
    </script>
    
    <template>
      <div class="tw:min-h-screen tw:bg-gray-50 tw:flex tw:flex-col">
        <div class="tw:bg-[#06C755] tw:text-white tw:p-4 tw:text-center tw:text-lg tw:font-bold tw:shadow-sm tw:relative">
          建立新群組
          <router-link to="/list" class="tw:absolute tw:right-4 tw:top-4 tw:text-sm tw:opacity-80 hover:tw:opacity-100">
            ✕
          </router-link>
        </div>
    
        <div class="tw:p-6 tw:max-w-lg tw:mx-auto tw:w-full tw:flex-1 tw:pb-24">
          
          <div class="tw:bg-white tw:rounded-xl tw:shadow-sm tw:border tw:overflow-hidden">
            
            <div class="tw:p-6 tw:border-b tw:border-gray-100">
              <label class="tw:block tw:mb-2 tw:text-sm tw:font-bold tw:text-gray-700">群組封面</label>
              <label class="tw:block tw:w-full tw:h-40 tw:border-2 tw:border-dashed tw:border-gray-300 tw:rounded-xl tw:flex tw:flex-col tw:justify-center tw:items-center tw:cursor-pointer hover:tw:bg-gray-50 tw:transition tw:relative tw:overflow-hidden tw:bg-gray-50">
                <input type="file" accept="image/*" class="tw:hidden" @change="handleFileChange">
                <img v-if="previewImage" :src="previewImage" class="tw:absolute tw:inset-0 tw:w-full tw:h-full tw:object-cover">
                <div v-else class="tw:text-center tw:text-gray-400">
                  <span class="tw:text-3xl tw:block tw:mb-1">☁️</span>
                  <span class="tw:text-xs">上傳圖片</span>
                </div>
              </label>
            </div>
    
            <div class="tw:p-6 tw:border-b tw:border-gray-100">
              <label class="tw:block tw:mb-2 tw:text-sm tw:font-bold tw:text-gray-700">群組名稱</label>
              <input 
                v-model="groupName"
                type="text" 
                placeholder="例如：東京自由行" 
                class="tw:w-full tw:bg-gray-50 tw:border tw:border-gray-200 tw:rounded-lg tw:p-3 tw:outline-none focus:tw:ring-2 focus:tw:ring-green-500 tw:transition"
              />
            </div>
    
            <div class="tw:p-6 tw:bg-gray-50">
              <label class="tw:block tw:mb-3 tw:text-sm tw:font-bold tw:text-gray-700">
                成員名單 ({{ members.length }})
              </label>
    
              <div class="tw:flex tw:gap-2 tw:mb-4">
                <input 
                  v-model="newMemberName"
                  type="text" 
                  placeholder="成員名字" 
                  class="tw:flex-1 tw:p-2 tw:border tw:rounded-lg tw:text-sm tw:outline-none focus:tw:ring-2 focus:tw:ring-green-500"
                  @keyup.enter="addVirtualMember"
                />
                
                <div class="tw:relative">
                  <select 
                    v-model="newMemberRole" 
                    class="tw:appearance-none tw:h-full tw:pl-3 tw:pr-8 tw:border tw:rounded-lg tw:text-sm tw:bg-white tw:outline-none focus:tw:ring-2 focus:tw:ring-green-500 tw:text-gray-700"
                  >
                    <option value="editor">可編輯</option>
                    <option value="viewer">僅查看</option>
                  </select>
                  <div class="tw:pointer-events-none tw:absolute tw:inset-y-0 tw:right-0 tw:flex tw:items-center tw:px-2 tw:text-gray-500">
                    <svg class="tw:w-4 tw:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
    
                <button 
                  @click="addVirtualMember"
                  class="tw:bg-gray-800 tw:text-white tw:px-4 tw:rounded-lg tw:text-sm tw:font-bold hover:tw:bg-gray-700 tw:whitespace-nowrap"
                >
                  新增
                </button>
              </div>
    
              <div class="tw:space-y-3">
                <div 
                  v-for="(member, index) in members" 
                  :key="member.id" 
                  class="tw:flex tw:items-center tw:gap-3 tw:bg-white tw:p-3 tw:rounded-lg tw:border tw:border-gray-200"
                  :class="{ 'tw:bg-green-50 tw:border-green-200': member.role === 'admin' }"
                >
                  
                  <img 
                    :src="member.pictureUrl || 'https://via.placeholder.com/40?text=V'" 
                    class="tw:w-10 tw:h-10 tw:rounded-full tw:bg-gray-200 tw:object-cover tw:border"
                  >
                  
                  <div class="tw:flex-1">
                    <div class="tw:flex tw:items-center tw:gap-2">
                      <span class="tw:text-sm tw:font-bold tw:text-gray-800">{{ member.name }}</span>
                      <span v-if="member.role === 'admin'" class="tw:text-xs tw:text-green-600">(你)</span>
                      <span v-if="member.isVirtual" class="tw:text-[10px] tw:bg-gray-100 tw:text-gray-500 tw:px-1.5 tw:rounded">虛擬</span>
                    </div>
                    
                    <div class="tw:text-xs tw:text-gray-400 tw:mt-0.5">
                       {{ member.role === 'admin' ? '管理者' : (member.role === 'editor' ? '可編輯' : '僅查看') }}
                    </div>
                  </div>
    
                  <button 
                    v-if="member.role !== 'admin'" 
                    @click="removeMember(index)"
                    class="tw:text-gray-400 hover:tw:text-red-500 tw:p-2 tw:transition"
                  >
                    🗑️
                  </button>
                  
                  <span v-else class="tw:text-green-500 tw:p-2">
                    🔒
                  </span>
    
                </div>
              </div>
    
              <p class="tw:text-xs tw:text-gray-400 tw:mt-4 tw:px-1 tw:leading-relaxed">
                * 虛擬成員之後可透過分享連結，讓真實的朋友加入並取代其位置。
              </p>
            </div>
    
          </div>
    
          <button 
            @click="handleCreate"
            :disabled="isSubmitting"
            class="tw:w-full tw:bg-[#06C755] tw:text-white tw:py-3.5 tw:rounded-lg tw:mt-8 tw:font-bold tw:text-lg tw:shadow-md active:tw:scale-95 tw:transition disabled:tw:opacity-50"
          >
            {{ isSubmitting ? '建立中...' : '建立群組' }}
          </button>
    
        </div>
      </div>
    </template>
