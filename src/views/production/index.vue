<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import DeviceDialog from './components/DeviceDialog.vue'
import EmptyState from './components/EmptyState.vue'
import HarvestDialog from './components/HarvestDialog.vue'
import PlanDialog from './components/PlanDialog.vue'

const loading = ref(true)
const refreshLoading = ref(false)
const notice = ref('')
const resourceId = ref(resolveResourceId())
const dashboard = ref(createMockDashboard(resourceId.value))
const lastUpdatedAt = ref('')
const planDialogVisible = ref(false)
const planSubmitting = ref(false)
const planDialogMode = ref('create')
const currentPlan = ref(null)
const deviceDialogVisible = ref(false)
const deviceSubmitting = ref(false)
const currentDeviceConfig = ref(null)
const harvestDialogVisible = ref(false)
const harvestSubmitting = ref(false)
const currentHarvest = ref(null)

let noticeTimer = null

const summaryStats = computed(() => {
  const plans = dashboard.value.plans ?? []
  const harvests = dashboard.value.harvests ?? []
  const deviceConfig = dashboard.value.deviceConfig ?? {}
  const totalHarvest = harvests.reduce(
    (total, item) => total + Number(item.harvestQuantity ?? 0),
    0,
  )
  const runningPlans = plans.filter((item) => item.status === '进行中').length

  return [
    {
      label: '种植计划',
      value: `${plans.length} 项`,
      detail: `${runningPlans} 项进行中`,
    },
    {
      label: '设备节奏',
      value: `${deviceConfig.timesPerDay ?? 0} 次/日`,
      detail: `单次 ${deviceConfig.durationMinutes ?? 0} 分钟`,
    },
    {
      label: '湿度目标',
      value: `${deviceConfig.targetHumidity ?? '--'}%`,
      detail: deviceConfig.sprinklerEnabled ? '喷水器已启用' : '喷水器未启用',
    },
    {
      label: '累计收获',
      value: `${totalHarvest} 斤`,
      detail: `${harvests.length} 条记录`,
    },
  ]
})

const environmentMetrics = computed(() => {
  const environment = dashboard.value.environment ?? {}

  return [
    {
      label: '温度',
      value: `${formatValue(environment.temperature)}℃`,
      note: '棚内空气温度',
    },
    {
      label: '湿度',
      value: `${formatValue(environment.humidity)}%`,
      note: '相对湿度',
    },
    {
      label: '光照',
      value: `${formatValue(environment.light, 0)} lx`,
      note: '实时光照强度',
    },
    {
      label: '土壤湿度',
      value: `${formatValue(environment.soilHumidity)}%`,
      note: '根区含水率',
    },
  ]
})

const latestHarvest = computed(() => {
  const [firstHarvest] = dashboard.value.harvests ?? []

  return firstHarvest
    ? `${firstHarvest.productName} ${firstHarvest.harvestQuantity}${firstHarvest.unit}`
    : '暂无收获记录'
})

onMounted(() => {
  loadDashboard()
})

onBeforeUnmount(() => {
  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }
})

async function loadDashboard() {
  loading.value = true

  await sleep(420)

  dashboard.value = createMockDashboard(resourceId.value)
  lastUpdatedAt.value = formatDateTime(new Date())
  loading.value = false
}

async function refreshEnvironment() {
  refreshLoading.value = true

  await sleep(360)

  const environment = dashboard.value.environment ?? {}

  dashboard.value = {
    ...dashboard.value,
    environment: {
      ...environment,
      temperature: nudgeNumber(environment.temperature, 0.8, 1),
      humidity: nudgeNumber(environment.humidity, 3, 0),
      light: nudgeNumber(environment.light, 45, 0),
      soilHumidity: clamp(nudgeNumber(environment.soilHumidity, 4, 0), 30, 90),
    },
  }

  refreshLoading.value = false
  lastUpdatedAt.value = formatDateTime(new Date())
  showNotice('环境数据已刷新，当前为演示数据。')
}

function handlePlaceholderAction(label) {
  showNotice(`${label}弹窗会在下一步继续接入，首页入口已经预留。`)
}

function openCreatePlanDialog() {
  planDialogMode.value = 'create'
  currentPlan.value = null
  planDialogVisible.value = true
}

function openEditPlanDialog(plan) {
  planDialogMode.value = 'edit'
  currentPlan.value = { ...plan }
  planDialogVisible.value = true
}

function closePlanDialog() {
  if (planSubmitting.value) {
    return
  }

  planDialogVisible.value = false
}

