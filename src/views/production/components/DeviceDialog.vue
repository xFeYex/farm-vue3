<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  config: {
    type: Object,
    default: null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'save'])

const dialogTitleId = 'device-dialog-title'
const timesInputRef = ref(null)
const nextStartTime = ref('08:00')
const errors = ref({})
const form = ref(createDefaultForm())

let previousBodyOverflow = ''

const dialogDescription = computed(
  () =>
    '修改灌溉节奏、目标湿度和喷水器开关，保存后首页“设备联动”模块会立即同步显示最新配置。',
)

const schedulePreview = computed(() => {
  const count = Number(form.value.timesPerDay || 0)
  const duration = Number(form.value.durationMinutes || 0)
  const humidity = Number(form.value.targetHumidity || 0)

  return [
    `每日 ${count} 次`,
    `单次 ${duration} 分钟`,
    `目标湿度 ${humidity}%`,
  ].join(' · ')
})

watch(
  () => props.modelValue,
  async (visible) => {
    toggleBodyScroll(visible)

    if (visible) {
      syncForm()
      await nextTick()
      timesInputRef.value?.focus()
      bindEscListener()
      return
    }

    resetErrors()
    nextStartTime.value = '08:00'
    unbindEscListener()
  },
  { immediate: true },
)

watch(
  () => props.config,
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
    timesPerDay: 3,
    durationMinutes: 10,
    startTimes: ['08:00', '14:00', '19:30'],
    targetHumidity: 70,
    sprinklerEnabled: true,
  }
}

