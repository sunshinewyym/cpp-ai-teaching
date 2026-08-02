<template>
  <div class="sidebar">
    <div class="sidebar-logo">
      <span class="logo-icon">🎓</span>
      <span class="logo-text">AI 助教</span>
    </div>

    <nav class="sidebar-nav">
      <section v-for="section in sections" :key="section.id" class="nav-section">
        <button
          type="button"
          class="nav-section-toggle"
          :aria-expanded="expandedSections[section.id]"
          @click="toggleSection(section.id)"
        >
          <span>{{ section.label }}</span>
          <span class="nav-section-arrow">{{ expandedSections[section.id] ? '⌃' : '⌄' }}</span>
        </button>
        <div v-show="expandedSections[section.id]" class="nav-section-content">
          <template v-for="group in section.groups" :key="group.id">
            <div v-if="group.label" class="nav-group-label">{{ group.label }}</div>
            <button
              v-for="tool in group.items"
              :key="tool.id"
              :class="['nav-item', { active: activeTool === tool.id }]"
              @click="selectTool(tool.id, section.id)"
            >
              <span class="nav-icon">{{ tool.icon }}</span>
              <span class="nav-label">{{ tool.label }}</span>
            </button>
          </template>
        </div>
      </section>
    </nav>

    <div class="sidebar-footer" v-if="isLoggedIn">
      <div class="user-info">
        <div class="user-name-wrap">
          <span class="user-name">{{ currentUser?.name }}</span>
          <span class="user-username">@{{ currentUser?.username }}</span>
        </div>
        <span class="user-role">{{ isTeacher ? '老师' : '学生' }}</span>
      </div>
      <button class="logout-btn" @click="$emit('logout')">退出登录</button>
    </div>
    <div class="sidebar-footer" v-else>
      <div class="version">v1.0.0</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { isTeacher, isLoggedIn, isAdmin, currentUser, authFetch } from '../utils/auth';

const props = defineProps({
  activeTool: String,
});

const emit = defineEmits(['select-tool', 'logout']);

const hasTrainingCourse = ref(false);
const hasStudentTraining = ref(false);
const expandedSections = ref({
  ai: false,
  competition: true,
  learning: true,
  management: false,
});

const makeTool = (id, icon, label) => ({ id, icon, label });

const sections = computed(() => {
  const competitionItems = [
    makeTool('csp-practice', '🏆', 'CSP-J/S 练习'),
    makeTool('gesp-practice', '🎯', 'GESP 考级练习'),
    makeTool('leaderboard', '🏅', '学习排行榜'),
  ];
  if (isTeacher.value && hasTrainingCourse.value) {
    competitionItems.push(makeTool('training-course', '📅', '集训课程'));
  }
  if (!isTeacher.value && hasStudentTraining.value) {
    competitionItems.push(makeTool('student-training', '📘', '我的集训'));
  }

  const result = [
    {
      id: 'ai',
      label: 'AI 学习',
      groups: [
        {
          id: 'ai-main',
          items: [
            makeTool('chat', '💬', 'AI 对话'),
            makeTool('algorithm-coach', '🧠', '算法教练'),
            makeTool('opener', '⚡', '算法速懂卡'),
          ],
        },
        {
          id: 'visualization',
          label: '可视化学习',
          items: [
            makeTool('syntax-visualizer', '🧩', '语法可视化'),
            makeTool('visualizer', '🎞️', '算法可视化'),
          ],
        },
        {
          id: 'diagnosis',
          label: '代码诊断',
          items: [
            makeTool('debug', '🔍', '代码调试'),
            makeTool('edge-case', '🧨', '边界测试'),
          ],
        },
      ],
    },
    {
      id: 'competition',
      label: '竞赛考级训练',
      groups: [{ id: 'competition-main', items: competitionItems }],
    },
  ];

  if (!isTeacher.value) {
    result.push({
      id: 'learning',
      label: '学习中心',
      groups: [{
        id: 'learning-main',
        items: [
          makeTool('my-records', '📊', '学习记录'),
          makeTool('wrong-questions', '📕', '错题本'),
        ],
      }],
    });
  }

  if (isTeacher.value) {
    const managementItems = [
      makeTool('teaching', '🧑‍🏫', '教学工具'),
      makeTool('class-feedback', '📝', '课后反馈'),
      makeTool('teacher-dashboard', '📋', '学生记录'),
      makeTool('student-manage', '👥', '学生管理'),
    ];
    if (isAdmin.value) managementItems.push(makeTool('teacher-manage', '🧑‍🏫', '教师管理'));
    result.push({
      id: 'management',
      label: '教学管理',
      groups: [{ id: 'management-main', items: managementItems }],
    });
  }

  return result;
});

function toggleSection(sectionId) {
  expandedSections.value = {
    ...expandedSections.value,
    [sectionId]: !expandedSections.value[sectionId],
  };
}

function selectTool(toolId, sectionId) {
  expandedSections.value = { ...expandedSections.value, [sectionId]: true };
  emit('select-tool', toolId);
}

onMounted(async () => {
  if (!isLoggedIn.value) return;
  try {
    const response = await authFetch(isTeacher.value
      ? '/api/training-courses/access'
      : '/api/training-courses/student/access');
    const data = await response.json();
    if (isTeacher.value) {
      hasTrainingCourse.value = response.ok && data.hasAccess === true;
      if (hasTrainingCourse.value) selectTool('training-course', 'competition');
    } else {
      hasStudentTraining.value = response.ok && data.hasAccess === true;
      if (hasStudentTraining.value) selectTool('student-training', 'competition');
    }
  } catch {
    if (isTeacher.value) hasTrainingCourse.value = false;
    else hasStudentTraining.value = false;
  }
});
</script>

<style scoped>
.sidebar {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-logo {
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #4f46e5;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-section {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 4px;
}

.nav-section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 6px;
  border: 0;
  background: transparent;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .04em;
  cursor: pointer;
  text-align: left;
}

.nav-section-toggle:hover {
  color: #4f46e5;
}

.nav-section-arrow {
  color: #94a3b8;
  font-size: 14px;
}

.nav-group-label {
  padding: 8px 12px 3px 18px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.nav-section-content .nav-item {
  margin-left: 4px;
  width: calc(100% - 4px);
}

.nav-item:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.nav-item.active {
  background: #eef2ff;
  color: #4f46e5;
}

.nav-icon {
  font-size: 18px;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
}

.version {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.user-name-wrap {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.user-username {
  font-size: 11px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.user-role {
  font-size: 11px;
  padding: 2px 8px;
  background: #eef2ff;
  color: #4f46e5;
  border-radius: 10px;
}

.logout-btn {
  width: 100%;
  padding: 7px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}
</style>
