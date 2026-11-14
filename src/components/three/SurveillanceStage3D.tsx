import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { VMS_WORKSPACE_PRESETS, useVms } from '@/context/VmsContext';
import type { ThemeMode } from '@/hooks/useTheme';
import { assetPath } from '@/utils/assets';
import {
  FINISH_PRESETS,
  type FinishId,
  type MaterialBundle,
  applyFinishPreset,
  createSurveillanceMaterials,
  disposeMaterialBundle,
  drawSmartClientAuxCanvas,
  drawSmartClientPrimaryCanvas,
} from './materials';
import { type InspectablePartInfo, buildSurveillanceAssembly } from './surveillanceModel';

type CameraPresetId = 'workstation' | 'smart-client' | 'rack';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: readonly CameraPreset[] = [
  {
    id: 'workstation',
    label: 'Workstation',
    position: [3.3, 2.25, 3.85],
    target: [0.06, 0.96, 0.02],
  },
  {
    id: 'smart-client',
    label: 'Smart Client',
    position: [-0.15, 1.38, 2.35],
    target: [0.08, 1.24, -0.08],
  },
  {
    id: 'rack',
    label: 'Rack & Deck',
    position: [1.85, 0.95, 2.5],
    target: [0.04, 0.42, 0.14],
  },
];

const DEFAULT_PART_INFO: InspectablePartInfo = {
  id: 'xprotect-vms',
  label: 'Milestone XProtect VMS',
  spec: 'Drag to orbit · Scroll to zoom · Click a hardware module to interact with the site',
};

