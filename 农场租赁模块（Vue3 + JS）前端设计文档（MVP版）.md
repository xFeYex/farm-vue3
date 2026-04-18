# 农场租赁模块（Vue3 + JS）前端设计文档（MVP版）

> 基于你提供的《农场租赁》与《说明文档》整理输出
> 技术栈：**Vue3 + JavaScript + Element Plus（推荐） + Axios + Vue Router**
> 设计原则：**MVP、界面简洁、链路最短、能完成发布/查看/订阅/续订/退订即可**。农场租赁域作为系统入口域，主要负责资源发布与订阅生命周期管理。

------

# 一、项目目标

前端实现农场租赁模块的最小可用版本，覆盖两类用户：

1. 资源拥有者
   - 发布资源
   - 编辑资源
   - 下架资源
   - 查看我的发布
2. 租赁用户
   - 查看资源列表
   - 查看资源详情
   - 订阅资源
   - 续订资源
   - 退订资源
   - 查看我的订阅

模块只做租赁主链路，不做支付、审批、合同、后台管理、复杂通知。

------

# 二、前端目录结构（Vue3）

```bash
src/
├── api/
│   └── lease.js
├── views/
│   └── lease/
│       ├── plaza.vue                # 资源广场页
│       ├── detail.vue               # 资源详情页
│       ├── my-publish.vue           # 我的发布页
│       ├── resource-form.vue        # 发布/编辑资源页
│       ├── my-subscription.vue      # 我的订阅页
│       └── components/
│           ├── SubscribeDialog.vue
│           ├── RenewDialog.vue
│           ├── ResourceCard.vue
│           └── EmptyState.vue
├── router/
│   └── index.js
├── utils/
│   └── request.js
└── App.vue
```

------

# 三、路由设计

```bash
/lease/plaza
/lease/resource/:id
/lease/my-publish
/lease/resource-form
/lease/resource-form/:id
/lease/my-subscription
```

------

# 四、页面设计

根据文档，前端只保留 5 个页面，够用即可。

## 1）资源广场页

面向租赁方。

### 页面用途

展示可租赁资源列表，支持最基础筛选。

### 页面内容

- 筛选区
  - 资源类型
  - 资源状态（默认只看 `ON_SHELF`）
- 资源列表
  - 标题
  - 类型
  - 面积
  - 位置
  - 月租金
  - 最短租期
- 操作
  - 查看详情

### 页面原型

```text
┌──────────────────────────────────────┐
│ 农场资源广场                         │
├──────────────────────────────────────┤
│ 类型[全部/大棚/菜地] 状态[上架中] 查询 │
├──────────────────────────────────────┤
│ 资源卡片1                            │
│ 标题：A区大棚1号                     │
│ 类型：GREENHOUSE  面积：200㎡        │
│ 位置：嘉义县梅山乡A区                │
│ 月租：1200     最短租期：1个月       │
│ [查看详情]                           │
├──────────────────────────────────────┤
│ 资源卡片2 ...                        │
└──────────────────────────────────────┘
```

------

## 2）资源详情页

面向租赁方，也可给资源拥有者查看。

### 页面用途

展示资源完整信息，并在当前页完成订阅、续订、退订。

### 页面内容

- 资源基础信息
- 发布者信息
- 当前资源状态
- 当前用户订阅状态
- 操作按钮
  - 订阅
  - 续订
  - 退订

### 设计原则

不单独拆订阅页，直接在详情页通过弹窗完成订阅和续订，这样最符合 MVP。

### 页面原型

```text
┌────────────────────────────┐
│ 资源详情                   │
├────────────────────────────┤
│ 标题：A区大棚1号           │
│ 类型：GREENHOUSE           │
│ 面积：200.5㎡              │
│ 位置：嘉义县梅山乡A区      │
│ 月租金：1200/月            │
│ 最短租期：1个月            │
│ 状态：ON_SHELF             │
│ 说明：适合蔬菜种植         │
├────────────────────────────┤
│ 当前我的订阅状态：未订阅    │
│ [订阅] [续订] [退订]       │
└────────────────────────────┘
```

------

## 3）我的发布页

面向资源拥有者。

### 页面用途

查看自己发布的资源，并进行管理。

### 页面内容

- 我的资源列表
- 每项显示
  - 标题
  - 状态
  - 类型
  - 月租金
- 操作
  - 发布资源
  - 编辑
  - 查看
  - 下架

### 页面原型

```text
┌──────────────────────────────────────┐
│ 我的发布                  [+发布资源] │
├──────────────────────────────────────┤
│ A区大棚1号   ON_SHELF                │
│ GREENHOUSE   1200/月                 │
│ [查看] [编辑] [下架]                 │
├──────────────────────────────────────┤
│ B区菜地2号   OFF_SHELF               │
│ FARMLAND     800/月                  │
│ [查看] [编辑]                        │
└──────────────────────────────────────┘
```

