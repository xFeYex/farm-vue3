<template>
  <div class="resource-form-container" v-loading="loading">
    <el-page-header @back="goBack" class="mb-20">
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
          <el-input v-model="form.title" placeholder="请输入资源标题，例如：A区大棚1号" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="资源类型" prop="resourceType">
          <el-select v-model="form.resourceType" placeholder="请选择资源类型" style="width: 100%">
            <el-option label="大棚" value="GREENHOUSE" />
            <el-option label="菜地" value="FARMLAND" />
            <el-option label="果园" value="ORCHARD" />
          </el-select>
        </el-form-item>

        <el-form-item label="面积(㎡)" prop="area">
          <el-input-number v-model="form.area" :min="0.1" :precision="1" :step="10" style="width: 100%" placeholder="请输入面积" />
        </el-form-item>

        <el-form-item label="位置描述" prop="locationDesc">
          <el-input v-model="form.locationDesc" placeholder="请输入详细位置，例如：嘉义县梅山乡A区" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="月租金(元)" prop="pricePerMonth">
          <el-input-number v-model="form.pricePerMonth" :min="1" :step="100" style="width: 100%" placeholder="请输入月租金" />
        </el-form-item>

        <el-form-item label="最短租期(月)" prop="minLeaseMonths">
          <el-input-number v-model="form.minLeaseMonths" :min="1" :max="120" :step="1" style="width: 100%" placeholder="请输入最短租期" />
        </el-form-item>

        <el-form-item label="资源说明" prop="description">
          <el-input 
            v-model="form.description" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入资源详细说明，如适合种植的作物、配套设施等" 
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createResource, updateResource, getResourceDetail } from '@/api/lease'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const formRef = ref(null)
const loading = ref(false)
const submitting = ref(false)

// 判断是否为编辑模式
const resourceId = computed(() => route.params.id)
const isEdit = computed(() => !!resourceId.value)

const form = reactive({
  title: '',
  resourceType: '',
  area: undefined,
  locationDesc: '',
  pricePerMonth: undefined,
  minLeaseMonths: 1,
  description: '',
  ownerUserId: Number(localStorage.getItem('farming_user_id')) || 1
})

// 表单校验规则
const rules = reactive({
  title: [
    { required: true, message: '请输入资源标题', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  resourceType: [
    { required: true, message: '请选择资源类型', trigger: 'change' }
  ],
  area: [
    { required: true, message: '请输入面积', trigger: 'blur' },
    { type: 'number', min: 0.1, message: '面积必须大于 0', trigger: 'blur' }
  ],
  locationDesc: [
    { required: true, message: '请输入位置描述', trigger: 'blur' }
  ],
  pricePerMonth: [
    { required: true, message: '请输入月租金', trigger: 'blur' },
    { type: 'number', min: 1, message: '月租金必须大于 0', trigger: 'blur' }
  ],
  minLeaseMonths: [
    { required: true, message: '请输入最短租期', trigger: 'blur' },
    { type: 'number', min: 1, message: '最短租期必须大于等于 1', trigger: 'blur' }
  ]
})

// 获取资源详情（编辑模式）
const fetchDetail = async () => {
  if (!isEdit.value) return
  
  loading.value = true
  try {
    const res = await getResourceDetail(resourceId.value)
    const data = res.data || res
    
    // 回填表单数据
    Object.keys(form).forEach(key => {
      if (data[key] !== undefined) {
        form[key] = data[key]
      }
    })
  } catch (error) {
    console.error('获取资源详情失败:', error)
    ElMessage.error('获取资源详情失败')
  } finally {
    loading.value = false
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid, fields) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value) {
          await updateResource(resourceId.value, form)
          ElMessage.success('更新成功')
        } else {
          await createResource(form)
          ElMessage.success('发布成功')
        }
        router.back()
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error(isEdit.value ? '更新失败' : '发布失败')
      } finally {
        submitting.value = false
      }
    } else {
      console.log('表单校验不通过', fields)
    }
  })
}

// 返回上一页
const goBack = () => {
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
