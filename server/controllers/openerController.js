const { chat } = require('../services/deepseek');
const { setupSSE, sendSSE, endSSE } = require('../utils/stream');

/**
 * POST /api/opener
 * Body: { courseTopic }
 * Generates an algorithm quick card (算法速懂卡)
 */
async function handleOpener(req, res) {
  const { courseTopic } = req.body;

  if (!courseTopic) {
    return res.status(400).json({ error: 'courseTopic is required' });
  }

  const prompt = `你是一名 C++ 一线竞赛教学老师。请为"${courseTopic}"生成一张"算法速懂卡"，目标是让六年级、初中生或备课老师最快抓住算法。

要求：
- 用中文，大白话，生动但不绕弯。
- 可以直接说算法名，不要卖关子。
- 不要强行用文字手算复杂过程，复杂算法优先讲直觉、使用场景和背景故事。
- C++ 模板要短，只给最小可背版本。
- 算法小故事可以讲起源、历史背景、相关趣事；如果没有可靠起源，就讲它为什么会被发明出来。
- 不要输出 markdown 外壳，不要输出多余解释，只输出合法 JSON。

JSON 格式：
{
  "title": "算法名 + 速懂卡",
  "oneSentence": "一句话讲清楚它解决什么问题",
  "whenToUse": ["看到什么题目信号会想到它", "第二个信号", "第三个信号"],
  "analogy": "一个生活化比喻，帮助学生立刻有画面",
  "coreSteps": ["核心动作 1", "核心动作 2", "核心动作 3"],
  "cppTemplate": "最小 C++ 模板代码，保留必要注释",
  "pitfalls": ["最容易错的点 1", "最容易错的点 2", "老师提醒语"],
  "story": "算法小故事：讲讲这个算法的起源、相关趣事、为什么它会出现，适合学生听"
}

请为"${courseTopic}"生成完整输出：`;

  setupSSE(res);

  try {
    const content = await chat([{ role: 'user', content: prompt }], {
      temperature: 0.85,
      max_tokens: 4096,
    });
    sendSSE(res, { content });
    endSSE(res);
  } catch (err) {
    console.error('[Opener Error]', err.message);
    sendSSE(res, { error: err.message });
    endSSE(res);
  }
}

module.exports = { handleOpener };
