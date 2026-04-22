<template>
  <div class="resource-form-container" v-loading="loading">
    <el-page-header class="mb-20" @back="goBack">
      <template #content>
        <span class="text-large font-600">{{ isEdit ? '编辑资源' : '发布资源' }}</span>
      </template>
    </el-page-header>

    <el-card shadow="never" class="form-card">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        class="resource-form"
      >
        <el-form-item label="资源标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入资源标题，例如：A区大棚 1 号"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="资源类型" prop="resourceType">
          <el-select v-model="form.resourceType" placeholder="请选择资源类型" style="width: 100%">
            <el-option label="大棚" value="GREENHOUSE" />
            <el-option label="菜地" value="FARMLAND" />
            <el-option label="果园" value="ORCHARD" />
          </el-select>
        </el-form-item>

        <el-form-item label="面积(㎡)" prop="area">
          <el-input-number
            v-model="form.area"
            :min="0.1"
            :precision="1"
            :step="10"
            style="width: 100%"
            placeholder="请输入面积"
          />
        </el-form-item>

        <el-form-item label="位置描述" prop="locationDesc">
          <el-input
            v-model="form.locationDesc"
            placeholder="请输入详细位置，例如：嘉义县梅山乡 A 区"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="月租金(元)" prop="pricePerMonth">
          <el-input-number
            v-model="form.pricePerMonth"
            :min="1"
            :step="100"
            style="width: 100%"
            placeholder="请输入月租金"
          />
        </el-form-item>

        <el-form-item label="最短租期(月)" prop="minLeaseMonths">
          <el-input-number
            v-model="form.minLeaseMonths"
            :min="1"
            :max="120"
            :step="1"
            style="width: 100%"
            placeholder="请输入最短租期"
          />
        </el-form-item>

        <el-form-item label="资源说明" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入资源详细说明，如适合作物、配套设施等"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            保存
          </el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createResource, getResourceDetail, updateResource } from '@/api/lease'

const route = useRoute()
const router = useRouter()

const formRef = ref(null)
const loading = ref(false)
const submitting = ref(false)

const resourceId = computed(() => route.params.id)
const isEdit = computed(() => Boolean(resourceId.value))

const form = reactive({
  title: '',
  resourceType: '',
  area: undefined,
  locationDesc: '',
  pricePerMonth: undefined,
  minLeaseMonths: 1,
  description: '',
  userId: Number(localStorage.getItem('farming_user_id')) || 1,
  ownerUserId: Number(localStorage.getItem('farming_user_id')) || 1,
})

const rules = reactive({
  title: [
    { required: true, message: '请输入资源标题', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  resourceType: [{ required: true, message: '请选择资源类型', trigger: 'change' }],
  area: [
    { required: true, message: '请输入面积', trigger: 'blur' },
    { type: 'number', min: 0.1, message: '面积必须大于 0', trigger: 'blur' },
  ],
  locationDesc: [{ required: true, message: '请输入位置描述', trigger: 'blur' }],
  pricePerMonth: [
    { required: true, message: '请输入月租金', trigger: 'blur' },
    { type: 'number', min: 1, message: '月租金必须大于 0', trigger: 'blur' },
  ],
  minLeaseMonths: [
    { required: true, message: '请输入最短租期', trigger: 'blur' },
    { type: 'number', min: 1, message: '最短租期必须大于 0', trigger: 'blur' },
  ],
})

function getCurrentUserId() {
  return Number(localStorage.getItem('farming_user_id')) || 1
}

function applyResourceData(data = {}) {
  form.title = data.title ?? ''
  form.resourceType = data.resourceType ?? ''
  form.area = data.area ?? undefined
  form.locationDesc = data.locationDesc ?? ''
  form.pricePerMonth = data.pricePerMonth ?? undefined
  form.minLeaseMonths = data.minLeaseMonths ?? 1
  form.description = data.description ?? ''
  form.ownerUserId = data.ownerUserId ?? form.ownerUserId
  form.userId = getCurrentUserId()
}

function buildPayload() {
  return {
    userId: getCurrentUserId(),
    title: form.title,
    resourceType: form.resourceType,
    area: form.area,
    locationDesc: form.locationDesc,
    pricePerMonth: form.pricePerMonth,
    minLeaseMonths: form.minLeaseMonths,
    description: form.description || null,
  }
}

async function fetchDetail() {
  if (!isEdit.value) {
    return
  }

  loading.value = true
  try {
    const data = await getResourceDetail(resourceId.value)
    applyResourceData(data)
  } catch (error) {
    console.error('获取资源详情失败:', error)
    ElMessage.error(error.message || '获取资源详情失败')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!formRef.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true
  try {
    const payload = buildPayload()

    if (isEdit.value) {
      const data = await updateResource(resourceId.value, payload)
      applyResourceData(data)
      ElMessage.success('更新成功')
      return
    }

    await createResource(payload)
    ElMessage.success('发布成功')
    router.push('/lease/my-publish')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.back()
}

onMounted(() => {
  if (isEdit.value) {
    fetchDetail()
  }
})
</script>

<style scoped>
.resource-form-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.mb-20 {
  margin-bottom: 20px;
}

.text-large {
  font-size: 18px;
}

.font-600 {
  font-weight: 600;
}

.form-card {
  margin-top: 20px;
}

.resource-form {
  max-width: 600px;
}
</style>