const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _pointer = new THREE.Vector2();

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function isWebGLSupported(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

interface SurveillanceStage3DProps {
  theme: ThemeMode;
}

export function SurveillanceStage3D({ theme }: SurveillanceStage3DProps) {
  const { viewMode, activeSiteId, selectedFeedId, setViewMode, focusSectionFromVms } = useVms();

  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  const [webglFailed, setWebglFailed] = useState(() => !isWebGLSupported());
  const [dockOpen, setDockOpen] = useState(true);
  const [explodeLevel, setExplodeLevel] = useState(0);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('workstation');
  const [activeFinish, setActiveFinish] = useState<FinishId>('slate');
  const [selectedPart, setSelectedPart] = useState<InspectablePartInfo>(DEFAULT_PART_INFO);

  const explodeTargetRef = useRef(0);
  const finishRef = useRef<FinishId>('slate');
  const themeRef = useRef<ThemeMode>(theme);
  const screenStateRef = useRef({
    mode: viewMode,
    siteId: activeSiteId,
    feedId: selectedFeedId,
    theme,
  });
  const materialsRef = useRef<MaterialBundle | null>(null);
  const presetFlightRef = useRef<{
    active: boolean;
    position: [number, number, number];
    target: [number, number, number];
  }>({
    active: false,
    position: CAMERA_PRESETS[0]?.position ?? [3.3, 2.25, 3.85],
    target: CAMERA_PRESETS[0]?.target ?? [0.06, 0.96, 0.02],
  });

  const applyThemeCallbackRef = useRef<((nextTheme: ThemeMode) => void) | null>(null);
  const applyFinishCallbackRef = useRef<((nextFinish: FinishId) => void) | null>(null);

  useEffect(() => {
    explodeTargetRef.current = explodeLevel;
  }, [explodeLevel]);

  useEffect(() => {
    finishRef.current = activeFinish;
    applyFinishCallbackRef.current?.(activeFinish);
  }, [activeFinish]);

  useEffect(() => {
    themeRef.current = theme;
    applyThemeCallbackRef.current?.(theme);
  }, [theme]);

  useEffect(() => {
    screenStateRef.current = {
      mode: viewMode,
      siteId: activeSiteId,
      feedId: selectedFeedId,
      theme,
    };
    const bundle = materialsRef.current;
    if (!bundle) return;
    drawSmartClientPrimaryCanvas(bundle.primaryCanvas, screenStateRef.current);
    bundle.primaryTexture.needsUpdate = true;
    drawSmartClientAuxCanvas(bundle.auxCanvas, screenStateRef.current);
    bundle.auxTexture.needsUpdate = true;
  }, [activeSiteId, selectedFeedId, theme, viewMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      if (event.key.toLowerCase() === 'h') {
        setDockOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let isDisposed = false;
    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      queueMicrotask(() => {
        if (!isDisposed) setWebglFailed(true);
      });
      return;
    }

    const initialBgHex = themeRef.current === 'light' ? 0xeef2f7 : 0x080b12;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(initialBgHex, 1);

    const width = Math.max(280, mount.clientWidth || 480);
    const height = Math.max(280, mount.clientHeight || 480);
    renderer.setSize(width, height);

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initialBgHex);
    scene.fog = new THREE.FogExp2(initialBgHex, 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 40);
    camera.position.set(3.3, 2.25, 3.85);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.06, 0.96, 0.02);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.0;
    controls.maxDistance = 6.4;
    controls.minPolarAngle = 0.18;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.update();

    const onControlStart = () => {
      presetFlightRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // 3-point studio lighting + cool hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xa5d8ff, 0x0b1220, 0.78);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.15);
    keyLight.position.set(3.8, 5.4, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.camera.left = -2.8;
    keyLight.shadow.camera.right = 2.8;
    keyLight.shadow.camera.top = 2.8;
    keyLight.shadow.camera.bottom = -2.8;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.25);
    rimLight.position.set(-4.0, 2.8, -3.5);
    scene.add(rimLight);

    let softboxLight: THREE.RectAreaLight | null = null;
    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      softboxLight = new THREE.RectAreaLight(0xdbeafe, 2.6, 3.2, 1.4);
      softboxLight.position.set(-2.6, 3.4, 2.4);
      softboxLight.lookAt(0, 0.95, 0);
      scene.add(softboxLight);
    }

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const materials = createSurveillanceMaterials(
      isSoftwareGl,
      maxAniso,
      finishRef.current,
      screenStateRef.current,
    );
    materialsRef.current = materials;
    const assembly = buildSurveillanceAssembly(materials);
    scene.add(assembly.root);

    applyThemeCallbackRef.current = (nextTheme: ThemeMode) => {
      const hex = nextTheme === 'light' ? 0xeef2f7 : 0x080b12;
      renderer.setClearColor(hex, 1);
      if (scene.background instanceof THREE.Color) {
        scene.background.setHex(hex);
      }
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(hex);
      }
      hemiLight.groundColor.setHex(nextTheme === 'light' ? 0xcbd5e1 : 0x0b1220);
    };

    applyFinishCallbackRef.current = (nextFinish: FinishId) => {
      applyFinishPreset(materials, nextFinish);
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on dedicated layer 1
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);

    let lastHoverCheck = 0;
    let pointerDownX = 0;
    let pointerDownY = 0;

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerDownX = event.clientX;
      pointerDownY = event.clientY;
    };

    const onPointerUp = (event: PointerEvent) => {
      const moved = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY);
      if (moved > 6) return;
      updatePointer(event);
      raycaster.setFromCamera(_pointer, camera);
      const hits = raycaster.intersectObjects(assembly.clickableTargets, true);
      const hitInfo = hits[0]?.object.userData.partInfo as InspectablePartInfo | undefined;
      if (hitInfo) {
        setSelectedPart(hitInfo);
        if (hitInfo.vmsMode) {
          setViewMode(hitInfo.vmsMode, { scrollToSection: false });
        }
      } else {
        setSelectedPart(DEFAULT_PART_INFO);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;
      updatePointer(event);
      raycaster.setFromCamera(_pointer, camera);
      const hits = raycaster.intersectObjects(assembly.clickableTargets, true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = Math.max(240, mount.clientWidth);
      const nextHeight = Math.max(240, mount.clientHeight);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    });
    resizeObserver.observe(mount);

    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? true;
      },
      { threshold: 0.02 },
    );
    intersectionObserver.observe(mount);

    let frameId = 0;
    let currentExplode = 0;
    let lastTickTime = performance.now();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
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
      if (isDisposed) return;

      const now = performance.now();
      const delta = Math.min((now - lastTickTime) / 1000, 0.08);
      lastTickTime = now;

      if (isVisible && document.visibilityState !== 'hidden') {
        elapsed += delta;

        // Smooth exponential damping for exploded view
        currentExplode = THREE.MathUtils.damp(currentExplode, explodeTargetRef.current, 6.5, delta);
        for (const layer of assembly.explodeLayers) {
          layer.object.position.y = layer.baseY + layer.offsetY * currentExplode;
        }

        // Subtle Smart Client display breathing, PTZ joystick patrol & orbital ring motion
        assembly.displayGroup.rotation.y = Math.sin(elapsed * 0.45) * 0.03;
        assembly.joystickStick.rotation.z = Math.sin(elapsed * 0.9) * 0.14;
        assembly.joystickStick.rotation.x = Math.cos(elapsed * 0.7) * 0.1;
        assembly.orbitRing.rotation.z = elapsed * 0.14;

        // Smooth camera preset transition
        if (presetFlightRef.current.active) {
          const [px, py, pz] = presetFlightRef.current.position;
          const [tx, ty, tz] = presetFlightRef.current.target;
          _targetCamPos.set(px, py, pz);
          _targetLook.set(tx, ty, tz);

          camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5.5, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5.5, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5.5, delta);

          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, 5.5, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, 5.5, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, 5.5, delta);

          if (
            camera.position.distanceTo(_targetCamPos) < 0.015 &&
            controls.target.distanceTo(_targetLook) < 0.015
          ) {
            presetFlightRef.current.active = false;
          }
        }

        controls.update();
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    // Immediate first frame draw
    renderer.render(scene, camera);
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }

    return () => {
      isDisposed = true;
      materialsRef.current = null;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);

      for (const geo of assembly.geometries) {
        geo.dispose();
      }
      disposeMaterialBundle(materials);
      envTexture.dispose();
      renderer.dispose();
      if (softboxLight) {
        scene.remove(softboxLight);
      }
      mount.innerHTML = '';
    };
  }, [setViewMode]);

  const handleSelectPreset = (preset: CameraPreset) => {
    setActivePreset(preset.id);
    presetFlightRef.current = {
      active: true,
      position: preset.position,
      target: preset.target,
    };
  };

  const handleResetView = () => {
    setExplodeLevel(0);
    setSelectedPart(DEFAULT_PART_INFO);
    setViewMode('live', { scrollToSection: false });
    const overview = CAMERA_PRESETS[0];
    if (overview) handleSelectPreset(overview);
  };

  if (webglFailed) {
    return (
      <div className="stage3d-shell" ref={stageRef}>
        <img
          alt="Illustrative Milestone XProtect VMS monitoring console"
          className="earth-fallback-img"
          decoding="async"
          height="640"
          src={assetPath('assets/earth-globe-poster.png')}
          width="640"
        />
        <div className="stage3d-caption-static">
          <span>MILESTONE XPROTECT VMS · PATLI SECTOR 01</span>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Interactive 3D Milestone XProtect VMS workstation showcase"
      className="stage3d-shell"
      ref={stageRef}
    >
      <div className="stage3d-mount" ref={mountRef} />

      <div className="stage3d-spec-badge">
        <div className="stage3d-spec-row">
          <span className="stage3d-spec-title">{selectedPart.label}</span>
          {selectedPart.sectionId && selectedPart.actionLabel ? (
            <button
              className="stage3d-spec-action"
              onClick={() => focusSectionFromVms(selectedPart.sectionId!, selectedPart.vmsMode)}
              type="button"
            >
              {selectedPart.actionLabel}
              <ArrowUpRight aria-hidden="true" size={12} />
            </button>
          ) : null}
        </div>
        <span className="stage3d-spec-sub">{selectedPart.spec}</span>
      </div>

      <div className={`stage3d-dock-wrap ${dockOpen ? '' : 'stage3d-dock-wrap--collapsed'}`}>
        <button
          aria-expanded={dockOpen}
          className="stage3d-dock-toggle"
          onClick={() => setDockOpen((open) => !open)}
          title="Toggle 3D controls (H)"
          type="button"
        >
          {dockOpen ? (
            <>
              <ChevronDown aria-hidden="true" size={14} /> Hide Controls
            </>
          ) : (
            <>
              <ChevronUp aria-hidden="true" size={14} /> Show Controls
            </>
          )}
        </button>

        {dockOpen ? (
          <div className="stage3d-dock" role="toolbar" aria-label="XProtect VMS 3D controls">
            <div className="stage3d-group" role="group" aria-label="XProtect workspace mode">
              {VMS_WORKSPACE_PRESETS.map((preset) => (
                <button
                  aria-pressed={viewMode === preset.id}
                  className={
                    viewMode === preset.id ? 'stage3d-pill stage3d-pill--active' : 'stage3d-pill'
                  }
                  key={preset.id}
                  onClick={() => setViewMode(preset.id, { scrollToSection: false })}
                  title={preset.statusNote}
                  type="button"
                >
                  {preset.shortLabel}
                </button>
              ))}
            </div>

            <label className="stage3d-slider-group">
              <span>Explode</span>
              <input
                aria-label="Explode VMS rack and display layers"
                max={1}
                min={0}
                onChange={(event) => setExplodeLevel(Number(event.target.value))}
                step={0.01}
                type="range"
                value={explodeLevel}
              />
            </label>

            <div className="stage3d-group" role="group" aria-label="Camera views">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  aria-pressed={activePreset === preset.id}
                  className={
                    activePreset === preset.id
                      ? 'stage3d-pill stage3d-pill--active'
                      : 'stage3d-pill'
                  }
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="stage3d-group" role="group" aria-label="Workstation finish">
              {(Object.keys(FINISH_PRESETS) as FinishId[]).map((finishId) => {
                const preset = FINISH_PRESETS[finishId];
                return (
                  <button
                    aria-label={preset.label}
                    aria-pressed={activeFinish === finishId}
                    className={
                      activeFinish === finishId
                        ? 'stage3d-swatch stage3d-swatch--active'
                        : 'stage3d-swatch'
                    }
                    key={finishId}
                    onClick={() => setActiveFinish(finishId)}
                    style={{ backgroundColor: preset.swatch }}
                    title={preset.label}
                    type="button"
                  />
                );
              })}
            </div>

            <button
              aria-label="Reset 3D workstation view"
              className="stage3d-reset-btn"
              onClick={handleResetView}
              title="Reset view"
              type="button"
            >
              <RotateCcw aria-hidden="true" size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
