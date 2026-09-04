import assert from 'node:assert/strict';
import { parseCoursewareEntry } from '../src/utils/courseware.js';

function parse(search) {
  return parseCoursewareEntry(search);
}

assert.deepEqual(parse(''), { matched: false, ok: true, entry: null });

const card = parse('?source=ppt&lessonId=cpp-basic-10-while&module=card&topicId=while-loop&version=v1&view=compact');
assert.equal(card.ok, true);
assert.equal(card.entry.module, 'card');
assert.equal(card.entry.view, 'compact');

const summary = parse('?source=ppt&lessonId=cpp-basic-10-while&module=summary&topicId=while-loop&version=v1');
assert.equal(summary.ok, true);

const problemSummary = parse('?source=ppt&lessonId=cpp-basic-10-while&module=problem-summary&topicId=while-loop&problemId=1004&version=v1&view=compact');
assert.equal(problemSummary.ok, true);
assert.equal(problemSummary.entry.problemId, '1004');

for (const count of [3, 5, 10]) {
  const practice = parse(`?source=ppt&lessonId=cpp-basic-10-while&module=practice&topicId=while-loop&count=${count}`);
  assert.equal(practice.ok, true);
  assert.equal(practice.entry.count, count);
}

assert.equal(parse('?source=ppt&lessonId=cpp-basic-10-while&module=practice&topicId=while-loop').entry.count, 5);
assert.equal(parse('?source=ppt&lessonId=cpp-basic-10-while&module=coach&topicId=while-loop&problemId=1004').ok, true);
assert.equal(parse('?source=ppt&lessonId=cpp-basic-10-while&module=debug&topicId=while-loop&problemId=1004&templateId=while-product-basic').ok, true);
assert.equal(parse('?source=ppt&lessonId=cpp-basic-10-while&module=edge-case&topicId=while-loop&problemId=1004').ok, true);

for (const search of [
  '?source=web&lessonId=cpp-basic-10-while&module=card&topicId=while-loop',
  '?source=ppt&lessonId=wrong&module=card&topicId=while-loop',
  '?source=ppt&lessonId=cpp-basic-10-while&module=unknown&topicId=while-loop',
  '?source=ppt&lessonId=cpp-basic-10-while&module=card&topicId=wrong',
  '?source=ppt&lessonId=cpp-basic-10-while&module=practice&topicId=while-loop&count=7',
  '?source=ppt&lessonId=cpp-basic-10-while&module=debug&topicId=while-loop&problemId=1004&templateId=wrong',
]) {
  assert.equal(parse(search).ok, false);
}

console.log('courseware entry checks passed');
