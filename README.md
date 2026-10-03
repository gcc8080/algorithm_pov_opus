# 算法之美 · THE BEAUTY OF ALGORITHMS

一部 5 分钟的算法宣传片。片中出现的每一个算法都是**真的在运行**：排序的每一次比较、迷宫的每一格、傅里叶的每一个圆、鸟群的每一只鸟、曼德博集合的每一个像素，都是当场计算出来的。配乐同样由代码合成，而且算法本身也在“演奏”：你看到的快速排序就是你听到的快速排序。

A five‑minute film about algorithms in which every algorithm on screen actually runs. Every comparison, cell, circle, bird and pixel is computed; the score is synthesized too, and the algorithms play in it.

| | |
|---|---|
| 成片 / Film | `film/beauty_of_algorithms_1080p.mp4` — 1920×1080 · 30 fps · H.264 + AAC · 5:00，中英字幕已烧录 |
| 网页版 / Live player | `src/index.html` — 浏览器实时渲染（曼德博集合用 WebGL 微扰算法实时计算） |
| 字幕 / Subtitles | `subtitles.zh-en.srt` · `subtitles.zh.srt` · `subtitles.en.srt` |
| 配乐 / Score | `src/score.mp3` — 原创合成，120 BPM，D 小调 |

## 七个算法 / Seven algorithms

| 时间 | 章节 | 画面里真正在跑的东西 |
|---|---|---|
| 0:00 | 序章 · 欧几里得 | 1071 × 462 的矩形被辗转相除切成 12 个正方形，每切一刀一个音，最后剩下 21 |
| 0:20 | 片名 | 片名由几千个粒子聚合而成，随后落成 64 根柱子 |
| 0:28 | I 排序 | 64 个数的快速排序（509 步，每一次比较都有声音）；6 种排序同速赛跑（冒泡 7,605 步 vs 快排 1,163 步）；240 条数组同时做归并排序，7 轮把噪声排成色轮，每一轮踩在一个拍子上 |
| 1:00 | II 搜索 | 在 0 – 1,000,000 中二分查找 742,519，20 步，每步一个八分音符；深度优先生成 3,600 格迷宫；广度优先像水一样漫过迷宫，最短路径随后被提起，直接变成下一章的正弦波 |
| 1:30 | III 傅里叶变换 | 方波的谐波一个一个加上去，你同时听到音色在变；330 个圆分成 3 条链，画出“美”字；外圈是这段配乐自己的 64 频段频谱 |
| 1:58 | IV 涌现 | 2,400 只 boids 只遵守分离 / 对齐 / 聚集三条规则，在晚霞里形成鸟群；随后 Gray–Scott 反应–扩散方程长出珊瑚般的图灵斑图 |
| 2:26 | V 递归 | 12 层递归长出 4,096 根枝条；曼德博集合先随迭代次数“雕刻”出来，再放大 70 亿倍，镜头终点的迷你曼德博与开头的全景完全重合 |
| 3:04 | VI 优化 | 1,500 座城市取自曼德博集合的点画；模拟退火解旅行商问题，最后那一条线画出的正是刚才那座岛屿 |
| 3:32 | VII 学习 | 300 个粒子在损失曲面上做带动量的梯度下降；2-20-20-1 神经网络学习双螺旋，决策边界随真实训练快照变形，150 轮后准确率 100% |
| 4:04 | 本片即算法 | 本片自己的源代码滚过屏幕 |
| 4:10 | 蒙太奇 | 24 个镜头逐拍切换，随后 9 个算法同屏，最后汇成一个光点 |
| 4:32 | 终章 | 欧几里得的矩形再次出现，化作粒子，写成片名 |

## 画面与音乐如何对上 / How picture and music lock together

`tools/compute.py` 先跑算法并写出共享时间线；`tools/compose.py` 读同一份时间线来合成音乐，并把每个事件写进 `src/events.js`；画面再按这些时间点渲染。因此：

- 欧几里得每切一个正方形、二分查找每走一步、递归每长一层、归并排序每完成一轮，都正好落在拍点上；
- 快速排序的 509 次操作每一次都有对应的音高（数值越大音越高，量化到 D 小调五声音阶）；
- 傅里叶一章在画面加入第 3、5、7 次谐波的同时，音乐里也加入同样的谐波；
- 曼德博集合放大的 20 秒里，音乐是一条永远在上升的 Shepard–Risset 音阶，对应“永无尽头”的放大；在迷你曼德博出现前留出半拍静默，揭晓那一刻是 D 大调；
- 傅里叶一章的频谱环和右上角的频谱条，用的是 `tools/analyze.py` 从最终母带算出的真实频谱。

## 重新生成 / Rebuild

```bash
python3 tools/compute.py           # 跑算法：排序轨迹、二分查找、"美"的傅里叶系数、点画城市、神经网络训练快照、曼德博镜头参数
python3 tools/compose.py           # 合成配乐 → build/score.wav + src/events.js
ffmpeg -i build/score.wav -af loudnorm=I=-14:TP=-1 build/score_master.wav
ffmpeg -i build/score_master.wav -b:a 192k src/score.mp3
python3 tools/analyze.py           # 母带频谱 → src/spectrum.js
python3 tools/fonts.py             # 内嵌 Latin Modern（TeX 的字体）
cc -O3 -march=native -fopenmp -o build/mandel tools/mandel.c -lm
head -721 build/mandel_frames.txt > build/mandel_frames_unique.txt
build/mandel build/mandel_frames_unique.txt <target_re> <target_im> | \
  ffmpeg -f rawvideo -pix_fmt rgb24 -s 1920x1080 -i - -q:v 2 -start_number 0 build/mframes/%05d.jpg
node tools/render.mjs 30 2         # 无头 Chromium 逐帧渲染
ffmpeg -f concat -safe 0 -i build/segs.txt -i build/score_master.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k build/master.mp4
# 仓库里的成片：两遍编码，控制在 GitHub 单文件 100 MB 限制以内
ffmpeg -i build/master.mp4 -an -c:v libx264 -preset slow -b:v 2250k -maxrate 6000k -bufsize 9000k -pass 1 -f mp4 /dev/null
ffmpeg -i build/master.mp4 -c:v libx264 -preset slow -b:v 2250k -maxrate 6000k -bufsize 9000k -pass 2 -c:a aac -b:a 160k -movflags +faststart film/beauty_of_algorithms_1080p.mp4
node tools/still.mjs out 30 160 207  # 任意时间点的静帧
```

`<target_re> <target_im>` 由 `compute.py` 写入 `src/data.js`（`DATA.MANDEL.target`）。曼德博帧用 C 双精度直接迭代并做自适应超采样；网页版用 WebGL 在 float32 下做微扰计算，参考轨道是那座迷你曼德博的周期 35 核心的轨道，配合 rebasing，不会出现 glitch。

## 文件 / Files

- `tools/compute.py` — 运行算法，生成共享时间线与数据
- `tools/compose.py` — 合成配乐（钢琴、合唱、braam、太鼓、超锯齿波 pad、各段 sonification、Shepard 音阶）
- `tools/mandel.c` — 曼德博深度放大渲染器（OpenMP，自适应抗锯齿）
- `tools/analyze.py` — 配乐频谱
- `src/core.js` — 渲染引擎：缓动、数学排版（类 TeX）、泛光、横向光晕、色差、胶片颗粒、章节卡、字幕
- `src/scenes_a.js` … `src/scenes_d.js` — 各章节
- `src/script.js` — 中英字幕

Written, designed, scored and rendered by Claude Opus 5.5.
