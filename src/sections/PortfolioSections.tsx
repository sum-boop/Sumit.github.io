import { Suspense, lazy } from 'react';
import { Hero } from '@/components/Hero';
import type { ThemeMode } from '@/hooks/useTheme';
import { PageTransition } from '@/motion';
import type { DeploymentBriefing } from '@/types/portfolio';

const About = lazy(() =>
  import('@/components/About').then((module) => ({ default: module.About })),
);
const Skills = lazy(() =>
  import('@/components/Skills').then((module) => ({ default: module.Skills })),
);
const Footprint = lazy(() =>
  import('@/components/Footprint').then((module) => ({ default: module.Footprint })),
);
const Deployments = lazy(() =>
  import('@/components/Deployments').then((module) => ({ default: module.Deployments })),
);
const Experience = lazy(() =>
  import('@/components/Experience').then((module) => ({ default: module.Experience })),
);
const Credentials = lazy(() =>
  import('@/components/Credentials').then((module) => ({ default: module.Credentials })),
);
const Contact = lazy(() =>
  import('@/components/Contact').then((module) => ({ default: module.Contact })),
);

interface PortfolioSectionsProps {
  theme: ThemeMode;
  onOpenDeployment: (deployment: DeploymentBriefing) => void;
}

function SectionSkeleton({ minHeight }: { minHeight: string }) {
  return (
    <div aria-hidden="true" className="skeleton-section" style={{ minHeight }}>
      <div className="skeleton-bar skeleton-bar--short" />
      <div className="skeleton-bar skeleton-bar--title" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

export function PortfolioSections({ theme, onOpenDeployment }: PortfolioSectionsProps) {
  return (
    <PageTransition>
      <main id="main-content">
        <Hero theme={theme} />

        <Suspense fallback={<SectionSkeleton minHeight="540px" />}>
          <About />
        </Suspense>

        <Suspense fallback={<SectionSkeleton minHeight="520px" />}>
          <Skills />
        </Suspense>

        <Suspense fallback={<SectionSkeleton minHeight="620px" />}>
          <Footprint theme={theme} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton minHeight="720px" />}>
          <Deployments onOpen={onOpenDeployment} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton minHeight="540px" />}>
          <Experience />
        </Suspense>

        <Suspense fallback={<SectionSkeleton minHeight="440px" />}>
          <Credentials />
        </Suspense>

        <Suspense fallback={<SectionSkeleton minHeight="580px" />}>
          <Contact />
        </Suspense>
      </main>
    </PageTransition>
  );
}
