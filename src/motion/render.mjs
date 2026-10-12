import { FRAME, chapterAt, captionAt, cameraAt, clamp, ease, mix } from './story.mjs';
import { CHARACTERS } from '../characters.mjs';

const C = { paper: '#fff9ed', white: '#ffffff', ink: '#28535a', red: '#b24f3c', blue: '#287682', desk: '#edf6ef', gold: '#f4c34e' };
const SERIF = '"Heiti TC", "PingFang SC", sans-serif';
const SANS = '"Heiti TC", "PingFang SC", sans-serif';
export const HERO = { x: 160, y: 32, w: 1600, h: 900 };
export const CAPTION = { x: 160, y: 950, w: 1600, h: 104 };
const GRID = Array.from({ length: 6 }, (_, i) => ({ x: 162 + (i % 3) * 540, y: 259 + Math.floor(i / 3) * 320, w: 514, h: 289 }));

function rect(ctx, x, y, w, h, fill, stroke, line = 3, radius = 0) {
  ctx.beginPath();
  if (radius) ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = line; ctx.strokeStyle = stroke; ctx.stroke(); }
}

function text(ctx, value, x, y, size, color = C.ink, weight = 600, family = SERIF) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(value, x, y);
}

export function wrapText(ctx, value, maxWidth) {
  const lines = [];
  let line = '';
  for (const char of value) {
    if (char === '\n') { lines.push(line); line = ''; continue; }
    if (line && ctx.measureText(line + char).width > maxWidth && !'，。！？：；、”）'.includes(char)) {
      lines.push(line); line = char;
    } else line += char;
  }
  if (line) lines.push(line);
  return lines;
}

function lines(ctx, value, x, y, maxWidth, size, leading, color, weight = 600) {
  ctx.font = `${weight} ${size}px ${SERIF}`;
  for (const [index, line] of wrapText(ctx, value, maxWidth).entries()) text(ctx, line, x, y + index * leading, size, color, weight);
}

function drawGallery(ctx, assets, scenes, story, time) {
  rect(ctx, 111 + 10, 67 + 12, 1698, 932, '#09110c55', null);
  rect(ctx, 111, 67, 1698, 932, C.paper, null);
  text(ctx, '小小的我们，也能保护自己', 160, 104, 24, '#77705e', 500, SANS);
  text(ctx, '缪胥衍与冰淇淋', 154, 145, 70, C.ink, 900);
  text(ctx, `第 ${Math.floor((story.id - 1) / 6) + 1} 话`, 1268, 128, 42, C.ink, 800);
  text(ctx, '和冰淇淋一起，学会保护自己', 1268, 184, 23, '#7d7565', 500, SANS);
  GRID.forEach((box, i) => {
    ctx.save();
    const angle = [-.004, .003, -.003, .003, -.004, .004][i];
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2); ctx.rotate(angle); ctx.translate(-box.x - box.w / 2, -box.y - box.h / 2);
    rect(ctx, box.x + 5, box.y + 7, box.w, box.h, C.ink, null);
    ctx.drawImage(assets[i], box.x, box.y, box.w, box.h);
    rect(ctx, box.x, box.y, box.w, box.h, null, C.ink, 5);
    rect(ctx, box.x, box.y, 48, 37, C.ink, null);
    text(ctx, String(scenes[i].id).padStart(2, '0'), box.x + 8, box.y + 4, 25, C.paper);
    ctx.font = `700 27px ${SERIF}`;
    const captionWidth = ctx.measureText(scenes[i].title).width + 26;
    rect(ctx, box.x + box.w - captionWidth - 14, box.y + box.h - 58, captionWidth, 44, C.white, C.ink, 2);
    text(ctx, scenes[i].title, box.x + box.w - captionWidth - 1, box.y + box.h - 52, 27, C.ink, 700);
    ctx.restore();
  });
  text(ctx, '点开一个小故事，学会一个安全小提醒', 163, 929, 24, '#817764', 500, SANS);
  text(ctx, `${String(scenes[0].id).padStart(2,'0')}—${String(scenes.at(-1).id).padStart(2,'0')} / 24 个故事`, 1460, 929, 22, '#817764', 500, SANS);
  if (time < .7) {
    const box = GRID[(story.id - 1) % 6];
    ctx.save(); ctx.globalAlpha = .5 + Math.sin(time * 4) * .2;
    rect(ctx, box.x - 10, box.y - 10, box.w + 20, box.h + 20, null, C.gold, 7, 3);
    ctx.restore();
  }

}

