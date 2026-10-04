// Bilingual subtitles — [start, end, 中文, English] on the film clock (seconds)
window.SUBS = [
  [0.8, 4.6, "公元前三百年，欧几里得写下了一个算法。", "Around 300 BC, Euclid wrote down an algorithm."],
  [5.0, 9.4, "用小的去量大的；量不尽的余数，再拿来继续量。", "Measure the larger by the smaller, then measure again with what is left."],
  [9.8, 13.8, "直到余数为零，最大公约数便自己现身。", "When nothing remains, the greatest common divisor reveals itself."],
  [14.2, 19.4, "两千三百年后，它仍在现代密码学的核心运转。", "Twenty-three centuries later, it still runs at the heart of modern cryptography."],

  [30.2, 34.4, "排序：把混乱，变成秩序。", "Sorting: turning chaos into order."],
  [34.6, 39.0, "快速排序：选一个基准，小的放左边，大的放右边。", "Quicksort: pick a pivot, smaller to the left, larger to the right."],
  [39.2, 43.8, "同样一百个数：冒泡排序要 7,605 步，快速排序只要 1,163 步。", "The same hundred numbers: bubble sort takes 7,605 steps, quicksort 1,163."],
  [44.4, 48.6, "归并排序：每一轮，有序片段的长度都翻一倍。", "Merge sort: with every pass, the sorted runs double in length."],
  [49.2, 54.0, "七轮之后，噪声变成了光谱。", "Seven passes later, noise has become a spectrum."],
  [54.4, 59.4, "一百亿个数：快速排序几分钟，冒泡排序要上千年。", "Ten billion numbers: minutes for quicksort, millennia for bubble sort."],

  [62.2, 66.6, "二分查找：每一步，排除一半。", "Binary search: every step rules out half."],
  [67.0, 71.6, "一百万个数里找一个，只需二十步。", "One number in a million, found in twenty steps."],
  [72.0, 76.6, "深度优先：一路向前，走进死路就回头。", "Depth-first: push ahead, and at a dead end, turn back."],
  [77.0, 81.6, "广度优先：像水一样，同时涌入每一条岔路。", "Breadth-first: like water, flowing into every branch at once."],
  [82.0, 86.6, "最先抵达出口的那股水流，走的就是最短路径。", "The first stream to reach the exit has traced the shortest path."],

  [92.2, 96.4, "傅里叶：任何波形，都能拆成旋转的圆。", "Fourier: any wave can be built from spinning circles."],
  [96.8, 100.4, "圆越多，方波就越方。", "The more circles, the squarer the wave."],
  [100.8, 105.4, "三百多个圆层层相套，就能写出一个字。", "Three hundred nested circles can write a character."],
  [105.8, 110.0, "这个字，是「美」。", "The character is 美: beauty."],
  [110.4, 114.4, "声音、图像、无线信号——世界由频率组成。", "Sound, images, radio: the world is made of frequencies."],
  [114.6, 117.8, "你此刻听到的音乐，正是这样被分解的。", "The music you are hearing breaks down exactly like this."],

  [120.2, 124.4, "每只鸟只遵守三条规则：分离、对齐、聚集。", "Each bird follows three rules: separate, align, cohere."],
  [124.8, 129.4, "没有领袖，没有蓝图，成千只鸟却像一个整体。", "No leader, no blueprint, yet a thousand birds move as one."],
  [129.8, 133.6, "这就是涌现：简单的规则，复杂的世界。", "This is emergence: simple rules, complex worlds."],
  [134.4, 139.6, "1952 年，图灵发现：两种物质的反应与扩散，就能长出斑纹。", "In 1952, Turing showed that two reacting, spreading chemicals can grow patterns."],
  [140.0, 145.4, "豹纹、珊瑚、指纹……也许生命本身，就是一段算法。", "Leopard spots, coral, fingerprints. Perhaps life itself is an algorithm."],

  [148.2, 152.4, "递归：一个函数，调用它自己。", "Recursion: a function that calls itself."],
  [152.8, 155.8, "十二层调用，长出四千零九十六根枝条。", "Twelve calls deep: four thousand and ninety-six branches."],
  [156.4, 160.4, "曼德博集合：只有一行公式，z 变成 z² 加 c。", "The Mandelbrot set: one line, z becomes z² plus c."],
  [160.8, 165.2, "对平面上每一个点反复迭代，问它：会逃向无穷吗？", "Iterate every point on the plane and ask: does it escape to infinity?"],
  [165.6, 170.2, "不会逃逸的点，组成这座黑色的岛屿；它的海岸线无限复杂。", "The points that never escape form this black island. Its coastline is infinitely complex."],
  [170.6, 175.4, "我们正在把它放大七十亿倍。", "We are magnifying it seven billion times."],
  [175.8, 179.4, "越往深处，越是无穷。", "The deeper we go, the more there is."],
  [180.6, 183.8, "而在最深处，它又看见了自己。", "And at the very bottom, it finds itself again."],

  [186.2, 190.4, "旅行商问题：走遍每一座城市，怎样走最短？", "The traveling salesman: visit every city. What is the shortest route?"],
  [190.8, 195.4, "一千五百座城市，可能的路线比宇宙中的原子还多。", "With 1,500 cities, there are more routes than atoms in the universe."],
  [195.8, 200.4, "模拟退火：像金属冷却，先大胆尝试，再慢慢收敛。", "Simulated annealing: like cooling metal, bold at first, then slowly settling."],
  [200.8, 205.4, "最后，只剩一条线，经过每一颗星。", "In the end, a single line passes through every star."],
  [205.8, 211.2, "它画出的，正是刚才那座曼德博岛屿。", "And what it draws is the very Mandelbrot island we just explored."],

  [214.2, 218.6, "梯度下降：沿着最陡的方向，一步步走向谷底。", "Gradient descent: follow the steepest slope, step by step, to the valley floor."],
  [219.0, 223.6, "今天几乎所有的人工智能，都是这样学会的。", "Almost every AI today learns this way."],
  [224.2, 228.8, "神经网络：规则不再由人写下，而是从数据中学会。", "Neural networks: the rules are no longer written. They are learned from data."],
  [229.2, 233.6, "两条交缠的螺旋。起初，它只会画一条直线。", "Two intertwined spirals. At first, it can only draw a straight line."],
  [234.0, 238.8, "一百五十轮训练之后，它学会了弯曲。", "After 150 rounds of training, it learns to bend."],
  [239.2, 243.6, "今天，算法已经学会了写作、绘画、编程……", "Today, algorithms have learned to write, to paint, to code."],
  [244.2, 249.6, "就连这部影片，每一帧、每一个音符，也都是计算出来的。", "Even this film, every frame and every note, was computed."],

  [250.6, 255.4, "排序、搜索、变换、涌现、递归、优化、学习——", "Sorting, searching, transforming, emerging, recursing, optimizing, learning:"],
  [255.8, 260.6, "它们藏在每一次点击、每一次搜索、每一条消息背后。", "they hide behind every click, every search, every message."],
  [261.0, 265.6, "算法，是人类思想最精确的形式。", "An algorithm is human thought in its most precise form."],
  [266.0, 271.2, "冷静、严密，却美得惊人。", "Cold and rigorous, and astonishingly beautiful."],

  [274.0, 279.0, "一组有限的步骤，", "A finite set of steps,"],
  [279.4, 284.6, "通往无限的可能。", "leading to infinite possibility."],
];
