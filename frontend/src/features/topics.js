import dailyTopics from '../../../data/topics/daily.json' with { type: 'json' };

export function getDailyTopic(date = new Date(), characterId = 'yuki') {
  const index = date.getDate() % dailyTopics.length;
  const topic = dailyTopics[index];
  return {
    ...topic,
    openerJa: topic.openers?.[characterId]?.ja || topic.openers?.default?.ja || topic.questionJa,
    openerEn: topic.openers?.[characterId]?.en || topic.openers?.default?.en || topic.questionEn
  };
}
