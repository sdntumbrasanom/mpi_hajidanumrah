import * as THREE from 'three';
import { GenderType } from '../types/game';
import { ProceduralTextureSet } from './textures';

export type AvatarAnimMode = 'idle' | 'walk' | 'pray' | 'wave' | 'throw' | 'celebrate';

export interface RobloxAvatarRig {
  group: THREE.Group;
  setIhram: (wearingIhram: boolean) => void;
  setCrown: (hasCrown: boolean) => void;
  updateAnimation: (dt: number, elapsed: number, speed: number, mode: AvatarAnimMode) => void;
}

function createRoundedBoxGeometry(w: number, h: number, d: number, bevel = 0.05): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hw = w / 2 - bevel;
  const hh = h / 2 - bevel;
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, d - bevel * 2),
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geo.center();
  return geo;
}

export function createRobloxAvatar(
  gender: GenderType,
  textures: ProceduralTextureSet,
  casualColorHex = '#2563EB',
  initialIhram = false
): RobloxAvatarRig {
  const group = new THREE.Group();

  // Ground contact shadow (prevents floating look)
  const shadowGeo = new THREE.PlaneGeometry(1.7, 1.7);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);

  const skinMat = new THREE.MeshStandardMaterial({
    color: '#F6C799',
    roughness: 0.55,
    metalness: 0.05,
  });

  const casualTopMat = new THREE.MeshStandardMaterial({
    color: casualColorHex,
    roughness: 0.65,
    metalness: 0.08,
  });

  const casualBottomMat = new THREE.MeshStandardMaterial({
    color: gender === 'putra' ? '#1E293B' : '#334155',
    roughness: 0.75,
    metalness: 0.05,
  });

  const ihramMat = new THREE.MeshStandardMaterial({
    map: textures.ihramFabric,
    color: '#FFFFFF',
    roughness: 0.82,
    metalness: 0.02,
  });

  const hairPeciMat = new THREE.MeshStandardMaterial({
    color: gender === 'putra' ? '#0F766E' : '#EC4899',
    roughness: 0.45,
    metalness: 0.12,
  });

  const whiteHijabMat = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    roughness: 0.75,
    metalness: 0.03,
  });

  // Legs (pivoted at hips y = 0.78)
  const legGeo = createRoundedBoxGeometry(0.36, 0.72, 0.36, 0.04);
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.21, 0.76, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, casualBottomMat);
  leftLegMesh.position.y = -0.38;
  leftLegMesh.castShadow = true;
  leftLegPivot.add(leftLegMesh);
  bodyRoot.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.21, 0.76, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, casualBottomMat);
  rightLegMesh.position.y = -0.38;
  rightLegMesh.castShadow = true;
  rightLegPivot.add(rightLegMesh);
  bodyRoot.add(rightLegPivot);

  // Torso (Roblox blocky beveled chest)
  const torsoGeo = createRoundedBoxGeometry(0.84, 0.88, 0.44, 0.05);
  const torsoMesh = new THREE.Mesh(torsoGeo, casualTopMat);
  torsoMesh.position.y = 1.2;
  torsoMesh.castShadow = true;
  bodyRoot.add(torsoMesh);

  // Ihram lower wrap (Izar / Skirt) & diagonal shoulder sash (Rida' Idhthiba' for Putra)
  const ihramWrapGroup = new THREE.Group();
  const izarGeo = createRoundedBoxGeometry(0.88, 0.56, 0.48, 0.04);
  const izarMesh = new THREE.Mesh(izarGeo, ihramMat);
  izarMesh.position.y = 0.76;
  izarMesh.castShadow = true;
  ihramWrapGroup.add(izarMesh);

  if (gender === 'putra') {
    // Diagonal Rida' sash leaving right shoulder uncovered (Idhthiba')
    const sashGeo = createRoundedBoxGeometry(0.9, 0.38, 0.5, 0.04);
    const sashMesh = new THREE.Mesh(sashGeo, ihramMat);
    sashMesh.position.set(-0.04, 1.32, 0);
    sashMesh.rotation.z = -0.32;
    sashMesh.castShadow = true;
    ihramWrapGroup.add(sashMesh);
  } else {
    // Putri Mukena/Khimar upper drape covering shoulders and chest neatly
    const khimarGeo = new THREE.ConeGeometry(0.62, 0.9, 12, 1, false);
    const khimarMesh = new THREE.Mesh(khimarGeo, whiteHijabMat);
    khimarMesh.position.y = 1.34;
    khimarMesh.scale.set(1, 1, 0.72);
    khimarMesh.castShadow = true;
    ihramWrapGroup.add(khimarMesh);
  }
  bodyRoot.add(ihramWrapGroup);

  // Arms (pivoted at shoulders y = 1.56)
  const armGeo = createRoundedBoxGeometry(0.3, 0.76, 0.32, 0.04);
  const handGeo = new THREE.SphereGeometry(0.14, 12, 10);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.59, 1.56, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, casualTopMat);
  leftArmMesh.position.y = -0.34;
  leftArmMesh.castShadow = true;
  const leftHandMesh = new THREE.Mesh(handGeo, skinMat);
  leftHandMesh.position.y = -0.74;
  leftArmPivot.add(leftArmMesh, leftHandMesh);
  bodyRoot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.59, 1.56, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, casualTopMat);
  rightArmMesh.position.y = -0.34;
  rightArmMesh.castShadow = true;
  const rightHandMesh = new THREE.Mesh(handGeo, skinMat);
  rightHandMesh.position.y = -0.74;
  rightArmPivot.add(rightArmMesh, rightHandMesh);
  bodyRoot.add(rightArmPivot);

  // Roblox Cylindrical/Rounded Head
  const headPivot = new THREE.Group();
  headPivot.position.y = 1.94;
  bodyRoot.add(headPivot);

  const faceTex = gender === 'putra' ? textures.facePutra : textures.facePutri;
  const headMaterials = [
    skinMat, // right
    skinMat, // left
    skinMat, // top
    skinMat, // bottom
    new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.5, metalness: 0.04 }), // front (+Z)
    skinMat, // back
  ];
  const headGeo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
  const headMesh = new THREE.Mesh(headGeo, headMaterials);
  headMesh.castShadow = true;
  headPivot.add(headMesh);

  // Hair / Peci / Hijab
  const hairCapGroup = new THREE.Group();
  if (gender === 'putra') {
    // Neat dark hair + Peci cap (Peci is worn in casual, removed in Ihram!)
    const hairGeo = createRoundedBoxGeometry(0.66, 0.2, 0.66, 0.03);
    const hairMat = new THREE.MeshStandardMaterial({ color: '#1E1B18', roughness: 0.85, metalness: 0.02 });
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = 0.26;
    headPivot.add(hairMesh);

    const peciGeo = createRoundedBoxGeometry(0.65, 0.22, 0.65, 0.04);
    const peciMesh = new THREE.Mesh(peciGeo, hairPeciMat);
    peciMesh.position.y = 0.34;
    hairCapGroup.add(peciMesh);
  } else {
    // Putri Hijab hood framing face
    const hoodTopGeo = createRoundedBoxGeometry(0.7, 0.24, 0.7, 0.05);
    const hoodBackGeo = createRoundedBoxGeometry(0.7, 0.68, 0.38, 0.05);
    const hoodLeftGeo = createRoundedBoxGeometry(0.14, 0.64, 0.66, 0.03);
    const hoodTop = new THREE.Mesh(hoodTopGeo, hairPeciMat);
    hoodTop.position.y = 0.28;
    const hoodBack = new THREE.Mesh(hoodBackGeo, hairPeciMat);
    hoodBack.position.set(0, -0.02, -0.18);
    const hoodLeft = new THREE.Mesh(hoodLeftGeo, hairPeciMat);
    hoodLeft.position.set(-0.32, -0.02, 0);
    const hoodRight = new THREE.Mesh(hoodLeftGeo, hairPeciMat);
    hoodRight.position.set(0.32, -0.02, 0);
    hairCapGroup.add(hoodTop, hoodBack, hoodLeft, hoodRight);
  }
  headPivot.add(hairCapGroup);

  // Golden Completion Crown (unlocked on Tahallul Akhir!)
  const crownGroup = new THREE.Group();
  crownGroup.position.y = 0.48;
  const crownMat = new THREE.MeshPhysicalMaterial({
    color: '#FACC15',
    metalness: 0.88,
    roughness: 0.18,
    clearcoat: 0.6,
  });
  const crownRing = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.16, 8, 1, false), crownMat);
  crownGroup.add(crownRing);
  const gemMat = new THREE.MeshStandardMaterial({ color: '#10B981', roughness: 0.2, metalness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), gemMat);
    gem.position.set(Math.cos(a) * 0.24, 0.08, Math.sin(a) * 0.24);
    crownGroup.add(gem);
  }
  crownGroup.visible = false;
  headPivot.add(crownGroup);

  const setIhram = (wearingIhram: boolean) => {
    ihramWrapGroup.visible = wearingIhram;
    if (gender === 'putra') {
      // Male Ihram: white Rida/Izar, right arm bare skin (Idhthiba), NO peci/headgear!
      torsoMesh.material = wearingIhram ? skinMat : casualTopMat;
      leftArmMesh.material = wearingIhram ? ihramMat : casualTopMat;
      rightArmMesh.material = wearingIhram ? skinMat : casualTopMat;
      leftLegMesh.material = wearingIhram ? ihramMat : casualBottomMat;
      rightLegMesh.material = wearingIhram ? ihramMat : casualBottomMat;
      hairCapGroup.visible = !wearingIhram;
    } else {
      // Female Ihram: neat white Muslimah attire covering all except face & hands
      torsoMesh.material = wearingIhram ? whiteHijabMat : casualTopMat;
      leftArmMesh.material = wearingIhram ? whiteHijabMat : casualTopMat;
      rightArmMesh.material = wearingIhram ? whiteHijabMat : casualTopMat;
      leftLegMesh.material = wearingIhram ? whiteHijabMat : casualBottomMat;
      rightLegMesh.material = wearingIhram ? whiteHijabMat : casualBottomMat;
      hairCapGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).material = wearingIhram ? whiteHijabMat : hairPeciMat;
        }
      });
    }
  };

  setIhram(initialIhram);

  return {
    group,
    setIhram,
    setCrown: (hasCrown: boolean) => {
      crownGroup.visible = hasCrown;
    },
    updateAnimation: (_dt: number, elapsed: number, speed: number, mode: AvatarAnimMode) => {
      if (mode === 'pray') {
        leftLegPivot.rotation.x = 0;
        rightLegPivot.rotation.x = 0;
        leftArmPivot.rotation.x = -1.25 + Math.sin(elapsed * 2.5) * 0.08;
        rightArmPivot.rotation.x = -1.25 + Math.sin(elapsed * 2.5) * 0.08;
        leftArmPivot.rotation.z = 0.2;
        rightArmPivot.rotation.z = -0.2;
        bodyRoot.position.y = Math.sin(elapsed * 2) * 0.02;
        return;
      }

      if (mode === 'wave') {
        rightArmPivot.rotation.x = -2.4 + Math.sin(elapsed * 12) * 0.35;
        rightArmPivot.rotation.z = -0.25;
        leftArmPivot.rotation.x = 0;
        bodyRoot.position.y = Math.abs(Math.sin(elapsed * 8)) * 0.06;
        return;
      }

      if (mode === 'throw') {
        rightArmPivot.rotation.x = -2.1 + Math.sin(elapsed * 16) * 0.9;
        leftArmPivot.rotation.x = 0.3;
        return;
      }

      if (mode === 'celebrate') {
        leftArmPivot.rotation.x = -2.7 + Math.sin(elapsed * 10) * 0.25;
        rightArmPivot.rotation.x = -2.7 - Math.sin(elapsed * 10) * 0.25;
        leftLegPivot.rotation.x = Math.sin(elapsed * 10) * 0.35;
        rightLegPivot.rotation.x = -Math.sin(elapsed * 10) * 0.35;
        bodyRoot.position.y = Math.abs(Math.sin(elapsed * 9)) * 0.28;
        return;
      }

      leftArmPivot.rotation.z = 0;
      rightArmPivot.rotation.z = 0;

      if (speed > 0.25) {
        const swingFreq = 10.5;
        const amp = Math.min(0.85, speed * 0.11);
        const phase = elapsed * swingFreq;
        leftLegPivot.rotation.x = Math.sin(phase) * amp;
        rightLegPivot.rotation.x = -Math.sin(phase) * amp;
        leftArmPivot.rotation.x = -Math.sin(phase) * amp * 0.95;
        rightArmPivot.rotation.x = Math.sin(phase) * amp * 0.95;
        bodyRoot.position.y = Math.abs(Math.sin(phase)) * 0.09;
        headPivot.rotation.y = Math.sin(phase * 0.5) * 0.05;
      } else {
        // Gentle idle breathing
        leftLegPivot.rotation.x *= 0.85;
        rightLegPivot.rotation.x *= 0.85;
        leftArmPivot.rotation.x = Math.sin(elapsed * 2.2) * 0.05;
        rightArmPivot.rotation.x = -Math.sin(elapsed * 2.2) * 0.05;
        bodyRoot.position.y = Math.sin(elapsed * 2.2) * 0.02;
        headPivot.rotation.y = Math.sin(elapsed * 1.1) * 0.06;
      }
    },
  };
}