async function handlePlanSave(payload) {
  planSubmitting.value = true

  await sleep(420)

  const plans = [...(dashboard.value.plans ?? [])]

  if (planDialogMode.value === 'edit' && payload.id) {
    dashboard.value = {
      ...dashboard.value,
      plans: plans.map((item) => (item.id === payload.id ? { ...item, ...payload } : item)),
    }
    showNotice('计划已更新，首页列表已同步。')
  } else {
    dashboard.value = {
      ...dashboard.value,
      plans: [
        {
          ...payload,
          id: Date.now(),
        },
        ...plans,
      ],
    }
    showNotice('计划已创建，后续可以继续接入真实提交接口。')
  }

  planSubmitting.value = false
  planDialogVisible.value = false
  lastUpdatedAt.value = formatDateTime(new Date())
}

function openDeviceDialog() {
  currentDeviceConfig.value = {
    ...(dashboard.value.deviceConfig ?? {}),
    startTimes: [...(dashboard.value.deviceConfig?.startTimes ?? [])],
  }
  deviceDialogVisible.value = true
}

function closeDeviceDialog() {
  if (deviceSubmitting.value) {
    return
  }

  deviceDialogVisible.value = false
}

async function handleDeviceSave(payload) {
  deviceSubmitting.value = true

  await sleep(420)

  dashboard.value = {
    ...dashboard.value,
    deviceConfig: {
      ...dashboard.value.deviceConfig,
      ...payload,
      linkageMode: payload.sprinklerEnabled ? '自动联动' : '手动待机',
      lastOperator: '生产管理员',
    },
  }

  deviceSubmitting.value = false
  deviceDialogVisible.value = false
  lastUpdatedAt.value = formatDateTime(new Date())
  showNotice('设备参数已更新，联动卡片已同步最新配置。')
}

function openHarvestDialog() {
  currentHarvest.value = null
  harvestDialogVisible.value = true
}

function closeHarvestDialog() {
  if (harvestSubmitting.value) {
    return
  }

  harvestDialogVisible.value = false
}

async function handleHarvestSave(payload) {
  harvestSubmitting.value = true

  await sleep(420)

  const nextHarvests = sortHarvests([
    {
      ...payload,
      id: Date.now(),
    },
    ...(dashboard.value.harvests ?? []),
  ])

  dashboard.value = {
    ...dashboard.value,
    harvests: nextHarvests,
  }

  harvestSubmitting.value = false
  harvestDialogVisible.value = false
  lastUpdatedAt.value = formatDateTime(new Date())
  showNotice('收获记录已新增，首页列表已按日期刷新。')
}

function showNotice(message) {
  notice.value = message

  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }

  noticeTimer = setTimeout(() => {
    notice.value = ''
  }, 2600)
}

