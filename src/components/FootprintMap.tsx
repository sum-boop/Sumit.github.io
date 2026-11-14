import { useState } from 'react';
import {
  ArrowUpRight,
  Crosshair,
  Film,
  MapPin,
  Pause,
  Play,
  Radar,
  ShieldCheck,
} from 'lucide-react';
import { useVms } from '@/context/VmsContext';
import { contact } from '@/data/contact';
import { careerSites } from '@/data/experience';
import { profile } from '@/data/profile';
import type { ThemeMode } from '@/hooks/useTheme';
import { BackgroundVideo } from './BackgroundVideo';

interface FootprintMapProps {
  theme: ThemeMode;
}

type FootprintVisualMode = 'animation' | 'video';

interface CorridorNode {
  id: 'flipkart' | 'ekart';
  title: string;
  client: string;
  location: string;
  period: string;
  cameras: number;
  status: 'active' | 'past';
  coordsLabel: string;
  osmUrl: string;
  xPercent: number;
  yPercent: number;
}

const CORRIDOR_NODES: readonly CorridorNode[] = careerSites.map((site) => {
  const isFlipkart = site.id === 'flipkart';
  return {
    id: isFlipkart ? 'flipkart' : 'ekart',
    title: site.name,
    client: site.client,
    location: site.location,
    period: site.period,
    cameras: site.cameras,
    status: site.status,
    coordsLabel: isFlipkart ? '28.450° N, 76.850° E' : '28.426° N, 76.915° E',
    osmUrl: isFlipkart
      ? 'https://www.openstreetmap.org/?mlat=28.450&mlon=76.850#map=13/28.450/76.850'
      : 'https://www.openstreetmap.org/?mlat=28.426&mlon=76.915#map=13/28.426/76.915',
    xPercent: isFlipkart ? 38 : 66,
    yPercent: isFlipkart ? 46 : 62,
  };
});