export function createKaabaComplex(textures: ProceduralTextureSet): THREE.Group {
  const complex = new THREE.Group();

  // 1. Mataf white marble circular floor (radius 18m)
  const matafGeo = new THREE.CircleGeometry(18.5, 64);
  const matafMat = new THREE.MeshStandardMaterial({
    map: textures.matafMarble,
    roughness: 0.28,
    metalness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const matafFloor = new THREE.Mesh(matafGeo, matafMat);
  matafFloor.rotation.x = -Math.PI / 2;
  matafFloor.position.y = 0.025;
  matafFloor.receiveShadow = true;
  complex.add(matafFloor);

  // Outer Mataf colonnade low marble curb
  const curbGeo = new THREE.RingGeometry(18.3, 19.2, 64);
  const curbMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.5, metalness: 0.1 });
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.rotation.x = -Math.PI / 2;
  curb.position.y = 0.04;
  complex.add(curb);

  // 2. Syazarwan slanted white marble base plinth
  const baseGeo = new THREE.CylinderGeometry(4.45, 4.85, 0.45, 4);
  baseGeo.rotateY(Math.PI / 4);
  const baseMat = new THREE.MeshStandardMaterial({ color: '#F1F5F9', roughness: 0.35, metalness: 0.1 });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.225;
  baseMesh.receiveShadow = true;
  baseMesh.castShadow = true;
  complex.add(baseMesh);

  // 3. Main Ka'bah Cube (6.2 x 7.4 x 6.2)
  const kaabaGeo = new THREE.BoxGeometry(6.2, 7.4, 6.2);
  const kiswahSideMat = new THREE.MeshStandardMaterial({
    map: textures.kiswah,
    roughness: 0.68,
    metalness: 0.18,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.6, metalness: 0.1 });
  const kaabaMesh = new THREE.Mesh(kaabaGeo, [
    kiswahSideMat,
    kiswahSideMat,
    roofMat,
    roofMat,
    kiswahSideMat,
    kiswahSideMat,
  ]);
  kaabaMesh.position.y = 3.9;
  kaabaMesh.castShadow = true;
  kaabaMesh.receiveShadow = true;
  complex.add(kaabaMesh);

  // 4. Golden Roof Trim & Mizab Rahmah (Waterspout on North/Hijr Ismail side -Z)
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: '#FACC15',
    metalness: 0.92,
    roughness: 0.18,
    clearcoat: 0.5,
  });
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(6.32, 0.22, 6.32), goldMat);
  roofTrim.position.y = 7.52;
  complex.add(roofTrim);

  const mizab = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 1.1), goldMat);
  mizab.position.set(0, 7.38, -3.45);
  complex.add(mizab);

  // 5. Multazam Golden Door (on +X East wall near Hajar Aswad +X/+Z corner)
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 1.45), goldMat);
  doorMesh.position.set(3.12, 2.8, 1.1);
  complex.add(doorMesh);

  // 6. Hajar Aswad Corner (+X, +Z corner = [3.1, 1.6, 3.1])
  const silverMat = new THREE.MeshPhysicalMaterial({
    color: '#E2E8F0',
    metalness: 0.95,
    roughness: 0.12,
  });
  const hajarGroup = new THREE.Group();
  hajarGroup.position.set(3.12, 1.55, 3.12);
  hajarGroup.rotation.y = Math.PI / 4;
  const silverFrame = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 14, 24), silverMat);
  const blackStone = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 16),
    new THREE.MeshPhysicalMaterial({ color: '#090D16', roughness: 0.15, metalness: 0.3, clearcoat: 1 })
  );
  blackStone.scale.z = 0.5;
  hajarGroup.add(silverFrame, blackStone);
  complex.add(hajarGroup);

  // 7. Hijr Ismail (Semi-circular white marble wall on -Z side!)
  const hijrGeo = new THREE.CylinderGeometry(3.8, 3.8, 1.25, 32, 1, true, Math.PI * 0.55, Math.PI * 0.9);
  const hijrMat = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    roughness: 0.3,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  // Thick curved wall using Torus segment + cylinder
  const hijrWall = new THREE.Mesh(hijrGeo, hijrMat);
  hijrWall.position.set(0, 0.65, -3.5);
  hijrWall.rotation.y = Math.PI / 2;
  hijrWall.castShadow = true;
  complex.add(hijrWall);

  const hijrCap = new THREE.Mesh(
    new THREE.TorusGeometry(3.8, 0.22, 10, 32, Math.PI * 0.9),
    goldMat
  );
  hijrCap.rotation.x = Math.PI / 2;
  hijrCap.rotation.z = -Math.PI * 0.95;
  hijrCap.position.set(0, 1.28, -3.5);
  complex.add(hijrCap);

  // 8. Maqam Ibrahim (Golden enclosure on +X side)
  const maqamGroup = new THREE.Group();
  maqamGroup.position.set(6.8, 0, 0.8);
  const maqamBase = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.55, 8), baseMat);
  maqamBase.position.y = 0.275;
  const maqamCage = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 1.2, 8), goldMat);
  maqamCage.position.y = 1.15;
  const maqamDome = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), goldMat);
  maqamDome.position.y = 1.75;
  const maqamFinial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 8), goldMat);
  maqamFinial.position.y = 2.45;
  maqamGroup.add(maqamBase, maqamCage, maqamDome, maqamFinial);
  maqamGroup.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) m.castShadow = true;
  });
  complex.add(maqamGroup);

  // 9. Garis Mulai Hajar Aswad (Green glowing strip along +X/+Z diagonal from corner out to Mataf edge!)
  const startLineGroup = new THREE.Group();
  startLineGroup.rotation.y = -Math.PI / 4; // Points toward (+X, +Z) angle = PI/4 in atan2(z, x)
  const greenLineMat = new THREE.MeshStandardMaterial({
    color: '#10B981',
    emissive: '#059669',
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const startStrip = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.05, 0.52), greenLineMat);
  startStrip.position.set(11.2, 0.045, 0);
  startLineGroup.add(startStrip);

  // Green lantern pillar at outer end of Hajar Aswad line
  const greenPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 3.4, 12),
    new THREE.MeshStandardMaterial({ color: '#065F46', roughness: 0.4, metalness: 0.3 })
  );
  greenPillar.position.set(18.2, 1.7, 0);
  const greenLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 16),
    new THREE.MeshStandardMaterial({ color: '#34D399', emissive: '#10B981', emissiveIntensity: 1.1 })
  );
  greenLamp.position.set(18.2, 3.65, 0);
  startLineGroup.add(greenPillar, greenLamp);
  complex.add(startLineGroup);

  return complex;
}

