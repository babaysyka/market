"use client";

import { useEffect, useRef, useState } from "react";

export function useCartFeedback() {
  const [added, setAdded] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  function showAdded() {
    setAdded(true);
    setAnimationKey((key) => key + 1);

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setAdded(false);
      timeoutRef.current = null;
    }, 1400);
  }

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  return { added, animationKey, showAdded };
}
