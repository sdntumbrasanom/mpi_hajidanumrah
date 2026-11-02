import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GameScreen,
  GenderType,
  LiveSimulationProgress,
  StationConfig,
  WorshipType,
} from '../types/game';
import { soundEngine } from '../utils/sound';
import {
  AvatarAnimMode,
  RobloxAvatarRig,
  createArafahComplex,
  createHotelTanimComplex,
  createKaabaComplex,
  createMiqatComplex,
  createMuzdalifahMinaComplex,
  createOutdoorPerimeterScenery,
  createRobloxAvatar,
  createSaiComplex,
  createTahallulComplex,
} from '../three/models';
import { createProceduralTextures } from '../three/textures';

export interface WorldCanvasHandle {
  setVirtualJoystick: (dx: number, dz: number) => void;
  triggerAction: () => void;
  triggerJump: () => void;
  teleportToCurrentTarget: () => void;
  resetCameraBehindPlayer: () => void;
}

interface WorldCanvasProps {
  screen: GameScreen;
  gender: GenderType;
  worshipType: WorshipType;
  activeStation: StationConfig | null;
  simulationUnlocked: boolean;
  isModalOpen: boolean;
  onNearStationEnter: () => void;
  onProgressUpdate: (progress: LiveSimulationProgress) => void;
  onStationSimulationComplete: (stationId: string) => void;
}

// Pre-allocated scratch math helpers (zero GC inside animation loop)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveVec = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _guideDir = new THREE.Vector3();
const _tempVec = new THREE.Vector3();

