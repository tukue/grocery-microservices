import { useEffect } from "react";

export function useIntersectionObserver(
  targetRef: React.RefObject<HTMLElement>,
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverInit = {},
) {
  useEffect(() => {
    const element = targetRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => callback(entry.isIntersecting),
      {
        rootMargin: "0px 0px -50px 0px",
        ...options,
      },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [targetRef, callback, options]);
}