export function createMiqatComplex(): {
  group: THREE.Group;
  fountainPos: THREE.Vector3;
  wardrobePos: THREE.Vector3;
  prayerPos: THREE.Vector3;
} {
  const group = new THREE.Group();
  group.position.set(-30, 0, 22);

  const whiteStone = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.42, metalness: 0.06 });
  const emeraldMat = new THREE.MeshStandardMaterial({ color: '#059669', roughness: 0.55, metalness: 0.1 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: '#F59E0B', metalness: 0.85, roughness: 0.22 });

  // Courtyard platform
  const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.24, 14), whiteStone);
  floor.position.y = 0.12;
  floor.receiveShadow = true;
  group.add(floor);

  // Pavilion roof & 4 columns
  const colPositions: [number, number][] = [
    [-6.5, -5.5],
    [6.5, -5.5],
    [-6.5, 5.5],
    [6.5, 5.5],
  ];
  for (const [cx, cz] of colPositions) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 4.4, 12), whiteStone);
    col.position.set(cx, 2.3, cz);
    col.castShadow = true;
    group.add(col);
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.45, 12.6), whiteStone);
  roof.position.y = 4.65;
  roof.castShadow = true;
  group.add(roof);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), emeraldMat);
  dome.position.y = 4.85;
  dome.castShadow = true;
  group.add(dome);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 10), goldMat);
  finial.position.y = 7.75;
  group.add(finial);

  // Sub-pos 1: Pancuran Wudhu / Mandi Sunnah (-4.2, 0, -2.2)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(-4.2, 0.24, -2.2);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.5, 0.55, 16), whiteStone);
  basin.position.y = 0.28;
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.2,
  });
  const waterPool = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.12, 16), waterMat);
  waterPool.position.y = 0.54;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.5, 12), goldMat);
  spout.position.y = 0.95;
  const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.35, 0.35, 14), whiteStone);
  topBowl.position.y = 1.65;
  fountainGroup.add(basin, waterPool, spout, topBowl);
  group.add(fountainGroup);

  // Sub-pos 2: Bilik Ganti Pakaian Ihram (0, 0, -3.2)
  const boothGroup = new THREE.Group();
  boothGroup.position.set(0.2, 0.24, -3.2);
  const boothBody = new THREE.Mesh(
    createRoundedBoxGeometry(2.4, 3.1, 2.0, 0.08),
    new THREE.MeshStandardMaterial({ color: '#0284C7', roughness: 0.5, metalness: 0.1 })
  );
  boothBody.position.y = 1.55;
  boothBody.castShadow = true;
  const curtain = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.4, 0.12),
    new THREE.MeshStandardMaterial({ color: '#FDE047', roughness: 0.65 })
  );
  curtain.position.set(0, 1.35, 1.02);
  boothGroup.add(boothBody, curtain);
  group.add(boothGroup);

  // Sub-pos 3: Karpet Hijau Niat & Talbiyah (4.4, 0, 1.8)
  const carpetGroup = new THREE.Group();
  carpetGroup.position.set(4.4, 0.26, 1.8);
  const rug = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 4.2), emeraldMat);
  const rugBorder = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.05, 4.45), goldMat);
  rugBorder.position.y = -0.015;
  carpetGroup.add(rugBorder, rug);
  group.add(carpetGroup);

  return {
    group,
    fountainPos: new THREE.Vector3(-30 - 4.2, 0, 22 - 0.2),
    wardrobePos: new THREE.Vector3(-30 + 0.2, 0, 22 - 1.0),
    prayerPos: new THREE.Vector3(-30 + 4.4, 0, 22 + 1.8),
  };
}

