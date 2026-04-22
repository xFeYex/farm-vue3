<template>
  <el-dialog title="续订资源" v-model="visible" width="500px" @close="handleClose">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="当前结束日期">
        <span>{{ currentEndDate || '未知' }}</span>
      </el-form-item>
      <el-form-item label="续订月数" prop="leaseMonths">
        <el-input-number
          v-model="form.leaseMonths"
          :min="1"
          :max="120"
          style="width: 100%"
        />
        <div class="tip" v-if="previewEndDate">预计新结束日期：{{ previewEndDate }}</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确认续订
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { renewSubscription } from '@/api/lease'

const props = defineProps({
  subscriptionId: {
    type: [Number, String],
    required: true,
  },
  currentEndDate: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['success'])

const visible = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const form = reactive({
  leaseMonths: 1,
  userId: Number(localStorage.getItem('farming_user_id')) || 2001,
})

const rules = reactive({
  leaseMonths: [{ required: true, message: '请输入续订月数', trigger: 'blur' }],
})

const previewEndDate = computed(() => {
  if (!props.currentEndDate || !form.leaseMonths) {
    return ''
  }

  const nextDate = new Date(`${props.currentEndDate}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + 1)
  nextDate.setMonth(nextDate.getMonth() + form.leaseMonths)
  nextDate.setDate(nextDate.getDate() - 1)

  return formatLocalDate(nextDate)
})

const open = () => {
  form.leaseMonths = 1
  form.userId = Number(localStorage.getItem('farming_user_id')) || 2001
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
      await renewSubscription(props.subscriptionId, form)
      ElMessage.success('续订成功')
      visible.value = false
      emit('success')
    } catch (error) {
      console.error('续订失败:', error)
      ElMessage.error('续订失败，请重试')
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
