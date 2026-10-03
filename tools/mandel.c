// Mandelbrot deep-zoom frame renderer used for the film export.
// Same camera path and colouring as the real-time WebGL shader in src/scenes_c.js.
//   cc -O3 -march=native -fopenmp -o build/mandel tools/mandel.c -lm
//   build/mandel build/mandel_frames.txt <target_re> <target_im> | ffmpeg -f rawvideo -pix_fmt rgb24 -s 1920x1080 -i - frames/%05d.jpg
// frames.txt lines: idx zoom rot maxit   (written by tools/compute.py)
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>

#define W 1920
#define H 1080
static double TRE, TIM;
static const double START_RE = -0.6, START_IM = 0.0, K = 1.3, SPAN = 3.6;
static const float STOPS[6][3] = {{3,3,15},{16,32,107},{42,167,255},{230,251,255},{255,192,77},{255,61,139}};

static void pal(double s, float out[3]) {
  s = s - floor(s); s *= 6.0; int i = (int)floor(s); double f = s - i; f = f*f*(3-2*f);
  int j = (i + 1) % 6; i %= 6;
  for (int k = 0; k < 3; k++) out[k] = (float)((STOPS[i][k]*(1-f) + STOPS[j][k]*f) / 255.0);
}
static void sample(double cr, double ci, int maxit, double pix, float col[3]) {
  double zr = 0, zi = 0, dr = 0, di = 0, pr = 0, pi = 0, nn = -1; int n;
  for (n = 0; n < maxit; n++) {
    double ndr = 2*(zr*dr - zi*di) + 1, ndi = 2*(zr*di + zi*dr); dr = ndr; di = ndi;
    double t = zr*zr - zi*zi + cr; zi = 2*zr*zi + ci; zr = t;
    double r2 = zr*zr + zi*zi;
    if (r2 > 65536.0) { nn = n + 1 - log2(0.5*log(r2)); break; }
    if (n % 35 == 34) { if (fabs(zr - pr) + fabs(zi - pi) < 1e-13) break; pr = zr; pi = zi; }
  }
  if (nn < 0) { col[0] = col[1] = col[2] = 0; return; }
  double r = sqrt(zr*zr + zi*zi), dl = sqrt(dr*dr + di*di);
  double de = r*log(r)/dl / pix, tt = nn > 0 ? nn : 0;
  pal(0.10*sqrt(tt) + 0.2*log(1.0 + tt), col);
  double lde = log(1.0 + fmin(fmax(de, 0), 1e6));
  double bright = 0.10 + 0.90*exp(-lde/1.6), glow = exp(-fmin(fmax(de, 0), 50)*0.7);
  col[0] = col[0]*bright + glow*0.6375f; col[1] = col[1]*bright + glow*0.6975f; col[2] = col[2]*bright + glow*0.75f;
}
int main(int argc, char **argv) {
  if (argc < 4) { fprintf(stderr, "usage: mandel frames.txt target_re target_im\n"); return 1; }
  FILE *fl = fopen(argv[1], "r"); if (!fl) return 1;
  TRE = strtod(argv[2], 0); TIM = strtod(argv[3], 0);
  float *img = malloc(sizeof(float)*W*H*3), *aa = malloc(sizeof(float)*W*H*3);
  unsigned char *out = malloc(W*H*3);
  int idx, maxit; double zoom, rot;
  while (fscanf(fl, "%d %lf %lf %d", &idx, &zoom, &rot, &maxit) == 4) {
    double f = pow(zoom, -K);
    double cre = TRE + (START_RE - TRE)*f, cim = TIM + (START_IM - TIM)*f;
    double pix = SPAN/zoom/W, c = cos(rot), s = sin(rot);
    #pragma omp parallel for schedule(dynamic, 2)
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
      double px = x + 0.5 - W/2.0, py = -(y + 0.5 - H/2.0);
      sample(cre + (c*px - s*py)*pix, cim + (s*px + c*py)*pix, maxit, pix, &img[(y*W + x)*3]);
    }
    long extra = 0;
    #pragma omp parallel for schedule(dynamic, 2) reduction(+:extra)
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
      float *p = &img[(y*W + x)*3], *o = &aa[(y*W + x)*3]; float m = 0;
      o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
      if (x == 0 || y == 0 || x == W-1 || y == H-1) continue;
      const int nb[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};
      for (int k = 0; k < 4; k++) { float *q = &img[((y+nb[k][1])*W + x+nb[k][0])*3]; float d = fabsf(p[0]-q[0]) + fabsf(p[1]-q[1]) + fabsf(p[2]-q[2]); if (d > m) m = d; }
      if (m < 0.16f) continue;
      extra++;
      float acc[3] = {p[0], p[1], p[2]};
      const double so[4][2] = {{-0.375,-0.125},{0.125,-0.375},{0.375,0.125},{-0.125,0.375}};
      for (int k = 0; k < 4; k++) {
        double px = x + 0.5 + so[k][0] - W/2.0, py = -(y + 0.5 + so[k][1] - H/2.0); float col[3];
        sample(cre + (c*px - s*py)*pix, cim + (s*px + c*py)*pix, maxit, pix, col);
        acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2];
      }
      o[0] = acc[0]/5; o[1] = acc[1]/5; o[2] = acc[2]/5;
    }
    for (int i = 0; i < W*H*3; i++) { float v = aa[i]; v = v < 0 ? 0 : v > 1 ? 1 : v; out[i] = (unsigned char)(v*255 + 0.5f); }
    fwrite(out, 1, W*H*3, stdout); fflush(stdout);
    fprintf(stderr, "frame %d zoom %.4g maxit %d aa %ld\n", idx, zoom, maxit, extra);
  }
  return 0;
}
