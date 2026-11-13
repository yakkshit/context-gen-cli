"use client";

import React, {
  Children,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface SequenceContextValue {
  completeItem: (index: number) => void;
  activeIndex: number;
  sequenceStarted: boolean;
}

const SequenceContext = createContext<SequenceContextValue | null>(null);
const useSequence = () => useContext(SequenceContext);

const ItemIndexContext = createContext<number | null>(null);
const useItemIndex = () => useContext(ItemIndexContext);

interface AnimatedSpanProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const AnimatedSpan = ({
  children,
  delay = 0,
  className,
}: AnimatedSpanProps) => {
  const sequence = useSequence();
  const itemIndex = useItemIndex();
  const [hasStarted, setHasStarted] = useState(!sequence);

  useEffect(() => {
    if (!sequence || itemIndex === null) return;
    if (!sequence.sequenceStarted) return;
    if (hasStarted) return;
    if (sequence.activeIndex === itemIndex) {
      setHasStarted(true);
    }
  }, [sequence, hasStarted, itemIndex]);

  useEffect(() => {
    if (hasStarted && sequence && itemIndex !== null) {
      const timer = setTimeout(() => {
        sequence.completeItem(itemIndex);
      }, delay + 200);
      return () => clearTimeout(timer);
    }
  }, [hasStarted, sequence, itemIndex, delay]);

  if (!hasStarted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("text-xs font-mono tracking-tight", className)}
    >
      {children}
    </motion.div>
  );
};

interface TypingAnimationProps {
  children: string;
  className?: string;
  duration?: number;
  delay?: number;
}

export const TypingAnimation = ({
  children,
  className,
  duration = 30,
  delay = 0,
}: TypingAnimationProps) => {
  const sequence = useSequence();
  const itemIndex = useItemIndex();
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(!sequence);

  useEffect(() => {
    if (!sequence || itemIndex === null) return;
    if (sequence.sequenceStarted && sequence.activeIndex === itemIndex) {
      const timer = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(timer);
    }
  }, [sequence, itemIndex, delay]);

  useEffect(() => {
    if (!started) return;

    let i = 0;
    const interval = setInterval(() => {
      if (i < children.length) {
        setDisplayedText(children.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        if (sequence && itemIndex !== null) {
          sequence.completeItem(itemIndex);
        }
      }
    }, duration);

    return () => clearInterval(interval);
  }, [children, duration, started, sequence, itemIndex]);

  return (
    <span className={cn("text-xs font-mono font-medium tracking-tight text-foreground", className)}>
      {displayedText}
      {started && displayedText.length < children.length && (
        <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse" />
      )}
    </span>
  );
};

interface TerminalProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  sequence?: boolean;
}

export const Terminal = ({
  children,
  className,
  title = "bash — ctx",
  sequence = true,
}: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef, { amount: 0.2, once: true });
  const [activeIndex, setActiveIndex] = useState(0);

  const contextValue = useMemo<SequenceContextValue | null>(() => {
    if (!sequence) return null;
    return {
      completeItem: (index: number) => {
        setActiveIndex((curr) => (index === curr ? curr + 1 : curr));
      },
      activeIndex,
      sequenceStarted: isInView,
    };
  }, [sequence, activeIndex, isInView]);

  const wrappedChildren = useMemo(() => {
    if (!sequence) return children;
    const array = Children.toArray(children);
    return array.map((child, index) => (
      <ItemIndexContext.Provider key={index} value={index}>
        {child}
      </ItemIndexContext.Provider>
    ));
  }, [children, sequence]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-2xl border border-border bg-card shadow-sm overflow-hidden font-mono",
        className
      )}
    >
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-secondary/80 border border-secondary" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary/80 border border-primary" />
        </div>
        <span className="text-[11px] text-muted-foreground font-mono tracking-tight">{title}</span>
        <div className="w-10" />
      </div>

      {/* Terminal Body */}
      <div className="p-4 sm:p-5 overflow-x-auto text-foreground">
        <SequenceContext.Provider value={contextValue}>
          <div className="space-y-2">{wrappedChildren}</div>
        </SequenceContext.Provider>
      </div>
    </div>
  );
};
