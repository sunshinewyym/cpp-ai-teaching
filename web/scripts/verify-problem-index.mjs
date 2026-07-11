import assert from 'node:assert/strict';
import { problemIndex, problemUrl } from '../src/data/problemIndex.js';

assert.deepEqual(problemIndex.map(group => group.label), ['基础篇', '算法篇', '数据结构篇']);

const topics = problemIndex.flatMap(group => group.topics);
const ids = topics.flatMap(topic => topic.levels.flatMap(level => level.ids));

assert.equal(topics.length, 37);
assert.ok(ids.length > 0 && ids.every(id => /^\d{4}$/.test(id)));
assert.equal(problemUrl('1000'), 'https://oj.czos.cn/p/1000');

console.log(`problem index verified: ${topics.length} topics, ${ids.length} links`);
