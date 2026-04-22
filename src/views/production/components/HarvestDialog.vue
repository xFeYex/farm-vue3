<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  record: {
    type: Object,
    default: null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'save'])

const dialogTitleId = 'harvest-dialog-title'
const nameInputRef = ref(null)
const errors = ref({})
const form = ref(createDefaultForm())
const categoryOptions = [
  { label: '果蔬', value: 'VEGETABLE' },
  { label: '叶菜', value: 'LEAFY' },
  { label: '香草', value: 'HERB' },
  { label: '根茎', value: 'ROOT' },
  { label: '其他', value: 'OTHER' },
]
const unitOptions = ['斤', '千克', '筐', '箱', '袋']

let previousBodyOverflow = ''

const dialogDescription = computed(
  () =>
    '记录本次收获的品类、数量和日期，保存后首页收获列表会立刻补进最新一条数据。',
)

const previewSummary = computed(() => {
  const quantity = Number(form.value.harvestQuantity || 0)
  const formattedQuantity = Number.isNaN(quantity) ? '--' : quantity

  return `${form.value.productName || '未填写产品'} · ${formattedQuantity}${form.value.unit || ''}`
})

const categoryLabel = computed(
  () => categoryOptions.find((item) => item.value === form.value.category)?.label || form.value.category,
)

watch(
  () => props.modelValue,
  async (visible) => {
    toggleBodyScroll(visible)

    if (visible) {
      syncForm()
      await nextTick()
      nameInputRef.value?.focus()
      bindEscListener()
      return
    }

    resetErrors()
    unbindEscListener()
  },
  { immediate: true },
)

watch(
  () => props.record,
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
    productName: '',
    category: 'VEGETABLE',
    harvestQuantity: '',
    unit: '斤',
    harvestDate: todayString(),
    remark: '',
  }
}

