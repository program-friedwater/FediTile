import { useEffect, useMemo, useRef, useState } from "react";

type Props<T> = {
  items: T[];
  estimateItemHeight: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onNearEnd?: () => void;
  endThresholdPx?: number;
  prependCompensationKey?: number;
  prependCompensationPx?: number;
  topLockThresholdPx?: number;
  onTopLockChange?: (nearTop: boolean) => void;
};

export function VirtualList<T>(props: Props<T>) {
  const overscan = props.overscan ?? 6;
  const endThresholdPx = props.endThresholdPx ?? 800;
  const topLockThresholdPx = props.topLockThresholdPx ?? 24;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const nearTopRef = useRef(true);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);
    setViewportHeight(el.clientHeight);
    nearTopRef.current = el.scrollTop <= topLockThresholdPx;
    props.onTopLockChange?.(nearTopRef.current);
    return () => ro.disconnect();
  }, [props, topLockThresholdPx]);

  const totalHeight = props.items.length * props.estimateItemHeight;

  const { startIndex, endIndex, padTop, padBottom } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / props.estimateItemHeight) - overscan);
    const end = Math.min(
      props.items.length,
      Math.ceil((scrollTop + viewportHeight) / props.estimateItemHeight) + overscan,
    );
    const top = start * props.estimateItemHeight;
    const bottom = Math.max(0, totalHeight - end * props.estimateItemHeight);
    return { startIndex: start, endIndex: end, padTop: top, padBottom: bottom };
  }, [overscan, props.estimateItemHeight, props.items.length, scrollTop, totalHeight, viewportHeight]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !props.onNearEnd) return;
    const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (remaining < endThresholdPx) props.onNearEnd();
  }, [endThresholdPx, props, scrollTop, viewportHeight]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const compensation = props.prependCompensationPx ?? 0;
    if (compensation <= 0) return;
    if (nearTopRef.current) return;
    el.scrollTop += compensation;
    setScrollTop(el.scrollTop);
  }, [props.prependCompensationKey, props.prependCompensationPx]);

  return (
    <div
      ref={scrollerRef}
      className={props.className}
      onScroll={(e) => {
        const nextScrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
        nearTopRef.current = nextScrollTop <= topLockThresholdPx;
        props.onTopLockChange?.(nearTopRef.current);
        setScrollTop(nextScrollTop);
      }}
    >
      <div style={{ height: totalHeight }}>
        <div style={{ paddingTop: padTop, paddingBottom: padBottom }}>
          {props.items.slice(startIndex, endIndex).map((item, i) => props.renderItem(item, startIndex + i))}
        </div>
      </div>
    </div>
  );
}
