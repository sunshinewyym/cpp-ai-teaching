import { whileCourseware, coursewareModules } from '../data/coursewareWhile.js';

const allowedViews = new Set(['compact']);
const allowedVersions = new Set([whileCourseware.version]);

function readParam(params, key) {
  const value = params.get(key);
  return value == null ? '' : value.trim();
}

export function parseCoursewareEntry(search = typeof window !== 'undefined' ? window.location.search : '') {
  const params = new URLSearchParams(search || '');
  if (!params.has('source') && !params.has('lessonId') && !params.has('module')) {
    return { matched: false, ok: true, entry: null };
  }

  const source = readParam(params, 'source');
  const lessonId = readParam(params, 'lessonId');
  const module = readParam(params, 'module');
  const topicId = readParam(params, 'topicId');
  const problemId = readParam(params, 'problemId');
  const version = readParam(params, 'version') || whileCourseware.version;
  const templateId = readParam(params, 'templateId');
  const view = readParam(params, 'view');
  const rawCount = readParam(params, 'count');
  const count = rawCount ? Number(rawCount) : null;

  if (source !== 'ppt') return { matched: true, ok: false, message: '课件链接来源无效。' };
  if (lessonId !== whileCourseware.lessonId) return { matched: true, ok: false, message: '课件课程标识无效。' };
  if (!coursewareModules.has(module)) return { matched: true, ok: false, message: '课件模块无效。' };
  if (topicId !== whileCourseware.topicId) return { matched: true, ok: false, message: '课件知识点无效。' };
  if (!allowedVersions.has(version)) return { matched: true, ok: false, message: '课件版本暂不支持。' };
  if (view && !allowedViews.has(view)) return { matched: true, ok: false, message: '课件展示模式无效。' };
  if (['problem-summary', 'coach', 'debug', 'edge-case'].includes(module) && problemId !== whileCourseware.problem1004.id) {
    return { matched: true, ok: false, message: '课件题号无效。' };
  }
  if (module === 'debug' && templateId !== whileCourseware.problem1004.templateId) {
    return { matched: true, ok: false, message: '调试模板无效。' };
  }
  if (module === 'practice' && rawCount && (!Number.isInteger(count) || !whileCourseware.practice.allowedCounts.includes(count))) {
    return { matched: true, ok: false, message: '练习题数量只能是 3、5 或 10。' };
  }

  return {
    matched: true,
    ok: true,
    entry: {
      source,
      lessonId,
      module,
      topicId,
      problemId: problemId || null,
      version,
      count: module === 'practice' ? (count || whileCourseware.practice.defaultCount) : null,
      templateId: templateId || null,
      view: view || null,
    },
  };
}