------

## 4）发布 / 编辑资源页

面向资源拥有者。

### 页面用途

新建资源或编辑已有资源。

### 表单字段

- 标题
- 类型
- 面积
- 位置描述
- 月租金
- 最短租期
- 资源说明

### 页面原型

```text
┌────────────────────────────┐
│ 发布资源 / 编辑资源        │
├────────────────────────────┤
│ 标题        [            ] │
│ 类型        [下拉选择     ] │
│ 面积        [            ] │
│ 位置描述    [            ] │
│ 月租金      [            ] │
│ 最短租期    [            ] │
│ 资源说明    [ textarea   ] │
├────────────────────────────┤
│ [保存] [取消]              │
└────────────────────────────┘
```

------

## 5）我的订阅页

面向租赁方。

### 页面用途

查看自己所有订阅，并支持续订和退订。

### 页面内容

- 资源名称
- 起始日期
- 结束日期
- 状态
- 操作
  - 查看详情
  - 续订
  - 退订

### 页面原型

```text
┌────────────────────────────────────────┐
│ 我的订阅                               │
├────────────────────────────────────────┤
│ A区大棚1号                             │
│ 2026-04-15 ~ 2026-07-14                │
│ 状态：ACTIVE                           │
│ [查看详情] [续订] [退订]               │
├────────────────────────────────────────┤
│ B区菜地2号                             │
│ 2026-01-01 ~ 2026-03-31                │
│ 状态：EXPIRED                          │
│ [查看详情]                             │
└────────────────────────────────────────┘
```

------

# 五、弹窗设计

为了保持页面最少，建议增加两个弹窗组件。

## 1. SubscribeDialog.vue

用于订阅资源。

### 字段

- 起始日期
- 租期（月）

### 交互

- 输入租期后前端自动计算结束日期
- 校验租期必须大于等于 `minLeaseMonths`

------

## 2. RenewDialog.vue

用于续订资源。

### 字段

- 续订月数

### 交互

- 根据当前 `endDate` 自动预估续订后结束日期
- 提交后刷新订阅详情或列表

------

# 六、接口设计

文档中的接口已经足够前端使用，直接按最小 REST 接口接入即可。

## 资源接口

### 1. 发布资源

```http
POST /api/resources
```

请求示例：

```json
{
  "ownerUserId": 1,
  "title": "A区大棚1号",
  "resourceType": "GREENHOUSE",
  "area": 200.5,
  "locationDesc": "嘉义县梅山乡A区",
  "pricePerMonth": 1200,
  "minLeaseMonths": 1,
  "description": "适合蔬菜种植"
}
```

------

### 2. 编辑资源

```http
PUT /api/resources/{id}
```

------

### 3. 查看资源详情

```http
GET /api/resources/{id}
```

返回示例：

```json
{
  "id": 1001,
  "title": "A区大棚1号",
  "resourceType": "GREENHOUSE",
  "area": 200.5,
  "locationDesc": "嘉义县梅山乡A区",
  "pricePerMonth": 1200,
  "minLeaseMonths": 1,
  "description": "适合蔬菜种植",
  "status": "ON_SHELF"
}
```

------

### 4. 资源列表

```http
GET /api/resources?type=GREENHOUSE&status=ON_SHELF&page=1&pageSize=10
```

返回示例：

```json
{
  "total": 20,
  "list": [
    {
      "id": 1001,
      "title": "A区大棚1号",
      "resourceType": "GREENHOUSE",
      "area": 200.5,
      "locationDesc": "嘉义县梅山乡A区",
      "pricePerMonth": 1200,
      "minLeaseMonths": 1,
      "status": "ON_SHELF"
    }
  ]
}
```

------

### 5. 下架资源

```http
POST /api/resources/{id}/off-shelf
```

------

### 6. 我的发布

```http
GET /api/my/resources?page=1&pageSize=10
```

------

## 订阅接口

### 7. 订阅资源

```http
POST /api/subscriptions
```

请求示例：

```json
{
  "resourceId": 1001,
  "tenantUserId": 2001,
  "startDate": "2026-04-15",
  "leaseMonths": 3
}
```

返回示例：

```json
{
  "id": 9001,
  "resourceId": 1001,
  "tenantUserId": 2001,
  "startDate": "2026-04-15",
  "endDate": "2026-07-14",
  "status": "ACTIVE"
}
```

------

### 8. 续订

```http
POST /api/subscriptions/{id}/renew
```

请求示例：

```json
{
  "leaseMonths": 2
}
```

------

### 9. 退订

```http
POST /api/subscriptions/{id}/cancel
```

------

### 10. 我的订阅列表

