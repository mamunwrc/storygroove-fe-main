import { useEffect, useState } from "react";

export const MOBILE_LAYOUT_MQ = "(max-width: 1199px)";

export const useMobileLayout = () => {
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_LAYOUT_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_LAYOUT_MQ);
    const onChange = () => setIsMobileLayout(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobileLayout;
};
