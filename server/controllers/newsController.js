const axios = require('axios');

let cache = { time: 0, items: [] };

const BAD_WORDS = ['死亡', '遇难', '逝世', '去世', '牺牲', '杀', '血', '战争', '宣战', '武力', '断绝', '爆炸', '坠毁', '沉没', '残割', '犯罪'];
const TECH_WORDS = ['AI', '人工智能', '编程', '代码', '程序', '开源', '机器人', '芯片', 'CPU', '算法', '科学', '航天', '电脑'];

async function handleNews(req, res) {
  const now = Date.now();
  if (now - cache.time < 10 * 60 * 1000 && cache.items.length) {
    return res.json({ items: cache.items });
  }

  try {
    const settled = await Promise.allSettled([fetchTechNews(), fetchTodayHistory()]);
    const items = settled
      .flatMap(result => (result.status === 'fulfilled' ? result.value : []))
      .filter(item => item.title && isClassroomFriendly(item.title))
      .slice(0, 8);

    cache = { time: now, items };
    res.json({ items });
  } catch (err) {
    console.error('[News Error]', err.message);
    res.json({ items: [] });
  }
}

async function fetchTechNews() {
  const resp = await axios.get('https://www.ithome.com/rss/', { timeout: 6000 });
  const titles = [...resp.data.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g)]
    .map(match => decodeXml(match[1] || match[2] || '').trim())
    .filter(title => title && title !== 'IT之家')
    .filter(title => TECH_WORDS.some(word => title.includes(word)))
    .slice(0, 4);

  return titles.map(title => ({
    title: `中文科技新闻：${title}`,
    source: 'IT之家',
  }));
}

async function fetchTodayHistory() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const resp = await axios.get(`https://baike.baidu.com/cms/home/eventsOnHistory/${month}.json`, {
    timeout: 6000,
  });

  return ((resp.data[month] || {})[`${month}${day}`] || [])
    .map(event => `${event.year} 年：${stripHtml(event.title)}`)
    .filter(text => isClassroomFriendly(text))
    .slice(0, 4)
    .map(title => ({
      title: `历史上的今天：${title}`,
      source: '百度百科',
    }));
}

function isClassroomFriendly(text) {
  return !BAD_WORDS.some(word => text.includes(word));
}

function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(text) {
  return decodeXml(text).replace(/<[^>]+>/g, '');
}

module.exports = { handleNews };
