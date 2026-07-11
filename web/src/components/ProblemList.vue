<template>
  <section class="problem-list" aria-label="题目列表">
    <div class="chapter-tabs" role="tablist" aria-label="题目章节">
      <button
        v-for="chapter in problemIndex"
        :key="chapter.label"
        type="button"
        :class="{ active: activeChapter === chapter.label }"
        @click="activeChapter = chapter.label"
      >
        {{ chapter.label }}
      </button>
    </div>

    <p class="list-summary">{{ activeGroup.topics.length }} 个知识点，共 {{ problemCount }} 道题目。点击题号可打开对应题目。</p>

    <article v-for="item in activeGroup.topics" :key="item.name" class="topic-list-item">
      <header>
        <h3>{{ item.name }}</h3>
        <span>{{ item.levels.reduce((total, level) => total + level.ids.length, 0) }} 题</span>
      </header>
      <div v-for="level in item.levels" :key="level.label" class="problem-level">
        <b :class="`level-${level.label}`">{{ level.label }}</b>
        <div class="problem-links">
          <a
            v-for="id in level.ids"
            :key="id"
            :href="problemUrl(id)"
            target="_blank"
            rel="noopener noreferrer"
            :title="`打开第 ${id} 题`"
          >
            {{ id }}
          </a>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { problemIndex, problemUrl } from '../data/problemIndex';

const activeChapter = ref(problemIndex[0].label);
const activeGroup = computed(() => problemIndex.find(item => item.label === activeChapter.value) || problemIndex[0]);
const problemCount = computed(() => activeGroup.value.topics.reduce(
  (total, item) => total + item.levels.reduce((sum, level) => sum + level.ids.length, 0),
  0,
));
</script>

<style scoped>
.problem-list { display: grid; gap: 14px; padding: 18px; border: 1px solid #dbe2ea; border-radius: 8px; background: #fff; }
.chapter-tabs { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
.chapter-tabs button { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 14px; background: #fff; color: #475569; font: inherit; font-weight: 700; cursor: pointer; }
.chapter-tabs button.active { border-color: #4f46e5; background: #4f46e5; color: #fff; }
.list-summary { margin: 0; color: #64748b; font-size: 14px; }
.topic-list-item { padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
.topic-list-item header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.topic-list-item h3 { margin: 0; color: #1e293b; font-size: 17px; }
.topic-list-item header span { padding: 3px 8px; border-radius: 999px; background: #eef2ff; color: #4f46e5; font-size: 12px; }
.problem-level { display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 10px; align-items: start; padding: 9px 0; border-top: 1px dashed #e2e8f0; }
.problem-level b { padding-top: 5px; font-size: 13px; }
.level-入门 { color: #15803d; }.level-基础 { color: #b45309; }.level-提高 { color: #7e22ce; }
.problem-links { display: flex; flex-wrap: wrap; gap: 7px; }
.problem-links a { min-width: 52px; padding: 5px 8px; border: 1px solid #c7d2fe; border-radius: 5px; background: #f8faff; color: #4338ca; font-size: 13px; line-height: 1.25; text-align: center; text-decoration: none; }
.problem-links a:hover { border-color: #6366f1; background: #eef2ff; }
@media (max-width: 640px) { .problem-list { padding: 14px; }.topic-list-item { padding: 14px; }.problem-level { grid-template-columns: 1fr; gap: 6px; }.problem-level b { padding-top: 0; } }
</style>