// 弹窗打开时拷贝一份本地表单，避免用户输入过程中直接影响父组件里的收获列表。
function syncForm() {
  form.value = {
    ...createDefaultForm(),
    ...(props.record ?? {}),
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

function updateField(field, value) {
  form.value = {
    ...form.value,
    [field]: value,
  }

  clearFieldError(field)
}

function clearFieldError(field) {
  if (!errors.value[field]) {
    return
  }

  const nextErrors = { ...errors.value }
  delete nextErrors[field]
  errors.value = nextErrors
}

// 这里先做轻量校验，保证新增记录进入列表前字段完整，后续接 API 时也能复用同一套约束。
function validateForm() {
  const nextErrors = {}
  const quantity = Number(form.value.harvestQuantity)

  if (!form.value.productName.trim()) {
    nextErrors.productName = '请输入产品名称'
  }

  if (!form.value.category) {
    nextErrors.category = '请选择分类'
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    nextErrors.harvestQuantity = '收获数量请输入大于 0 的数字'
  }

  if (!form.value.unit) {
    nextErrors.unit = '请选择单位'
  }

  if (!form.value.harvestDate) {
    nextErrors.harvestDate = '请选择收获日期'
  }

  if (form.value.remark.trim().length > 120) {
    nextErrors.remark = '备注请控制在 120 个字以内'
  }

  errors.value = nextErrors

  return Object.keys(nextErrors).length === 0
}

// 提交前统一整理字段，父组件后续无论接 mock 还是 API，都能直接拿到干净的请求体。
function buildPayload() {
  return {
    ...(props.record?.id ? { id: props.record.id } : {}),
    productName: form.value.productName.trim(),
    category: form.value.category,
    harvestQuantity: Number(form.value.harvestQuantity),
    unit: form.value.unit,
    harvestDate: form.value.harvestDate,
    remark: form.value.remark.trim(),
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
      class="harvest-dialog"
      role="presentation"
      @click="handleMaskClick"
    >
      <section
        class="harvest-dialog__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="dialogTitleId"
      >
        <header class="harvest-dialog__header">
          <div>
            <p class="harvest-dialog__eyebrow">HARVEST ENTRY</p>
            <h2 :id="dialogTitleId">新增收获记录</h2>
            <p class="harvest-dialog__description">{{ dialogDescription }}</p>
          </div>

          <button
            class="harvest-dialog__close"
            type="button"
            aria-label="关闭收获记录弹窗"
            @click="closeDialog"
          >
            ×
          </button>
        </header>

        <div class="harvest-dialog__content">
          <form class="harvest-form" @submit.prevent="handleSubmit">
            <div class="field-group">
              <label class="field-label" for="harvest-product-name">产品名称</label>
              <input
                id="harvest-product-name"
                ref="nameInputRef"
                class="field-control"
                type="text"
                maxlength="24"
                :value="form.productName"
                :aria-invalid="Boolean(errors.productName)"
                placeholder="例如：樱桃番茄"
                @input="updateField('productName', $event.target.value)"
              />
              <p v-if="errors.productName" class="field-error">{{ errors.productName }}</p>
            </div>

            <div class="field-row">
              <div class="field-group">
                <label class="field-label" for="harvest-category">分类</label>
                <select
                  id="harvest-category"
                  class="field-control"
                  :value="form.category"
                  :aria-invalid="Boolean(errors.category)"
                  @change="updateField('category', $event.target.value)"
                >
                  <option v-for="item in categoryOptions" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </option>
                </select>
                <p v-if="errors.category" class="field-error">{{ errors.category }}</p>
              </div>

              <div class="field-group">
                <label class="field-label" for="harvest-date">收获日期</label>
                <input
                  id="harvest-date"
                  class="field-control"
                  type="date"
                  :value="form.harvestDate"
                  :aria-invalid="Boolean(errors.harvestDate)"
                  @input="updateField('harvestDate', $event.target.value)"
                />
                <p v-if="errors.harvestDate" class="field-error">{{ errors.harvestDate }}</p>
              </div>
            </div>

            <div class="field-row field-row--compact">
              <div class="field-group">
                <label class="field-label" for="harvest-quantity">数量</label>
                <input
                  id="harvest-quantity"
                  class="field-control"
                  type="number"
                  min="0.1"
                  step="0.1"
                  :value="form.harvestQuantity"
                  :aria-invalid="Boolean(errors.harvestQuantity)"
                  placeholder="请输入数量"
                  @input="updateField('harvestQuantity', $event.target.value)"
                />
                <p v-if="errors.harvestQuantity" class="field-error">
                  {{ errors.harvestQuantity }}
                </p>
              </div>

              <div class="field-group field-group--unit">
                <label class="field-label" for="harvest-unit">单位</label>
                <select
                  id="harvest-unit"
                  class="field-control"
                  :value="form.unit"
                  :aria-invalid="Boolean(errors.unit)"
                  @change="updateField('unit', $event.target.value)"
                >
                  <option v-for="item in unitOptions" :key="item" :value="item">
                    {{ item }}
                  </option>
                </select>
                <p v-if="errors.unit" class="field-error">{{ errors.unit }}</p>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="harvest-remark">备注</label>
              <textarea
                id="harvest-remark"
                class="field-control field-control--textarea"
                maxlength="120"
                :value="form.remark"
                :aria-invalid="Boolean(errors.remark)"
                placeholder="例如：第一批果实成熟度高，适合分级装箱。"
                @input="updateField('remark', $event.target.value)"
              />
              <div class="field-hint-row">
                <p v-if="errors.remark" class="field-error">{{ errors.remark }}</p>
                <span class="field-hint">{{ form.remark.length }}/120</span>
              </div>
            </div>
          </form>

          <aside class="harvest-aside">
            <div class="harvest-aside__card">
              <p class="harvest-aside__label">当前预览</p>
              <strong>{{ previewSummary }}</strong>
              <p>{{ form.harvestDate || '未选择日期' }} · {{ categoryLabel || '未选择分类' }}</p>
              <p>{{ form.remark || '这里会同步显示本次收获记录的备注摘要。' }}</p>
            </div>

            <div class="harvest-aside__card harvest-aside__card--soft">
              <p class="harvest-aside__label">填写建议</p>
              <ul class="harvest-aside__list">
                <li>产品名称尽量与实际台账一致，方便后续汇总和筛选。</li>
                <li>数量支持小数，适合处理分批采收或称重数据。</li>
                <li>如果后续接接口，这个 payload 可以直接映射到 `createHarvest`。</li>
              </ul>
            </div>
          </aside>
        </div>

        <footer class="harvest-dialog__footer">
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
            {{ submitting ? '保存中...' : '新增记录' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.harvest-dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(26, 37, 26, 0.48);
  backdrop-filter: blur(10px);
}

.harvest-dialog__panel {
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

.harvest-dialog__header,
.harvest-dialog__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
}

.harvest-dialog__header {
  border-bottom: 1px solid rgba(109, 136, 96, 0.12);
}

.harvest-dialog__eyebrow,
.harvest-aside__label,
.field-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #70836d;
}

.harvest-dialog__header h2 {
  margin-top: 10px;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 800;
  color: #203126;
}

.harvest-dialog__description {
  max-width: 34rem;
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.75;
  color: #5a6d5e;
}

.harvest-dialog__close {
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

.harvest-dialog__content {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
  gap: 22px;
  padding: 26px 28px 10px;
}

.harvest-form {
  display: grid;
  gap: 18px;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-row--compact {
  grid-template-columns: minmax(0, 1.4fr) minmax(130px, 0.8fr);
}

.field-group {
  display: grid;
  gap: 10px;
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
  min-height: 150px;
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

.harvest-aside {
  display: grid;
  gap: 14px;
}

.harvest-aside__card {
  padding: 18px;
  border: 1px solid rgba(109, 136, 96, 0.12);
  border-radius: 22px;
  background: rgba(245, 249, 241, 0.88);
}

.harvest-aside__card--soft {
  background: linear-gradient(135deg, rgba(234, 243, 228, 0.92), rgba(255, 255, 255, 0.92));
}

.harvest-aside__card strong {
  display: block;
  margin-top: 12px;
  font-size: 20px;
  line-height: 1.35;
  color: #223427;
}

.harvest-aside__card p,
.harvest-aside__list {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: #607162;
}

.harvest-aside__list {
  display: grid;
  gap: 10px;
  padding-left: 18px;
}

.harvest-dialog__footer {
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
.harvest-dialog__close:hover {
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
  .harvest-dialog__content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .harvest-dialog {
    padding: 12px;
  }

  .harvest-dialog__panel {
    border-radius: 24px;
  }

  .harvest-dialog__header,
  .harvest-dialog__content,
  .harvest-dialog__footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .harvest-dialog__header,
  .harvest-dialog__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .field-row,
  .field-row--compact {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .field-control,
  .dialog-button,
  .harvest-dialog__close {
    transition: none;
  }
}
</style>