function imageTransform(box, camera) {
  const z = camera.zoom;
  const x = clamp(camera.x, 1 / (2 * z), 1 - 1 / (2 * z));
  const y = clamp(camera.y, 1 / (2 * z), 1 - 1 / (2 * z));
  return { x: box.x + box.w / 2 - x * box.w * z, y: box.y + box.h / 2 - y * box.h * z, w: box.w * z, h: box.h * z };
}

function drawHero(ctx, image, box, camera) {
  const transform = imageTransform(box, camera);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 22); ctx.clip();
  ctx.drawImage(image, transform.x, transform.y, transform.w, transform.h);
  ctx.restore();
  rect(ctx, box.x, box.y, box.w, box.h, null, '#94b8b0', 3, 22);
  return transform;
}

function focusMark(ctx, transform, area, time, color) {
  const box = { x: transform.x + area.x * transform.w, y: transform.y + area.y * transform.h,
    w: area.w * transform.w, h: area.h * transform.h };
  const pulse = 4 + Math.sin(time * 5) * 3;
  ctx.save();
  ctx.beginPath(); ctx.rect(HERO.x, HERO.y, HERO.w, HERO.h); ctx.clip();
  rect(ctx, box.x - pulse, box.y - pulse, box.w + pulse * 2, box.h + pulse * 2, null, '#fffdf5cc', 13, 15);
  rect(ctx, box.x - pulse, box.y - pulse, box.w + pulse * 2, box.h + pulse * 2, null, color, 6, 15);
  ctx.restore();
}

function captionCard(ctx, caption, avatars, time, reducedMotion) {
  const character = CHARACTERS[caption.role];
  const box = CAPTION;
  ctx.save();
  ctx.globalAlpha *= ease((time - caption.start) / .22);
  rect(ctx, box.x, box.y, box.w, box.h, character.background, character.border, 3, 28);
  const bounce = reducedMotion ? 0 : Math.sin((time - caption.start) * 3) * 2;
  rect(ctx, box.x + 10, box.y + 8, 88, 88, '#ffffffaa', null, 0, 44);
  ctx.drawImage(avatars[caption.role], box.x + 6, box.y + 3 + bounce, 100, 100);
  const size = 42;
  ctx.font = `600 ${size}px ${SANS}`;
  const rows = wrapText(ctx, caption.text, box.w - 150);
  rows.forEach((row, i) => text(ctx, row, box.x + 126, box.y + (box.h - rows.length * 46) / 2 + i * 46, size, character.color, 600, SANS));
  ctx.restore();
}

export function renderMotionFrame(ctx, { assets, avatars, scenes, story }, time, { reducedMotion = false } = {}) {
  const t = Number.isFinite(time) ? clamp(time, 0, story.duration) : 0;
  const chapter = chapterAt(story, t), caption = captionAt(story, t);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,FRAME.width,FRAME.height);
  rect(ctx,0,0,FRAME.width,FRAME.height,C.desk,null);
  if(t < 1.7)drawGallery(ctx,assets,scenes,story,t);
  if(t > .7){
    const n = reducedMotion ? 1 : ease((t - .7) / 1);
    ctx.save();ctx.globalAlpha=n;rect(ctx,0,0,FRAME.width,FRAME.height,C.desk,null);ctx.restore();
    const slot=(story.id-1)%6,b=GRID[slot];
    const box={x:mix(b.x,HERO.x,n),y:mix(b.y,HERO.y,n),w:mix(b.w,HERO.w,n),h:mix(b.h,HERO.h,n)};
    const transform=drawHero(ctx,assets[slot],box,cameraAt(story,t,reducedMotion));
    if(t>=1.7){
      if(story.id===1 && chapter.id==='answer-1')focusMark(ctx,transform,{x:.885,y:.049,w:.09,h:.176},t,C.gold);
      if(story.id===1 && chapter.id==='answer-2')focusMark(ctx,transform,{x:.006,y:.24,w:.305,h:.3},t,C.gold);
      if(caption)captionCard(ctx,caption,avatars,t,reducedMotion);
      if(chapter.id==='takeaway')captionCard(ctx,{role:'cat',start:chapter.start,text:story.id===1?'先看信号灯，再看左右来车，也要留意转弯车辆。':story.title},avatars,t,reducedMotion);
    }
  }
  ctx.restore();
}