export function createSaiComplex(textures: ProceduralTextureSet): {
  group: THREE.Group;
  shafaPos: THREE.Vector3;
  marwahPos: THREE.Vector3;
} {
  const group = new THREE.Group();
  group.position.set(30, 0, 0);

  // Mas'a Corridor Floor (-20 to +20 along Z)
  const corridorFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 42),
    new THREE.MeshStandardMaterial({
      map: textures.saiFloor,
      roughness: 0.32,
      metalness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  corridorFloor.rotation.x = -Math.PI / 2;
  corridorFloor.position.y = 0.03;
  corridorFloor.receiveShadow = true;
  group.add(corridorFloor);

  // Colonnade side pillars using InstancedMesh (>20 pillars)
  const pillarGeo = new THREE.CylinderGeometry(0.24, 0.28, 3.4, 10);
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.45, metalness: 0.08 });
  const pillarInstances = new THREE.InstancedMesh(pillarGeo, pillarMat, 22);
  pillarInstances.castShadow = true;
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let i = 0; i < 11; i++) {
    const z = -18 + i * 3.6;
    dummy.position.set(-3.7, 1.7, z);
    dummy.updateMatrix();
    pillarInstances.setMatrixAt(idx++, dummy.matrix);

    dummy.position.set(3.7, 1.7, z);
    dummy.updateMatrix();
    pillarInstances.setMatrixAt(idx++, dummy.matrix);
  }
  pillarInstances.computeBoundingSphere();
  group.add(pillarInstances);

  // Green Raml Light Arches (z = -4.2 and z = +4.2)
  const greenGlowMat = new THREE.MeshStandardMaterial({
    color: '#22C55E',
    emissive: '#16A34A',
    emissiveIntensity: 1.15,
    roughness: 0.25,
  });
  for (const gz of [-4.2, 4.2]) {
    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.42, 0.48), greenGlowMat);
    archBeam.position.set(0, 3.55, gz);
    const leftGreenStrip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.45), greenGlowMat);
    leftGreenStrip.position.set(-3.7, 1.7, gz);
    const rightGreenStrip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.45), greenGlowMat);
    rightGreenStrip.position.set(3.7, 1.7, gz);
    group.add(archBeam, leftGreenStrip, rightGreenStrip);
  }

  // Green floor tint in the Raml sprint zone
  const ramlZoneFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 8.4),
    new THREE.MeshBasicMaterial({
      color: '#22C55E',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  ramlZoneFloor.rotation.x = -Math.PI / 2;
  ramlZoneFloor.position.set(0, 0.045, 0);
  group.add(ramlZoneFloor);

  // Composite Rocky Mound Builder for Bukit Shafa (-19) & Bukit Marwah (+19)
  const rockMat = new THREE.MeshStandardMaterial({ color: '#B48456', roughness: 0.88, metalness: 0.03 });
  const domeGold = new THREE.MeshPhysicalMaterial({ color: '#F59E0B', metalness: 0.85, roughness: 0.22 });

  const buildHill = (zPos: number) => {
    const hill = new THREE.Group();
    hill.position.set(0, 0, zPos);
    const r1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 1), rockMat);
    r1.scale.set(1.5, 0.65, 1.1);
    r1.position.y = 0.6;
    const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), rockMat);
    r2.position.set(-1.6, 0.8, 0.3);
    const r3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), rockMat);
    r3.position.set(1.5, 0.75, -0.2);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeGold);
    canopy.position.y = 3.6;
    hill.add(r1, r2, r3, canopy);
    hill.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = true;
    });
    return hill;
  };

  group.add(buildHill(-19.5));
  group.add(buildHill(19.5));

  return {
    group,
    shafaPos: new THREE.Vector3(30, 0, -16.5),
    marwahPos: new THREE.Vector3(30, 0, 16.5),
  };
}

