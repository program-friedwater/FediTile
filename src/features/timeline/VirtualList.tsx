import { useEffect, useMemo, useRef, useState } from "react";

type Props<T> = {
  items: T[];
  itemKey: (item: T, index: number) => string;
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

function findIndex(offsets: number[], scrollTop: number) {
  let low = 0;
  let high = offsets.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (offsets[mid] <= scrollTop) low = mid;
    else high = mid - 1;
  }
  return low;
}

function Row(props: { index: number; onResize: (index: number, height: number) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const emit = () => props.onResize(props.index, el.offsetHeight);
    emit();
    const ro = new ResizeObserver(() => emit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [props]);

  return <div ref={ref}>{props.children}</div>;
}

export function VirtualList<T>(props: Props<T>) {
  const overscan = props.overscan ?? 6;
  const endThresholdPx = props.endThresholdPx ?? 800;
  const topLockThresholdPx = props.topLockThresholdPx ?? 24;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const nearTopRef = useRef(true);
  const heightsRef = useRef(new Map<string, number>());
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [, setHeightsVersion] = useState(0);

  const keys = useMemo(() => props.items.map((item, index) => props.itemKey(item, index)), [props]);
  const offsets = useMemo(() => {
    let acc = 0;
    return props.items.map((item, index) => {
      const top = acc;
      acc += heightsRef.current.get(props.itemKey(item, index)) ?? props.estimateItemHeight;
      return top;
    });
  }, [props.items, props.itemKey, props.estimateItemHeight, keys]);
  const totalHeight =
    offsets[props.items.length - 1] + (heightsRef.current.get(keys[props.items.length - 1] ?? "") ?? props.estimateItemHeight) || 0;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);
    setViewportHeight(el.clientHeight);
    nearTopRef.current = el.scrollTop <= topLockThresholdPx;
    props.onTopLockChange?.(nearTopRef.current);
    return () => ro.disconnect();
  }, [props.onTopLockChange, topLockThresholdPx]);

  const { startIndex, endIndex, padTop, padBottom } = useMemo(() => {
    if (props.items.length === 0) return { startIndex: 0, endIndex: 0, padTop: 0, padBottom: 0 };
    const anchor = findIndex(offsets, scrollTop);
    const start = Math.max(0, anchor - overscan);
    const viewportBottom = scrollTop + viewportHeight;
    let end = anchor;
    while (end < props.items.length && offsets[end] < viewportBottom) end += 1;
    end = Math.min(props.items.length, end + overscan);
    const padTopValue = offsets[start] ?? 0;
    const renderedHeight = (offsets[end] ?? totalHeight) - padTopValue;
    return {
      startIndex: start,
      endIndex: end,
      padTop: padTopValue,
      padBottom: Math.max(0, totalHeight - padTopValue - renderedHeight),
    };
  }, [offsets, overscan, props.items.length, scrollTop, totalHeight, viewportHeight]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !props.onNearEnd) return;
    const remaining = totalHeight - (el.scrollTop + el.clientHeight);
    if (remaining < endThresholdPx) props.onNearEnd();
  }, [endThresholdPx, props.onNearEnd, scrollTop, totalHeight, viewportHeight]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const compensation = props.prependCompensationPx ?? 0;
    if (compensation <= 0 || nearTopRef.current) return;
    el.scrollTop += compensation;
    setScrollTop(el.scrollTop);
  }, [props.prependCompensationKey, props.prependCompensationPx]);

  const handleResize = (index: number, height: number) => {
    const key = keys[index];
    if (!key) return;
    const prev = heightsRef.current.get(key);
    if (prev === height) return;
    heightsRef.current.set(key, height);
    if ((offsets[index] ?? 0) < scrollTop) {
      const el = scrollerRef.current;
      if (el) {
        el.scrollTop += height - (prev ?? props.estimateItemHeight);
        setScrollTop(el.scrollTop);
      }
    }
    setHeightsVersion((n) => n + 1);
  };

  return (
    <div
      ref={scrollerRef}
      className={props.className}
      onScroll={(e) => {
        const nextScrollTop = e.currentTarget.scrollTop;
        nearTopRef.current = nextScrollTop <= topLockThresholdPx;
        props.onTopLockChange?.(nearTopRef.current);
        setScrollTop(nextScrollTop);
      }}
    >
      <div style={{ height: totalHeight }}>
        <div style={{ paddingTop: padTop, paddingBottom: padBottom }}>
          {props.items.slice(startIndex, endIndex).map((item, i) => {
            const index = startIndex + i;
            return (
              <Row key={keys[index]} index={index} onResize={handleResize}>
                {props.renderItem(item, index)}
              </Row>
            );
          })}
        </div>
      </div>
    </div>
  );
}
