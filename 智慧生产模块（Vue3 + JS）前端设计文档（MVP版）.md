# 智慧生产模块（Vue3 + JS）前端设计文档（MVP版）

> 基于你提供的《智慧生产模块（新增版）》整理输出
> 技术栈：**Vue3 + JavaScript + Element Plus（推荐） + Axios + Pinia（可选）**
> 原则：**MVP、界面极简、快速交付、只展示核心数据、低维护成本**

------

# 一、项目目标

前端实现智慧生产模块，提供以下最小可用能力：

1. 种植计划管理（增删改查）
2. 设备参数配置（假数据联动）
3. 环境状态监测（展示最新数据）
4. 收获记录管理（新增 + 列表）

------

# 二、前端目录结构（Vue3）

```bash
src/
├── api/
│   └── production.js
├── views/
│   └── production/
│       ├── index.vue
│       ├── components/
│       │   ├── PlanDialog.vue
│       │   ├── DeviceDialog.vue
│       │   ├── HarvestDialog.vue
│       │   └── EmptyState.vue
├── router/
│   └── index.js
├── utils/
│   └── request.js
└── App.vue
```

------

# 三、页面结构设计（极简）

# 页面入口

```bash
/production/:resourceId
```

例如：

```bash
/production/101
```

------

# 四、主页面设计（index.vue）

采用单页四模块布局：

```text
--------------------------------------------------
智慧生产
--------------------------------------------------

[种植计划]
+ 新建计划
计划列表

[设备联动]
当前参数展示
编辑按钮

[环境监测]
温度 湿度 光照 土壤湿度
刷新按钮

[收获管理]
+ 新增收获
收获记录列表
--------------------------------------------------
```

------

# 五、页面组件拆分

# 1. index.vue（主页）

负责：

- 获取 dashboard 数据
- 渲染四大模块
- 打开弹窗

------

# 2. PlanDialog.vue

用于：

- 新增计划
- 编辑计划

字段：

```js
标题
计划日期
正文内容
状态
```

------

# 3. DeviceDialog.vue

用于修改设备参数：

```js
每日次数
每次时长
启动时间
目标湿度
是否启用喷水器
```

------

# 4. HarvestDialog.vue

用于新增收获记录：

```js
产品名称
分类
数量
单位
收获日期
备注
```

------

# 5. EmptyState.vue

租赁失效时显示：

```text
当前资源未开通智慧生产服务
```

------

# 六、页面原型（MVP）

# 主页面布局（建议）

```text
┌────────────────────────┐
│ 智慧生产                │
├────────────────────────┤
│ 种植计划      [+新建]   │
│ 4月番茄计划            │
│ 草莓育苗计划           │
├────────────────────────┤
│ 设备联动      [编辑]   │
│ 每日3次 每次10分钟     │
│ 湿度目标70%           │
├────────────────────────┤
│ 环境监测      [刷新]   │
│ 温度 26℃              │
│ 湿度 65%              │
│ 光照 300lx            │
│ 土壤湿度 52%          │
├────────────────────────┤
│ 收获管理      [+新增]  │
│ 番茄 80斤             │
│ 黄瓜 40斤             │
└────────────────────────┘
```

------

# 七、API接口设计

------

# 1. 查询主页数据

```http
GET /api/production/dashboard/{resourceId}?userId=2001
```

返回：

```json
{
  "enabled": true,
  "plans": [],
  "deviceConfig": {},
  "environment": {},
  "harvests": []
}
```

------

# 2. 更新设备参数

```http
PUT /api/production/orchestration/{resourceId}
```

请求：

```json
{
  "userId": 2001,
  "timesPerDay": 3,
  "durationMinutes": 10,
  "startTimes": ["08:00","14:00"],
  "targetHumidity": 70,
  "sprinklerEnabled": true
}
```

------

# 3. 获取环境数据

```http
GET /api/production/environment/{resourceId}?userId=2001
```

------

# 4. 获取摄像头信息（预留）

```http
GET /api/production/camera/{resourceId}?userId=2001
```

------

# 5. 新增种植计划

```http
POST /api/production/plan/{resourceId}
{
  "userId":2001,
  "title":"番茄计划",
  "planContent":"播种，补水",
  "planDate":"2026-04-18"
}
```

------

# 6. 查询计划列表

```http
GET /api/production/plan/{resourceId}/list?userId=2001
```

------

# 7. 编辑计划

```http
PUT /api/production/plan/{planId}
```

------

# 8. 新增收获记录

```http
POST /api/production/harvest/{resourceId}
{
  "userId":2001,
  "productName":"番茄",
  "category":"VEGETABLE",
  "harvestQuantity":80,
  "unit":"斤",
  "harvestDate":"2026-04-18",
  "remark":"第一批成熟"
}
```

------

# 9. 查询收获列表

```http
GET /api/production/harvest/{resourceId}/list?userId=2001
```

------

# 八、前端 API 文件（api/production.js）

```javascript
import request from '@/utils/request'

export function getDashboard(id,userId){
  return request.get(`/api/production/dashboard/${id}`,{
    params:{userId}
  })
}

export function updateDevice(id,data){
  return request.put(`/api/production/orchestration/${id}`,data)
}

export function createPlan(id,data){
  return request.post(`/api/production/plan/${id}`,data)
}

export function getPlanList(id,userId){
  return request.get(`/api/production/plan/${id}/list`,{
    params:{userId}
  })
}

export function updatePlan(id,data){
  return request.put(`/api/production/plan/${id}`,data)
}

export function createHarvest(id,data){
  return request.post(`/api/production/harvest/${id}`,data)
}

export function getHarvestList(id,userId){
  return request.get(`/api/production/harvest/${id}/list`,{
    params:{userId}
  })
}
```

------

# 九、数据结构设计（前端）

```javascript
data(){
 return {
   loading:false,
   resourceId:'',
   userId:2001,

   dashboard:{},
   plans:[],
   harvests:[],

   planDialog:false,
   deviceDialog:false,
   harvestDialog:false
 }
}
```

------

# 十、交互流程（MVP）

# 页面进入

```text
读取resourceId
→ 请求dashboard
→ 判断enabled
→ enabled=false 显示不可用页
→ true 显示四模块
```

------

# 新增计划

```text
点击新建
→ 弹窗填写
→ 提交接口
→ 刷新列表
```

------

# 编辑设备

```text
点击编辑
→ 打开弹窗
→ 保存参数
→ 刷新dashboard
```

------

# 新增收获

```text
点击新增
→ 填写信息
→ 保存
→ 刷新列表
```

------

# 十一、UI风格建议（简洁）

仅使用：

```text
卡片 + 表格 + 弹窗 + 表单 + 按钮
```

避免：

```text
复杂图表
动画
拖拽
多标签页
复杂权限系统
```

