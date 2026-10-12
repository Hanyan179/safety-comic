import { createCanvas, loadImage } from '@napi-rs/canvas';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { FRAME, createStory } from '../src/motion/story.mjs';
import { CHARACTERS } from '../src/characters.mjs';
import { renderMotionFrame } from '../src/motion/render.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'output'),media=path.join(root,'public/motion'),qa=path.join(root,'qa/avatar-v3');
await Promise.all([out,media,qa].map(folder=>fs.mkdir(folder,{recursive:true})));
const scenes=JSON.parse(await fs.readFile(path.join(root,'src/scenes.json'),'utf8'));
const voices=JSON.parse(await fs.readFile(path.join(root,'src/voices.json'),'utf8'));
const avatars=Object.fromEntries(await Promise.all(Object.entries(CHARACTERS).map(async([role,c])=>[role,await loadImage(path.join(root,'public',c.avatar))])));
const canvas=createCanvas(FRAME.width,FRAME.height),ctx=canvas.getContext('2d');
async function contextFor(scene){const page=Math.floor((scene.id-1)/6)*6,pageScenes=scenes.slice(page,page+6);return {story:createStory(scene,voices[scene.id]),avatars,scenes:pageScenes,assets:await Promise.all(pageScenes.map(s=>loadImage(path.join(root,'public',s.image))))};}
if(process.argv.includes('--all-stills')){
  for(const scene of scenes){const context=await contextFor(scene);for(const role of ['boy','cat']){const cue=context.story.captions.find(c=>c.role===role);renderMotionFrame(ctx,context,cue.start+.5);await fs.writeFile(path.join(qa,`scene-${String(scene.id).padStart(2,'0')}-${role}.jpg`),await canvas.encode('jpeg',88));}}
  console.log('Rendered boy and cat frames for all 24 stories.');process.exit(0);
}
const context=await contextFor(scenes[0]),story=context.story,total=Math.round(story.duration*FRAME.fps);
function timestamp(t,separator='.'){const ms=Math.round(t*1000);return `00:${Math.floor(ms/60000).toString().padStart(2,'0')}:${Math.floor(ms/1000%60).toString().padStart(2,'0')}${separator}${(ms%1000).toString().padStart(3,'0')}`;}
const cues=story.captions.map((c,i)=>`${i+1}\n${timestamp(c.start,',')} --> ${timestamp(c.end,',')}\n${CHARACTERS[c.role].name}：${c.text}\n`).join('\n');
await fs.writeFile(path.join(out,'safety-scene-01.srt'),cues);
await fs.writeFile(path.join(media,'safety-scene-01.vtt'),`WEBVTT\n\n${story.captions.map(c=>`${timestamp(c.start)} --> ${timestamp(c.end)}\n${CHARACTERS[c.role].name}：${c.text}\n`).join('\n')}`);
for(const chapter of story.chapters){const t=chapter.start+Math.min(.6,(chapter.end-chapter.start)/2);renderMotionFrame(ctx,context,t);await fs.writeFile(path.join(qa,`first-${chapter.id}.png`),await canvas.encode('png'));}
renderMotionFrame(ctx,context,story.captions[0].start+1);await fs.writeFile(path.join(media,'safety-scene-01-poster.jpg'),await canvas.encode('jpeg',90));
if(!process.argv.includes('--stills')){
  const voiceFile=path.join(out,'safety-scene-01-voice.wav');
  const args=['-v','error','-y','-f','lavfi','-i',`anullsrc=r=48000:cl=mono:d=${story.duration}`];
  for(const clip of story.audio)args.push('-i',path.join(root,'public',clip.src));
  const delayed=story.audio.map((clip,i)=>`[${i+1}:a]adelay=${Math.round(clip.start*1000)}:all=1[a${i}]`);
  const inputs=['[0:a]',...story.audio.map((_,i)=>`[a${i}]`)].join('');
  args.push('-filter_complex',`${delayed.join(';')};${inputs}amix=inputs=${story.audio.length+1}:normalize=0:duration=first[mix]`,'-map','[mix]','-c:a','pcm_s16le',voiceFile);
  execFileSync('ffmpeg',args);
  const filename=path.join(out,'safety-scene-01.mp4');
  const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${FRAME.width}x${FRAME.height}`,'-framerate',String(FRAME.fps),'-i','pipe:0','-i',voiceFile,'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-shortest','-movflags','+faststart',filename],{stdio:['pipe','ignore','pipe']});
  let errors='';encoder.stderr.on('data',chunk=>errors+=chunk.toString());encoder.stdin.on('error',()=>{});
  const complete=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(new Error(errors)));});
  for(let i=0;i<total;i++){renderMotionFrame(ctx,context,i/FRAME.fps);const pixels=ctx.getImageData(0,0,FRAME.width,FRAME.height).data;if(!encoder.stdin.write(Buffer.from(pixels.buffer,pixels.byteOffset,pixels.byteLength)))await Promise.race([once(encoder.stdin,'drain'),complete.then(()=>{throw new Error('Encoder stopped early');})]);if(i%180===0)console.log(`Rendered ${i}/${total} frames`);}
  encoder.stdin.end();await complete;await fs.copyFile(filename,path.join(media,'safety-scene-01.mp4'));
  await fs.writeFile(path.join(out,'render-manifest.json'),JSON.stringify({title:story.title,duration:story.duration,...FRAME,frames:total,sha256:createHash('sha256').update(await fs.readFile(filename)).digest('hex'),renderer:'src/motion/render.mjs',avatars:CHARACTERS,chapters:story.chapters,captions:story.captions,audio:story.audio,voice:'Local synthetic Icecream audition; boy voice not supplied'},null,2)+'\n');
  console.log(`Complete: ${filename}`);
}
