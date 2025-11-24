"use client";

import { useEffect } from "react";

type Props = {
  setSelectedView: (view: string) => void;
  setSecurityTab: (tab: string) => void;
  location: string;
};

export function useAdminNavigation({ setSelectedView, setSecurityTab, location }: Props) {
  // Handle /admin/alerts route navigation
  useEffect(() => {
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path && path.startsWith('/admin/alerts')) {
        setSelectedView('security');
        setSecurityTab('booking');
      }
    } catch (e) {
      // ignore
    }
  }, [location, setSelectedView, setSecurityTab]);

  // Handle hash-based navigation (e.g., /admin#activity:notifications)
  useEffect(() => {
    const isReloadNavigation = () => {
      try {
        const navEntries = (performance && performance.getEntriesByType) 
          ? performance.getEntriesByType('navigation') as PerformanceNavigationTiming[] 
          : [];
        if (Array.isArray(navEntries) && navEntries[0] && (navEntries[0] as any).type) {
          return (navEntries[0] as any).type === 'reload' || (navEntries[0] as any).type === 'back_forward';
        }
        if ((performance as any).navigation && typeof (performance as any).navigation.type === 'number') {
          return (performance as any).navigation.type === 1;
        }
      } catch (e) {
        // ignore
      }
      return false;
    };

    const handleHash = () => {
      try {
        const rawHash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
        if (!rawHash) return;
        
        const normalized = rawHash.replace('/', ':');
        const parts = normalized.split(':');
        
        if (parts[0] === 'security' && parts[1] === 'users') {
          setSelectedView('security');
          setSecurityTab('users');
          
          if (isReloadNavigation()) {
            try {
              const overviewTarget = '/admin#overview';
              if (window.location.pathname + window.location.hash !== overviewTarget) {
                window.history.replaceState({}, '', overviewTarget);
              }
            } catch (e) { /* ignore */ }
          }
        } else if (parts[0] === 'activity' && parts[1] === 'notifications') {
          setSelectedView('security');
          setSecurityTab('booking');
          
          if (isReloadNavigation()) {
            try {
              const overviewTarget = '/admin#overview';
              if (window.location.pathname + window.location.hash !== overviewTarget) {
                window.history.replaceState({}, '', overviewTarget);
              }
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) {
        // ignore
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [setSelectedView, setSecurityTab]);

  // Handle openAdminAlertsOnce flag
  useEffect(() => {
    try {
      const flag = typeof sessionStorage !== 'undefined' 
        ? sessionStorage.getItem('openAdminAlertsOnce') 
        : null;
        
      if (flag === '1') {
        try { sessionStorage.removeItem('openAdminAlertsOnce'); } catch (_) {}
        setSelectedView('security');
        setSecurityTab('booking');
        
        try {
          const navEntries = (performance && performance.getEntriesByType) 
            ? performance.getEntriesByType('navigation') as PerformanceNavigationTiming[] 
            : [];
          const isReload = (Array.isArray(navEntries) && navEntries[0] && (navEntries[0] as any).type && 
            ((navEntries[0] as any).type === 'reload' || (navEntries[0] as any).type === 'back_forward'))
            || ((performance as any).navigation && (performance as any).navigation.type === 1);
            
          if (isReload) {
            const target = '/admin#overview';
            if (window.location.pathname + window.location.hash !== target) {
              window.history.replaceState({}, '', target);
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
  }, [setSelectedView, setSecurityTab]);
}
