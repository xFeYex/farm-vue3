<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'create',
  },
  plan: {
    type: Object,
    default: null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'save'])

const dialogTitleId = 'plan-dialog-title'
const titleInputRef = ref(null)
const errors = ref({})
const form = ref(createDefaultForm())
const statusOptions = ['待执行', '进行中', '已完成']

let previousBodyOverflow = ''

const dialogTitle = computed(() => (props.mode === 'edit' ? '编辑计划' : '新建计划'))
const dialogDescription = computed(() =>
  props.mode === 'edit'
    ? '调整计划日期、状态或执行内容，保持首页计划列表信息最新。'
    : '补充本次种植任务的目标、日期和执行说明，保存后即可加入首页计划列表。',
)

watch(
  () => props.modelValue,
  async (visible) => {
    toggleBodyScroll(visible)

    if (visible) {
      syncForm()
      await nextTick()
      titleInputRef.value?.focus()
      bindEscListener()
      return
    }

    resetErrors()
    unbindEscListener()
  },
  { immediate: true },
)

watch(
  () => props.plan,
  () => {
    if (props.modelValue) {
      syncForm()
    }
  },
  { deep: true },
)

onBeforeUnmount(() => {
  toggleBodyScroll(false)
  unbindEscListener()
})

function createDefaultForm() {
  return {
    title: '',
    planDate: todayString(),
    planContent: '',
    status: '待执行',
  }
}

// 弹窗打开时把外部传入的数据拷贝为本地表单，避免用户输入过程中直接改动父级数据。
function syncForm() {
  form.value = {
    ...createDefaultForm(),
    ...(props.plan ?? {}),
  }
}

function closeDialog() {
  if (props.submitting) {
    return
  }

  emit('update:modelValue', false)
}

function handleMaskClick(event) {
  if (event.target === event.currentTarget) {
    closeDialog()
  }
}

function handleEscKey(event) {
  if (event.key === 'Escape' && props.modelValue) {
    closeDialog()
  }
}

function bindEscListener() {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleEscKey)
  }
}

function unbindEscListener() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleEscKey)
  }
}

function toggleBodyScroll(locked) {
  if (typeof document === 'undefined') {
    return
  }

  if (locked) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }

  document.body.style.overflow = previousBodyOverflow
}

function resetErrors() {
  errors.value = {}
}

// 先做一层轻量校验，保证标题、日期和正文在没有接表单库时也有清晰反馈。
function validateForm() {
  const nextErrors = {}

  if (!form.value.title.trim()) {
    nextErrors.title = '请输入计划标题'
  }

  if (!form.value.planDate) {
    nextErrors.planDate = '请选择计划日期'
  }

  if (!form.value.status) {
    nextErrors.status = '请选择状态'
  }

  if (!form.value.planContent.trim()) {
    nextErrors.planContent = '请填写计划内容'
  } else if (form.value.planContent.trim().length < 8) {
    nextErrors.planContent = '计划内容至少填写 8 个字'
  }

  errors.value = nextErrors

  return Object.keys(nextErrors).length === 0
}

// 提交前统一整理字段，后续无论接 mock 还是 API，请求体结构都会更稳定。
function buildPayload() {
  return {
    ...(props.plan?.id ? { id: props.plan.id } : {}),
    title: form.value.title.trim(),
    planDate: form.value.planDate,
    planContent: form.value.planContent.trim(),
    status: form.value.status,
  }
}

function handleSubmit() {
  if (props.submitting) {
    return
  }

  if (!validateForm()) {
    return
  }

  emit('save', buildPayload())
}

function updateField(field, value) {
  form.value = {
    ...form.value,
    [field]: value,
  }

  if (errors.value[field]) {
    const nextErrors = { ...errors.value }
    delete nextErrors[field]
    errors.value = nextErrors
  }
}