// 打开弹窗时复制父组件传入的数据，避免编辑过程中直接污染首页上的设备配置对象。
function syncForm() {
  const source = props.config ?? createDefaultForm()

  form.value = {
    ...createDefaultForm(),
    ...source,
    startTimes: [...(source.startTimes ?? [])],
  }

  nextStartTime.value = form.value.startTimes[0] || '08:00'
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

// 启动时间单独维护成数组，便于后续直接映射为接口里的 startTimes 字段。
function addStartTime() {
  const time = normalizeTime(nextStartTime.value)

  if (!time) {
    errors.value = {
      ...errors.value,
      startTimes: '请输入有效的启动时间',
    }
    return
  }

  if (form.value.startTimes.includes(time)) {
    errors.value = {
      ...errors.value,
      startTimes: '该启动时间已经存在，请勿重复添加',
    }
    return
  }

  form.value = {
    ...form.value,
    startTimes: [...form.value.startTimes, time].sort(),
  }

  clearFieldError('startTimes')
}

function removeStartTime(target) {
  form.value = {
    ...form.value,
    startTimes: form.value.startTimes.filter((item) => item !== target),
  }

  clearFieldError('startTimes')
}

function clearFieldError(field) {
  if (!errors.value[field]) {
    return
  }

  const nextErrors = { ...errors.value }
  delete nextErrors[field]
  errors.value = nextErrors
}

// 这里先做页面级校验，确保数量、时长、湿度和启动时间之间的关系合理，再向父组件提交。
function validateForm() {
  const nextErrors = {}
  const timesPerDay = Number(form.value.timesPerDay)
  const durationMinutes = Number(form.value.durationMinutes)
  const targetHumidity = Number(form.value.targetHumidity)
  const startTimes = form.value.startTimes ?? []

  if (!Number.isInteger(timesPerDay) || timesPerDay < 1 || timesPerDay > 24) {
    nextErrors.timesPerDay = '每日次数请输入 1 到 24 之间的整数'
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 180) {
    nextErrors.durationMinutes = '每次时长请输入 1 到 180 之间的整数分钟'
  }

  if (!Number.isInteger(targetHumidity) || targetHumidity < 30 || targetHumidity > 95) {
    nextErrors.targetHumidity = '目标湿度请输入 30 到 95 之间的整数'
  }

  if (!startTimes.length) {
    nextErrors.startTimes = '请至少添加一个启动时间'
  } else if (startTimes.length !== timesPerDay) {
    nextErrors.startTimes = '启动时间数量需要与每日次数保持一致'
  }

  errors.value = nextErrors

  return Object.keys(nextErrors).length === 0
}

// 统一把字符串数字收敛成 number，后续接接口时就不需要再重复做字段清洗。
function buildPayload() {
  return {
    timesPerDay: Number(form.value.timesPerDay),
    durationMinutes: Number(form.value.durationMinutes),
    startTimes: [...form.value.startTimes].sort(),
    targetHumidity: Number(form.value.targetHumidity),
    sprinklerEnabled: Boolean(form.value.sprinklerEnabled),
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

function normalizeTime(value) {
  return /^\d{2}:\d{2}$/.test(value) ? value : ''
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="device-dialog"
      role="presentation"
      @click="handleMaskClick"
    >
      <section
        class="device-dialog__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="dialogTitleId"
      >
        <header class="device-dialog__header">
          <div>
            <p class="device-dialog__eyebrow">DEVICE ORCHESTRATION</p>
            <h2 :id="dialogTitleId">编辑设备参数</h2>
            <p class="device-dialog__description">{{ dialogDescription }}</p>
          </div>

          <button
            class="device-dialog__close"
            type="button"
            aria-label="关闭设备参数弹窗"
            @click="closeDialog"
          >
            ×
          </button>
        </header>

        <div class="device-dialog__content">
          <form class="device-form" @submit.prevent="handleSubmit">
            <div class="field-row">
              <div class="field-group">
                <label class="field-label" for="times-per-day">每日次数</label>
                <input
                  id="times-per-day"
                  ref="timesInputRef"
                  class="field-control"
                  type="number"
                  min="1"
                  max="24"
                  step="1"
                  :value="form.timesPerDay"
                  :aria-invalid="Boolean(errors.timesPerDay)"
                  @input="updateField('timesPerDay', $event.target.value)"
                />
                <p v-if="errors.timesPerDay" class="field-error">{{ errors.timesPerDay }}</p>
              </div>

              <div class="field-group">
                <label class="field-label" for="duration-minutes">每次时长</label>
                <input
                  id="duration-minutes"
                  class="field-control"
                  type="number"
                  min="1"
                  max="180"
                  step="1"
                  :value="form.durationMinutes"
                  :aria-invalid="Boolean(errors.durationMinutes)"
                  @input="updateField('durationMinutes', $event.target.value)"
                />
                <p v-if="errors.durationMinutes" class="field-error">
                  {{ errors.durationMinutes }}
                </p>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="target-humidity">目标湿度</label>
              <input
                id="target-humidity"
                class="field-control"
                type="number"
                min="30"
                max="95"
                step="1"
                :value="form.targetHumidity"
                :aria-invalid="Boolean(errors.targetHumidity)"
                @input="updateField('targetHumidity', $event.target.value)"
              />
              <p v-if="errors.targetHumidity" class="field-error">{{ errors.targetHumidity }}</p>
            </div>

            <div class="field-group">
              <label class="field-label" for="start-time-input">启动时间</label>
              <div class="time-editor">
                <input
                  id="start-time-input"
                  class="field-control"
                  type="time"
                  :value="nextStartTime"
                  @input="nextStartTime = $event.target.value"
                />
                <button
                  class="editor-button"
                  type="button"
                  @click="addStartTime"
                >
                  添加时间
                </button>
              </div>
              <div class="time-chip-list">
                <button
                  v-for="item in form.startTimes"
                  :key="item"
                  class="time-chip"
                  type="button"
                  @click="removeStartTime(item)"
                >
                  {{ item }}
                  <span class="time-chip__close">×</span>
                </button>
              </div>
              <p v-if="errors.startTimes" class="field-error">{{ errors.startTimes }}</p>
              <p class="field-hint">点击时间标签可移除，数量需要与“每日次数”保持一致。</p>
            </div>

            <label class="toggle-card">
              <div>
                <p class="toggle-card__label">启用喷水器</p>
                <p class="toggle-card__text">
                  开启后，设备会按设定时间和湿度策略触发喷水联动。
                </p>
              </div>

              <span
                :class="[
                  'switch',
                  form.sprinklerEnabled ? 'switch--active' : '',
                ]"
              >
                <input
                  class="switch__input"
                  type="checkbox"
                  :checked="form.sprinklerEnabled"
                  @change="updateField('sprinklerEnabled', $event.target.checked)"
                />
                <span class="switch__track" />
                <span class="switch__thumb" />
              </span>
            </label>
          </form>

          <aside class="device-aside">
            <div class="device-aside__card">
              <p class="device-aside__label">当前联动摘要</p>
              <strong>{{ schedulePreview }}</strong>
              <p>
                {{
                  form.sprinklerEnabled
                    ? '喷水器为启用状态，系统会按设定时间进入联动流程。'
                    : '喷水器当前关闭，保存后首页会显示未启用状态。'
                }}
              </p>
            </div>

            <div class="device-aside__card device-aside__card--soft">
              <p class="device-aside__label">配置建议</p>
              <ul class="device-aside__list">
                <li>每日次数和启动时间建议一一对应，方便排查执行节奏。</li>
                <li>湿度目标不宜过高，避免长时间潮湿造成病害风险。</li>
                <li>如果后续接真实接口，这个 payload 可直接映射到 `updateDevice`。</li>
              </ul>
            </div>
          </aside>
        </div>

        <footer class="device-dialog__footer">
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
            {{ submitting ? '保存中...' : '保存参数' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.device-dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(26, 37, 26, 0.48);
  backdrop-filter: blur(10px);
}

.device-dialog__panel {
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

.device-dialog__header,
.device-dialog__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
}

.device-dialog__header {
  border-bottom: 1px solid rgba(109, 136, 96, 0.12);
}

.device-dialog__eyebrow,
.device-aside__label,
.field-label,
.toggle-card__label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #70836d;
}

.device-dialog__header h2 {
  margin-top: 10px;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 800;
  color: #203126;
}

.device-dialog__description {
  max-width: 34rem;
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.75;
  color: #5a6d5e;
}

.device-dialog__close {
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

.device-dialog__content {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: 22px;
  padding: 26px 28px 10px;
}

.device-form {
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

.field-hint {
  font-size: 12px;
  color: #809080;
}

.time-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.editor-button {
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid rgba(57, 79, 63, 0.12);
  border-radius: 18px;
  background: rgba(244, 248, 241, 0.92);
  color: #294230;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

.editor-button:hover:not(:disabled),
.device-dialog__close:hover,
.dialog-button:hover:not(:disabled),
.time-chip:hover {
  transform: translateY(-1px);
}

.time-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.time-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(109, 136, 96, 0.12);
  border-radius: 999px;
  background: white;
  color: #2b4332;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.time-chip__close {
  font-size: 14px;
  line-height: 1;
  color: #6d7f6d;
}

.toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
  border: 1px solid rgba(109, 136, 96, 0.12);
  border-radius: 22px;
  background: rgba(245, 249, 241, 0.88);
}

.toggle-card__label {
  letter-spacing: 0.08em;
}

.toggle-card__text,
.device-aside__card p,
.device-aside__list {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: #607162;
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 62px;
  height: 36px;
  flex-shrink: 0;
}

.switch__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.switch__track {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: rgba(128, 144, 128, 0.28);
  transition: background-color 180ms ease;
}

.switch__thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 6px 16px rgba(36, 50, 38, 0.18);
  transition: transform 180ms ease;
}

.switch--active .switch__track {
  background: #5f8f55;
}

.switch--active .switch__thumb {
  transform: translateX(26px);
}

.device-aside {
  display: grid;
  gap: 14px;
}

.device-aside__card {
  padding: 18px;
  border: 1px solid rgba(109, 136, 96, 0.12);
  border-radius: 22px;
  background: rgba(245, 249, 241, 0.88);
}

.device-aside__card--soft {
  background: linear-gradient(135deg, rgba(234, 243, 228, 0.92), rgba(255, 255, 255, 0.92));
}

.device-aside__card strong {
  display: block;
  margin-top: 12px;
  font-size: 20px;
  line-height: 1.4;
  color: #223427;
}

.device-aside__list {
  display: grid;
  gap: 10px;
  padding-left: 18px;
}

.device-dialog__footer {
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

.dialog-button:disabled,
.editor-button:disabled {
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
  .device-dialog__content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .device-dialog {
    padding: 12px;
  }

  .device-dialog__panel {
    border-radius: 24px;
  }

  .device-dialog__header,
  .device-dialog__content,
  .device-dialog__footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .device-dialog__header,
  .device-dialog__footer,
  .toggle-card {
    flex-direction: column;
    align-items: stretch;
  }

  .field-row,
  .time-editor {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .field-control,
  .editor-button,
  .dialog-button,
  .device-dialog__close,
  .time-chip,
  .switch__track,
  .switch__thumb {
    transition: none;
  }
}
</style>
