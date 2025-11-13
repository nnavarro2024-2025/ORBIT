"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type NavigateOptions = {
  replace?: boolean;
};

export function useLegacyLocation(): [string, (path: string, options?: NavigateOptions) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  const [hash, setHash] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.location.hash ?? "";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateHash = () => {
      const next = window.location.hash ?? "";
      setHash((current) => (current === next ? current : next));
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
    };
  }, []);

  const [location, setLocationState] = useState<string>(() => {
    const query = search ? `?${search}` : "";
    return `${pathname ?? "/"}${query}${hash}`;
  });

  useEffect(() => {
    const query = search ? `?${search}` : "";
    const next = `${pathname ?? "/"}${query}${hash}`;
    setLocationState((current) => (current === next ? current : next));
  }, [pathname, search, hash]);

  const setLocation = useCallback(
    (path: string, options?: NavigateOptions) => {
      if (options?.replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
    },
    [router]
  );

  return [location, setLocation];
}
