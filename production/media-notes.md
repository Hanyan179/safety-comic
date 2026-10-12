# 头像与声音素材说明

## 角色头像

- 缪胥衍：`public/avatars/miaoxuyan.png`。直接使用用户提供的透明头像，未改脸、未另生成。
- 冰淇淋：`public/avatars/icecream.png`。根据用户提供的猫咪头像，通过内置 Image Gen（图像生成）移除嵌在原图中的灰白格子底，保留可爱的猫脸和表情。输出为真实透明通道。
- 色彩：缪胥衍的对白背景 `#e4f5df`、文字 `#246947`；冰淇淋的对白背景 `#fff1bc`、文字 `#725019`。头像名称作为文字以外的辨识方式，未仅依赖颜色。

图像处理最终提示原文：

> Use case: background-extraction. Edit target: the supplied cute blue-eyed cream kitten head avatar. Remove ONLY the baked-in white and light-gray checkerboard and all remaining white margins/UI fragments. Deliver the exact same kitten head, pose, expression, eyes, fur coloring, whiskers and open smiling mouth as a clean RGBA cutout on a truly transparent background. Preserve the full ears, whiskers and fur outline, do not crop any part of the cat, do not add body, accessories, text, shadows or badges, no checkerboard in the actual pixels. Center the head with a small transparent margin. This asset will be used small in a children's story speaker bubble, so preserve the original cute identity faithfully.

## 猫咪试听

第一格四段音频位于 `public/audio/scene-01/cat-1.mp3` 至 `cat-4.mp3`。文本逐段取自原答案，没有添加台词。使用系统中文语音 Tingting（婷婷）以每分钟 195 的语速设置本机合成，再轻微提高音调，并补偿速度，作为可爱猫咪的初版试听。没有使用任何真人声音克隆或外部付费语音服务。

试听的音色需要用户最终判断。正式猫咪配音和人物真人录音可以在网页的「给老师和家长」中替换。上传整段录音时按文字长度分配段落时长，并非逐词语音识别对齐。

## 素材与交付边界

24 张场景沿用项目原图的网页版本。动态故事当前采用镜头运动与头像、字幕变化，画面人物本身没有新增身体动作或口型。第一格已导出带默认猫咪试听的线性视频；选项互动仅在网页中。

本机导入录音保存在浏览器数据库，不会被上传、打包或推送。视频导出使用版本控制中的默认音频配置，不包含浏览器里的私人录音。