export function createArafahComplex(): {
  group: THREE.Group;
  prayerStars: { mesh: THREE.Mesh; worldPos: THREE.Vector3; label: string; collected: boolean }[];
} {
  const group = new THREE.Group();
  const baseX = -32;
  const baseZ = -24;
  group.position.set(baseX, 0, baseZ);

  const rockMat = new THREE.MeshStandardMaterial({ color: '#C28E5C', roughness: 0.85, metalness: 0.04 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5, metalness: 0.05 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: '#FACC15', metalness: 0.85, roughness: 0.2 });

  // Jabal Rahmah terraced mount (4 rock tiers + white obelisk monument!)
  const jabal = new THREE.Group();
  jabal.position.set(-4, 0, -5);
  for (let i = 0; i < 4; i++) {
    const tier = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2 - i * 1.1, 6.2 - i * 1.1, 1.15, 9),
      rockMat
    );
    tier.position.y = 0.57 + i * 1.05;
    tier.rotation.y = i * 0.4;
    tier.castShadow = true;
    tier.receiveShadow = true;
    jabal.add(tier);
  }
  const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 4.4, 0.95), whiteMat);
  obelisk.position.y = 6.3;
  obelisk.castShadow = true;
  jabal.add(obelisk);
  group.add(jabal);

  // White Arafah Tents
  const tentOffsets: [number, number][] = [
    [6.5, -4.5],
    [7.5, 3.5],
    [-6.5, 5.5],
  ];
  for (const [tx, tz] of tentOffsets) {
    const tent = new THREE.Group();
    tent.position.set(tx, 0, tz);
    const walls = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 1.8, 6), whiteMat);
    walls.position.y = 0.9;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.85, 1.6, 6), whiteMat);
    roof.position.y = 2.6;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), goldMat);
    tip.position.y = 3.45;
    tent.add(walls, roof, tip);
    tent.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = true;
    });
    group.add(tent);
  }

  // 5 Interactive Glowing Prayer Stars around Arafah
  const starDefs: { dx: number; dz: number; label: string }[] = [
    { dx: 0, dz: 3.5, label: 'Doa Ampunan Orang Tua' },
    { dx: 3.8, dz: -0.5, label: 'Kalimat Talbiyah & Tauhid' },
    { dx: -1.5, dz: 0.5, label: 'Tasbih, Tahmid & Takbir' },
    { dx: 2.5, dz: 6.2, label: 'Doa Kebaikan Dunia Akhirat' },
    { dx: -4.2, dz: 2.2, label: 'Doa Menjadi Anak Saleh' },
  ];

  const starMat = new THREE.MeshStandardMaterial({
    color: '#FDE047',
    emissive: '#F59E0B',
    emissiveIntensity: 0.95,
    roughness: 0.2,
    metalness: 0.6,
  });

  const prayerStars = starDefs.map((d) => {
    const starMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), starMat.clone());
    starMesh.position.set(d.dx, 1.35, d.dz);
    starMesh.castShadow = true;
    group.add(starMesh);
    return {
      mesh: starMesh,
      worldPos: new THREE.Vector3(baseX + d.dx, 0, baseZ + d.dz),
      label: d.label,
      collected: false,
    };
  });

  return { group, prayerStars };
}