export function FootprintMap({ theme }: FootprintMapProps) {
  const { activeSiteId, setActiveSiteId } = useVms();
  const [visualMode, setVisualMode] = useState<FootprintVisualMode>('animation');
  const [videoPaused, setVideoPaused] = useState(false);

  const activeNode = CORRIDOR_NODES.find((node) => node.id === activeSiteId) ?? CORRIDOR_NODES[0]!;

  return (
    <div className={`footprint-corridor-stack footprint-corridor-stack--${theme}`}>
      <div className="footprint-corridor-toolbar">
        <div
          aria-label="Corridor display mode"
          className="corridor-mode-group"
          role="group"
        >
          <button
            aria-pressed={visualMode === 'animation'}
            className={`corridor-chip ${visualMode === 'animation' ? 'corridor-chip--primary' : ''}`}
            onClick={() => setVisualMode('animation')}
            type="button"
          >
            <Radar aria-hidden="true" size={14} />
            <span>Animated Radar</span>
          </button>
          <button
            aria-pressed={visualMode === 'video'}
            className={`corridor-chip ${visualMode === 'video' ? 'corridor-chip--primary' : ''}`}
            onClick={() => setVisualMode('video')}
            type="button"
          >
            <Film aria-hidden="true" size={14} />
            <span>Ambient Video</span>
          </button>
        </div>

        <div className="corridor-site-switches" role="group" aria-label="Focus deployment node">
          {CORRIDOR_NODES.map((node) => {
            const selected = activeNode.id === node.id;
            return (
              <button
                aria-pressed={selected}
                className={`corridor-chip ${selected ? 'corridor-chip--selected' : ''}`}
                key={node.id}
                onClick={() => setActiveSiteId(node.id)}
                type="button"
              >
                <Crosshair aria-hidden="true" size={13} />
                <span>{node.title}</span>
              </button>
            );
          })}

          {visualMode === 'video' ? (
            <button
              aria-label={videoPaused ? 'Play corridor video' : 'Pause corridor video'}
              className="corridor-chip"
              onClick={() => setVideoPaused((prev) => !prev)}
              type="button"
            >
              {videoPaused ? (
                <>
                  <Play aria-hidden="true" size={13} />
                  <span>Play</span>
                </>
              ) : (
                <>
                  <Pause aria-hidden="true" size={13} />
                  <span>Pause</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      <div className="footprint-map footprint-corridor-viewport">
        {visualMode === 'video' ? (
          <div className="footprint-media-layer">
            <BackgroundVideo
              className="footprint-section-video"
              paused={videoPaused}
              poster="assets/earth-globe-poster.png"
              posterAlt="Orbital video backdrop centered over India and Patli, Haryana"
              src="assets/earth-globe.mp4"
            />
            <div aria-hidden="true" className="footprint-media-vignette" />
          </div>
        ) : (
          <div aria-hidden="true" className="corridor-radar-canvas">
            <svg
              className="corridor-radar-svg"
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 900 440"
            >
              <defs>
                <radialGradient id="radar-glow" cx="38%" cy="46%" r="55%">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.22)" />
                  <stop offset="60%" stopColor="rgba(56, 189, 248, 0.05)" />
                  <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
                </radialGradient>
              </defs>

              <rect fill="url(#radar-glow)" height="440" width="900" x="0" y="0" />

              {/* Concentric range rings around Patli base */}
              <circle
                className="radar-ring"
                cx="342"
                cy="202"
                fill="none"
                r="78"
                stroke="rgba(56, 189, 248, 0.24)"
                strokeDasharray="4 6"
                strokeWidth="1.2"
              />
              <circle
                className="radar-ring"
                cx="342"
                cy="202"
                fill="none"
                r="156"
                stroke="rgba(56, 189, 248, 0.16)"
                strokeWidth="1"
              />
              <circle
                className="radar-ring"
                cx="342"
                cy="202"
                fill="none"
                r="242"
                stroke="rgba(56, 189, 248, 0.1)"
                strokeDasharray="6 8"
                strokeWidth="1"
              />

              {/* Regional NCR Logistics Highways: KMP Expressway & NH-48 corridor */}
              <path
                d="M 60 365 C 210 305, 342 202, 594 273 S 800 180, 860 95"
                fill="none"
                stroke="rgba(148, 163, 184, 0.34)"
                strokeDasharray="8 6"
                strokeWidth="2"
              />
              <path
                d="M 155 48 C 245 140, 315 170, 342 202 L 490 385"
                fill="none"
                stroke="rgba(56, 189, 248, 0.26)"
                strokeWidth="1.6"
              />
              <line
                stroke="rgba(52, 211, 153, 0.52)"
                strokeDasharray="5 5"
                strokeWidth="1.8"
                x1="342"
                x2="594"
                y1="202"
                y2="273"
              />

              <text
                fill="rgba(148, 163, 184, 0.72)"
                fontFamily="monospace"
                fontSize="11"
                x="110"
                y="344"
              >
                KMP EXPRESSWAY CORRIDOR
              </text>
              <text
                fill="rgba(148, 163, 184, 0.72)"
                fontFamily="monospace"
                fontSize="11"
                x="630"
                y="196"
              >
                NH-48 FREIGHT ROUTE
              </text>
            </svg>
            <div className="corridor-radar-sweep" />
          </div>
        )}

        <div aria-hidden="true" className="footprint-map-overlay" />

        {visualMode === 'animation'
          ? CORRIDOR_NODES.map((node) => {
              const selected = activeNode.id === node.id;
              return (
                <button
                  aria-label={`Select ${node.title} (${node.location})`}
                  aria-pressed={selected}
                  className={`corridor-pin ${selected ? 'corridor-pin--active' : ''} ${node.status === 'active' ? 'corridor-pin--current' : 'corridor-pin--past'}`}
                  key={node.id}
                  onClick={() => setActiveSiteId(node.id)}
                  style={{ left: `${node.xPercent}%`, top: `${node.yPercent}%` }}
                  type="button"
                >
                  <span aria-hidden="true" className="corridor-pin-ring" />
                  <span aria-hidden="true" className="corridor-pin-core" />
                  <span className="corridor-pin-label">
                    <strong>{node.title}</strong>
                    <small>{node.cameras} cam</small>
                  </span>
                </button>
              );
            })
          : null}

        <div className="footprint-map-top">
          <span>
            <MapPin aria-hidden="true" size={14} /> {activeNode.location} · {activeNode.coordsLabel}
          </span>
          <span>
            <ShieldCheck aria-hidden="true" size={14} />{' '}
            {visualMode === 'animation' ? 'INTERACTIVE RADAR ANIMATION' : 'AMBIENT VIDEO FEED'}
          </span>
        </div>

        <aside aria-live="polite" className="footprint-details">
          <div className="footprint-details-heading">
            <span>{activeNode.status === 'active' ? 'CURRENT HUB' : 'PAST DEPLOYMENT'}</span>
          </div>
          <strong>{activeNode.title}</strong>
          <div className="footprint-readouts">
            <div>
              <small>CLIENT</small>
              {activeNode.client}
            </div>
            <div>
              <small>PERIOD</small>
              {activeNode.period}
            </div>
            <div>
              <small>CAMERAS</small>
              {activeNode.cameras} ch
            </div>
          </div>
          <div className="footprint-details-links">
            <a href={activeNode.osmUrl} rel="noopener noreferrer" target="_blank">
              OpenStreetMap <ArrowUpRight aria-hidden="true" size={13} />
            </a>
            <a href={contact.mapUrl} rel="noopener noreferrer" target="_blank">
              Google Maps <ArrowUpRight aria-hidden="true" size={13} />
            </a>
          </div>
        </aside>
      </div>

      <div className="footprint-corridor-legend">
        <span>
          <MapPin aria-hidden="true" size={13} /> {profile.location} · 28.45° N, 76.85° E
        </span>
        <span>
          <ShieldCheck aria-hidden="true" size={13} /> 100% Free Client-Side View · Switch between
          Animated Radar &amp; Ambient Video
        </span>
      </div>
    </div>
  );
}
