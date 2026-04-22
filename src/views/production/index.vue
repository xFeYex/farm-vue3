<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  createHarvest,
  createPlan,
  getDashboard,
  getEnvironment,
  getHarvestList,
  getPlanList,
  updateOrchestration,
} from '@/api/production'
import DeviceDialog from './components/DeviceDialog.vue'
import EmptyState from './components/EmptyState.vue'
import HarvestDialog from './components/HarvestDialog.vue'
import PlanDialog from './components/PlanDialog.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const refreshLoading = ref(false)
const notice = ref('')
const dashboard = ref(createInitialDashboard('101'))
const lastUpdatedAt = ref('')
const resourceInput = ref('101')
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
const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

let noticeTimer = null

const resourceId = computed(() => {
  const routeId = route.params.resourceId ?? route.query.resourceId

  return String(routeId || '101')
})

const summaryStats = computed(() => {
  const plans = dashboard.value.plans ?? []
  const harvests = dashboard.value.harvests ?? []
  const deviceConfig = dashboard.value.deviceConfig ?? {}
  const totalHarvest = harvests.reduce(
    (total, item) => total + Number(item.harvestQuantity ?? 0),
    0,
  )
  const runningPlans = plans.filter((item) => item.status === '进行中').length
  const humidityValue =
    deviceConfig.targetHumidity === null || deviceConfig.targetHumidity === undefined
      ? '--'
      : `${deviceConfig.targetHumidity}%`

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
      value: humidityValue,
      detail: deviceConfig.sprinklerEnabled ? '喷水器已启用' : '喷水器未启用',
    },
    {
      label: '累计收获',
      value: `${formatValue(totalHarvest, 1)} 斤`,
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
    {
      label: '空气质量',
      value: `${formatValue(environment.airQuality)} 分`,
      note: '环境综合评分',
    },
  ]
})

const environmentSummaryText = computed(() => {
  const environment = dashboard.value.environment ?? {}

  if (environment.message) {
    return environment.message
  }

  if (environment.snapshotTime) {
    return `最近快照 ${formatDateTime(environment.snapshotTime)}`
  }

  return '当前还没有环境快照数据'
})

const latestHarvest = computed(() => {
  const [firstHarvest] = sortHarvests(dashboard.value.harvests ?? [])

  return firstHarvest
    ? `${firstHarvest.productName} ${formatValue(firstHarvest.harvestQuantity, 1)}${firstHarvest.unit}`
    : '暂无收获记录'
})

watch(
  resourceId,
  async (nextResourceId) => {
    resourceInput.value = String(nextResourceId)
    dashboard.value = createInitialDashboard(nextResourceId)
    await loadDashboard()
  },
  { immediate: true },
)

function createInitialDashboardState(id) {
  return {
    available: true,
    resourceId: String(id),
    message: '',
    resourceName: `资源 ${id}`,
    greenhouseName: `智慧生产资源 ${id}`,
    plans: [],
    harvests: [],
    planTotal: 0,
    harvestTotal: 0,
    deviceConfig: normalizeDeviceConfig(createDefaultDeviceConfig()),
    environment: createEmptyEnvironment(),
    camera: null,
  }
}

function toStartTimesArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  if (typeof value !== 'string' || !value.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

function normalizeOrchestrationResult(orchestration) {
  if (!orchestration) {
    return normalizeDeviceConfig(createDefaultDeviceConfig())
  }

  const nextTargetHumidity =
    orchestration.targetHumidity === null || orchestration.targetHumidity === undefined
      ? null
      : Number(orchestration.targetHumidity)

  return normalizeDeviceConfig({
    ...createDefaultDeviceConfig(),
    name: orchestration.name || '基础灌溉编排',
    timesPerDay: Number(orchestration.timesPerDay ?? 0),
    durationMinutes: Number(orchestration.durationMinutes ?? 0),
    startTimes: toStartTimesArray(orchestration.startTimes ?? orchestration.startTimesJson),
    sprinklerEnabled: orchestration.sprinklerEnabled ?? false,
    targetHumidity: Number.isFinite(nextTargetHumidity) ? nextTargetHumidity : null,
    status: orchestration.status || 'INACTIVE',
    updatedAt: orchestration.updatedAt || '',
  })
}

async function loadPlanRecords() {
  const data = await getPlanList(resourceId.value, {
    userId: getCurrentUserId(),
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  dashboard.value = {
    ...dashboard.value,
    plans: Array.isArray(data?.list) ? data.list : [],
    planTotal: Number(data?.total ?? 0),
  }

  return data
}

async function loadHarvestRecords() {
  const data = await getHarvestList(resourceId.value, {
    userId: getCurrentUserId(),
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  dashboard.value = {
    ...dashboard.value,
    harvests: sortHarvests(Array.isArray(data?.list) ? data.list : []),
    harvestTotal: Number(data?.total ?? 0),
  }

  return data
}

async function loadProductionPage() {
  loading.value = true

  try {
    const data = await getDashboard(resourceId.value, getCurrentUserId())
    const nextResourceId = String(data?.resourceId ?? resourceId.value)

    if (data?.available === false) {
      dashboard.value = {
        ...createInitialDashboardState(nextResourceId),
        available: false,
        resourceId: nextResourceId,
        message: data?.message || '',
        greenhouseName: data?.orchestration?.name || `智慧生产资源 ${nextResourceId}`,
        deviceConfig: normalizeOrchestrationResult(data?.orchestration),
        camera: data?.camera ?? null,
      }
      lastUpdatedAt.value = resolveLastUpdatedTime(dashboard.value)
      return
    }

    const [environmentData, planPage, harvestPage] = await Promise.all([
      getEnvironment(nextResourceId, getCurrentUserId()),
      getPlanList(nextResourceId, {
        userId: getCurrentUserId(),
        page: DEFAULT_PAGE,
        pageSize: DEFAULT_PAGE_SIZE,
      }),
      getHarvestList(nextResourceId, {
        userId: getCurrentUserId(),
        page: DEFAULT_PAGE,
        pageSize: DEFAULT_PAGE_SIZE,
      }),
    ])

    dashboard.value = {
      ...createInitialDashboardState(nextResourceId),
      available: true,
      resourceId: nextResourceId,
      message: data?.message || '',
      greenhouseName: data?.orchestration?.name || `智慧生产资源 ${nextResourceId}`,
      plans: Array.isArray(planPage?.list) ? planPage.list : [],
      planTotal: Number(planPage?.total ?? 0),
      harvests: sortHarvests(Array.isArray(harvestPage?.list) ? harvestPage.list : []),
      harvestTotal: Number(harvestPage?.total ?? 0),
      deviceConfig: normalizeOrchestrationResult(data?.orchestration),
      environment: mapEnvironmentToViewModel(environmentData),
      camera: data?.camera ?? null,
    }

    lastUpdatedAt.value = resolveLastUpdatedTime(dashboard.value)
  } catch (error) {
    dashboard.value = {
      ...createInitialDashboardState(resourceId.value),
      available: false,
      message: error.message || '智慧生产首页加载失败',
    }
    handleApiError(error, '智慧生产首页加载失败')
  } finally {
    loading.value = false
  }
}

async function refreshEnvironmentData() {
  refreshLoading.value = true

  try {
    const data = await getEnvironment(resourceId.value, getCurrentUserId())

    dashboard.value = {
      ...dashboard.value,
      environment: mapEnvironmentToViewModel(data),
    }

    lastUpdatedAt.value = resolveLastUpdatedTime(dashboard.value)
    showNotice(data?.message || '环境数据已刷新')
  } catch (error) {
    handleApiError(error, '环境数据刷新失败')
  } finally {
    refreshLoading.value = false
  }
}

async function savePlanRecord(payload) {
  planSubmitting.value = true

  try {
    const result = await createPlan(resourceId.value, {
      userId: getCurrentUserId(),
      title: payload.title,
      planContent: payload.planContent,
      planDate: payload.planDate,
    })

    await loadPlanRecords()
    planDialogVisible.value = false
    currentPlan.value = null
    lastUpdatedAt.value = formatDateTime(result.createdAt || new Date())
    showNotice('种植计划已创建')
  } catch (error) {
    handleApiError(error, '新增种植计划失败')
  } finally {
    planSubmitting.value = false
  }
}

async function saveDeviceRecord(payload) {
  deviceSubmitting.value = true

  try {
    const result = await updateOrchestration(resourceId.value, {
      userId: getCurrentUserId(),
      ...payload,
    })

    dashboard.value = {
      ...dashboard.value,
      deviceConfig: normalizeOrchestrationResult({
        ...dashboard.value.deviceConfig,
        name: dashboard.value.deviceConfig?.name || '基础灌溉编排',
        ...result,
      }),
    }

    deviceDialogVisible.value = false
    lastUpdatedAt.value = formatDateTime(result.updatedAt || new Date())
    showNotice('设备参数已更新')
  } catch (error) {
    handleApiError(error, '设备参数更新失败')
  } finally {
    deviceSubmitting.value = false
  }
}

async function saveHarvestRecord(payload) {
  harvestSubmitting.value = true

  try {
    const result = await createHarvest(resourceId.value, {
      userId: getCurrentUserId(),
      productName: payload.productName,
      category: payload.category,
      harvestQuantity: payload.harvestQuantity,
      unit: payload.unit,
      harvestDate: payload.harvestDate,
      remark: payload.remark,
    })

    await loadHarvestRecords()
    harvestDialogVisible.value = false
    currentHarvest.value = null
    lastUpdatedAt.value = formatDateTime(result.createdAt || new Date())
    showNotice('收获记录已新增')
  } catch (error) {
    handleApiError(error, '新增收获记录失败')
  } finally {
    harvestSubmitting.value = false
  }
}

onBeforeUnmount(() => {
  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }
})

async function loadDashboard() {
  return loadProductionPage()
  loading.value = true

  try {
    const data = await getDashboard(resourceId.value, getCurrentUserId())
    const cachedPlans = getStoredResourceList(resourceId.value, 'plans')
    const cachedHarvests = sortHarvests(getStoredResourceList(resourceId.value, 'harvests'))
    const cachedDeviceConfig = getStoredDeviceConfig(resourceId.value)

    dashboard.value = {
      available: Boolean(data?.available),
      resourceId: String(data?.resourceId ?? resourceId.value),
      message: data?.message || '',
      resourceName: `资源 ${data?.resourceId ?? resourceId.value}`,
      greenhouseName: data?.orchestration?.name || `智慧生产资源 ${data?.resourceId ?? resourceId.value}`,
      plans: cachedPlans,
      harvests: cachedHarvests,
      deviceConfig: normalizeDeviceConfig({
        ...mapOrchestrationToDeviceConfig(data?.orchestration),
        ...cachedDeviceConfig,
      }),
      environment: mapEnvironmentToViewModel(data?.environment),
      camera: data?.camera ?? null,
    }

    lastUpdatedAt.value = resolveLastUpdatedTime(dashboard.value)
  } catch (error) {
    dashboard.value = {
      ...createInitialDashboard(resourceId.value),
      available: false,
      message: error.message || '智慧生产主页加载失败',
    }
    handleApiError(error, '智慧生产主页加载失败')
  } finally {
    loading.value = false
  }
}

async function refreshEnvironment() {
  return refreshEnvironmentData()
  refreshLoading.value = true

  try {
    const data = await getEnvironment(resourceId.value, getCurrentUserId())

    dashboard.value = {
      ...dashboard.value,
      environment: mapEnvironmentToViewModel(data),
    }

    lastUpdatedAt.value = resolveLastUpdatedTime(dashboard.value)
    showNotice(data?.message || '环境数据已刷新。')
  } catch (error) {
    handleApiError(error, '环境数据刷新失败')
  } finally {
    refreshLoading.value = false
  }
}

async function applyResourceId() {
  const nextResourceId = String(resourceInput.value || '').trim()

  if (!nextResourceId) {
    handleApiError(new Error('请输入资源编号'), '请输入资源编号')
    return
  }

  if (nextResourceId === resourceId.value) {
    await loadDashboard()
    return
  }

  router.push({
    name: 'Production',
    params: {
      resourceId: nextResourceId,
    },
  })
}

function handlePlaceholderAction(label) {
  showNotice(`${label}入口已保留，后续可以继续扩展。`)
}

function openCreatePlanDialog() {
  planDialogMode.value = 'create'
  currentPlan.value = null
  planDialogVisible.value = true
}

function openEditPlanDialog() {
  ElMessage.info('当前后端暂未开放计划编辑接口，仅支持新增计划。')
  showNotice('当前后端暂未开放计划编辑接口，仅支持新增计划。')
}

function closePlanDialog() {
  if (planSubmitting.value) {
    return
  }

  planDialogVisible.value = false
}

async function handlePlanSave(payload) {
  return savePlanRecord(payload)
  planSubmitting.value = true

  try {
    const result = await createPlan(resourceId.value, {
      userId: getCurrentUserId(),
      title: payload.title,
      planContent: payload.planContent,
      planDate: payload.planDate,
    })

    const nextPlan = {
      id: result.planId ?? Date.now(),
      title: result.title,
      planContent: result.planContent,
      planDate: result.planDate,
      status: payload.status || mapPlanStatus(result.status),
      backendStatus: result.status,
      createdAt: result.createdAt,
    }

    const nextPlans = [nextPlan, ...(dashboard.value.plans ?? [])]

    dashboard.value = {
      ...dashboard.value,
      plans: nextPlans,
    }

    setStoredResourceList(resourceId.value, 'plans', nextPlans)
    planDialogVisible.value = false
    lastUpdatedAt.value = formatDateTime(result.createdAt || new Date())
    showNotice('种植计划已提交，当前列表使用本地缓存补齐展示。')
  } catch (error) {
    handleApiError(error, '新增种植计划失败')
  } finally {
    planSubmitting.value = false
  }
}

function openDeviceDialog() {
  currentDeviceConfig.value = {
    ...(dashboard.value.deviceConfig ?? createDefaultDeviceConfig()),
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
  return saveDeviceRecord(payload)
  deviceSubmitting.value = true

  try {
    const result = await updateOrchestration(resourceId.value, {
      userId: getCurrentUserId(),
      ...payload,
    })

    const nextDeviceConfig = normalizeDeviceConfig({
      ...dashboard.value.deviceConfig,
      name: dashboard.value.deviceConfig?.name || '基础灌溉编排',
      ...result,
      linkageMode: mapDeviceLinkageMode(result.status, result.sprinklerEnabled),
      updatedAt: result.updatedAt,
    })

    dashboard.value = {
      ...dashboard.value,
      deviceConfig: nextDeviceConfig,
    }

    setStoredDeviceConfig(resourceId.value, nextDeviceConfig)
    deviceDialogVisible.value = false
    lastUpdatedAt.value = formatDateTime(result.updatedAt || new Date())
    showNotice('设备参数已更新，联动卡片已同步最新配置。')
  } catch (error) {
    handleApiError(error, '设备参数更新失败')
  } finally {
    deviceSubmitting.value = false
  }
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
  return saveHarvestRecord(payload)
  harvestSubmitting.value = true

  try {
    const result = await createHarvest(resourceId.value, {
      userId: getCurrentUserId(),
      productName: payload.productName,
      category: payload.category,
      harvestQuantity: payload.harvestQuantity,
      unit: payload.unit,
      harvestDate: payload.harvestDate,
      remark: payload.remark,
    })

    const nextHarvests = sortHarvests([
      {
        id: result.harvestId ?? Date.now(),
        productName: result.productName,
        category: result.category,
        harvestQuantity: result.harvestQuantity,
        unit: result.unit,
        harvestDate: result.harvestDate,
        remark: result.remark,
        status: result.status,
        createdAt: result.createdAt,
      },
      ...(dashboard.value.harvests ?? []),
    ])

    dashboard.value = {
      ...dashboard.value,
      harvests: nextHarvests,
    }

    setStoredResourceList(resourceId.value, 'harvests', nextHarvests)
    harvestDialogVisible.value = false
    lastUpdatedAt.value = formatDateTime(result.createdAt || new Date())
    showNotice('收获记录已新增，当前列表使用本地缓存补齐展示。')
  } catch (error) {
    handleApiError(error, '新增收获记录失败')
  } finally {
    harvestSubmitting.value = false
  }
}

function showNotice(message) {
  notice.value = message

  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }

  noticeTimer = setTimeout(() => {
    notice.value = ''
  }, 3200)
}

function handleApiError(error, fallbackMessage) {
  const message = error?.message || fallbackMessage

  ElMessage.error(message)
  showNotice(message)
}

function createInitialDashboard(id) {
  return createInitialDashboardState(id)
  return {
    available: true,
    resourceId: String(id),
    message: '',
    resourceName: `资源 ${id}`,
    greenhouseName: `智慧生产资源 ${id}`,
    plans: getStoredResourceList(id, 'plans'),
    harvests: sortHarvests(getStoredResourceList(id, 'harvests')),
    deviceConfig: normalizeDeviceConfig({
      ...createDefaultDeviceConfig(),
      ...getStoredDeviceConfig(id),
    }),
    environment: createEmptyEnvironment(),
    camera: null,
  }
}

function createDefaultDeviceConfig() {
  return {
    name: '基础灌溉编排',
    timesPerDay: 0,
    durationMinutes: 0,
    startTimes: [],
    targetHumidity: null,
    sprinklerEnabled: false,
    linkageMode: '未配置',
    status: 'INACTIVE',
    updatedAt: '',
    lastOperator: '系统同步',
  }
}

function createEmptyEnvironment(message = '') {
  return {
    temperature: null,
    humidity: null,
    light: null,
    soilHumidity: null,
    airQuality: null,
    snapshotTime: null,
    message,
  }
}

function mapOrchestrationToDeviceConfig(orchestration) {
  if (!orchestration) {
    return createDefaultDeviceConfig()
  }

  return {
    name: orchestration.name || '基础灌溉编排',
    timesPerDay: Number(orchestration.timesPerDay ?? 0),
    durationMinutes: Number(orchestration.durationMinutes ?? 0),
    startTimes: parseStartTimes(orchestration.startTimesJson),
    linkageMode: mapDeviceLinkageMode(orchestration.status, null),
    status: orchestration.status || 'INACTIVE',
  }
}

function normalizeDeviceConfig(deviceConfig) {
  const nextConfig = {
    ...createDefaultDeviceConfig(),
    ...deviceConfig,
  }

  return {
    ...nextConfig,
    startTimes: Array.isArray(nextConfig.startTimes) ? [...nextConfig.startTimes] : [],
    linkageMode: mapDeviceLinkageMode(nextConfig.status, nextConfig.sprinklerEnabled),
  }
}

function mapEnvironmentToViewModel(environment) {
  if (!environment) {
    return createEmptyEnvironment('当前还没有环境快照数据')
  }

  const snapshotMissing = [
    environment.temperature,
    environment.humidity,
    environment.lightLux,
    environment.soilMoisture,
    environment.airQuality,
    environment.snapshotTime,
  ].every((item) => item === null || item === undefined)

  return {
    temperature: environment.temperature ?? null,
    humidity: environment.humidity ?? null,
    light: environment.lightLux ?? null,
    soilHumidity: environment.soilMoisture ?? null,
    airQuality: environment.airQuality ?? null,
    snapshotTime: environment.snapshotTime ?? null,
    message:
      environment.message ||
      (snapshotMissing ? '当前还没有环境快照数据' : ''),
  }
}

function mapDeviceLinkageMode(status, sprinklerEnabled) {
  if (sprinklerEnabled === false) {
    return '手动待机'
  }

  if (status === 'ACTIVE') {
    return '自动联动'
  }

  if (status) {
    return '待机配置'
  }

  return '未配置'
}

function mapPlanStatus(status) {
  if (status === 'ACTIVE') {
    return '进行中'
  }

  return '待执行'
}

function formatHarvestCategory(category) {
  const categoryMap = {
    VEGETABLE: '果蔬',
    LEAFY: '叶菜',
    HERB: '香草',
    ROOT: '根茎',
    OTHER: '其他',
  }

  return categoryMap[category] || category || '--'
}

function getCurrentUserId() {
  if (typeof window === 'undefined') {
    return 2001
  }

  const savedId = window.localStorage.getItem('farming_user_id')

  if (!savedId) {
    window.localStorage.setItem('farming_user_id', '2001')
    return 2001
  }

  const nextUserId = Number(savedId)

  if (Number.isFinite(nextUserId)) {
    return nextUserId
  }

  window.localStorage.setItem('farming_user_id', '2001')
  return 2001
}

function parseStartTimes(startTimesJson) {
  if (!startTimesJson) {
    return []
  }

  try {
    const parsed = JSON.parse(startTimesJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// 计划和收获列表接口当前还没开放，这里用 localStorage 暂存创建成功的数据，避免页面刷新后完全丢失。
function getStoredResourceList(id, type) {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(`production:${id}:${type}`)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setStoredResourceList(id, type, list) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(`production:${id}:${type}`, JSON.stringify(list))
}

function getStoredDeviceConfig(id) {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(`production:${id}:device-config`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setStoredDeviceConfig(id, config) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    `production:${id}:device-config`,
    JSON.stringify({
      timesPerDay: config.timesPerDay,
      durationMinutes: config.durationMinutes,
      startTimes: config.startTimes,
      targetHumidity: config.targetHumidity,
      sprinklerEnabled: config.sprinklerEnabled,
      status: config.status,
      updatedAt: config.updatedAt,
    }),
  )
}

function resolveLastUpdatedTime(currentDashboard) {
  return (
    formatDateTime(currentDashboard.environment?.snapshotTime) ||
    formatDateTime(currentDashboard.deviceConfig?.updatedAt) ||
    formatDateTime(new Date())
  )
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

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

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

  if (status === '进行中' || status === 'ACTIVE') {
    return 'warning'
  }

  return 'neutral'
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function sortHarvests(list) {
  return [...list].sort((left, right) => {
    const leftTime = new Date(`${left.harvestDate}T00:00:00`).getTime()
    const rightTime = new Date(`${right.harvestDate}T00:00:00`).getTime()

    if (leftTime !== rightTime) {
      return rightTime - leftTime
    }

    return Number(right.harvestId ?? right.id ?? 0) - Number(left.harvestId ?? left.id ?? 0)
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
            <div class="resource-search">
              <label class="resource-search__label" for="resource-id-input">资源编号</label>
              <div class="resource-search__controls">
                <input
                  id="resource-id-input"
                  v-model.trim="resourceInput"
                  class="resource-search__input"
                  type="text"
                  inputmode="numeric"
                  placeholder="请输入资源编号"
                  @keydown.enter.prevent="applyResourceId"
                />
                <button
                  class="resource-search__button"
                  type="button"
                  :disabled="loading"
                  @click="applyResourceId"
                >
                  {{ loading ? '加载中' : '切换' }}
                </button>
              </div>
            </div>
            <span class="hero-chip">当前资源 {{ resourceId }}</span>
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
              @click="refreshEnvironment"
            >
              刷新环境
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

      <EmptyState
        v-else-if="dashboard.available === false"
        :description="dashboard.message || '当前订阅已失效，智慧生产模块不可用。'"
        @retry="loadDashboard"
      />

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
              <li v-if="!dashboard.plans.length" class="empty-list-item">
                暂无种植计划
              </li>
              <li v-for="item in dashboard.plans" :key="item.planId" class="plan-item">
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
                  <strong>
                    {{
                      dashboard.deviceConfig.targetHumidity === null ||
                      dashboard.deviceConfig.targetHumidity === undefined
                        ? '--'
                        : `${dashboard.deviceConfig.targetHumidity}%`
                    }}
                  </strong>
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
                      v-if="!dashboard.deviceConfig.startTimes.length"
                      class="time-chip time-chip--empty"
                    >
                      暂无启动时间
                    </span>
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
              {{ environmentSummaryText }}
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
              <li v-if="!dashboard.harvests.length" class="empty-list-item">
                暂无收获记录
              </li>
              <li v-for="item in dashboard.harvests" :key="item.harvestId" class="harvest-item">
                <div>
                  <strong>{{ item.productName }}</strong>
                  <p>{{ formatHarvestCategory(item.category) }} · {{ item.remark || '暂无备注' }}</p>
                </div>
                <div class="harvest-item__meta">
                  <strong>{{ formatValue(item.harvestQuantity, 1) }}{{ item.unit }}</strong>
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

.resource-search {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 8px 10px 8px 14px;
  border-radius: 20px;
  background: rgba(41, 66, 48, 0.08);
  border: 1px solid rgba(41, 66, 48, 0.08);
}

.resource-search__label {
  font-size: 14px;
  font-weight: 700;
  color: #294230;
  white-space: nowrap;
}

.resource-search__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resource-search__input {
  width: 120px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(57, 79, 63, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #213226;
  font-size: 14px;
  font-weight: 700;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.resource-search__input:focus {
  outline: none;
  border-color: rgba(87, 125, 74, 0.48);
  box-shadow: 0 0 0 4px rgba(135, 168, 115, 0.14);
  background: white;
}

.resource-search__button {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #294230;
  color: #f3f7ee;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    box-shadow 180ms ease;
}

.resource-search__button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(41, 66, 48, 0.18);
}

.resource-search__button:disabled {
  opacity: 0.65;
  cursor: wait;
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

.empty-list-item {
  padding: 18px;
  border: 1px dashed rgba(103, 134, 88, 0.18);
  border-radius: 22px;
  background: rgba(248, 251, 245, 0.88);
  font-size: 14px;
  line-height: 1.75;
  color: #6b7d6d;
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
  display: none;
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

.time-chip--empty {
  color: #708172;
  font-weight: 600;
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

  .resource-search,
  .resource-search__controls {
    width: 100%;
  }

  .resource-search {
    flex-direction: column;
    align-items: stretch;
    border-radius: 18px;
  }

  .resource-search__input {
    width: 100%;
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