export function createHotelTanimComplex(): {
  group: THREE.Group;
  wardrobePos: THREE.Vector3;
  prayerPos: THREE.Vector3;
} {
  const group = new THREE.Group();
  const baseX = -26;
  const baseZ = -2;
  group.position.set(baseX, 0, baseZ);

  const creamStone = new THREE.MeshStandardMaterial({ color: '#FEFCE8', roughness: 0.48, metalness: 0.06 });
  const tealMat = new THREE.MeshStandardMaterial({ color: '#0D9488', roughness: 0.45, metalness: 0.12 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: '#F59E0B', metalness: 0.85, roughness: 0.22 });

  const pad = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.24, 9.5), creamStone);
  pad.position.y = 0.12;
  pad.receiveShadow = true;
  group.add(pad);

  // Neat Roblox Hotel Makkah / Masjid Tan'im Tower
  const building = new THREE.Mesh(createRoundedBoxGeometry(4.4, 5.2, 3.6, 0.08), creamStone);
  building.position.set(-2.2, 2.8, -1.8);
  building.castShadow = true;
  group.add(building);

  // Windows grid
  const winMat = new THREE.MeshStandardMaterial({ color: '#38BDF8', roughness: 0.2, metalness: 0.4 });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.12), winMat);
      win.position.set(-3.0 + col * 1.6, 2.2 + row * 1.6, 0.02);
      group.add(win);
    }
  }

  const roofDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    tealMat
  );
  roofDome.position.set(-2.2, 5.4, -1.8);
  group.add(roofDome);

  // Ihram Wardrobe Booth at (+2.0, 0.24, -2.0)
  const booth = new THREE.Mesh(createRoundedBoxGeometry(2.0, 2.8, 1.8, 0.06), tealMat);
  booth.position.set(2.2, 1.64, -2.0);
  booth.castShadow = true;
  group.add(booth);

  // Prayer Carpet for Niat at (+1.8, 0.26, +2.0)
  const rugBorder = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 3.6), goldMat);
  rugBorder.position.set(1.8, 0.25, 2.0);
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 3.3), tealMat);
  rug.position.set(1.8, 0.27, 2.0);
  group.add(rugBorder, rug);

  return {
    group,
    wardrobePos: new THREE.Vector3(baseX + 2.2, 0, baseZ - 0.5),
    prayerPos: new THREE.Vector3(baseX + 1.8, 0, baseZ + 2.0),
  };
}