function todayString() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="plan-dialog"
      role="presentation"
      @click="handleMaskClick"
    >
      <section
        class="plan-dialog__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="dialogTitleId"
      >
        <header class="plan-dialog__header">
          <div>
            <p class="plan-dialog__eyebrow">PLAN EDITOR</p>
            <h2 :id="dialogTitleId">{{ dialogTitle }}</h2>
            <p class="plan-dialog__description">{{ dialogDescription }}</p>
          </div>

          <button
            class="plan-dialog__close"
            type="button"
            aria-label="关闭计划弹窗"
            @click="closeDialog"
          >
            ×
          </button>
        </header>

        <div class="plan-dialog__content">
          <form class="plan-form" @submit.prevent="handleSubmit">
            <div class="field-group">
              <label class="field-label" for="plan-title">计划标题</label>
              <input
                id="plan-title"
                ref="titleInputRef"
                class="field-control"
                type="text"
                maxlength="32"
                :value="form.title"
                :aria-invalid="Boolean(errors.title)"
                placeholder="例如：4月番茄定植计划"
                @input="updateField('title', $event.target.value)"
              />
              <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
            </div>

            <div class="field-row">
              <div class="field-group">
                <label class="field-label" for="plan-date">计划日期</label>
                <input
                  id="plan-date"
                  class="field-control"
                  type="date"
                  :value="form.planDate"
                  :aria-invalid="Boolean(errors.planDate)"
                  @input="updateField('planDate', $event.target.value)"
                />
                <p v-if="errors.planDate" class="field-error">{{ errors.planDate }}</p>
              </div>

              <div class="field-group">
                <label class="field-label" for="plan-status">状态</label>
                <select
                  id="plan-status"
                  class="field-control"
                  :value="form.status"
                  :aria-invalid="Boolean(errors.status)"
                  @change="updateField('status', $event.target.value)"
                >
                  <option v-for="item in statusOptions" :key="item" :value="item">
                    {{ item }}
                  </option>
                </select>
                <p v-if="errors.status" class="field-error">{{ errors.status }}</p>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="plan-content">正文内容</label>
              <textarea
                id="plan-content"
                class="field-control field-control--textarea"
                maxlength="200"
                :value="form.planContent"
                :aria-invalid="Boolean(errors.planContent)"
                placeholder="例如：完成幼苗定植、补充基质水分，并复核滴灌通畅情况。"
                @input="updateField('planContent', $event.target.value)"
              />
              <div class="field-hint-row">
                <p v-if="errors.planContent" class="field-error">{{ errors.planContent }}</p>
                <span class="field-hint">{{ form.planContent.length }}/200</span>
              </div>
            </div>
          </form>

          <aside class="plan-aside">
            <div class="plan-aside__card">
              <p class="plan-aside__label">填写提醒</p>
              <ul class="plan-aside__list">
                <li>标题建议写成“时间 + 作物 + 动作”，方便首页快速扫读。</li>
                <li>正文内容尽量覆盖执行动作、关注指标和复核点。</li>
                <li>若是补录历史任务，可以直接把状态改成“已完成”。</li>
              </ul>
            </div>

            <div class="plan-aside__card plan-aside__card--soft">
              <p class="plan-aside__label">当前预览</p>
              <strong>{{ form.title || '未填写标题' }}</strong>
              <p>{{ form.planDate || '未选择日期' }} · {{ form.status || '未选择状态' }}</p>
              <p>{{ form.planContent || '这里会同步展示计划内容摘要。' }}</p>
            </div>
          </aside>
        </div>

        <footer class="plan-dialog__footer">
          <button
            class="dialog-button dialog-button--ghost"
            type="button"
            :disabled="submitting"
            @click="closeDialog"
          >
            取消
          </button>
          <button
            class="dialog-button dialog-button--primary"
            type="button"
            :disabled="submitting"
            @click="handleSubmit"
          >
            {{ submitting ? '保存中...' : mode === 'edit' ? '保存修改' : '创建计划' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.plan-dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(26, 37, 26, 0.48);
  backdrop-filter: blur(10px);
}

.plan-dialog__panel {
  width: min(960px, 100%);
  max-height: min(88vh, 860px);
  overflow: auto;
  border: 1px solid rgba(109, 136, 96, 0.14);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 245, 0.98)),
    linear-gradient(135deg, rgba(204, 223, 193, 0.22), rgba(255, 255, 255, 0));
  box-shadow: 0 32px 70px rgba(24, 40, 26, 0.24);
}

