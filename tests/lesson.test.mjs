import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { QUIZZES, quizFor } from '../src/quizzes.mjs';
import { HERO, CAPTION, wrapText } from '../src/motion/render.mjs';
import { createStory } from '../src/motion/story.mjs';
const scenes = JSON.parse(fs.readFileSync(new URL('../src/scenes.json', import.meta.url), 'utf8'));

test('every source story has one complete, selectable quiz with feedback', () => {
  assert.deepEqual(QUIZZES.map(quiz => quiz.id), scenes.map(scene => scene.id));
  for (const scene of scenes) {
    const quiz = quizFor(scene.id);
    assert.equal(new Set(quiz.options).size, 3);
    assert.ok(Number.isInteger(quiz.correct) && quiz.correct >= 0 && quiz.correct < 3);
    for (const text of [quiz.prompt, ...quiz.options, quiz.hint, quiz.success]) assert.ok(text.trim().length > 0);
  }
});

test('all original video captions fit below the artwork without covering it', () => {
  assert.ok(CAPTION.y > HERO.y + HERO.h);
  assert.ok(CAPTION.y + CAPTION.h <= 1080);
  const ctx = createCanvas(1920, 1080).getContext('2d');
  ctx.font = '600 42px "Heiti TC", "PingFang SC", sans-serif';
  for (const caption of scenes.flatMap(scene => createStory(scene).captions)) {
    const lines = wrapText(ctx, caption.text, CAPTION.w - 150);
    assert.ok(lines.length * 46 <= CAPTION.h, caption.text);
    for (const line of lines) assert.ok(ctx.measureText(line).width <= CAPTION.w - 126 - 20, line);
  }
});
