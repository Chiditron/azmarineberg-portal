import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type TableHTMLAttributes,
} from 'react';

type TableChildProps = TableHTMLAttributes<HTMLTableElement>;

export type TableWrapperProps = {
  children: ReactElement<TableChildProps>;
  /** Sticky table header while scrolling vertically inside the wrapper (when maxHeight is set). */
  stickyHeader?: boolean;
  /** Minimum width for every th/td (pixels); avoids columns collapsing on narrow viewports. */
  minColumnWidthPx?: number;
  /** When set, tbody scrolls vertically and thead stays sticky within this region. */
  maxHeight?: string;
  className?: string;
};

let hintRaf = 0;

/**
 * Responsive table shell: horizontal scroll on small screens, optional sticky header,
 * subtle edge gradients when more content is scrollable, smooth scrolling.
 * For very large row counts, prefer server-side pagination or a virtualized body — this wrapper is presentational only.
 */
export default function TableWrapper({
  children,
  stickyHeader = true,
  minColumnWidthPx = 128,
  maxHeight,
  className = '',
}: TableWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hintLeft, setHintLeft] = useState(false);
  const [hintRight, setHintRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const epsilon = 2;
    setHintLeft(scrollLeft > epsilon);
    setHintRight(scrollLeft + clientWidth < scrollWidth - epsilon);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scheduleHints = () => {
      if (hintRaf) cancelAnimationFrame(hintRaf);
      hintRaf = requestAnimationFrame(() => {
        hintRaf = 0;
        updateScrollHints();
      });
    };

    scheduleHints();
    const ro = new ResizeObserver(scheduleHints);
    ro.observe(el);
    el.addEventListener('scroll', scheduleHints, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', scheduleHints);
      if (hintRaf) cancelAnimationFrame(hintRaf);
    };
  }, [updateScrollHints]);

  if (!isValidElement(children)) {
    console.warn('TableWrapper expects a single <table> element as child.');
    return children as ReactNode;
  }

  const tableEl = children as ReactElement<TableChildProps>;
  const prevStyle = tableEl.props.style as CSSProperties | undefined;
  const tableProps: TableChildProps = {
    ...tableEl.props,
    className: [tableEl.props.className, 'w-full min-w-max border-collapse'].filter(Boolean).join(' '),
    style: {
      ...prevStyle,
      minWidth: '100%',
    },
  };

  const scrollStyle: CSSProperties = maxHeight
    ? { maxHeight, overflowY: 'auto' as const }
    : {};

  const cssVars = {
    '--table-col-min': `${minColumnWidthPx}px`,
  } as CSSProperties;

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={scrollRef}
        className={`table-wrapper-scroll overflow-x-auto scroll-smooth rounded-lg ${
          stickyHeader ? 'table-wrapper-sticky-thead' : ''
        }`}
        style={{ ...cssVars, ...scrollStyle }}
      >
        {cloneElement(tableEl, tableProps)}
      </div>

      {/* Subtle hint that horizontal scroll is available (decorative only). */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 bg-gradient-to-r from-white to-transparent transition-opacity duration-300 ${
          hintLeft ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-white to-transparent transition-opacity duration-300 ${
          hintRight ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      />
    </div>
  );
}