```http
GET /api/my/subscriptions?page=1&pageSize=10
```

------

### 11. 订阅详情

```http
GET /api/subscriptions/{id}
```

------

# 七、前端 API 文件设计（api/lease.js）

```javascript
import request from '@/utils/request'

// 资源
export function createResource(data) {
  return request.post('/api/resources', data)
}

export function updateResource(id, data) {
  return request.put(`/api/resources/${id}`, data)
}

export function getResourceDetail(id) {
  return request.get(`/api/resources/${id}`)
}

export function getResourceList(params) {
  return request.get('/api/resources', { params })
}

export function offShelfResource(id) {
  return request.post(`/api/resources/${id}/off-shelf`)
}

export function getMyResources(params) {
  return request.get('/api/my/resources', { params })
}

// 订阅
export function createSubscription(data) {
  return request.post('/api/subscriptions', data)
}

export function renewSubscription(id, data) {
  return request.post(`/api/subscriptions/${id}/renew`, data)
}

export function cancelSubscription(id) {
  return request.post(`/api/subscriptions/${id}/cancel`)
}

export function getMySubscriptions(params) {
  return request.get('/api/my/subscriptions', { params })
}

export function getSubscriptionDetail(id) {
  return request.get(`/api/subscriptions/${id}`)
}
```

------

# 八、页面数据结构建议

## 1. 资源广场页

```javascript
data() {
  return {
    loading: false,
    queryForm: {
      type: '',
      status: 'ON_SHELF',
      page: 1,
      pageSize: 10
    },
    total: 0,
    list: []
  }
}
```

## 2. 资源表单页

```javascript
data() {
  return {
    form: {
      title: '',
      resourceType: '',
      area: '',
      locationDesc: '',
      pricePerMonth: '',
      minLeaseMonths: 1,
      description: ''
    },
    submitting: false
  }
}
```

## 3. 订阅弹窗

```javascript
data() {
  return {
    form: {
      resourceId: '',
      tenantUserId: 2001,
      startDate: '',
      leaseMonths: 1
    },
    previewEndDate: ''
  }
}
```

## 4. 我的订阅页

```javascript
data() {
  return {
    loading: false,
    queryForm: {
      page: 1,
      pageSize: 10
    },
    total: 0,
    list: []
  }
}
```

------

# 九、前端交互流程

## 流程 1：查看资源广场

```text
进入资源广场
→ 请求资源列表
→ 渲染卡片列表
→ 点击查看详情
→ 跳转详情页
```

------

## 流程 2：发布资源

```text
进入我的发布页
→ 点击发布资源
→ 跳转发布页
→ 填写表单
→ 提交创建
→ 返回我的发布页
→ 刷新列表
```

------

## 流程 3：编辑资源

```text
进入我的发布页
→ 点击编辑
→ 进入编辑页
→ 回填资源详情
→ 修改保存
→ 返回列表
```

------

## 流程 4：订阅资源

```text
进入资源详情页
→ 点击订阅
→ 打开订阅弹窗
→ 填写开始日期、租期
→ 提交接口
→ 关闭弹窗
→ 刷新详情状态
```

------

## 流程 5：续订资源

```text
进入我的订阅页
→ 点击续订
→ 打开续订弹窗
→ 输入续订月数
→ 提交接口
→ 刷新列表
```

------

## 流程 6：退订资源

```text
进入我的订阅页
→ 点击退订
→ 二次确认
→ 提交退订接口
→ 刷新列表
```

------

## 流程 7：下架资源

```text
进入我的发布页
→ 点击下架
→ 二次确认
→ 提交下架接口
→ 刷新列表
```

------

# 十、前端状态展示规则

根据文档中的业务规则，前端要显式处理这些状态。

## 资源状态

- `ON_SHELF`
  - 显示：上架中
  - 可订阅
- `OFF_SHELF`
  - 显示：已下架
  - 不可订阅

------

## 订阅状态

- `ACTIVE`
  - 显示：生效中
  - 可续订
  - 可退订
- `CANCELLED`
  - 显示：已退订
  - 不可续订
  - 不可退订
- `EXPIRED`
  - 显示：已到期
  - 不可续订
  - 不可退订

------

# 十一、关键前端校验规则

这些规则前端要先做一层校验，后端再做最终校验。

## 资源表单校验

- 标题必填
- 类型必选
- 面积必须大于 0
- 位置描述必填
- 月租金必须大于 0
- 最短租期必须大于等于 1

## 订阅校验

- 不能订阅自己的资源
- 资源必须是 `ON_SHELF`
- 租期必须大于等于 `minLeaseMonths`

## 续订校验

- 订阅状态必须为 `ACTIVE`
- 续订月数必须大于 0

## 退订校验

- 订阅状态必须为 `ACTIVE`

