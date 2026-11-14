import { AnimatePresence, LayoutGroup, m, useMotionValueEvent, useScroll } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Command, Menu, Moon, Radio, Sun, X } from 'lucide-react';
import { useClock } from '@/hooks/useClock';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import type { ThemeMode } from '@/hooks/useTheme';
import {
  ScrollProgress,
  drawerLinkVariants,
  drawerVariants,
  motionDurations,
  motionEasings,
  motionSprings,
} from '@/motion';

interface NavbarProps {
  theme: ThemeMode;
  onToggleTheme: (origin?: { x: number; y: number }) => void;
  onOpenPalette: () => void;
}

const links = [
  { href: '#about', label: 'Expertise' },
  { href: '#footprint', label: 'Footprint' },
  { href: '#operations', label: 'Deployments' },
  { href: '#experience', label: 'Logbook' },
  { href: '#contact', label: 'Contact' },
] as const;

const sectionIds = ['hero', 'about', 'footprint', 'operations', 'experience', 'contact'] as const;
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

export function Navbar({ theme, onToggleTheme, onOpenPalette }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const activeSection = useScrollSpy(sectionIds);
  const clock = useClock();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const isScrolled = latest > 8;
    setScrolled((prev) => (prev === isScrolled ? prev : isScrolled));
  });

  useEffect(() => {
    if (!menuOpen) return;
    firstLinkRef.current?.focus({ preventScroll: true });
    document.body.classList.add('menu-open');

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        toggleRef.current?.focus({ preventScroll: true });
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('menu-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const closeAfterNavigation = () => setMenuOpen(false);

  return (
    <>
      <ScrollProgress />
      <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>
        <nav aria-label="Primary navigation" className="nav-shell">
          <a
            aria-label="Sumit Anand — Home"
            className="brand-mark"
            href="#hero"
            onClick={closeAfterNavigation}
          >
            <span aria-hidden="true" className="brand-symbol">
              <Radio size={18} strokeWidth={1.8} />
            </span>
            <span>
              Sumit<span className="brand-surname"> Anand</span>
            </span>
          </a>

          <LayoutGroup id="primary-navbar">
            <div className="desktop-nav">
              {links.map((link) => {
                const active = activeSection === link.href.slice(1);
                return (
                  <m.a
                    aria-current={active ? 'location' : undefined}
                    className="nav-link"
                    href={link.href}
                    key={link.href}
                    whileTap={{ scale: 0.97 }}
                  >
                    {link.label}
                    {active ? (
                      <m.span
                        aria-hidden="true"
                        className="nav-active-indicator"
                        layoutId="active-nav-indicator"
                        transition={motionSprings.snappy}
                      />
                    ) : null}
                  </m.a>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="nav-actions">
            <div className="nav-telemetry" aria-label={`IST time ${clock}`}>
              <time>{clock}</time>
            </div>
            <button
              aria-label="Open command palette (Ctrl+K)"
              className="icon-button nav-utility-btn"
              onClick={onOpenPalette}
              title="Command palette (Ctrl+K / ⌘K)"
              type="button"
            >
              <Command aria-hidden="true" size={16} />
            </button>
            <button
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="icon-button nav-utility-btn"
              onClick={(event) => {
                if (event.clientX > 0 || event.clientY > 0) {
                  onToggleTheme({ x: event.clientX, y: event.clientY });
                } else {
                  const rect = event.currentTarget.getBoundingClientRect();
                  onToggleTheme({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                  });
                }
              }}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              type="button"
            >
              {theme === 'dark' ? (
                <Sun aria-hidden="true" size={16} />
              ) : (
                <Moon aria-hidden="true" size={16} />
              )}
            </button>
            <m.a
              className="nav-cta"
              href="#contact"
              transition={{ duration: motionDurations.micro, ease: motionEasings.out }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              Let&apos;s talk <ArrowUpRight aria-hidden="true" size={14} />
            </m.a>
            <m.button
              aria-controls="mobile-navigation"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              className="menu-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              ref={toggleRef}
              type="button"
              whileTap={{ scale: 0.94 }}
            >
              {menuOpen ? (
                <X aria-hidden="true" size={20} />
              ) : (
                <Menu aria-hidden="true" size={20} />
              )}
            </m.button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen ? (
            <>
              <m.div
                animate={{ opacity: 1 }}
                aria-hidden="true"
                className="mobile-nav-backdrop"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
                transition={{ duration: motionDurations.micro, ease: motionEasings.inOut }}
              />
              <m.div
                animate="visible"
                aria-label="Mobile navigation"
                className="mobile-nav"
                exit="exit"
                id="mobile-navigation"
                initial="hidden"
                ref={drawerRef}
                role="dialog"
                variants={drawerVariants}
              >
                <div className="mobile-nav-head">
                  <span className="mono-label">Navigation</span>
                  <m.button
                    aria-label="Close navigation"
                    className="icon-button"
                    onClick={() => {
                      setMenuOpen(false);
                      toggleRef.current?.focus({ preventScroll: true });
                    }}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                  >
                    <X aria-hidden="true" size={18} />
                  </m.button>
                </div>
                <LayoutGroup id="mobile-navbar">
                  {links.map((link, index) => {
                    const active = activeSection === link.href.slice(1);
                    return (
                      <m.a
                        animate="visible"
                        aria-current={active ? 'location' : undefined}
                        className="mobile-nav-link"
                        custom={index}
                        href={link.href}
                        initial="hidden"
                        key={link.href}
                        onClick={closeAfterNavigation}
                        ref={index === 0 ? firstLinkRef : undefined}
                        variants={drawerLinkVariants}
                      >
                        <span className="mobile-nav-index">0{index + 1}</span>
                        <span>{link.label}</span>
                        <ArrowUpRight aria-hidden="true" size={16} />
                      </m.a>
                    );
                  })}
                </LayoutGroup>
              </m.div>
            </>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
}
