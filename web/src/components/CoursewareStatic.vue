<template>
  <main class="courseware-static" :class="`courseware-static-${mode}`">
    <div class="courseware-static-toolbar">
      <span>课件样板 · {{ config.version }}</span>
      <button type="button" @click="$emit('return')">返回系统</button>
    </div>

    <template v-if="mode === 'card'">
      <p class="courseware-eyebrow">{{ config.card.eyebrow }}</p>
      <h1>{{ config.card.title }}</h1>
      <p class="courseware-lead">{{ config.card.oneSentence }}</p>
      <section class="courseware-grid">
        <article v-for="item in config.card.elements" :key="item.label" class="courseware-card">
          <h2>{{ item.label }}</h2>
          <p>{{ item.text }}</p>
        </article>
      </section>
      <section class="courseware-block"><h2>基本结构</h2><pre><code>{{ config.card.syntax }}</code></pre></section>
      <section class="courseware-block"><h2>执行顺序</h2><ol><li v-for="(item, index) in config.card.order" :key="item">{{ index + 1 }}. {{ item }}</li></ol></section>
      <section class="courseware-grid">
        <article class="courseware-card"><h2>while 和 if</h2><p>{{ config.card.whileVsIf }}</p></article>
        <article class="courseware-card"><h2>简单例子</h2><p>{{ config.card.example }}</p></article>
      </section>
      <section class="courseware-block"><h2>最小模板</h2><pre><code>{{ config.card.template }}</code></pre></section>
      <section class="courseware-block"><h2>死循环常见原因</h2><ul><li v-for="item in config.card.infiniteLoop" :key="item">{{ item }}</li></ul></section>
    </template>

    <template v-else-if="mode === 'summary'">
      <p class="courseware-eyebrow">{{ config.lessonSummary.eyebrow }}</p>
      <h1>{{ config.lessonSummary.title }}</h1>
      <section class="courseware-summary-list">
        <article v-for="([title, text], index) in config.lessonSummary.points" :key="title" class="courseware-summary-item">
          <span>{{ index + 1 }}</span><div><h2>{{ title }}</h2><p>{{ text }}</p></div>
        </article>
      </section>
    </template>

    <template v-else>
      <p class="courseware-eyebrow">编程题基础思路 · {{ config.version }}</p>
      <h1>{{ config.problem1004.title }}</h1>
      <p class="courseware-lead">先把“不断相乘”拆成一个循环过程，再逐轮确认变量的含义。</p>
      <section class="courseware-thinking-list">
        <p v-for="(item, index) in config.problem1004.summary" :key="item"><b>{{ index + 1 }}</b>{{ item }}</p>
      </section>
      <aside class="courseware-guidance">这里只展示第一层思路，不提供完整代码或可直接提交的伪代码。理解变量含义后，可以继续使用算法教练逐步推导。</aside>
      <button class="courseware-primary" type="button" @click="$emit('coach')">继续使用算法教练</button>
    </template>
  </main>
</template>

<script setup>
defineProps({
  mode: { type: String, required: true },
  config: { type: Object, required: true },
});
defineEmits(['return', 'coach']);
</script>

<style scoped>
.courseware-static { flex: 1; overflow: auto; min-height: calc(100vh - 48px); padding: 38px clamp(28px, 7vw, 120px) 70px; color: #172554; background: #fff; }
.courseware-static-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; color: #64748b; font-size: 14px; }
.courseware-static-toolbar button { border: 1px solid #c7d2fe; border-radius: 9px; padding: 8px 14px; background: #eef2ff; color: #4338ca; cursor: pointer; }
.courseware-eyebrow { margin: 0 0 10px; color: #4f46e5; font-weight: 800; letter-spacing: .04em; }
h1 { margin: 0 0 18px; color: #1e1b4b; font-size: clamp(32px, 4vw, 56px); }
.courseware-lead { max-width: 960px; margin: 0 0 30px; color: #334155; font-size: clamp(20px, 2.2vw, 30px); line-height: 1.7; }
.courseware-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin: 22px 0; }
.courseware-card, .courseware-block, .courseware-summary-item, .courseware-guidance { border: 1px solid #dbeafe; border-radius: 16px; background: #f8fbff; box-shadow: 0 10px 28px rgba(59, 130, 246, .08); }
.courseware-card { padding: 22px; }
.courseware-card h2, .courseware-block h2, .courseware-summary-item h2 { margin: 0 0 10px; color: #3730a3; font-size: 22px; }
.courseware-card p, .courseware-block li, .courseware-summary-item p, .courseware-thinking-list p { margin: 0; color: #334155; font-size: 18px; line-height: 1.8; }
.courseware-block { margin: 22px 0; padding: 22px 26px; }
.courseware-block pre { margin: 12px 0 0; padding: 18px; overflow: auto; border-radius: 10px; background: #0f172a; color: #e2e8f0; font: 18px/1.7 Consolas, monospace; }
.courseware-block ol, .courseware-block ul { margin: 0; padding-left: 28px; }
.courseware-summary-list { display: grid; gap: 16px; max-width: 1100px; }
.courseware-summary-item { display: grid; grid-template-columns: 48px 1fr; gap: 16px; padding: 22px; }
.courseware-summary-item > span { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; background: #e0e7ff; color: #4338ca; font-weight: 800; font-size: 20px; }
.courseware-thinking-list { display: grid; gap: 14px; max-width: 1000px; margin: 28px 0; }
.courseware-thinking-list p { display: grid; grid-template-columns: 34px 1fr; gap: 12px; padding: 16px 18px; border-left: 5px solid #6366f1; background: #eef2ff; }
.courseware-thinking-list b { color: #4338ca; }
.courseware-guidance { max-width: 1000px; margin: 26px 0; padding: 20px 24px; color: #475569; line-height: 1.8; font-size: 17px; }
.courseware-primary { border: 0; border-radius: 10px; padding: 13px 20px; background: #4f46e5; color: #fff; font-size: 17px; font-weight: 700; cursor: pointer; }
@media (max-width: 850px) { .courseware-grid { grid-template-columns: 1fr; } .courseware-static { padding: 24px 18px 50px; } }
</style>