export function createMuzdalifahMinaComplex(): {
  group: THREE.Group;
  pebbles: { mesh: THREE.Mesh; worldPos: THREE.Vector3; collected: boolean }[];
  pillarMeshes: [THREE.Mesh, THREE.Mesh, THREE.Mesh]; // [Ula, Wustha, Aqabah]
  pillarWorldPositions: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  jamaratTargetWorldPos: THREE.Vector3;
  throwStandWorldPos: THREE.Vector3;
  minaTentWorldPos: THREE.Vector3;
} {
  const group = new THREE.Group();
  const baseX = 0;
  const baseZ = -34;
  group.position.set(baseX, 0, baseZ);

  // Part 1: Muzdalifah Pebble Patch at local (-11, 0, 2)
  const muzPad = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 24),
    new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  muzPad.rotation.x = -Math.PI / 2;
  muzPad.position.set(-11, 0.03, 2);
  muzPad.receiveShadow = true;
  group.add(muzPad);

  const pebbleMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.75,
    roughness: 0.35,
  });

  const pebbles: { mesh: THREE.Mesh; worldPos: THREE.Vector3; collected: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2;
    const rad = i === 6 ? 0.5 : 3.2;
    const px = -11 + Math.cos(ang) * rad;
    const pz = 2 + Math.sin(ang) * rad;
    const pMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), pebbleMat.clone());
    pMesh.position.set(px, 0.38, pz);
    pMesh.castShadow = true;
    group.add(pMesh);
    pebbles.push({
      mesh: pMesh,
      worldPos: new THREE.Vector3(baseX + px, 0, baseZ + pz),
      collected: false,
    });
  }

  // Part 2: White Mina Mabit Tent at local (14.5, 0, 2.5)
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5, metalness: 0.05 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: '#FACC15', metalness: 0.85, roughness: 0.2 });
  const minaTent = new THREE.Group();
  minaTent.position.set(14.5, 0, 2.5);
  const tentWalls = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.0, 3.8), whiteMat);
  tentWalls.position.y = 1.0;
  tentWalls.castShadow = true;
  const tentRoof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.7, 4), whiteMat);
  tentRoof.rotation.y = Math.PI / 4;
  tentRoof.position.y = 2.85;
  tentRoof.castShadow = true;
  const tentFinial = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), goldMat);
  tentFinial.position.y = 3.75;
  minaTent.add(tentWalls, tentRoof, tentFinial);
  group.add(minaTent);

  // Part 3: Mina Jamarat Basin & 3 Pillars (Ula = -3.4, Wustha = 0, Aqabah = +3.4) at local (+5, 0, -2)
  const basinGroup = new THREE.Group();
  basinGroup.position.set(5, 0, -2);

  const stoneWallMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.65, metalness: 0.08 });

  const basinRim = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.7, 0.9, 28, 1, true), stoneWallMat);
  basinRim.scale.set(1.32, 1, 0.68);
  basinRim.position.y = 0.45;
  basinGroup.add(basinRim);

  const basinFloor = new THREE.Mesh(
    new THREE.CircleGeometry(5.3, 28),
    new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.8 })
  );
  basinFloor.rotation.x = -Math.PI / 2;
  basinFloor.scale.set(1.32, 0.68, 1);
  basinFloor.position.y = 0.04;
  basinGroup.add(basinFloor);

  // Three Jamarat pillars: Ula (-3.4), Wustha (0), Aqabah (+3.4)
  const pillarOffsets = [-3.4, 0, 3.4] as const;
  const builtPillars: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const px = pillarOffsets[i];
    const isAqabah = i === 2;
    const pilMat = new THREE.MeshStandardMaterial({
      color: isAqabah ? '#F59E0B' : '#94A3B8',
      roughness: 0.55,
      metalness: 0.15,
    });
    const pil = new THREE.Mesh(
      new THREE.CylinderGeometry(isAqabah ? 0.62 : 0.48, isAqabah ? 0.75 : 0.58, isAqabah ? 4.4 : 3.6, 12),
      pilMat
    );
    pil.position.set(px, isAqabah ? 2.2 : 1.8, 0);
    pil.castShadow = true;
    basinGroup.add(pil);
    builtPillars.push(pil);
  }

  group.add(basinGroup);

  const pillarWorldPositions: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
    new THREE.Vector3(baseX + 5 - 3.4, 2.0, baseZ - 2),
    new THREE.Vector3(baseX + 5, 2.0, baseZ - 2),
    new THREE.Vector3(baseX + 5 + 3.4, 2.3, baseZ - 2),
  ];

  return {
    group,
    pebbles,
    pillarMeshes: [builtPillars[0], builtPillars[1], builtPillars[2]],
    pillarWorldPositions,
    jamaratTargetWorldPos: pillarWorldPositions[2],
    throwStandWorldPos: new THREE.Vector3(baseX + 5, 0, baseZ + 3.2),
    minaTentWorldPos: new THREE.Vector3(baseX + 14.5, 0, baseZ + 5.2),
  };
}

