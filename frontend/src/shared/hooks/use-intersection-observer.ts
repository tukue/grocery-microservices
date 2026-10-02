import { useEffect } from "react";

export function useIntersectionObserver(
  targetRef: React.RefObject<HTMLElement>,
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverInit = {},
) {
  const { rootMargin, threshold, root } = options;
  useEffect(() => {
    const element = targetRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => callback(entry.isIntersecting),
      { rootMargin, threshold, root },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [targetRef, callback, rootMargin, threshold, root]);
}
