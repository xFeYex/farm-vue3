<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const globalUserId = ref('')

onMounted(() => {
  const savedId = localStorage.getItem('farming_user_id')
  if (savedId) {
    globalUserId.value = savedId
  } else {
    // 默认给一个初始的 user_id
    globalUserId.value = '1'
    localStorage.setItem('farming_user_id', '1')
  }
})

const handleUserIdChange = (val) => {
  localStorage.setItem('farming_user_id', val)
  // 如果当前在列表或详情页，可以考虑刷新页面，这里简单处理
  window.location.reload()
}

const activeMenu = computed(() => {
  // 如果在生产模块，高亮生产模块
  if (route.path.startsWith('/production')) {
    return '/production'
  }
  // 否则高亮租赁模块对应的子页面
  return route.path
})

const handleSelect = (key) => {
  router.push(key)
}
</script>

<template>
  <div class="app-container">
    <el-menu
      :default-active="activeMenu"
      class="top-menu"
      mode="horizontal"
      @select="handleSelect"
      background-color="#545c64"
      text-color="#fff"
      active-text-color="#ffd04b"
    >
      <div class="logo">
        <h2>农场系统</h2>
      </div>
      
      <!-- 租赁模块作为主入口域 -->
      <el-sub-menu index="/lease">
        <template #title>农场租赁</template>
        <el-menu-item index="/lease/plaza">资源广场</el-menu-item>
        <el-menu-item index="/lease/my-publish">我的发布</el-menu-item>
        <el-menu-item index="/lease/my-subscription">我的订阅</el-menu-item>
      </el-sub-menu>
      
      <!-- 生产模块 -->
      <el-menu-item index="/production">农场生产</el-menu-item>
      
      <div class="flex-grow"></div>
      
      <!-- 模拟用户登录，填充 user_id -->
      <div class="user-config">
        <span class="user-label">当前 User ID:</span>
        <el-input 
          v-model="globalUserId" 
          size="small" 
          style="width: 120px" 
          placeholder="请输入 user_id" 
          @change="handleUserIdChange"
        />
      </div>
    </el-menu>

    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  background-color: #f5f7fa;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-menu {
  display: flex;
  align-items: center;
  border-bottom: none !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.logo {
  padding: 0 30px;
  color: #fff;
  white-space: nowrap;
}

.logo h2 {
  margin: 0;
  font-size: 20px;
}

.flex-grow {
  flex-grow: 1;
}

.user-config {
  display: flex;
  align-items: center;
  padding-right: 20px;
  color: #fff;
  font-size: 14px;
}

.user-label {
  margin-right: 10px;
}

.main-content {
  flex: 1;
  padding: 20px;
}
</style>
