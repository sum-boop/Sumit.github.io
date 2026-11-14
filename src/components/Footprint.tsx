import { ArrowUpRight, MapPin } from 'lucide-react';
import { type VmsSiteFocus, useVms } from '@/context/VmsContext';
import { contact } from '@/data/contact';
import { careerSites } from '@/data/experience';
import type { ThemeMode } from '@/hooks/useTheme';
import { ChoreoReveal } from '@/motion';
import { FootprintMap } from './FootprintMap';
import { SectionHeading } from './SectionHeading';

interface FootprintProps {
  theme: ThemeMode;
}

export function Footprint({ theme }: FootprintProps) {
  const { activeSiteId, setActiveSiteId } = useVms();

  const handleSelectSite = (siteId: string) => {
    const focusSite: VmsSiteFocus = siteId === 'ekart' ? 'ekart' : 'flipkart';
    setActiveSiteId(focusSite);
  };

  return (
    <section
      aria-labelledby="footprint-title"
      className="content-section footprint-section"
      id="footprint"
    >
      <div className="section-inner">
        <SectionHeading
          description="Interactive logistics corridor explorer centered on Patli, Haryana with animated radar and ambient video modes — synced with XProtect Smart Map."
          eyebrow="Deployment footprint"
          id="footprint-title"
          number="03"
          title="Where I watch from."
          tone="lime"
        />

        <div className="footprint-layout footprint-layout--clean">
          <ChoreoReveal className="footprint-gmap-card" direction="scale">
            <div className="footprint-gmap-header">
              <span>
                <MapPin aria-hidden="true" size={15} /> PATLI LOGISTICS CORRIDOR · HARYANA, INDIA
              </span>
              <a href={contact.mapUrl} rel="noopener noreferrer" target="_blank">
                Open Base in Google Maps <ArrowUpRight aria-hidden="true" size={14} />
              </a>
            </div>
            <FootprintMap theme={theme} />
          </ChoreoReveal>
        </div>

        <div className="site-list" role="group" aria-label="Select deployment site on Smart Map">
          {careerSites.map((site, index) => {
            const isSelected = activeSiteId === site.id;
            return (
              <ChoreoReveal
                delay={index * 0.08}
                direction={index % 2 === 0 ? 'left' : 'right'}
                distance={26}
                key={site.id}
              >
                <button
                  aria-pressed={isSelected}
                  className={`site-row site-row-btn ${isSelected ? 'site-row--active' : ''}`}
                  onClick={() => handleSelectSite(site.id)}
                  type="button"
                >
                  <span className="site-index">0{index + 1}</span>
                  <span className="site-row-state">
                    <i
                      className={
                        site.status === 'active'
                          ? 'status-pulse'
                          : 'status-pulse status-pulse--muted'
                      }
                    />
                    {site.status === 'active' ? 'CURRENT' : 'ARCHIVED'}
                  </span>
                  <strong>{site.name}</strong>
                  <span>
                    {site.client} · {site.period}
                  </span>
                  <span className="site-camera-count tabular-nums">{site.cameras} cameras</span>
                </button>
              </ChoreoReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
