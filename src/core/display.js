// Port of graphics/display.cpp: owns the renderer and the 4:3 view, and
// provides the 2D (ortho) and 3D drawing contexts.

import * as THREE from 'three';
import { Batch2D } from './draw2d.js';
import './filmlook.js'; // patches three's shader chunks before anything compiles

// The ortho 2D coordinate space of the original: 1.0 x 0.75, origin centred.
export const ORTHO_W = 1.0;
export const ORTHO_H = 0.75;
// The original ran at 640x480; pixel sizes (line widths) are relative to it.
const BASE_W = 640;

THREE.ColorManagement.enabled = false;

/** The GPU (or software rasteriser) behind a WebGL context, if it says. */
function gpuName(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return String((ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || 'unknown');
}

class Display {
  init(canvas) {
    this.canvas = canvas;
    // Ask for the fast GPU on machines that have two (laptops). WebGL is
    // always GPU accelerated unless the browser has fallen back to a
    // software rasteriser (GPU blocklisted, hardware acceleration switched
    // off, a VM, a headless browser): see softwareRenderer().
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.gpu = gpuName(this.renderer.getContext());
    this.software = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(this.gpu);
    console.log(`WebGL renderer: ${this.gpu}${this.software ? ' (software rendering!)' : ''}`);
    // A software rasteriser is slow per pixel: don't render at 2x as well.
    this.renderer.setPixelRatio(this.software ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.g = new Batch2D(this.renderer);
    this.target = null;
    this.targets = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    // Largest 4:3 box that fits, centred (letterboxed).
    let vw = w;
    let vh = Math.round(w * ORTHO_H / ORTHO_W);
    if (vh > h) { vh = h; vw = Math.round(h * ORTHO_W / ORTHO_H); }
    this.view = { x: Math.floor((w - vw) / 2), y: Math.floor((h - vh) / 2), w: vw, h: vh };
    const pr = this.renderer.getPixelRatio();
    for (const t of this.targets) t.setSize(Math.round(vw * pr), Math.round(vh * pr));
  }

  /** Width in ortho units of a line that was `px` pixels wide at 640x480. */
  px(px) { return px * ORTHO_W / BASE_W; }

  beginFrame() {
    const r = this.renderer;
    this.target = null;
    r.setRenderTarget(null);
    r.setScissorTest(false);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    const v = this.view;
    r.setViewport(v.x, v.y, v.w, v.h);
    r.setScissor(v.x, v.y, v.w, v.h);
    r.setScissorTest(true);
  }

  clearDepth() { this.renderer.clearDepth(); }

  /** Display::draw_context_2d */
  draw2d(drawable, alpha = 1) {
    this.g.begin();
    drawable.draw(this.g, alpha);
    this.g.flush();
  }

  /** Immediate-mode 2D: fn(g) draws with the Batch2D. */
  draw2dWith(fn) {
    this.g.begin();
    fn(this.g);
    this.g.flush();
  }

  render3d(scene, camera) {
    this.renderer.render(scene, camera);
  }

  /** An offscreen target the size of the view (reused, owned by Display). */
  acquireTarget() {
    const free = this.targets.find((t) => !t._busy);
    if (free) { free._busy = true; return free; }
    const pr = this.renderer.getPixelRatio();
    const t = new THREE.WebGLRenderTarget(Math.round(this.view.w * pr), Math.round(this.view.h * pr), {
      depthBuffer: true,
      samples: 4,
    });
    t._busy = true;
    this.targets.push(t);
    return t;
  }

  releaseTarget(t) { t._busy = false; }

  /** Run fn() with drawing redirected into render target `t`. */
  withTarget(t, fn) {
    const r = this.renderer;
    const prev = this.target;
    this.target = t;
    r.setRenderTarget(t);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    try {
      fn();
    } finally {
      this.target = prev;
      r.setRenderTarget(prev);
    }
  }
}

export const display = new Display();