function normalizeAngleDiff(diff: number): number {
  let d = diff;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const JUMRAH_NAMES = ['Jumrah Ula', 'Jumrah Wustha', 'Jumrah Aqabah'] as const;

export const WorldCanvas = forwardRef<WorldCanvasHandle, WorldCanvasProps>(function WorldCanvas(
  {
    screen,
    gender,
    worshipType,
    activeStation,
    simulationUnlocked,
    isModalOpen,
    onNearStationEnter,
    onProgressUpdate,
    onStationSimulationComplete,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Latest React props mirrored into refs so the WebGL loop never tears down
  const propsRef = useRef({
    screen,
    gender,
    worshipType,
    activeStation,
    simulationUnlocked,
    isModalOpen,
    onNearStationEnter,
    onProgressUpdate,
    onStationSimulationComplete,
  });
  propsRef.current = {
    screen,
    gender,
    worshipType,
    activeStation,
    simulationUnlocked,
    isModalOpen,
    onNearStationEnter,
    onProgressUpdate,
    onStationSimulationComplete,
  };

  // Mutable simulation & input refs shared with imperative handle
  const controlStateRef = useRef({
    virtualDx: 0,
    virtualDz: 0,
    pendingAction: false,
    pendingJump: false,
    pendingTeleport: false,
    pendingResetCam: false,
  });

  useImperativeHandle(ref, () => ({
    setVirtualJoystick: (dx: number, dz: number) => {
      controlStateRef.current.virtualDx = dx;
      controlStateRef.current.virtualDz = dz;
    },
    triggerAction: () => {
      controlStateRef.current.pendingAction = true;
    },
    triggerJump: () => {
      controlStateRef.current.pendingJump = true;
    },
    teleportToCurrentTarget: () => {
      controlStateRef.current.pendingTeleport = true;
    },
    resetCameraBehindPlayer: () => {
      controlStateRef.current.pendingResetCam = true;
    },
  }));

  // Track gender changes dynamically to rebuild avatar cleanly without recreating WebGL scene
  const rebuildAvatarFnRef = useRef<((g: GenderType) => void) | null>(null);
  useEffect(() => {
    rebuildAvatarFnRef.current?.(gender);
  }, [gender]);

  useEffect(() => {
    const mountEl = containerRef.current;
    if (!mountEl) return;

    // 1. Software WebGL Guard (per Three.js skill specification)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountEl.clientWidth || window.innerWidth, mountEl.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#CBE7FC');
    scene.fog = new THREE.FogExp2('#E8DABA', 0.0072);

    // 2. Studio PBR Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.55;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      55,
      (mountEl.clientWidth || window.innerWidth) / (mountEl.clientHeight || window.innerHeight),
      0.2,
      240
    );
    camera.position.set(0, 14, 28);

    // 3. Balanced Warm/Cool Outdoor Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#93C5FD', '#D4A373', 0.9);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#FFF5E0', 1.85);
    sunLight.position.set(36, 54, 28);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    const d = 52;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 4;
    sunLight.shadow.camera.far = 140;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#BAE6FD', 0.45);
    rimLight.position.set(-30, 22, -30);
    scene.add(rimLight);

    // 4. Procedural Textures & World Complexes
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAniso);

    const scenery = createOutdoorPerimeterScenery(textures);
    scene.add(scenery);

    const kaaba = createKaabaComplex(textures);
    scene.add(kaaba);

    const miqat = createMiqatComplex();
    scene.add(miqat.group);

    const hotelTanim = createHotelTanimComplex();
    scene.add(hotelTanim.group);

    const sai = createSaiComplex(textures);
    scene.add(sai.group);

    const arafah = createArafahComplex();
    scene.add(arafah.group);

    const mina = createMuzdalifahMinaComplex();
    scene.add(mina.group);

    const tahallul = createTahallulComplex();
    scene.add(tahallul.group);

    // Helper to highlight active Jamarat pillar in glowing gold
    function setHighlightedJamaratPillar(activeIndex: number | null) {
      for (let i = 0; i < 3; i++) {
        const mat = mina.pillarMeshes[i].material as THREE.MeshStandardMaterial;
        if (activeIndex === i) {
          mat.color.set('#FACC15');
          mat.emissive.set('#D97706');
          mat.emissiveIntensity = 0.55;
        } else {
          mat.color.set(i === 2 && activeIndex === null ? '#F59E0B' : '#94A3B8');
          mat.emissive.set('#000000');
          mat.emissiveIntensity = 0;
        }
      }
    }

    // Fellow Roblox Pilgrim NPCs peacefully performing Tawaf around Ka'bah
    const npcPilgrims: { rig: RobloxAvatarRig; angle: number; radius: number; speed: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const npcGender: GenderType = i % 2 === 0 ? 'putra' : 'putri';
      const rig = createRobloxAvatar(npcGender, textures, '#0EA5E9', true);
      const radius = 8.2 + (i % 3) * 2.3;
      const angle = (i / 6) * Math.PI * 2;
      rig.group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      scene.add(rig.group);
      npcPilgrims.push({
        rig,
        angle,
        radius,
        speed: 0.34 + (i % 3) * 0.05,
      });
    }

    // Player Avatar Rig
    let playerRig: RobloxAvatarRig = createRobloxAvatar(propsRef.current.gender, textures, '#2563EB', false);
    const playerPos = new THREE.Vector3(-24, 0, 25);
    let playerVelY = 0;
    let playerGrounded = true;
    let playerHeading = 0;
    let wearingIhramState = false;
    let hasCrownState = false;
    playerRig.group.position.copy(playerPos);
    scene.add(playerRig.group);

    rebuildAvatarFnRef.current = (newGender: GenderType) => {
      scene.remove(playerRig.group);
      playerRig = createRobloxAvatar(
        newGender,
        textures,
        newGender === 'putra' ? '#2563EB' : '#DB2777',
        wearingIhramState
      );
      playerRig.setCrown(hasCrownState);
      playerRig.group.position.copy(playerPos);
      playerRig.group.rotation.y = playerHeading;
      scene.add(playerRig.group);
    };

    // Active Station Beacon Ring & Floating Crystal Marker
    const beaconGroup = new THREE.Group();
    const beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.7, 36),
      new THREE.MeshBasicMaterial({
        color: '#FACC15',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.y = 0.06;
    const beaconDiamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 0),
      new THREE.MeshStandardMaterial({
        color: '#FDE047',
        emissive: '#F59E0B',
        emissiveIntensity: 0.9,
        roughness: 0.2,
      })
    );
    beaconDiamond.position.y = 3.6;
    beaconGroup.add(beaconRing, beaconDiamond);
    scene.add(beaconGroup);

    // Floating 3D Waypoint Guide Arrow around Player's Feet
    const guideArrowPivot = new THREE.Group();
    const arrowCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.72, 12),
      new THREE.MeshStandardMaterial({
        color: '#10B981',
        emissive: '#059669',
        emissiveIntensity: 0.75,
        roughness: 0.25,
      })
    );
    arrowCone.rotation.x = Math.PI / 2;
    arrowCone.position.set(0, 0.35, 1.85);
    guideArrowPivot.add(arrowCone);
    scene.add(guideArrowPivot);

    // Flying Pebble Projectile for Jumrah Throw
    const projectileMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({ color: '#FDE047', emissive: '#F59E0B', emissiveIntensity: 0.8 })
    );
    projectileMesh.visible = false;
    scene.add(projectileMesh);
    const activeThrow = {
      active: false,
      t: 0,
      speed: 3.2,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
    };

    // Pooled Blocky Roblox Particle Burst System (40 cubes, zero allocation in loop)
    const particlePool: {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
    }[] = [];
    const partGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    for (let i = 0; i < 40; i++) {
      const pMat = new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.3 });
      const pMesh = new THREE.Mesh(partGeo, pMat);
      pMesh.visible = false;
      scene.add(pMesh);
      particlePool.push({
        mesh: pMesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.8,
      });
    }

    function spawnBurst(origin: THREE.Vector3, hexColor: string, count = 16) {
      let spawned = 0;
      for (const p of particlePool) {
        if (p.life <= 0) {
          p.life = 0.65 + Math.random() * 0.35;
          p.maxLife = p.life;
          p.mesh.visible = true;
          p.mesh.position.set(origin.x, origin.y + 1.1, origin.z);
          (p.mesh.material as THREE.MeshStandardMaterial).color.set(hexColor);
          const ang = Math.random() * Math.PI * 2;
          const spd = 2.2 + Math.random() * 4.2;
          p.vel.set(Math.cos(ang) * spd, 3.5 + Math.random() * 4.0, Math.sin(ang) * spd);
          spawned++;
          if (spawned >= count) break;
        }
      }
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 5. Input Handling (Keyboard + Pointer Camera Orbit)
    const heldKeys = new Set<string>();
    let justPressedSpace = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      const code = e.code;
      if (code === 'Space') {
        if (!heldKeys.has(code)) {
          justPressedSpace = true;
        }
      }
      heldKeys.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.code);
    };

    const onWindowBlur = () => {
      heldKeys.clear();
      controlStateRef.current.virtualDx = 0;
      controlStateRef.current.virtualDz = 0;
    };

    let targetCamYaw = 0.5;
    let currentCamYaw = 0.5;
    let targetCamPitch = 0.42;
    let currentCamPitch = 0.42;
    let isDraggingCam = false;
    let prevPointerX = 0;
    let prevPointerY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.target !== renderer.domElement) return;
      isDraggingCam = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingCam) return;
      const dx = e.clientX - prevPointerX;
      const dy = e.clientY - prevPointerY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      targetCamYaw -= dx * 0.0065;
      targetCamPitch = THREE.MathUtils.clamp(targetCamPitch + dy * 0.005, 0.16, 1.05);
    };

    const onPointerUp = () => {
      isDraggingCam = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!mountEl) return;
      const w = mountEl.clientWidth || window.innerWidth;
      const h = mountEl.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 6. Per-Station Simulation State Machine (supports all 17 StationKind modes)
    let trackedStationId: string | null = null;
    let miqatStep = 0; // 0: fountain, 1: wardrobe, 2: niat prayer
    let secondaryIhramStep = 0; // 0: wardrobe, 1: niat prayer (for Hotel Makkah 8 Dzulhijjah & Tan'im Tanah Halal)
    let tawafCompletedLaps = 0;
    let tawafStartedOnLine = false;
    let tawafPrevAngle = 0;
    let tawafAccumulatedCCW = 0;
    let tawafWrongWayAccum = 0;
    let saiTrips = 0;
    let saiAnchoredAtShafa = false;
    let wukufPrayersCount = 0;
    let jumrahPebblesPicked = 0;
    let mabitMinaDone = false;
    let jumrahThrown = 0;
    let tahallulCuts = 0;
    let damStep = 0;
    let actionPoseTimer = 0;
    let activePoseMode: AvatarAnimMode = 'idle';
    let footstepTimer = 0;
    let lastHudBroadcastTime = 0;
    let completionSentForStation: string | null = null;

    function resetStationSimulationState(station: StationConfig | null) {
      trackedStationId = station ? station.id : null;
      miqatStep = 0;
      secondaryIhramStep = 0;
      tawafCompletedLaps = 0;
      tawafStartedOnLine = false;
      tawafPrevAngle = Math.atan2(playerPos.z, playerPos.x);
      tawafAccumulatedCCW = 0;
      tawafWrongWayAccum = 0;
      saiTrips = 0;
      saiAnchoredAtShafa = false;
      wukufPrayersCount = 0;
      arafah.prayerStars.forEach((s) => {
        s.collected = false;
        s.mesh.visible = true;
      });
      jumrahPebblesPicked = 0;
      mabitMinaDone = false;
      jumrahThrown = 0;
      mina.pebbles.forEach((p) => {
        p.collected = false;
        p.mesh.visible = station?.kind === 'mabit_muzdalifah';
      });
      tahallulCuts = 0;
      damStep = 0;
      setHighlightedJamaratPillar(null);

      // Reset avatar clothing when starting fresh at Miqat (Pos 1)
      if (station && station.kind === 'miqat') {
        wearingIhramState = false;
        hasCrownState = false;
        playerRig.setIhram(false);
        playerRig.setCrown(false);
        playerPos.set(-24, 0, 26);
      }
    }

    // Reusable Tawaf 7-lap evaluator
    function evaluateTawafLaps(isWada: boolean): {
      subLabel: string;
      hint: string;
      warn: string | null;
      canAct: boolean;
      actLabel: string | null;
    } {
      const r = Math.hypot(playerPos.x, playerPos.z);
      const curAngle = Math.atan2(playerPos.z, playerPos.x);
      const distFromStartAngle = Math.abs(normalizeAngleDiff(curAngle - Math.PI / 4));
      let warn: string | null = null;
      let canAct = false;
      let actLabel: string | null = null;
      let subLabel = '';
      let hint = '';

      if (!tawafStartedOnLine) {
        subLabel = isWada
          ? 'Persiapan Tawaf Wada\' di Garis Hijau'
          : 'Persiapan di Garis Hijau Hajar Aswad';
        hint =
          'Berjalanlah ke Garis Hijau sejajar sudut Hajar Aswad untuk memulai Putaran ke-1!';
        if (r >= 4.8 && r <= 19.5 && distFromStartAngle < 0.34) {
          tawafStartedOnLine = true;
          tawafPrevAngle = curAngle;
          tawafAccumulatedCCW = 0;
          soundEngine.playProgressTick(1, 8);
          spawnBurst(playerPos, '#10B981', 16);
          actionPoseTimer = 0.7;
          activePoseMode = 'wave';
        }
      } else {
        if (r >= 4.6 && r <= 20.5) {
          const dAng = normalizeAngleDiff(curAngle - tawafPrevAngle);
          tawafPrevAngle = curAngle;

          // Counter-clockwise around Ka'bah (Ka'bah on LEFT) has dAng < 0
          if (dAng < 0) {
            tawafAccumulatedCCW += -dAng;
            tawafWrongWayAccum = Math.max(0, tawafWrongWayAccum - (-dAng) * 2);
          } else if (dAng > 0) {
            tawafAccumulatedCCW = Math.max(0, tawafAccumulatedCCW - dAng);
            tawafWrongWayAccum += dAng;
          }

          if (tawafWrongWayAccum > 0.55) {
            warn =
              'Arah terbalik! Yuk putar balik agar Ka\'bah berada di sebelah KIRI pundakmu mengikuti panah emas!';
          }

          if (tawafAccumulatedCCW >= Math.PI * 2 - 0.08) {
            tawafAccumulatedCCW -= Math.PI * 2;
            tawafAccumulatedCCW = Math.max(0, tawafAccumulatedCCW);
            tawafCompletedLaps = Math.min(7, tawafCompletedLaps + 1);
            soundEngine.playProgressTick(tawafCompletedLaps, 7);
            spawnBurst(playerPos, '#FACC15', 22);
            actionPoseTimer = 0.8;
            activePoseMode = 'wave';
            if (isWada && tawafCompletedLaps >= 7) {
              hasCrownState = true;
              playerRig.setCrown(true);
            }
          }
        } else {
          tawafPrevAngle = curAngle;
          warn = 'Tetap berjalan di area lantai marmer putih pelataran Ka\'bah ya!';
        }

        const pct = Math.min(99, Math.round((tawafAccumulatedCCW / (Math.PI * 2)) * 100));
        subLabel =
          tawafCompletedLaps < 7
            ? `${isWada ? 'Tawaf Wada\'' : 'Tawaf'} Putaran ke-${tawafCompletedLaps + 1} (${pct}%)`
            : '7 Putaran Tawaf Selesai!';
        hint = isWada
          ? 'Kelilingi Ka\'bah 7 putaran berlawanan arah jarum jam sebagai perpisahan penuh syukur!'
          : 'Kelilingi Ka\'bah berlawanan arah jarum jam (Ka\'bah di kiri). Lambaikan tangan saat sejajar Garis Hijau!';
        canAct = distFromStartAngle < 0.45 && r < 19.5;
        actLabel = canAct ? 'Istilam: Bismillahi Allahu Akbar' : null;
      }

      return { subLabel, hint, warn, canAct, actLabel };
    }

    // Reusable Sa'i 7-trip evaluator
    function evaluateSaiTrips(inGreenRaml: boolean): {
      subLabel: string;
      hint: string;
    } {
      const inCorridorX = Math.abs(playerPos.x - 30) < 5.8;
      let subLabel = '';
      let hint = '';

      if (!saiAnchoredAtShafa) {
        subLabel = 'Mulai Sa\'i dari Bukit Shafa';
        hint = 'Berjalanlah ke ujung Bukit Shafa terlebih dahulu untuk memulai perjalanan ke-1!';
        if (inCorridorX && playerPos.z <= -14.2) {
          saiAnchoredAtShafa = true;
          soundEngine.playProgressTick(1, 8);
          spawnBurst(playerPos, '#06B6D4', 16);
        }
      } else {
        const headingToMarwah = saiTrips % 2 === 0;
        if (headingToMarwah && inCorridorX && playerPos.z >= 14.2) {
          saiTrips = Math.min(7, saiTrips + 1);
          soundEngine.playProgressTick(saiTrips, 7);
          spawnBurst(playerPos, '#06B6D4', 20);
          actionPoseTimer = 0.65;
          activePoseMode = 'pray';
        } else if (!headingToMarwah && inCorridorX && playerPos.z <= -14.2) {
          saiTrips = Math.min(7, saiTrips + 1);
          soundEngine.playProgressTick(saiTrips, 7);
          spawnBurst(playerPos, '#10B981', 20);
          actionPoseTimer = 0.65;
          activePoseMode = 'pray';
        }

        const nextHill = saiTrips % 2 === 0 ? 'Bukit Marwah' : 'Bukit Shafa';
        subLabel =
          saiTrips < 7
            ? `Sa'i Perjalanan ke-${saiTrips + 1} menuju ${nextHill}`
            : '7 Perjalanan Sa\'i Selesai di Marwah!';
        hint = inGreenRaml
          ? 'ZONA LAMPU HIJAU! Ayo berlari-lari kecil (Raml) penuh semangat!'
          : `Berjalanlah lurus di jalur Mas'a menuju ${nextHill}!`;
      }

      return { subLabel, hint };
    }

    // 7. Main Simulation & Render Loop (with Software-WebGL fenceSync guard)
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();
      const p = propsRef.current;

      // Animate NPC pilgrims around Ka'bah continuously (counter-clockwise: decreasing angle)
      for (const npc of npcPilgrims) {
        npc.angle -= npc.speed * dt;
        const nx = Math.cos(npc.angle) * npc.radius;
        const nz = Math.sin(npc.angle) * npc.radius;
        const tx = Math.sin(npc.angle);
        const tz = -Math.cos(npc.angle);
        npc.rig.group.position.set(nx, 0, nz);
        npc.rig.group.rotation.y = Math.atan2(tx, tz);
        npc.rig.updateAnimation(dt, elapsed + npc.radius, 3.2, 'walk');
      }

      // Spin Arafah stars & Muzdalifah pebbles
      for (const s of arafah.prayerStars) {
        if (s.mesh.visible) {
          s.mesh.rotation.y = elapsed * 1.8;
          s.mesh.position.y = 1.35 + Math.sin(elapsed * 3 + s.worldPos.x) * 0.18;
        }
      }
      for (const peb of mina.pebbles) {
        if (peb.mesh.visible) {
          peb.mesh.rotation.y = elapsed * 1.4;
          peb.mesh.position.y = 0.38 + Math.sin(elapsed * 3.2 + peb.worldPos.x) * 0.08;
        }
      }

      // Update particle pool
      for (const pt of particlePool) {
        if (pt.life > 0) {
          pt.life -= dt;
          if (pt.life <= 0) {
            pt.mesh.visible = false;
          } else {
            pt.vel.y -= 12.5 * dt;
            pt.mesh.position.addScaledVector(pt.vel, dt);
            pt.mesh.rotation.x += 5 * dt;
            pt.mesh.rotation.y += 4 * dt;
            const s = Math.max(0.05, pt.life / pt.maxLife);
            pt.mesh.scale.setScalar(s);
          }
        }
      }

      // Update stone projectile arc
      if (activeThrow.active) {
        activeThrow.t += dt * activeThrow.speed;
        if (activeThrow.t >= 1) {
          activeThrow.active = false;
          projectileMesh.visible = false;
          spawnBurst(activeThrow.end, '#F59E0B', 14);
        } else {
          const u = activeThrow.t;
          _tempVec.lerpVectors(activeThrow.start, activeThrow.end, u);
          _tempVec.y += Math.sin(u * Math.PI) * 3.1;
          projectileMesh.position.copy(_tempVec);
        }
      }

      // Title Screen Atmospheric Camera Orbit around Ka'bah & World
      if (p.screen === 'title') {
        beaconGroup.visible = false;
        guideArrowPivot.visible = false;
        const orbitAngle = elapsed * 0.18;
        camera.position.set(Math.cos(orbitAngle) * 26, 13.5, Math.sin(orbitAngle) * 26);
        camera.lookAt(0, 3.2, 0);
        renderer.render(scene, camera);
        if (isSoftwareGl) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
        return;
      }

      // Sync station change
      const st = p.activeStation;
      if ((st?.id ?? null) !== trackedStationId) {
        resetStationSimulationState(st);
      }

      if (controlStateRef.current.pendingResetCam) {
        controlStateRef.current.pendingResetCam = false;
        targetCamYaw = playerHeading + Math.PI;
        targetCamPitch = 0.42;
      }

      // Determine current objective target coordinate for guide arrow & teleport
      const objectiveWorldPos = new THREE.Vector3();
      if (st) {
        if (!p.simulationUnlocked) {
          objectiveWorldPos.set(st.worldPos[0], 0, st.worldPos[2]);
        } else if (st.kind === 'miqat') {
          if (miqatStep === 0) objectiveWorldPos.copy(miqat.fountainPos);
          else if (miqatStep === 1) objectiveWorldPos.copy(miqat.wardrobePos);
          else objectiveWorldPos.copy(miqat.prayerPos);
        } else if (st.kind === 'ihram_haji_hotel' || st.kind === 'ihram_tanah_halal') {
          if (secondaryIhramStep === 0) objectiveWorldPos.copy(hotelTanim.wardrobePos);
          else objectiveWorldPos.copy(hotelTanim.prayerPos);
        } else if (st.kind === 'tawaf' || st.kind === 'tawaf_wada') {
          if (!tawafStartedOnLine) {
            objectiveWorldPos.set(8.2, 0, 8.2);
          } else {
            const curAng = Math.atan2(playerPos.z, playerPos.x);
            const nextAng = curAng - 0.65;
            objectiveWorldPos.set(Math.cos(nextAng) * 10.5, 0, Math.sin(nextAng) * 10.5);
          }
        } else if (st.kind === 'sai') {
          if (!saiAnchoredAtShafa) {
            objectiveWorldPos.copy(sai.shafaPos);
          } else {
            if (saiTrips % 2 === 0) objectiveWorldPos.copy(sai.marwahPos);
            else objectiveWorldPos.copy(sai.shafaPos);
          }
        } else if (st.kind === 'tawaf_sai_gabung') {
          if (tawafCompletedLaps < 7) {
            if (!tawafStartedOnLine) {
              objectiveWorldPos.set(8.2, 0, 8.2);
            } else {
              const curAng = Math.atan2(playerPos.z, playerPos.x);
              const nextAng = curAng - 0.65;
              objectiveWorldPos.set(Math.cos(nextAng) * 10.5, 0, Math.sin(nextAng) * 10.5);
            }
          } else {
            if (!saiAnchoredAtShafa) {
              objectiveWorldPos.copy(sai.shafaPos);
            } else {
              if (saiTrips % 2 === 0) objectiveWorldPos.copy(sai.marwahPos);
              else objectiveWorldPos.copy(sai.shafaPos);
            }
          }
        } else if (
          st.kind === 'tahallul_umrah_lepas' ||
          st.kind === 'tahallul_awal' ||
          st.kind === 'tahallul_tsani' ||
          st.kind === 'tahallul'
        ) {
          objectiveWorldPos.copy(tahallul.chairWorldPos);
        } else if (st.kind === 'tahallul_dan_wada') {
          if (tahallulCuts < 3) {
            objectiveWorldPos.copy(tahallul.chairWorldPos);
          } else if (!tawafStartedOnLine) {
            objectiveWorldPos.set(8.2, 0, 8.2);
          } else {
            const curAng = Math.atan2(playerPos.z, playerPos.x);
            const nextAng = curAng - 0.65;
            objectiveWorldPos.set(Math.cos(nextAng) * 10.5, 0, Math.sin(nextAng) * 10.5);
          }
        } else if (st.kind === 'wukuf') {
          const nextStar = arafah.prayerStars.find((s) => !s.collected);
          if (nextStar) objectiveWorldPos.copy(nextStar.worldPos);
          else objectiveWorldPos.set(st.worldPos[0], 0, st.worldPos[2]);
        } else if (st.kind === 'mabit_muzdalifah') {
          const nextPebble = mina.pebbles.find((pb) => !pb.collected);
          if (nextPebble) objectiveWorldPos.copy(nextPebble.worldPos);
          else objectiveWorldPos.set(st.worldPos[0], 0, st.worldPos[2]);
        } else if (st.kind === 'jumrah_aqabah') {
          objectiveWorldPos.copy(mina.throwStandWorldPos);
        } else if (st.kind === 'jumrah_tasyrik') {
          if (!mabitMinaDone) objectiveWorldPos.copy(mina.minaTentWorldPos);
          else objectiveWorldPos.copy(mina.throwStandWorldPos);
        } else if (st.kind === 'bayar_dam') {
          objectiveWorldPos.copy(tahallul.damStandWorldPos);
        }
      }

      // Handle Teleport Helper (brings player to active objective entrance without skipping laps/steps)
      if (controlStateRef.current.pendingTeleport && st && !p.isModalOpen) {
        controlStateRef.current.pendingTeleport = false;
        if (!p.simulationUnlocked) {
          playerPos.set(st.worldPos[0], 0, st.worldPos[2] + 2.5);
        } else if (
          st.kind === 'tawaf' ||
          st.kind === 'tawaf_wada' ||
          (st.kind === 'tawaf_sai_gabung' && tawafCompletedLaps < 7) ||
          (st.kind === 'tahallul_dan_wada' && tahallulCuts >= 3)
        ) {
          playerPos.set(8.5, 0, 8.5);
          tawafPrevAngle = Math.atan2(playerPos.z, playerPos.x);
        } else if (
          st.kind === 'sai' ||
          (st.kind === 'tawaf_sai_gabung' && tawafCompletedLaps >= 7)
        ) {
          if (!saiAnchoredAtShafa || Math.abs(playerPos.x - 30) > 5.5) {
            playerPos.set(sai.shafaPos.x, 0, sai.shafaPos.z);
          } else {
            playerPos.x = 30;
          }
        } else if (st.kind === 'mabit_muzdalifah') {
          playerPos.set(objectiveWorldPos.x, 0, objectiveWorldPos.z + 1.8);
        } else {
          playerPos.set(objectiveWorldPos.x, 0, objectiveWorldPos.z + 1.1);
        }
        soundEngine.playJump();
        spawnBurst(playerPos, '#38BDF8', 12);
      }

      // Player Movement (paused when Video/Quiz modal is open)
      let moveSpeed = 0;
      const isSaiActivePhase =
        st?.kind === 'sai' || (st?.kind === 'tawaf_sai_gabung' && tawafCompletedLaps >= 7);
      const inRamlGreenZone =
        Boolean(isSaiActivePhase) &&
        p.simulationUnlocked &&
        Math.abs(playerPos.x - 30) < 4.5 &&
        Math.abs(playerPos.z) < 4.3;

      if (!p.isModalOpen && p.screen === 'playing') {
        let inputX = controlStateRef.current.virtualDx;
        let inputZ = controlStateRef.current.virtualDz;

        if (heldKeys.has('KeyW') || heldKeys.has('ArrowUp')) inputZ -= 1;
        if (heldKeys.has('KeyS') || heldKeys.has('ArrowDown')) inputZ += 1;
        if (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) inputX -= 1;
        if (heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) inputX += 1;

        _forward.set(-Math.sin(currentCamYaw), 0, -Math.cos(currentCamYaw)).normalize();
        _right.set(Math.cos(currentCamYaw), 0, -Math.sin(currentCamYaw)).normalize();

        _moveVec.set(0, 0, 0);
        _moveVec.addScaledVector(_right, inputX);
        _moveVec.addScaledVector(_forward, -inputZ);

        if (_moveVec.lengthSq() > 0.001) {
          _moveVec.normalize();
          const sprinting = heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight') || inRamlGreenZone;
          const baseMaxSpeed = sprinting ? 11.8 : 8.6;
          moveSpeed = baseMaxSpeed;

          playerPos.addScaledVector(_moveVec, moveSpeed * dt);

          // Collision keep-out from inside Ka'bah stone cube (radius 4.6m around 0,0)
          const distFromKaaba = Math.hypot(playerPos.x, playerPos.z);
          if (distFromKaaba < 4.65) {
            const pushScale = 4.65 / Math.max(0.01, distFromKaaba);
            playerPos.x *= pushScale;
            playerPos.z *= pushScale;
          }

          // World perimeter clamp
          playerPos.x = THREE.MathUtils.clamp(playerPos.x, -56, 56);
          playerPos.z = THREE.MathUtils.clamp(playerPos.z, -56, 56);

          const desiredHeading = Math.atan2(_moveVec.x, _moveVec.z);
          const headingDiff = normalizeAngleDiff(desiredHeading - playerHeading);
          playerHeading += headingDiff * (1 - Math.exp(-14 * dt));

          footstepTimer += dt * (sprinting ? 1.35 : 1.0);
          if (footstepTimer > 0.28 && playerGrounded) {
            footstepTimer = 0;
            soundEngine.playStep();
            if (inRamlGreenZone) {
              spawnBurst(playerPos, '#22C55E', 3);
            }
          }
        }

        if (controlStateRef.current.pendingJump && playerGrounded) {
          controlStateRef.current.pendingJump = false;
          playerVelY = 6.8;
          playerGrounded = false;
          soundEngine.playJump();
        }
      }

      // Vertical Jump Physics
      if (!playerGrounded || playerPos.y > 0) {
        playerPos.y += playerVelY * dt;
        playerVelY -= 19.5 * dt;
        if (playerPos.y <= 0) {
          playerPos.y = 0;
          playerVelY = 0;
          playerGrounded = true;
        }
      }

      playerRig.group.position.copy(playerPos);
      playerRig.group.rotation.y = playerHeading;

      // Update Beacon & Guide Arrow
      if (st && p.screen === 'playing') {
        beaconGroup.visible = true;
        beaconGroup.position.set(objectiveWorldPos.x, 0, objectiveWorldPos.z);
        beaconDiamond.rotation.y = elapsed * 2.0;
        beaconDiamond.position.y = 3.2 + Math.sin(elapsed * 3.5) * 0.25;

        _guideDir.set(objectiveWorldPos.x - playerPos.x, 0, objectiveWorldPos.z - playerPos.z);
        const guideDist = _guideDir.length();
        guideArrowPivot.visible = guideDist > 2.4;
        guideArrowPivot.position.set(playerPos.x, 0.05, playerPos.z);
        if (guideDist > 0.1) {
          guideArrowPivot.rotation.y = Math.atan2(_guideDir.x, _guideDir.z);
        }
      } else {
        beaconGroup.visible = false;
        guideArrowPivot.visible = false;
      }

      // Consume Action Trigger (Spacebar or UI Action Button)
      const actionTriggered =
        !p.isModalOpen && (justPressedSpace || controlStateRef.current.pendingAction);
      justPressedSpace = false;
      controlStateRef.current.pendingAction = false;

      // Evaluate Station Mechanics
      let currentCount = 0;
      let targetCount = st ? st.targetCount : 1;
      let subStepLabel = '';
      let hintMessage = '';
      let warningMessage: string | null = null;
      let canTriggerAction = false;
      let actionButtonLabel: string | null = null;
      let nearStationPortal = false;
      let distToActive = 0;

      if (st && p.screen === 'playing') {
        distToActive = Math.hypot(playerPos.x - st.worldPos[0], playerPos.z - st.worldPos[2]);

        if (!p.simulationUnlocked) {
          nearStationPortal = distToActive < 5.8;
          subStepLabel = `Menuju Pos ${st.stepNumber}: ${st.shortLabel}`;
          hintMessage = nearStationPortal
            ? `Kamu sudah tiba di ${st.locationName}! Tekan tombol "Tonton Video & Kuis" untuk memulai!`
            : `Ikuti panah hijau menuju ${st.locationName} (${Math.round(distToActive)}m) atau klik "Ke Lokasi Pos".`;
          canTriggerAction = nearStationPortal;
          actionButtonLabel = nearStationPortal ? 'Mulai Pos (Video & Kuis)' : null;

          if (actionTriggered && nearStationPortal) {
            p.onNearStationEnter();
          } else if (actionTriggered && playerGrounded) {
            playerVelY = 6.8;
            playerGrounded = false;
            soundEngine.playJump();
          }
        } else {
          // ==================================================================
          // ACTIVE POS 3D SIMULATION MECHANICS
          // ==================================================================
          if (st.kind === 'miqat') {
            currentCount = miqatStep;
            targetCount = 3;
            if (miqatStep === 0) {
              const dFountain = Math.hypot(
                playerPos.x - miqat.fountainPos.x,
                playerPos.z - miqat.fountainPos.z
              );
              subStepLabel = 'Tahap 1/3: Mandi Sunnah & Wudhu';
              hintMessage = 'Dekati Pancuran Air Biru di Paviliun Miqat lalu tekan tombol Bersuci!';
              canTriggerAction = dFountain < 3.5;
              actionButtonLabel = canTriggerAction ? 'Bersuci & Wudhu' : null;
              if (actionTriggered && canTriggerAction) {
                miqatStep = 1;
                soundEngine.playWaterSplash();
                spawnBurst(playerPos, '#38BDF8', 22);
                actionPoseTimer = 0.7;
                activePoseMode = 'celebrate';
              }
            } else if (miqatStep === 1) {
              const dBooth = Math.hypot(
                playerPos.x - miqat.wardrobePos.x,
                playerPos.z - miqat.wardrobePos.z
              );
              subStepLabel = 'Tahap 2/3: Berganti Pakaian Ihram';
              hintMessage = 'Dekati Bilik Ganti Biru-Kuning untuk mengenakan Pakaian Ihram Putih!';
              canTriggerAction = dBooth < 3.6;
              actionButtonLabel = canTriggerAction ? 'Ganti Baju Ihram Putih' : null;
              if (actionTriggered && canTriggerAction) {
                miqatStep = 2;
                wearingIhramState = true;
                playerRig.setIhram(true);
                soundEngine.playIhramSwap();
                spawnBurst(playerPos, '#FFFFFF', 26);
                actionPoseTimer = 0.85;
                activePoseMode = 'celebrate';
              }
            } else if (miqatStep === 2) {
              const dPray = Math.hypot(
                playerPos.x - miqat.prayerPos.x,
                playerPos.z - miqat.prayerPos.z
              );
              subStepLabel = 'Tahap 3/3: Niat Ihram & Talbiyah';
              hintMessage = 'Berdirilah di atas Karpet Hijau lalu lafalkan Niat & Kalimat Talbiyah!';
              canTriggerAction = dPray < 3.6;
              actionButtonLabel = canTriggerAction ? 'Lafalkan Niat & Talbiyah' : null;
              if (actionTriggered && canTriggerAction) {
                miqatStep = 3;
                currentCount = 3;
                soundEngine.playProgressTick(3, 3);
                spawnBurst(playerPos, '#10B981', 28);
                actionPoseTimer = 1.4;
                activePoseMode = 'pray';
              }
            }
          } else if (st.kind === 'ihram_haji_hotel' || st.kind === 'ihram_tanah_halal') {
            const isHotel = st.kind === 'ihram_haji_hotel';
            targetCount = 2;
            currentCount = secondaryIhramStep;

            if (secondaryIhramStep === 0) {
              const dBooth = Math.hypot(
                playerPos.x - hotelTanim.wardrobePos.x,
                playerPos.z - hotelTanim.wardrobePos.z
              );
              subStepLabel = isHotel
                ? 'Tahap 1/2: Pakai Kain Ihram di Hotel Makkah (8 Dzulhijjah)'
                : 'Tahap 1/2: Pakai Kain Ihram di Masjid Tan\'im (Tanah Halal)';
              hintMessage = isHotel
                ? 'Dekati Bilik Persiapan Hotel Makkah untuk mengenakan kembali Pakaian Ihram Putih!'
                : 'Dekati Bilik Masjid Tan\'im di Tanah Halal untuk mengenakan Pakaian Ihram Putih!';
              canTriggerAction = dBooth < 3.6;
              actionButtonLabel = canTriggerAction ? 'Pakai Pakaian Ihram Putih' : null;
              if (actionTriggered && canTriggerAction) {
                secondaryIhramStep = 1;
                wearingIhramState = true;
                playerRig.setIhram(true);
                soundEngine.playIhramSwap();
                spawnBurst(playerPos, '#FFFFFF', 24);
                actionPoseTimer = 0.85;
                activePoseMode = 'celebrate';
              }
            } else if (secondaryIhramStep === 1) {
              const dPray = Math.hypot(
                playerPos.x - hotelTanim.prayerPos.x,
                playerPos.z - hotelTanim.prayerPos.z
              );
              subStepLabel = isHotel
                ? 'Tahap 2/2: Lafalkan Niat Haji (Labbaik Allahumma Hajjan)'
                : 'Tahap 2/2: Lafalkan Niat Umrah (Labbaik Allahumma \'Umratan)';
              hintMessage = 'Berdirilah di atas Sajadah Hijau lalu ucapkan Niat & Talbiyah!';
              canTriggerAction = dPray < 3.6;
              actionButtonLabel = canTriggerAction
                ? isHotel
                  ? 'Niat Haji: Labbaik Allahumma Hajjan'
                  : 'Niat Umrah: Labbaik Allahumma \'Umratan'
                : null;
              if (actionTriggered && canTriggerAction) {
                secondaryIhramStep = 2;
                currentCount = 2;
                soundEngine.playProgressTick(2, 2);
                spawnBurst(playerPos, '#0D9488', 26);
                actionPoseTimer = 1.3;
                activePoseMode = 'pray';
              }
            }
          } else if (st.kind === 'tawaf' || st.kind === 'tawaf_wada') {
            targetCount = 7;
            const res = evaluateTawafLaps(st.kind === 'tawaf_wada');
            subStepLabel = res.subLabel;
            hintMessage = res.hint;
            warningMessage = res.warn;
            canTriggerAction = res.canAct;
            actionButtonLabel = res.actLabel;
            if (actionTriggered && canTriggerAction) {
              actionPoseTimer = 0.8;
              activePoseMode = 'wave';
              soundEngine.playClick();
              spawnBurst(playerPos, '#FDE047', 10);
            }
            currentCount = tawafCompletedLaps;
          } else if (st.kind === 'sai') {
            targetCount = 7;
            const res = evaluateSaiTrips(inRamlGreenZone);
            subStepLabel = res.subLabel;
            hintMessage = res.hint;
            currentCount = saiTrips;
          } else if (st.kind === 'tawaf_sai_gabung') {
            targetCount = 14;
            if (tawafCompletedLaps < 7) {
              const res = evaluateTawafLaps(false);
              subStepLabel = `Bagian 1/2 — ${res.subLabel}`;
              hintMessage = res.hint;
              warningMessage = res.warn;
              canTriggerAction = res.canAct;
              actionButtonLabel = res.actLabel;
              if (actionTriggered && canTriggerAction) {
                actionPoseTimer = 0.8;
                activePoseMode = 'wave';
                soundEngine.playClick();
                spawnBurst(playerPos, '#FDE047', 10);
              }
              currentCount = tawafCompletedLaps;
            } else {
              const res = evaluateSaiTrips(inRamlGreenZone);
              subStepLabel = `Bagian 2/2 — ${res.subLabel}`;
              hintMessage = !saiAnchoredAtShafa
                ? 'Alhamdulillah 7 putaran Tawaf tuntas! Sekarang jalan atau klik "Dekati Titik" ke Bukit Shafa untuk Sa\'i 7x!'
                : res.hint;
              currentCount = 7 + saiTrips;
            }
          } else if (
            st.kind === 'tahallul_umrah_lepas' ||
            st.kind === 'tahallul_awal' ||
            st.kind === 'tahallul'
          ) {
            targetCount = 3;
            const dChair = Math.hypot(
              playerPos.x - tahallul.chairWorldPos.x,
              playerPos.z - tahallul.chairWorldPos.z
            );
            currentCount = tahallulCuts;
            subStepLabel =
              st.kind === 'tahallul_umrah_lepas'
                ? `Cukur Rambut Tahallul Umrah (${tahallulCuts}/3)`
                : st.kind === 'tahallul_awal'
                ? `Cukur Rambut Tahallul Awal (${tahallulCuts}/3)`
                : `Potong Helai Rambut Tahallul (${tahallulCuts}/3)`;
            hintMessage =
              dChair < 3.8
                ? st.kind === 'tahallul_umrah_lepas'
                  ? 'Tekan "Cukur Rambut" 3x agar bebas dari pakaian ihram sambil menunggu waktu Haji 8 Dzulhijjah!'
                  : st.kind === 'tahallul_awal'
                  ? 'Tekan "Cukur Rambut" 3x untuk meraih Tahallul Awal dan kembali mengenakan pakaian biasa!'
                  : 'Tekan "Gunting Rambut" 3 kali untuk menyempurnakan ibadah Umrahmu!'
                : 'Dekati Kursi Emas di Paviliun Tahallul untuk memotong minimal 3 helai rambut!';
            canTriggerAction = dChair < 3.8;
            actionButtonLabel = canTriggerAction ? `Cukur Rambut (${tahallulCuts + 1}/3)` : null;

            if (actionTriggered && canTriggerAction) {
              tahallulCuts++;
              currentCount = tahallulCuts;
              soundEngine.playProgressTick(tahallulCuts, 3);
              spawnBurst(playerPos, '#A855F7', 18);
              actionPoseTimer = 0.65;
              activePoseMode = 'celebrate';
              if (tahallulCuts >= 3) {
                wearingIhramState = false;
                playerRig.setIhram(false);
                soundEngine.playIhramSwap();
                if (st.kind === 'tahallul') {
                  hasCrownState = true;
                  playerRig.setCrown(true);
                }
              }
            }
          } else if (st.kind === 'tahallul_tsani') {
            targetCount = 3;
            const dChair = Math.hypot(
              playerPos.x - tahallul.chairWorldPos.x,
              playerPos.z - tahallul.chairWorldPos.z
            );
            currentCount = tahallulCuts;
            const stepTitles = [
              'Konfirmasi 1/3: Lontar Jumrah & Cukur Terlaksana',
              'Konfirmasi 2/3: Tawaf Ifadah & Sa\'i Terlaksana',
              'Konfirmasi 3/3: Sempurna Tahallul Tsani (Kedua)!',
            ];
            subStepLabel = stepTitles[Math.min(2, tahallulCuts)];
            hintMessage =
              dChair < 3.8
                ? 'Tekan tombol Konfirmasi Tahallul Tsani 3 kali sebagai tanda bebas penuh dari seluruh larangan Ihram!'
                : 'Dekati Paviliun Tahallul Emas untuk menyempurnakan Tahallul Tsani!';
            canTriggerAction = dChair < 3.8;
            actionButtonLabel = canTriggerAction
              ? `Sempurnakan Tahallul Tsani (${tahallulCuts + 1}/3)`
              : null;

            if (actionTriggered && canTriggerAction) {
              tahallulCuts++;
              currentCount = tahallulCuts;
              wearingIhramState = false;
              playerRig.setIhram(false);
              soundEngine.playProgressTick(tahallulCuts, 3);
              spawnBurst(playerPos, '#FACC15', 20);
              actionPoseTimer = 0.75;
              activePoseMode = 'celebrate';
            }
          } else if (st.kind === 'tahallul_dan_wada') {
            targetCount = 10;
            if (tahallulCuts < 3) {
              const dChair = Math.hypot(
                playerPos.x - tahallul.chairWorldPos.x,
                playerPos.z - tahallul.chairWorldPos.z
              );
              currentCount = tahallulCuts;
              subStepLabel = `Bagian 1/2 — Cukur Rambut Tahallul Umrah (${tahallulCuts}/3)`;
              hintMessage =
                dChair < 3.8
                  ? 'Tekan "Cukur Rambut" 3 kali untuk menyelesaikan Umrah Ifrad sebelum Tawaf Wada\'!'
                  : 'Dekati Kursi Emas di Paviliun Tahallul untuk memotong minimal 3 helai rambut!';
              canTriggerAction = dChair < 3.8;
              actionButtonLabel = canTriggerAction ? `Cukur Rambut (${tahallulCuts + 1}/3)` : null;

              if (actionTriggered && canTriggerAction) {
                tahallulCuts++;
                currentCount = tahallulCuts;
                soundEngine.playProgressTick(tahallulCuts, 3);
                spawnBurst(playerPos, '#A855F7', 18);
                actionPoseTimer = 0.65;
                activePoseMode = 'celebrate';
                if (tahallulCuts >= 3) {
                  wearingIhramState = false;
                  playerRig.setIhram(false);
                  soundEngine.playIhramSwap();
                }
              }
            } else {
              const res = evaluateTawafLaps(true);
              subStepLabel = `Bagian 2/2 — ${res.subLabel}`;
              hintMessage = !tawafStartedOnLine
                ? 'Tahallul Umrah selesai! Sekarang menuju Ka\'bah (klik "Dekati Titik") untuk 7 putaran Tawaf Wada\' perpisahan!'
                : res.hint;
              warningMessage = res.warn;
              canTriggerAction = res.canAct;
              actionButtonLabel = res.actLabel;
              if (actionTriggered && canTriggerAction) {
                actionPoseTimer = 0.8;
                activePoseMode = 'wave';
                soundEngine.playClick();
                spawnBurst(playerPos, '#FDE047', 10);
              }
              currentCount = 3 + tawafCompletedLaps;
            }
          } else if (st.kind === 'wukuf') {
            targetCount = 5;
            let nearestStar: (typeof arafah.prayerStars)[0] | null = null;
            let minDist = Infinity;
            for (const s of arafah.prayerStars) {
              if (!s.collected) {
                const dStar = Math.hypot(playerPos.x - s.worldPos.x, playerPos.z - s.worldPos.z);
                if (dStar < minDist) {
                  minDist = dStar;
                  nearestStar = s;
                }
              }
            }

            if (nearestStar && minDist < 2.7) {
              canTriggerAction = true;
              actionButtonLabel = `Berdoa: ${nearestStar.label}`;
              if (actionTriggered) {
                nearestStar.collected = true;
                nearestStar.mesh.visible = false;
                wukufPrayersCount++;
                soundEngine.playProgressTick(wukufPrayersCount, 5);
                spawnBurst(nearestStar.worldPos, '#F97316', 22);
                actionPoseTimer = 1.1;
                activePoseMode = 'pray';
              }
            }

            currentCount = wukufPrayersCount;
            subStepLabel = `Wukuf 9 Dzulhijjah: Doa & Dzikir (${wukufPrayersCount}/5)`;
            hintMessage = nearestStar
              ? minDist < 2.7
                ? `Tekan tombol "Berdoa: ${nearestStar.label}" atau tombol Spasi!`
                : `Dekati Bintang Cahaya Emas di Padang Arafah untuk memanjatkan ${nearestStar.label}!`
              : 'Alhamdulillah, Wukuf di Arafah telah dilaksanakan dengan khusyuk!';
          } else if (st.kind === 'mabit_muzdalifah') {
            targetCount = 7;
            let nearestPebble: (typeof mina.pebbles)[0] | null = null;
            let minPebDist = Infinity;

            for (const pb of mina.pebbles) {
              if (!pb.collected) {
                const dPeb = Math.hypot(playerPos.x - pb.worldPos.x, playerPos.z - pb.worldPos.z);
                if (dPeb < minPebDist) {
                  minPebDist = dPeb;
                  nearestPebble = pb;
                }
                if (dPeb < 1.95) {
                  pb.collected = true;
                  pb.mesh.visible = false;
                  jumrahPebblesPicked = Math.min(7, jumrahPebblesPicked + 1);
                  soundEngine.playProgressTick(jumrahPebblesPicked, 7);
                  spawnBurst(pb.worldPos, '#38BDF8', 12);
                }
              }
            }

            if (nearestPebble && !nearestPebble.collected && minPebDist < 2.8) {
              canTriggerAction = true;
              actionButtonLabel = `Pungut Kerikil (${jumrahPebblesPicked + 1}/7)`;
              if (actionTriggered) {
                nearestPebble.collected = true;
                nearestPebble.mesh.visible = false;
                jumrahPebblesPicked = Math.min(7, jumrahPebblesPicked + 1);
                soundEngine.playProgressTick(jumrahPebblesPicked, 7);
                spawnBurst(nearestPebble.worldPos, '#38BDF8', 12);
              }
            }

            currentCount = jumrahPebblesPicked;
            subStepLabel = `Mabit Muzdalifah: Cari Kerikil (${jumrahPebblesPicked}/7)`;
            hintMessage =
              'Berjalanlah menyusuri batu-batu kerikil biru bercahaya di Muzdalifah untuk mengumpulkan 7 kerikil bekal Mina!';
          } else if (st.kind === 'jumrah_aqabah') {
            targetCount = 7;
            setHighlightedJamaratPillar(2);
            const dThrow = Math.hypot(
              playerPos.x - mina.throwStandWorldPos.x,
              playerPos.z - mina.throwStandWorldPos.z
            );
            currentCount = jumrahThrown;
            subStepLabel = `10 Dzulhijjah: Lempar Jumrah Aqabah (${jumrahThrown}/7)`;
            hintMessage =
              dThrow < 5.8
                ? 'Arahkan ke Tiang Jumrah Aqabah (Emas di sebelah kanan) lalu lempar 7 kerikil satu per satu!'
                : 'Berjalanlah ke depan Kolam Jamarat Mina untuk melontar Jumrah Aqabah!';
            canTriggerAction = dThrow < 5.8 && !activeThrow.active && jumrahThrown < 7;
            actionButtonLabel = canTriggerAction
              ? `Lempar Aqabah ke-${jumrahThrown + 1}/7 (Bismillahi Allahu Akbar!)`
              : null;

            if (actionTriggered && canTriggerAction) {
              jumrahThrown++;
              currentCount = jumrahThrown;
              soundEngine.playThrowStone();
              actionPoseTimer = 0.45;
              activePoseMode = 'throw';
              const targetPos = mina.pillarWorldPositions[2];
              playerHeading = Math.atan2(targetPos.x - playerPos.x, targetPos.z - playerPos.z);
              activeThrow.active = true;
              activeThrow.t = 0;
              activeThrow.speed = 3.0;
              activeThrow.start.set(playerPos.x, playerPos.y + 1.5, playerPos.z);
              activeThrow.end.copy(targetPos);
              projectileMesh.visible = true;
              projectileMesh.position.copy(activeThrow.start);
            }
          } else if (st.kind === 'jumrah_tasyrik') {
            targetCount = 22;
            if (!mabitMinaDone) {
              setHighlightedJamaratPillar(null);
              const dTent = Math.hypot(
                playerPos.x - mina.minaTentWorldPos.x,
                playerPos.z - mina.minaTentWorldPos.z
              );
              currentCount = 0;
              subStepLabel = 'Tahap 1: Mabit di Perkemahan Tenda Putih Mina';
              hintMessage =
                dTent < 4.5
                  ? 'Tekan tombol "Mabit & Dzikir Hari Tasyrik" di depan Tenda Putih Mina!'
                  : 'Dekati Tenda Putih Perkemahan Mina terlebih dahulu untuk melaksanakan Mabit!';
              canTriggerAction = dTent < 4.5;
              actionButtonLabel = canTriggerAction ? 'Mabit & Dzikir di Tenda Mina' : null;

              if (actionTriggered && canTriggerAction) {
                mabitMinaDone = true;
                currentCount = 1;
                soundEngine.playProgressTick(1, 4);
                spawnBurst(playerPos, '#10B981', 22);
                actionPoseTimer = 0.9;
                activePoseMode = 'pray';
              }
            } else {
              const pillarIdx = Math.min(2, Math.floor(jumrahThrown / 7));
              const stoneInPillar = (jumrahThrown % 7) + 1;
              setHighlightedJamaratPillar(pillarIdx);

              const dThrow = Math.hypot(
                playerPos.x - mina.throwStandWorldPos.x,
                playerPos.z - mina.throwStandWorldPos.z
              );
              currentCount = 1 + jumrahThrown;
              const pillarName = JUMRAH_NAMES[pillarIdx];
              subStepLabel =
                jumrahThrown < 21
                  ? `Hari Tasyrik — Lontar ${pillarName} (${stoneInPillar}/7)`
                  : 'Mabit & Lontar 3 Jumrah Tuntas!';
              hintMessage =
                dThrow < 6.2
                  ? `Lontarkan 7 kerikil berurutan ke tiang yang menyala emas: sekarang ${pillarName}!`
                  : 'Berjalanlah ke depan Kolam Tiga Tiang Jamarat Mina (atau klik "Dekati Titik")!';
              canTriggerAction = dThrow < 6.2 && !activeThrow.active && jumrahThrown < 21;
              actionButtonLabel = canTriggerAction
                ? `Lempar ${pillarName} (${stoneInPillar}/7)`
                : null;

              if (actionTriggered && canTriggerAction) {
                const targetPos = mina.pillarWorldPositions[pillarIdx];
                jumrahThrown++;
                currentCount = 1 + jumrahThrown;
                soundEngine.playThrowStone();
                actionPoseTimer = 0.38;
                activePoseMode = 'throw';
                playerHeading = Math.atan2(targetPos.x - playerPos.x, targetPos.z - playerPos.z);
                activeThrow.active = true;
                activeThrow.t = 0;
                activeThrow.speed = 4.0;
                activeThrow.start.set(playerPos.x, playerPos.y + 1.5, playerPos.z);
                activeThrow.end.copy(targetPos);
                projectileMesh.visible = true;
                projectileMesh.position.copy(activeThrow.start);
              }
            }
          } else if (st.kind === 'bayar_dam') {
            targetCount = 3;
            const dDam = Math.hypot(
              playerPos.x - tahallul.damStandWorldPos.x,
              playerPos.z - tahallul.damStandWorldPos.z
            );
            currentCount = damStep;
            const damSubLabels = [
              'Tahap 1/3: Pilih Hewan Hadyu (Kambing Sehat)',
              'Tahap 2/3: Sembelih Hewan Dam karena Allah',
              'Tahap 3/3: Bagikan Daging kepada Fakir Miskin Makkah',
            ];
            const damButtons = [
              '1/3 Pilih Kambing Hadyu Sehat',
              '2/3 Sembelih (Bismillahi Allahu Akbar)',
              '3/3 Bagikan ke Fakir Miskin',
            ];
            subStepLabel = damSubLabels[Math.min(2, damStep)];
            hintMessage =
              dDam < 3.8
                ? 'Tekan tombol aksi di Meja Domba Hadyu untuk menunaikan kewajiban Dam Syukur!'
                : 'Dekati Pos Hewan Kurban Hadyu (Domba Putih) untuk menunaikan kewajiban Membayar Dam!';
            canTriggerAction = dDam < 3.8;
            actionButtonLabel = canTriggerAction ? damButtons[Math.min(2, damStep)] : null;

            if (actionTriggered && canTriggerAction) {
              damStep++;
              currentCount = damStep;
              soundEngine.playProgressTick(damStep, 3);
              spawnBurst(playerPos, '#8B5CF6', 22);
              actionPoseTimer = 0.8;
              activePoseMode = damStep === 2 ? 'pray' : 'celebrate';
            }
          }

          // Fallback jump if Space pressed when no station action was available
          if (actionTriggered && !canTriggerAction && playerGrounded) {
            playerVelY = 6.8;
            playerGrounded = false;
            soundEngine.playJump();
          }

          // Check Station Simulation Completion!
          if (currentCount >= targetCount && completionSentForStation !== st.id) {
            completionSentForStation = st.id;
            soundEngine.playBadgeUnlock();
            spawnBurst(playerPos, '#FACC15', 36);
            actionPoseTimer = 2.0;
            activePoseMode = 'celebrate';
            p.onStationSimulationComplete(st.id);
          }
        }
      }

      // Animate Player Rig
      if (actionPoseTimer > 0) {
        actionPoseTimer -= dt;
        playerRig.updateAnimation(dt, elapsed, moveSpeed, activePoseMode);
      } else {
        playerRig.updateAnimation(dt, elapsed, moveSpeed, moveSpeed > 0.25 ? 'walk' : 'idle');
      }

      // Smooth Exponential-Damped Third-Person Camera
      const dampAlpha = 1 - Math.exp(-10 * dt);
      currentCamYaw += (targetCamYaw - currentCamYaw) * dampAlpha;
      currentCamPitch += (targetCamPitch - currentCamPitch) * dampAlpha;

      const camDist = 11.8;
      const horizDist = Math.cos(currentCamPitch) * camDist;
      const vertDist = Math.sin(currentCamPitch) * camDist;

      _camLookTarget.set(playerPos.x, playerPos.y + 1.85, playerPos.z);
      _desiredCamPos.set(
        _camLookTarget.x + Math.sin(currentCamYaw) * horizDist,
        Math.max(1.6, _camLookTarget.y + vertDist),
        _camLookTarget.z + Math.cos(currentCamYaw) * horizDist
      );

      camera.position.lerp(_desiredCamPos, 1 - Math.exp(-12 * dt));
      camera.lookAt(_camLookTarget);

      // Throttled HUD Progress Sync (12 Hz max so React HUD stays responsive without re-render spam)
      if (elapsed - lastHudBroadcastTime > 0.08) {
        lastHudBroadcastTime = elapsed;
        p.onProgressUpdate({
          stationId: st ? st.id : null,
          stationKind: st ? st.kind : null,
          currentCount,
          targetCount,
          subStepLabel,
          hintMessage,
          warningMessage,
          canTriggerAction,
          actionButtonLabel,
          distanceToActiveStation: Math.round(distToActive),
          nearStationPortal,
        });
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      textures.disposeAll();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 w-full h-full z-0" />;
});
