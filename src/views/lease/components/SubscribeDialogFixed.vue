<template>
  <el-dialog title="订阅资源" v-model="visible" width="500px" @close="handleClose">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="起始日期" prop="startDate">
        <el-date-picker
          v-model="form.startDate"
          type="date"
          placeholder="选择起始日期"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="租期(月)" prop="leaseMonths">
        <el-input-number
          v-model="form.leaseMonths"
          :min="minLeaseMonths"
          :max="120"
          style="width: 100%"
        />
        <div class="tip" v-if="previewEndDate">预计结束日期：{{ previewEndDate }}</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确认订阅
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createSubscription } from '@/api/lease'

const props = defineProps({
  resourceId: {
    type: [Number, String],
    required: true,
  },
  minLeaseMonths: {
    type: Number,
    default: 1,
  },
})

const emit = defineEmits(['success'])

const visible = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const form = reactive({
  resourceId: '',
  userId: Number(localStorage.getItem('farming_user_id')) || 2001,
  startDate: '',
  leaseMonths: 1,
})

const rules = reactive({
  startDate: [{ required: true, message: '请选择起始日期', trigger: 'change' }],
  leaseMonths: [{ required: true, message: '请输入租期(月)', trigger: 'blur' }],
})

const previewEndDate = computed(() => {
  if (!form.startDate || !form.leaseMonths) {
    return ''
  }

  const date = new Date(`${form.startDate}T00:00:00`)
  date.setMonth(date.getMonth() + form.leaseMonths)
  date.setDate(date.getDate() - 1)

  return formatLocalDate(date)
})

watch(visible, (value) => {
  if (!value) {
    return
  }

  form.resourceId = props.resourceId
  form.userId = Number(localStorage.getItem('farming_user_id')) || 2001
  form.leaseMonths = props.minLeaseMonths
})

const open = () => {
  visible.value = true
}

const handleClose = () => {
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  if (!formRef.value) {
    return
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) {
      return
    }

    submitting.value = true

    try {
      await createSubscription(form)
      ElMessage.success('订阅成功')
      visible.value = false
      emit('success')
    } catch (error) {
      console.error('订阅失败:', error)
      ElMessage.error('订阅失败，请重试')
    } finally {
      submitting.value = false
    }
  })
}

defineExpose({
  open,
})

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
</script>

<style scoped>
.tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  line-height: 1.2;
}
</style>