function resolveResourceId() {
  if (typeof window === 'undefined') {
    return '101'
  }

  const pathnameMatch = window.location.pathname.match(/production\/([^/?#]+)/)

  if (pathnameMatch?.[1]) {
    return decodeURIComponent(pathnameMatch[1])
  }

  const hashMatch = window.location.hash.match(/production\/([^/?#]+)/)

  if (hashMatch?.[1]) {
    return decodeURIComponent(hashMatch[1])
  }

  const params = new URLSearchParams(window.location.search)

  return params.get('resourceId') || '101'
}

function createMockDashboard(id) {
  return {
    enabled: true,
    resourceName: `东区一号温室 · 资源 ${id}`,
    greenhouseName: '春季高值果蔬区',
    plans: [
      {
        id: 1,
        title: '4月番茄定植计划',
        planDate: '2026-04-20',
        planContent: '完成幼苗定植、补充基质水分，并复核滴灌通畅情况。',
        status: '进行中',
      },
      {
        id: 2,
        title: '草莓育苗补光排程',
        planDate: '2026-04-22',
        planContent: '晚间补光 2 小时，关注新叶卷曲和湿度变化。',
        status: '待执行',
      },
      {
        id: 3,
        title: '病虫巡检复盘',
        planDate: '2026-04-17',
        planContent: '记录叶片斑点、补拍样本照片，并同步本周处理建议。',
        status: '已完成',
      },
    ],
    deviceConfig: {
      timesPerDay: 3,
      durationMinutes: 10,
      startTimes: ['08:00', '14:00', '19:30'],
      targetHumidity: 70,
      sprinklerEnabled: true,
      linkageMode: '自动联动',
      lastOperator: '生产管理员',
    },
    environment: {
      temperature: 26.4,
      humidity: 65,
      light: 326,
      soilHumidity: 52,
      stability: '参数稳定，适合继续维持当前灌溉节奏。',
    },
    harvests: [
      {
        id: 1,
        productName: '樱桃番茄',
        category: '果蔬',
        harvestQuantity: 80,
        unit: '斤',
        harvestDate: '2026-04-16',
        remark: '第一批果实成熟度高，适合分级装箱。',
      },
      {
        id: 2,
        productName: '水果黄瓜',
        category: '果蔬',
        harvestQuantity: 40,
        unit: '斤',
        harvestDate: '2026-04-14',
        remark: '表皮完整度好，适合供应到店。',
      },
      {
        id: 3,
        productName: '奶油生菜',
        category: '叶菜',
        harvestQuantity: 28,
        unit: '斤',
        harvestDate: '2026-04-12',
        remark: '建议下一批缩短采后预冷时间。',
      },
    ],
  }
}

function formatDate(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

function formatDateTime(date) {
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatValue(value, digits = 1) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  const nextValue = Number(value)

  if (Number.isNaN(nextValue)) {
    return value
  }

  return nextValue.toFixed(digits).replace(/\.0$/, '')
}

function planTone(status) {
  if (status === '已完成') {
    return 'success'
  }

  if (status === '进行中') {
    return 'warning'
  }

  return 'neutral'
}

function nudgeNumber(value, range, digits) {
  const current = Number(value ?? 0)
  const nextValue = current + (Math.random() * 2 - 1) * range

  return Number(nextValue.toFixed(digits))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

function sortHarvests(list) {
  return [...list].sort((left, right) => {
    const leftTime = new Date(`${left.harvestDate}T00:00:00`).getTime()
    const rightTime = new Date(`${right.harvestDate}T00:00:00`).getTime()

    if (leftTime !== rightTime) {
      return rightTime - leftTime
    }

    return Number(right.id ?? 0) - Number(left.id ?? 0)
  })
}
</script>

<template>
  <section class="production-page">
    <div class="production-page__glow production-page__glow--left" />
    <div class="production-page__glow production-page__glow--right" />

    <div class="production-shell">
      <header class="hero">
        <div class="hero__copy">
          <p class="hero__eyebrow">SMART FARMING MVP</p>
          <h1>智慧生产</h1>
          <p class="hero__description">
            围绕种植计划、设备联动、环境监测和收获管理，先把首页总览做好，后续页面可以在这个骨架上继续展开。
          </p>

          <div class="hero__chips">
            <span class="hero-chip">资源编号 {{ resourceId }}</span>
            <span class="hero-chip hero-chip--soft">{{ dashboard.resourceName }}</span>
            <span class="hero-chip hero-chip--soft">最后更新 {{ lastUpdatedAt || '--' }}</span>
          </div>
        </div>

        <div class="hero__panel">
          <p class="hero__panel-label">当前生产单元</p>
          <h2>{{ dashboard.greenhouseName }}</h2>
          <p class="hero__panel-text">
            保留四个核心业务入口，避免复杂图表和多层级导航，符合文档里的 MVP 交付方式。
          </p>

          <div class="hero__panel-actions">
            <button class="action-button action-button--primary" type="button" @click="loadDashboard">
              重新加载
            </button>
            <button
              class="action-button action-button--ghost"
              type="button"
              @click="handlePlaceholderAction('总体配置')"
            >
              查看说明
            </button>
          </div>
        </div>
      </header>

      <p v-if="notice" class="notice-banner" aria-live="polite">
        {{ notice }}
      </p>

      <section v-if="loading" class="dashboard-grid dashboard-grid--loading">
        <article v-for="card in 4" :key="card" class="module-card skeleton-card">
          <div class="skeleton skeleton--title" />
          <div class="skeleton skeleton--line" />
          <div class="skeleton skeleton--line skeleton--line-short" />
          <div class="skeleton skeleton--list" />
          <div class="skeleton skeleton--list" />
        </article>
      </section>

      <EmptyState v-else-if="dashboard.enabled === false" @retry="loadDashboard" />

      <template v-else>
        <section class="summary-grid">
          <article v-for="item in summaryStats" :key="item.label" class="summary-card">
            <p class="summary-card__label">{{ item.label }}</p>
            <strong class="summary-card__value">{{ item.value }}</strong>
            <p class="summary-card__detail">{{ item.detail }}</p>
          </article>
        </section>

        <section class="dashboard-grid">
          <article class="module-card">
            <header class="module-card__header">
              <div>
                <p class="module-card__eyebrow">Plan Board</p>
                <h3>种植计划</h3>
              </div>
              <button
                class="action-button action-button--small action-button--primary"
                type="button"
                @click="openCreatePlanDialog"
              >
                + 新建计划
              </button>
            </header>

            <ul class="plan-list">
              <li v-for="item in dashboard.plans" :key="item.id" class="plan-item">
                <div class="plan-item__head">
                  <strong>{{ item.title }}</strong>
                  <div class="plan-item__actions">
                    <span :class="['status-tag', `status-tag--${planTone(item.status)}`]">
                      {{ item.status }}
                    </span>
                    <button
                      class="mini-action"
                      type="button"
                      @click="openEditPlanDialog(item)"
                    >
                      编辑
                    </button>
                  </div>
                </div>
                <p>{{ item.planContent }}</p>
                <div class="meta-row">
                  <span>计划日期 {{ formatDate(item.planDate) }}</span>
                </div>
              </li>
            </ul>
          </article>

          <article class="module-card">
            <header class="module-card__header">
              <div>
                <p class="module-card__eyebrow">Device Sync</p>
                <h3>设备联动</h3>
              </div>
              <button
                class="action-button action-button--small action-button--ghost"
                type="button"
                @click="openDeviceDialog"
              >
                编辑参数
              </button>
            </header>

            <div class="device-overview">
              <div class="device-overview__stats">
                <div class="device-stat">
                  <span>每日次数</span>
                  <strong>{{ dashboard.deviceConfig.timesPerDay }} 次</strong>
                </div>
                <div class="device-stat">
                  <span>单次时长</span>
                  <strong>{{ dashboard.deviceConfig.durationMinutes }} 分钟</strong>
                </div>
                <div class="device-stat">
                  <span>目标湿度</span>
                  <strong>{{ dashboard.deviceConfig.targetHumidity }}%</strong>
                </div>
                <div class="device-stat">
                  <span>联动模式</span>
                  <strong>{{ dashboard.deviceConfig.linkageMode }}</strong>
                </div>
              </div>

              <div class="device-overview__footer">
                <div>
                  <p class="module-note">启动时间</p>
                  <div class="time-chips">
                    <span
                      v-for="time in dashboard.deviceConfig.startTimes"
                      :key="time"
                      class="time-chip"
                    >
                      {{ time }}
                    </span>
                  </div>
                </div>

                <div class="device-flag">
                  <span class="device-flag__dot" />
                  <span>
                    {{
                      dashboard.deviceConfig.sprinklerEnabled
                        ? '喷水器已启用'
                        : '喷水器未启用'
                    }}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article class="module-card">
            <header class="module-card__header">
              <div>
                <p class="module-card__eyebrow">Environment</p>
                <h3>环境监测</h3>
              </div>
              <button
                class="action-button action-button--small action-button--ghost"
                type="button"
                :disabled="refreshLoading"
                @click="refreshEnvironment"
              >
                {{ refreshLoading ? '刷新中...' : '刷新数据' }}
              </button>
            </header>

            <div class="metric-grid">
              <article v-for="item in environmentMetrics" :key="item.label" class="metric-card">
                <p class="metric-card__label">{{ item.label }}</p>
                <strong class="metric-card__value">{{ item.value }}</strong>
                <p class="metric-card__note">{{ item.note }}</p>
              </article>
            </div>

            <p class="module-note module-note--highlight">
              {{ dashboard.environment.stability }}
            </p>
          </article>

          <article class="module-card">
            <header class="module-card__header">
              <div>
                <p class="module-card__eyebrow">Harvest Log</p>
                <h3>收获管理</h3>
              </div>
              <button
                class="action-button action-button--small action-button--primary"
                type="button"
                @click="openHarvestDialog"
              >
                + 新增收获
              </button>
            </header>

            <div class="harvest-highlight">
              <p class="module-note">最近一次入库</p>
              <strong>{{ latestHarvest }}</strong>
            </div>

            <ul class="harvest-list">
              <li v-for="item in dashboard.harvests" :key="item.id" class="harvest-item">
                <div>
                  <strong>{{ item.productName }}</strong>
                  <p>{{ item.category }} · {{ item.remark }}</p>
                </div>
                <div class="harvest-item__meta">
                  <strong>{{ item.harvestQuantity }}{{ item.unit }}</strong>
                  <span>{{ formatDate(item.harvestDate) }}</span>
                </div>
              </li>
            </ul>
          </article>
        </section>
      </template>
    </div>

    <PlanDialog
      v-model="planDialogVisible"
      :mode="planDialogMode"
      :plan="currentPlan"
      :submitting="planSubmitting"
      @update:model-value="closePlanDialog"
      @save="handlePlanSave"
    />

    <DeviceDialog
      v-model="deviceDialogVisible"
      :config="currentDeviceConfig"
      :submitting="deviceSubmitting"
      @update:model-value="closeDeviceDialog"
      @save="handleDeviceSave"
    />

    <HarvestDialog
      v-model="harvestDialogVisible"
      :record="currentHarvest"
      :submitting="harvestSubmitting"
      @update:model-value="closeHarvestDialog"
      @save="handleHarvestSave"
    />
  </section>
</template>

<style scoped>
.production-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 20%, rgba(127, 163, 104, 0.22), transparent 28%),
    radial-gradient(circle at 88% 16%, rgba(229, 188, 118, 0.24), transparent 26%),
    linear-gradient(180deg, #f4f1e8 0%, #edf3ea 38%, #e7efe6 100%);
  color: #203126;
}

.production-page__glow {
  position: absolute;
  width: 22rem;
  height: 22rem;
  border-radius: 50%;
  filter: blur(18px);
  opacity: 0.5;
}

.production-page__glow--left {
  top: -9rem;
  left: -7rem;
  background: rgba(131, 170, 110, 0.28);
}

.production-page__glow--right {
  right: -8rem;
  bottom: -8rem;
  background: rgba(209, 171, 111, 0.24);
}

.production-shell {
  position: relative;
  z-index: 1;
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 40px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
  gap: 24px;
  align-items: stretch;
}

.hero__copy,
.hero__panel,
.summary-card,
.module-card {
  border: 1px solid rgba(112, 137, 95, 0.14);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 24px 60px rgba(67, 85, 57, 0.08);
  backdrop-filter: blur(16px);
}

.hero__copy {
  padding: 34px;
}

.hero__eyebrow,
.module-card__eyebrow,
.hero__panel-label,
.summary-card__label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6e816a;
}

.hero h1 {
  margin-top: 12px;
  font-size: clamp(36px, 6vw, 54px);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #1d3024;
}

.hero__description {
  max-width: 44rem;
  margin-top: 18px;
  font-size: 16px;
  line-height: 1.8;
  color: #526456;
}

.hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  background: #294230;
  color: #f3f7ee;
  font-size: 14px;
  font-weight: 600;
}

.hero-chip--soft {
  background: rgba(235, 243, 232, 0.92);
  color: #33503b;
}

.hero__panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 30px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 250, 246, 0.88)),
    linear-gradient(135deg, rgba(179, 201, 157, 0.2), rgba(255, 255, 255, 0));
}

.hero__panel h2 {
  margin-top: 10px;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 700;
  color: #213424;
}

.hero__panel-text {
  margin-top: 14px;
  font-size: 15px;
  line-height: 1.75;
  color: #5b6a5e;
}

.hero__panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

.notice-banner {
  margin-top: 18px;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(41, 66, 48, 0.9);
  color: #f4f8ef;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 18px 40px rgba(41, 66, 48, 0.18);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-top: 24px;
}

.summary-card {
  padding: 22px 24px;
}

.summary-card__value {
  display: block;
  margin-top: 14px;
  font-size: 28px;
  line-height: 1.1;
  font-weight: 800;
  color: #25382a;
}

.summary-card__detail {
  margin-top: 10px;
  font-size: 14px;
  color: #627165;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.module-card {
  padding: 24px;
}

.module-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.module-card__header h3 {
  margin-top: 8px;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 700;
  color: #25362a;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.action-button:focus-visible {
  outline: 3px solid rgba(129, 161, 110, 0.28);
  outline-offset: 2px;
}

.action-button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.action-button--primary {
  background: #294230;
  color: #f4f7f1;
  box-shadow: 0 14px 28px rgba(41, 66, 48, 0.16);
}

.action-button--ghost {
  border-color: rgba(57, 79, 63, 0.12);
  background: rgba(244, 248, 241, 0.86);
  color: #2d4634;
}

.action-button--small {
  min-height: 40px;
  padding: 0 14px;
}

.plan-list,
.harvest-list {
  display: grid;
  gap: 14px;
  margin-top: 22px;
  padding: 0;
  list-style: none;
}

.plan-item,
.harvest-item,
.metric-card,
.device-stat,
.harvest-highlight {
  border-radius: 22px;
  background: #f8fbf5;
}

.plan-item {
  padding: 18px;
  border: 1px solid rgba(103, 134, 88, 0.1);
}

.plan-item__head,
.harvest-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.plan-item__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.plan-item__head strong,
.harvest-item strong {
  font-size: 16px;
  line-height: 1.45;
  font-weight: 700;
  color: #223326;
}

.plan-item p,
.harvest-item p,
.metric-card__note,
.module-note {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: #617064;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  font-size: 13px;
  color: #708172;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-tag--success {
  background: rgba(94, 146, 105, 0.14);
  color: #3f7047;
}

.status-tag--warning {
  background: rgba(208, 159, 77, 0.16);
  color: #94611f;
}

.status-tag--neutral {
  background: rgba(112, 129, 106, 0.12);
  color: #5a6b5a;
}

.mini-action {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(57, 79, 63, 0.12);
  border-radius: 999px;
  background: rgba(244, 248, 241, 0.92);
  color: #2d4634;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

.mini-action:hover {
  transform: translateY(-1px);
  border-color: rgba(57, 79, 63, 0.2);
}

.mini-action:focus-visible {
  outline: 3px solid rgba(129, 161, 110, 0.24);
  outline-offset: 2px;
}

.device-overview {
  margin-top: 22px;
}

.device-overview__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.device-stat {
  padding: 18px;
  border: 1px solid rgba(103, 134, 88, 0.08);
}

.device-stat span,
.metric-card__label {
  font-size: 13px;
  color: #6b7e6d;
}

.device-stat strong,
.metric-card__value {
  display: block;
  margin-top: 12px;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 800;
  color: #233527;
}

.device-overview__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(240, 246, 235, 0.96), rgba(248, 250, 246, 0.96));
}

.module-note {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.module-note--highlight {
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(233, 241, 228, 0.9);
  text-transform: none;
  letter-spacing: normal;
}

.time-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.time-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: white;
  color: #2b4332;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid rgba(109, 136, 96, 0.12);
}

.device-flag {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: #32503a;
  font-size: 14px;
  font-weight: 700;
}

.device-flag__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6c9956;
  box-shadow: 0 0 0 5px rgba(108, 153, 86, 0.15);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.metric-card {
  padding: 18px;
  border: 1px solid rgba(103, 134, 88, 0.08);
}

.harvest-highlight {
  margin-top: 22px;
  padding: 18px;
  border: 1px solid rgba(103, 134, 88, 0.08);
}

.harvest-highlight strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  line-height: 1.3;
  font-weight: 800;
  color: #233628;
}

