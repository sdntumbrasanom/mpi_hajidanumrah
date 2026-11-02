import * as THREE from 'three';
import { GenderType } from '../types/game';

export interface ProceduralTextureSet {
  kiswah: THREE.CanvasTexture;
  matafMarble: THREE.CanvasTexture;
  desertGround: THREE.CanvasTexture;
  facePutra: THREE.CanvasTexture;
  facePutri: THREE.CanvasTexture;
  ihramFabric: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  saiFloor: THREE.CanvasTexture;
  disposeAll: () => void;
}

function finalizeColorTexture(canvas: HTMLCanvasElement, maxAnisotropy: number, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeatX > 1 || repeatY > 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function buildKiswahCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Rich black woven silk
  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle vertical silk damask pattern
  ctx.strokeStyle = '#1c2029';
  ctx.lineWidth = 3;
  for (let x = 0; x < 512; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Golden Hizam calligraphy belt near upper third
  const bandY = 115;
  const bandH = 66;
  const grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  grad.addColorStop(0, '#B45309');
  grad.addColorStop(0.2, '#FDE047');
  grad.addColorStop(0.5, '#D97706');
  grad.addColorStop(0.8, '#FDE047');
  grad.addColorStop(1, '#92400E');

  ctx.fillStyle = grad;
  ctx.fillRect(0, bandY, 512, bandH);

  // Inner black calligraphy cartouches
  ctx.fillStyle = '#14161d';
  for (let i = 0; i < 4; i++) {
    const bx = 18 + i * 124;
    ctx.fillRect(bx, bandY + 10, 100, bandH - 20);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, bandY + 10, 100, bandH - 20);

    // Stylized geometric calligraphy strokes
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + 14, bandY + 36);
    ctx.bezierCurveTo(bx + 35, bandY + 18, bx + 65, bandY + 48, bx + 86, bandY + 26);
    ctx.stroke();
  }

  // Lower golden medallions (Qanadil)
  for (let i = 0; i < 4; i++) {
    const cx = 68 + i * 124;
    const cy = 235;
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  return c;
}

function buildMatafMarbleCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 1024, 1024);

  const cx = 512;
  const cy = 512;

  // Concentric marble rings
  for (let r = 80; r < 500; r += 36) {
    ctx.strokeStyle = r % 72 === 0 ? '#CBD5E1' : '#E2E8F0';
    ctx.lineWidth = r % 72 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Radial marble joint lines
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  for (let a = 0; a < 32; a++) {
    const rad = (a / 32) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * 90, cy + Math.sin(rad) * 90);
    ctx.lineTo(cx + Math.cos(rad) * 500, cy + Math.sin(rad) * 500);
    ctx.stroke();
  }

  // Counter-clockwise golden guide arrows on floor (visual aid for children!)
  // Note: On an XZ ground plane rotated -PI/2 on X, canvas +X is world +X, canvas +Y is world +Z.
  // Counter-clockwise in top-down view (looking from +Y down to XZ plane):
  // From +Z (bottom, angle PI/2) -> +X (right, angle 0) -> -Z (top, angle -PI/2) -> -X (left, angle PI).
  // That means canvas angle DECREASES!
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + 0.35;
    const radius = 290;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;

    ctx.save();
    ctx.translate(px, py);
    // Tangent pointing in decreasing canvas angle (-sin, cos) -> counter-clockwise on XZ!
    ctx.rotate(angle - Math.PI / 2);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.38)';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -13);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return c;
}

function buildDesertGroundCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#F3DFA2';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle Roblox-inspired clean sand studs & warm ripples
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = (x + y) % 64 === 0 ? '#EED690' : '#F6E5AF';
      ctx.fillRect(x, y, 32, 32);

      ctx.strokeStyle = 'rgba(180, 135, 60, 0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 16, y + 16, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return c;
}

function buildRobloxFaceCanvas(gender: GenderType): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#F6C799';
  ctx.fillRect(0, 0, 256, 256);

  // Eyes (classic cheerful Roblox style)
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(76, 92, 24, 34, 10);
  ctx.roundRect(156, 92, 24, 34, 10);
  ctx.fill();

  // White eye catchlights
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(84, 102, 5, 0, Math.PI * 2);
  ctx.arc(164, 102, 5, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(74, 80);
  ctx.quadraticCurveTo(88, 73, 102, 80);
  ctx.moveTo(154, 80);
  ctx.quadraticCurveTo(168, 73, 182, 80);
  ctx.stroke();

  if (gender === 'putri') {
    // Gentle eyelashes & rosy cheeks
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(75, 96);
    ctx.lineTo(68, 90);
    ctx.moveTo(181, 96);
    ctx.lineTo(188, 90);
    ctx.stroke();
  }

  // Soft rosy cheeks
  ctx.fillStyle = 'rgba(244, 114, 182, 0.28)';
  ctx.beginPath();
  ctx.ellipse(68, 138, 14, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(188, 138, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Happy Roblox smile
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.arc(128, 134, 30, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  return c;
}

function buildIhramFabricCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  for (let i = 0; i < 128; i += 8) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  return c;
}

function buildSaiFloorCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, 256, 512);

  // Two-way lane divider
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(124, 0, 8, 512);

  // Tile lines
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  return c;
}

function buildContactShadowCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.52)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const kiswah = finalizeColorTexture(buildKiswahCanvas(), maxAnisotropy);
  const matafMarble = finalizeColorTexture(buildMatafMarbleCanvas(), maxAnisotropy);
  const desertGround = finalizeColorTexture(buildDesertGroundCanvas(), maxAnisotropy, 28, 28);
  const facePutra = finalizeColorTexture(buildRobloxFaceCanvas('putra'), maxAnisotropy);
  const facePutri = finalizeColorTexture(buildRobloxFaceCanvas('putri'), maxAnisotropy);
  const ihramFabric = finalizeColorTexture(buildIhramFabricCanvas(), maxAnisotropy, 2, 2);
  const saiFloor = finalizeColorTexture(buildSaiFloorCanvas(), maxAnisotropy, 1, 6);

  const contactShadow = new THREE.CanvasTexture(buildContactShadowCanvas());
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  return {
    kiswah,
    matafMarble,
    desertGround,
    facePutra,
    facePutri,
    ihramFabric,
    contactShadow,
    saiFloor,
    disposeAll: () => {
      kiswah.dispose();
      matafMarble.dispose();
      desertGround.dispose();
      facePutra.dispose();
      facePutri.dispose();
      ihramFabric.dispose();
      contactShadow.dispose();
      saiFloor.dispose();
    },
  };
}