export function createTahallulComplex(): {
  group: THREE.Group;
  chairWorldPos: THREE.Vector3;
  damStandWorldPos: THREE.Vector3;
} {
  const group = new THREE.Group();
  const baseX = 28;
  const baseZ = 22;
  group.position.set(baseX, 0, baseZ);

  const whiteMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.42, metalness: 0.08 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: '#FACC15', metalness: 0.88, roughness: 0.2 });
  const purpleMat = new THREE.MeshStandardMaterial({ color: '#7C3AED', roughness: 0.5, metalness: 0.12 });

  const pad = new THREE.Mesh(new THREE.BoxGeometry(11, 0.24, 9), whiteMat);
  pad.position.y = 0.12;
  pad.receiveShadow = true;
  group.add(pad);

  // Golden Tahallul Chair
  const chairGroup = new THREE.Group();
  chairGroup.position.set(2.2, 0.24, 0);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.6, 12), goldMat);
  pedestal.position.y = 0.3;
  const seat = new THREE.Mesh(createRoundedBoxGeometry(1.3, 0.25, 1.3, 0.05), purpleMat);
  seat.position.y = 0.72;
  const backrest = new THREE.Mesh(createRoundedBoxGeometry(1.3, 1.35, 0.25, 0.05), purpleMat);
  backrest.position.set(0, 1.45, -0.52);
  chairGroup.add(pedestal, seat, backrest);
  chairGroup.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) m.castShadow = true;
  });
  group.add(chairGroup);

  // Giant playful Roblox Scissors Sign above pavilion
  const scissorsGroup = new THREE.Group();
  scissorsGroup.position.set(2.2, 3.8, -1.2);
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.1), goldMat);
  blade1.rotation.z = 0.42;
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.1), goldMat);
  blade2.rotation.z = -0.42;
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 10, 18), purpleMat);
  ring1.position.set(-0.38, -0.82, 0);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 10, 18), purpleMat);
  ring2.position.set(0.38, -0.82, 0);
  scissorsGroup.add(blade1, blade2, ring1, ring2);
  group.add(scissorsGroup);

  // Dam / Hadyu Educational Stand at (-2.4, 0.24, 0)
  const damStand = new THREE.Group();
  damStand.position.set(-2.4, 0.24, 0);
  const counter = new THREE.Mesh(createRoundedBoxGeometry(2.4, 1.1, 1.4, 0.06), goldMat);
  counter.position.y = 0.55;
  // Cute Blocky Roblox Sheep (Hadyu education model!)
  const woolMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 });
  const sheepBody = new THREE.Mesh(createRoundedBoxGeometry(1.05, 0.72, 0.72, 0.08), woolMat);
  sheepBody.position.set(0, 1.55, 0);
  const sheepHead = new THREE.Mesh(
    createRoundedBoxGeometry(0.45, 0.45, 0.45, 0.05),
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.7 })
  );
  sheepHead.position.set(0.55, 1.72, 0);
  damStand.add(counter, sheepBody, sheepHead);
  group.add(damStand);

  return {
    group,
    chairWorldPos: new THREE.Vector3(baseX + 2.2, 0, baseZ + 1.1),
    damStandWorldPos: new THREE.Vector3(baseX - 2.4, 0, baseZ + 1.3),
  };
}

export function createOutdoorPerimeterScenery(textures: ProceduralTextureSet): THREE.Group {
  const env = new THREE.Group();

  // Extended golden desert ground (280 x 280m — natural horizon with fog, never a floating indoor box!)
  const groundGeo = new THREE.PlaneGeometry(280, 280);
  const groundMat = new THREE.MeshStandardMaterial({
    map: textures.desertGround,
    roughness: 0.92,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  env.add(ground);

  // Connecting stone walkways from stations to Masjidil Haram
  const pathMat = new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    roughness: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const paths: { x: number; z: number; w: number; l: number; rot: number }[] = [
    { x: -16, z: 13, w: 3.4, l: 24, rot: 0.95 }, // Miqat -> Kaaba
    { x: -17, z: -1.5, w: 3.2, l: 16, rot: Math.PI / 2 }, // Hotel Makkah / Tan'im -> Kaaba
    { x: 20, z: 0, w: 3.4, l: 16, rot: Math.PI / 2 }, // Kaaba -> Sai
    { x: -18, z: -14, w: 3.4, l: 26, rot: -0.92 }, // Kaaba -> Arafah
    { x: 0, z: -24, w: 3.4, l: 18, rot: 0 }, // Kaaba -> Mina
    { x: 18, z: 14, w: 3.4, l: 22, rot: -0.95 }, // Kaaba -> Tahallul
  ];
  for (const p of paths) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.l), pathMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = p.rot;
    road.position.set(p.x, 0.015, p.z);
    road.receiveShadow = true;
    env.add(road);
  }

  // Distant Makkah desert mountain ring using InstancedMesh (32 peaks)
  const mountainGeo = new THREE.ConeGeometry(12, 22, 7);
  const mountainMat = new THREE.MeshStandardMaterial({ color: '#D4A373', roughness: 0.92, metalness: 0.02 });
  const mountains = new THREE.InstancedMesh(mountainGeo, mountainMat, 32);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const dist = 78 + (i % 3) * 12;
    const scaleY = 0.7 + ((i * 7) % 5) * 0.22;
    const scaleXZ = 0.85 + ((i * 3) % 4) * 0.2;
    dummy.position.set(Math.cos(a) * dist, 11 * scaleY - 1.5, Math.sin(a) * dist);
    dummy.rotation.y = i * 0.7;
    dummy.scale.set(scaleXZ, scaleY, scaleXZ);
    dummy.updateMatrix();
    mountains.setMatrixAt(i, dummy.matrix);
    tint.setHSL(0.09, 0.42, 0.56 + (i % 4) * 0.04);
    mountains.setColorAt(i, tint);
  }
  mountains.computeBoundingSphere();
  env.add(mountains);

  // Date Palm Trees scattered naturally around oases (24 composite trees using InstancedMesh trunks + crowns)
  const palmSpots: [number, number][] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + 0.12;
    const r = 46 + (i % 3) * 6;
    palmSpots.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.88 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.65 });
  const trunkInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.38, 4.8, 8), trunkMat, palmSpots.length);
  const leafInst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.55, 1), leafMat, palmSpots.length);
  trunkInst.castShadow = true;
  leafInst.castShadow = true;

  palmSpots.forEach(([px, pz], i) => {
    const s = 0.88 + (i % 4) * 0.1;
    dummy.position.set(px, 2.4 * s, pz);
    dummy.rotation.set(0, i * 0.5, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(px, 5.0 * s, pz);
    dummy.scale.set(s * 1.25, s * 0.65, s * 1.25);
    dummy.updateMatrix();
    leafInst.setMatrixAt(i, dummy.matrix);
  });
  trunkInst.computeBoundingSphere();
  leafInst.computeBoundingSphere();
  env.add(trunkInst, leafInst);

  return env;
}