.plan-dialog__header,
.plan-dialog__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
}

.plan-dialog__header {
  border-bottom: 1px solid rgba(109, 136, 96, 0.12);
}

.plan-dialog__eyebrow,
.plan-aside__label,
.field-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #70836d;
}

.plan-dialog__header h2 {
  margin-top: 10px;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 800;
  color: #203126;
}

.plan-dialog__description {
  max-width: 34rem;
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.75;
  color: #5a6d5e;
}

.plan-dialog__close {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 14px;
  background: rgba(41, 66, 48, 0.08);
  color: #294230;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.plan-dialog__content {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
  gap: 22px;
  padding: 26px 28px 10px;
}

.plan-form {
  display: grid;
  gap: 18px;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-group {
  display: grid;
  gap: 10px;
}

.field-label {
  letter-spacing: 0.08em;
}

.field-control {
  min-height: 48px;
  width: 100%;
  padding: 0 16px;
  border: 1px solid rgba(109, 136, 96, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  color: #213226;
  font-size: 15px;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.field-control--textarea {
  min-height: 156px;
  padding: 14px 16px;
  resize: vertical;
}

.field-control:focus {
  outline: none;
  border-color: rgba(87, 125, 74, 0.48);
  box-shadow: 0 0 0 4px rgba(135, 168, 115, 0.14);
  background: white;
}

.field-control[aria-invalid='true'] {
  border-color: rgba(179, 90, 73, 0.5);
  box-shadow: 0 0 0 4px rgba(179, 90, 73, 0.1);
}

.field-error {
  font-size: 13px;
  color: #b35a49;
}

.field-hint-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-hint {
  margin-left: auto;
  font-size: 12px;
  color: #809080;
}

.plan-aside {
  display: grid;
  gap: 14px;
}

.plan-aside__card {
  padding: 18px;
  border: 1px solid rgba(109, 136, 96, 0.12);
  border-radius: 22px;
  background: rgba(245, 249, 241, 0.88);
}

.plan-aside__card--soft {
  background: linear-gradient(135deg, rgba(234, 243, 228, 0.92), rgba(255, 255, 255, 0.92));
}

.plan-aside__list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-left: 18px;
  color: #5f7061;
  line-height: 1.7;
}

.plan-aside__card strong {
  display: block;
  margin-top: 12px;
  font-size: 20px;
  line-height: 1.35;
  color: #223427;
}

.plan-aside__card p {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: #607162;
}

.plan-dialog__footer {
  align-items: center;
  padding-top: 18px;
  border-top: 1px solid rgba(109, 136, 96, 0.12);
}

.dialog-button {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    opacity 180ms ease;
}

.dialog-button:hover:not(:disabled),
.plan-dialog__close:hover {
  transform: translateY(-1px);
}

.dialog-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.dialog-button--ghost {
  background: rgba(244, 248, 241, 0.92);
  border-color: rgba(57, 79, 63, 0.12);
  color: #294230;
}

.dialog-button--primary {
  background: #294230;
  color: #f4f8ef;
  box-shadow: 0 16px 30px rgba(41, 66, 48, 0.16);
}

@media (max-width: 860px) {
  .plan-dialog__content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .plan-dialog {
    padding: 12px;
  }

  .plan-dialog__panel {
    border-radius: 24px;
  }

  .plan-dialog__header,
  .plan-dialog__content,
  .plan-dialog__footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .plan-dialog__header,
  .plan-dialog__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .field-control,
  .dialog-button,
  .plan-dialog__close {
    transition: none;
  }
}
</style>
