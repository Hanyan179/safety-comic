export const FRAME = { width: 1920, height: 1080, fps: 30 };
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const ease = value => { const n = clamp(value); return n * n * (3 - 2 * n); };
export const mix = (a, b, n) => a + (b - a) * n;
const readingSeconds = text => Math.max(2.5, text.length / 4.6 + .7);

// Keep every character and punctuation mark from the supplied dialogue.
export function splitDialogue(text, maxLength = 30) {
  const fragments = text.match(/[^，。！？；]+[，。！？；]?/gu) || [text];
  const lines = [];
  for (const fragment of fragments) {
    if (fragment.length <= maxLength) {
      if (lines.length && lines.at(-1).length + fragment.length <= maxLength) lines[lines.length - 1] += fragment;
      else lines.push(fragment);
    } else {
      const chars = [...fragment];
      while (chars.length) lines.push(chars.splice(0, maxLength).join(''));
    }
  }
  return lines;
}

export function createStory(scene, voices = {}) {
  const chapters = [{ id: 'overview', start: 0, end: .7, label: '故事地图' }, { id: 'enter', start: .7, end: 1.7, label: '走进故事' }];
  const captions = [], audio = [];
  let cursor = 1.7;
  function dialogue(role, parts, supplied) {
    const whole = !Array.isArray(supplied) && supplied?.src ? supplied : null;
    const totalCharacters = parts.join('').length;
    const groupStart = cursor;
    parts.forEach((text, i) => {
      const clip = Array.isArray(supplied) ? supplied[i] : null;
      const allotted = whole ? whole.duration * text.length / totalCharacters : Math.max(readingSeconds(text), (clip?.duration || 0) + .45);
      const id = role === 'boy' ? `question-${i}` : `answer-${i}`;
      const chapter = { id, role, text, start: cursor, end: cursor + allotted, label: role === 'boy' ? '想一想' : `安全提醒 ${i + 1}` };
      chapters.push(chapter); captions.push(chapter);
      if (clip?.src) audio.push({ src: clip.src, start: cursor, end: cursor + clip.duration, role });
      cursor += allotted;
    });
    if (whole) {
      audio.push({ src: whole.src, start: groupStart, end: groupStart + whole.duration, role });
      // A short breathing space after a complete recording, without stretching the audio.
      cursor += .5;
      chapters.at(-1).end = cursor;
    }
  }
  dialogue('boy', splitDialogue(scene.question), voices.boy);
  let answers = splitDialogue(scene.answer);
  if (scene.id === 1) {
    const cuts = ['要看', '再看看', '确认安全后'].map(text => scene.answer.indexOf(text));
    if (cuts.some((cut, i) => cut < 0 || (i > 0 && cut <= cuts[i - 1]))) throw new Error('第一格原文变化，请核对分镜。');
    answers = [scene.answer.slice(0, cuts[0]), scene.answer.slice(cuts[0], cuts[1]), scene.answer.slice(cuts[1], cuts[2]), scene.answer.slice(cuts[2])];
  }
  dialogue('cat', answers, voices.cat);
  const duration = Math.ceil((cursor + 3) * 10) / 10;
  chapters.push({ id: 'takeaway', start: cursor, end: duration, label: '记住啦' });
  return { id: scene.id, title: scene.title, question: scene.question, answer: scene.answer, chapters, captions, audio, duration };
}

export function chapterAt(story, time) {
  const t = Number.isFinite(time) ? clamp(time, 0, story.duration) : 0;
  return story.chapters.find(chapter => t >= chapter.start && t < chapter.end) || story.chapters.at(-1);
}
export function captionAt(story, time) {
  return story.captions.find(caption => time >= caption.start && time < caption.end) || null;
}
export function cameraAt(story, time, reducedMotion = false) {
  if (reducedMotion) return { zoom: 1, x: .5, y: .5 };
  const questionEnd = story.captions.filter(c => c.role === 'boy').at(-1).end;
  const answer = story.captions.filter(c => c.role === 'cat');
  const keys = [{ t: 0, zoom: 1, x: .5, y: .5 }, { t: 1.7, zoom: 1, x: .5, y: .5 },
    { t: questionEnd, zoom: 1.08, x: .52, y: .48 }];
  if (story.id === 1) {
    keys.push({t:answer[1].start + Math.min(.8,(answer[1].end-answer[1].start)*.35),zoom:1.24,x:.59,y:.42}, {t:answer[1].end,zoom:1.24,x:.59,y:.42},
      {t:answer[2].start + Math.min(.8,(answer[2].end-answer[2].start)*.35),zoom:1.17,x:.44,y:.5}, {t:answer[2].end,zoom:1.17,x:.44,y:.5});
  } else {
    const span = answer.at(-1).end - answer[0].start;
    keys.push({t:answer[0].start + span * .4,zoom:1.1,x:.48,y:.5}, {t:answer[0].start + span * .7,zoom:1.07,x:.52,y:.5});
  }
  keys.push({t:answer.at(-1).end,zoom:1,x:.5,y:.5}, {t:story.duration,zoom:1,x:.5,y:.5});
  const upper = keys.findIndex(key => key.t > time);
  if (upper < 0) return keys.at(-1);
  if (!upper) return keys[0];
  const a=keys[upper-1],b=keys[upper],n=ease((time-a.t)/(b.t-a.t));
  return {zoom:mix(a.zoom,b.zoom,n),x:mix(a.x,b.x,n),y:mix(a.y,b.y,n)};
}
