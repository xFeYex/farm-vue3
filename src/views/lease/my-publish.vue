<template>
  <div class="my-publish-container">
    <div class="header">
      <h2>我的发布</h2>
      <el-button type="primary" @click="handlePublish">发布资源</el-button>
    </div>

    <!-- 资源列表 -->
    <div class="list-wrapper" v-loading="loading">
      <el-card v-for="item in list" :key="item.id" class="list-item" shadow="hover">
        <div class="item-content">
          <div class="item-main">
            <div class="item-header">
              <span class="title">{{ item.title }}</span>
              <el-tag :type="item.status === 'ON_SHELF' ? 'success' : 'info'" size="small">
                {{ item.status === 'ON_SHELF' ? '上架中' : '已下架' }}
              </el-tag>
            </div>
            <div class="item-details">
              <span class="detail-item">类型：{{ getTypeLabel(item.resourceType) }}</span>
              <el-divider direction="vertical" />
              <span class="detail-item">月租金：<span class="price">¥{{ item.pricePerMonth }}</span></span>
            </div>
          </div>
          
          <div class="item-actions">
            <el-button link type="primary" @click="goToDetail(item.id)">查看</el-button>
            <el-button link type="primary" @click="handleEdit(item.id)">编辑</el-button>
            <el-button 
              v-if="item.status === 'ON_SHELF'" 
              link 
              type="danger" 
              @click="handleOffShelf(item)"
            >
              下架
            </el-button>
          </div>
        </div>
      </el-card>

      <el-empty v-if="!loading && list.length === 0" description="暂无发布记录" />
    </div>

    <!-- 分页 -->
    <div class="pagination-container" v-if="total > 0">
      <el-pagination
        v-model:current-page="queryForm.page"
        v-model:page-size="queryForm.pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyResources, offShelfResource } from '@/api/lease'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref([])

const queryForm = reactive({
  page: 1,
  pageSize: 10
})

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const data = await getMyResources(queryForm)
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    console.error('获取我的发布列表失败:', error)
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

// 类型转换
const getTypeLabel = (type) => {
  const typeMap = {
    'GREENHOUSE': '大棚',
    'FARMLAND': '菜地',
    'ORCHARD': '果园'
  }
  return typeMap[type] || type
}

// 分页处理
const handleSizeChange = (val) => {
  queryForm.pageSize = val
  fetchData()
}

const handleCurrentChange = (val) => {
  queryForm.page = val
  fetchData()
}

// 操作路由跳转
const handlePublish = () => {
  router.push('/lease/resource-form')
}

const goToDetail = (id) => {
  router.push(`/lease/resource/${id}`)
}

const handleEdit = (id) => {
  return router.push(`/lease/resource-form/${id}`)
  ElMessage.warning('当前后端暂未提供资源编辑接口，请先查看详情或等待接口补全')
}

// 下架操作
const handleOffShelf = (item) => {
  ElMessageBox.confirm(
    `确定要下架资源"${item.title}"吗？下架后租赁方将无法订阅该资源。`,
    '下架确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await offShelfResource(item.id)
      ElMessage.success('下架成功')
      fetchData()
    } catch (error) {
      console.error('下架失败:', error)
      ElMessage.error('下架失败')
    }
  }).catch(() => {
    // 取消操作
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.my-publish-container {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
}

.list-wrapper {
  min-height: 200px;
}

.list-item {
  margin-bottom: 15px;
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-main {
  flex: 1;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.item-details {
  color: #606266;
  font-size: 14px;
}

.price {
  color: #f56c6c;
  font-weight: bold;
}

.item-actions {
  margin-left: 20px;
  display: flex;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
