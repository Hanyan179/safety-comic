import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createStory,chapterAt,cameraAt,splitDialogue,FRAME} from '../src/motion/story.mjs';
const scenes=JSON.parse(fs.readFileSync(new URL('../src/scenes.json',import.meta.url)));
const voices=JSON.parse(fs.readFileSync(new URL('../src/voices.json',import.meta.url)));

test('all 24 animated stories preserve complete original question and answer',()=>{
  for(const scene of scenes){const story=createStory(scene,voices[scene.id]);for(const [role,text] of [['boy',scene.question],['cat',scene.answer]])assert.equal(story.captions.filter(c=>c.role===role).map(c=>c.text).join(''),text);assert.equal(splitDialogue(scene.answer).join(''),scene.answer);}
});
test('all timelines are continuous, audio fits captions, and frame counts are whole',()=>{
  for(const scene of scenes){const story=createStory(scene,voices[scene.id]);assert.ok(Math.abs(story.duration*10-Math.round(story.duration*10))<1e-7);assert.equal(story.chapters[0].start,0);assert.equal(story.chapters.at(-1).end,story.duration);assert.ok(Math.abs(story.duration*FRAME.fps-Math.round(story.duration*FRAME.fps))<1e-7);story.chapters.forEach((c,i)=>{assert.ok(c.end>c.start);if(i)assert.equal(c.start,story.chapters[i-1].end);});for(const a of story.audio){const cue=story.captions.find(c=>c.start===a.start);assert.ok(cue && a.end<=cue.end);}assert.equal(chapterAt(story,NaN).id,'overview');assert.equal(chapterAt(story,story.duration).id,'takeaway');}
});
test('replacing full recordings retimes captions without modifying the original text',()=>{
  const story=createStory(scenes[0],{boy:{src:'boy.mp3',duration:13},cat:{src:'cat.mp3',duration:38}});
  assert.equal(story.audio.length,2);assert.equal(story.audio[0].end-story.audio[0].start,13);assert.equal(story.audio[1].end-story.audio[1].start,38);
  assert.equal(story.captions.filter(c=>c.role==='cat').map(c=>c.text).join(''),scenes[0].answer);assert.ok(story.duration>51);
});
test('every story animates smoothly while reduced motion holds a fixed image',()=>{
  for(const scene of scenes){const story=createStory(scene,voices[scene.id]);let moving=false;for(let t=0;t<story.duration;t+=1/30){const a=cameraAt(story,t),b=cameraAt(story,t+1/30);assert.ok(a.zoom>=1&&a.zoom<=1.25);assert.ok(Math.abs(a.zoom-b.zoom)<.03);if(a.zoom>1.01)moving=true;assert.deepEqual(cameraAt(story,t,true),{zoom:1,x:.5,y:.5});}assert.ok(moving);}
});
