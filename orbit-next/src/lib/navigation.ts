"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type NavigateOptions = {
  replace?: boolean;
};

export function useLegacyLocation(): [string, (path: string, options?: NavigateOptions) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  const location = useMemo(() => {
    const query = search ? `?${search}` : "";
    const hash = window.location.hash ?? "";
    return `${pathname ?? "/"}${query}${hash}`;
  }, [pathname, search]);

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
