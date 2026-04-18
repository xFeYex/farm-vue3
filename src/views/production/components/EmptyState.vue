<script setup>
const props = defineProps({
  badge: {
    type: String,
    default: 'SERVICE OFF',
  },
  title: {
    type: String,
    default: '当前资源未开通智慧生产服务',
  },
  description: {
    type: String,
    default:
      '页面已经预留了未开通态展示。后续接入真实接口后，只要返回 enabled: false，这里就会自动切换到提示状态。',
  },
  actionText: {
    type: String,
    default: '重新检查',
  },
})

const emit = defineEmits(['retry'])

// 空状态只有一个主要动作，单独抛出 retry 事件，父组件后续可以自由接入重新查询接口。
function handleRetry() {
  emit('retry')
}
</script>

<template>
  <section class="empty-state">
    <div class="empty-state__badge">{{ badge }}</div>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <button class="empty-state__button" type="button" @click="handleRetry">
      {{ actionText }}
    </button>
  </section>
</template>

<style scoped>
.empty-state {
  margin-top: 24px;
  padding: 42px 28px;
  text-align: center;
  border: 1px solid rgba(112, 137, 95, 0.14);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 24px 60px rgba(67, 85, 57, 0.08);
  backdrop-filter: blur(16px);
}

.empty-state__badge {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(41, 66, 48, 0.1);
  color: #2e4835;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.empty-state h2 {
  margin-top: 18px;
  font-size: 28px;
  line-height: 1.25;
  font-weight: 800;
  color: #233629;
}

.empty-state p {
  max-width: 32rem;
  margin: 14px auto 0;
  font-size: 14px;
  line-height: 1.8;
  color: #617064;
}

.empty-state__button {
  min-height: 44px;
  margin-top: 24px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #294230;
  color: #f4f7f1;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(41, 66, 48, 0.16);
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease;
}

.empty-state__button:hover {
  transform: translateY(-1px);
}

.empty-state__button:focus-visible {
  outline: 3px solid rgba(129, 161, 110, 0.28);
  outline-offset: 2px;
}

@media (max-width: 960px) {
  .empty-state {
    border-radius: 24px;
  }
}

@media (max-width: 720px) {
  .empty-state {
    padding: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .empty-state__button {
    transition: none;
  }
}
</style>
