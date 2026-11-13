"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  graphic?: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export function BentoCard({
  eyebrow,
  title,
  description,
  graphic,
  className,
  badge,
}: BentoCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7 transition-all duration-200 hover:border-border/90 hover:shadow-sm",
        className
      )}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          {eyebrow && (
            <div className="text-[11px] font-mono font-medium text-primary uppercase tracking-wider">
              {eyebrow}
            </div>
          )}
          {badge}
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* Graphic Area */}
      {graphic && <div className="mt-5 relative w-full">{graphic}</div>}
    </motion.div>
  );
}
