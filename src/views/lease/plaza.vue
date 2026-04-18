<template>
  <div class="plaza-container">
    <div class="header">
      <h2>农场资源广场</h2>
    </div>

    <!-- 筛选区 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="queryForm" class="filter-form">
        <el-form-item label="资源类型">
          <el-select v-model="queryForm.type" placeholder="全部类型" clearable style="width: 150px">
            <el-option label="大棚" value="GREENHOUSE" />
            <el-option label="菜地" value="FARMLAND" />
            <el-option label="果园" value="ORCHARD" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源状态">
          <el-select v-model="queryForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="上架中" value="ON_SHELF" />
            <el-option label="已下架" value="OFF_SHELF" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 资源列表 -->
    <div class="resource-list" v-loading="loading">
      <el-row :gutter="20" v-if="list.length > 0">
        <el-col :span="8" v-for="item in list" :key="item.id" class="mb-20">
          <el-card class="resource-card" shadow="hover">
            <div class="card-header">
              <span class="title">{{ item.title }}</span>
              <el-tag :type="item.status === 'ON_SHELF' ? 'success' : 'info'" size="small">
                {{ item.status === 'ON_SHELF' ? '上架中' : '已下架' }}
              </el-tag>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">类型：</span>
                <span class="value">{{ getTypeLabel(item.resourceType) }}</span>
                <span class="label ml-10">面积：</span>
                <span class="value">{{ item.area }}㎡</span>
              </div>
              <div class="info-row">
                <span class="label">位置：</span>
                <span class="value text-ellipsis" :title="item.locationDesc">{{ item.locationDesc }}</span>
              </div>
              <div class="info-row price-row">
                <span class="price">¥{{ item.pricePerMonth }}</span><span class="unit">/月</span>
                <span class="min-lease">最短租期：{{ item.minLeaseMonths }}个月</span>
              </div>
            </div>
            <div class="card-footer">
              <el-button type="primary" plain class="w-full" @click="goToDetail(item.id)">
                查看详情
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-empty v-else description="暂无资源数据" />
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
import { getResourceList } from '@/api/lease'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 状态定义
const loading = ref(false)
const total = ref(0)
const list = ref([])

// 查询表单
const queryForm = reactive({
  type: '',
  status: 'ON_SHELF',
  page: 1,
  pageSize: 10
})

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getResourceList(queryForm)
    // 假设返回结构为 { code: 200, data: { list: [], total: 0 } }
    // 或者是直接 { list: [], total: 0 }
    const data = res.data || res
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    console.error('获取资源列表失败:', error)
    ElMessage.error('获取资源列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  queryForm.page = 1
  fetchData()
}

// 重置搜索
const resetSearch = () => {
  queryForm.type = ''
  queryForm.status = 'ON_SHELF'
  queryForm.page = 1
  fetchData()
}

// 分页变化
const handleSizeChange = (val) => {
  queryForm.pageSize = val
  fetchData()
}

const handleCurrentChange = (val) => {
  queryForm.page = val
  fetchData()
}

// 类型展示
const getTypeLabel = (type) => {
  const typeMap = {
    'GREENHOUSE': '大棚',
    'FARMLAND': '菜地',
    'ORCHARD': '果园'
  }
  return typeMap[type] || type
}

// 跳转详情
const goToDetail = (id) => {
  router.push(`/lease/resource/${id}`)
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.plaza-container {
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.mb-20 {
  margin-bottom: 20px;
}

.ml-10 {
  margin-left: 10px;
}

.w-full {
  width: 100%;
}

.resource-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-row {
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
  vertical-align: bottom;
}

.price-row {
  margin-top: 15px;
  display: flex;
  align-items: baseline;
}

.price {
  color: #f56c6c;
  font-size: 20px;
  font-weight: bold;
}

.unit {
  color: #909399;
  font-size: 12px;
  margin-left: 2px;
}

.min-lease {
  margin-left: auto;
  color: #909399;
  font-size: 13px;
}

.card-footer {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