.harvest-item {
  padding: 16px 18px;
  border: 1px solid rgba(103, 134, 88, 0.08);
}

.harvest-item__meta {
  display: grid;
  justify-items: end;
  gap: 6px;
  text-align: right;
}

.harvest-item__meta span {
  font-size: 13px;
  color: #768776;
}

.skeleton-card {
  min-height: 286px;
}

.skeleton {
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(232, 238, 228, 0.6), rgba(245, 248, 242, 0.95), rgba(232, 238, 228, 0.6));
  background-size: 220% 100%;
  animation: skeleton-loading 1.2s ease-in-out infinite;
}

.skeleton--title {
  width: 36%;
  height: 18px;
}

.skeleton--line {
  width: 72%;
  height: 36px;
  margin-top: 22px;
}

.skeleton--line-short {
  width: 48%;
  height: 14px;
  margin-top: 12px;
}

.skeleton--list {
  width: 100%;
  height: 82px;
  margin-top: 18px;
  border-radius: 22px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0 50%;
  }
}

@media (max-width: 960px) {
  .hero,
  .dashboard-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .production-shell {
    width: min(100% - 24px, 1180px);
    padding-top: 20px;
  }

  .hero__copy,
  .hero__panel,
  .module-card,
  .summary-card {
    border-radius: 24px;
  }
}

@media (max-width: 720px) {
  .hero__copy,
  .hero__panel,
  .module-card,
  .summary-card {
    padding: 22px;
  }

  .module-card__header,
  .device-overview__footer,
  .harvest-item,
  .plan-item__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .device-overview__stats,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .harvest-item__meta {
    justify-items: start;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .action-button,
  .skeleton {
    transition: none;
    animation: none;
  }
}
</style>
