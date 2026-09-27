import React from 'react';

/**
 * Skeleton card for Marketplace Grid view
 */
export function MarketplaceCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col"
        >
          {/* Image skeleton */}
          <div className="relative aspect-[4/3] bg-gradient-to-tr from-slate-150 via-slate-100 to-slate-200">
            {/* Price badge placeholder */}
            <div className="absolute bottom-3 left-3 w-16 h-7 bg-purple-200/80 rounded-xl" />
            {/* Heart button placeholder */}
            <div className="absolute top-3 right-3 w-9 h-9 bg-white/80 rounded-full shadow-sm" />
          </div>

          {/* Body content skeleton */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              {/* Category & Condition line */}
              <div className="flex items-center gap-2">
                <div className="h-3 w-20 bg-purple-100/90 rounded-md" />
                <div className="h-1 w-1 bg-slate-300 rounded-full" />
                <div className="h-3 w-16 bg-slate-150 rounded-md" />
                <div className="h-1 w-1 bg-slate-300 rounded-full" />
                <div className="h-3 w-24 bg-slate-150 rounded-md" />
              </div>

              {/* Title skeleton */}
              <div className="h-5 w-3/4 bg-slate-200 rounded-lg" />

              {/* Description skeleton */}
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full bg-slate-100 rounded-md" />
                <div className="h-3 w-5/6 bg-slate-100 rounded-md" />
              </div>
            </div>

            {/* Footer skeleton */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-100/70 shrink-0" />
                <div className="h-3 w-20 bg-slate-200 rounded-md" />
              </div>
              <div className="h-3 w-12 bg-slate-150 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton card for Marketplace List view
 */
export function MarketplaceCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        >
          <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
            {/* Square image */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-tr from-slate-150 via-slate-100 to-slate-200 shrink-0" />

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-3 w-20 bg-purple-100/90 rounded-md" />
                <div className="h-1 w-1 bg-slate-300 rounded-full" />
                <div className="h-3 w-16 bg-slate-150 rounded-md" />
              </div>
              <div className="h-4 w-48 bg-slate-200 rounded-lg" />
              <div className="h-3 w-full max-w-md bg-slate-100 rounded-md" />
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
            <div className="h-5 w-16 bg-purple-200/80 rounded-lg" />
            <div className="h-4 w-20 bg-slate-150 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton card for Events Grid view
 */
export function EventCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-[28px] sm:rounded-[32px] border-2 border-slate-100 p-4 sm:p-6 flex flex-col justify-between shadow-xs overflow-hidden"
        >
          <div>
            {/* Media Header */}
            <div className="overflow-hidden relative rounded-2xl bg-gradient-to-tr from-slate-200 via-slate-100 to-slate-150 h-40 sm:h-44 mb-4">
              {/* Date badge */}
              <div className="absolute top-3.5 left-3.5 w-28 h-7 bg-white/90 rounded-xl" />
              {/* Heart button */}
              <div className="absolute top-3.5 right-3.5 w-9 h-9 bg-white/80 rounded-full" />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-20 bg-orange-100/80 rounded-full" />
              <div className="h-5 w-14 bg-emerald-100/80 rounded-full" />
            </div>

            {/* Title */}
            <div className="space-y-2 mb-4">
              <div className="h-5 w-4/5 bg-slate-200 rounded-lg" />
              <div className="h-4 w-2/3 bg-slate-150 rounded-md" />
            </div>

            {/* Chips: Date, Time, Location */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="h-4 w-20 bg-orange-50 rounded-md" />
              <div className="h-4 w-24 bg-slate-100 rounded-md" />
              <div className="h-4 w-32 bg-slate-100 rounded-md" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100">
            <div className="h-5 w-24 bg-orange-100/90 rounded-lg" />
            <div className="h-4 w-20 bg-slate-200 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton card for Directory Professionals view
 */
export function DirectoryProCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4"
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-100 via-slate-100 to-slate-200 shrink-0" />

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="h-5 w-36 bg-slate-200 rounded-lg" />
                <div className="h-5 w-16 bg-blue-100 rounded-full" />
              </div>

              <div className="h-3.5 w-28 bg-slate-150 rounded-md" />

              {/* Star rating placeholder */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="w-3.5 h-3.5 bg-amber-100 rounded-sm" />
                ))}
                <div className="h-3 w-8 bg-slate-200 rounded-md ml-1" />
              </div>
            </div>
          </div>

          {/* Bio placeholder */}
          <div className="space-y-2 py-1">
            <div className="h-3 w-full bg-slate-100 rounded-md" />
            <div className="h-3 w-5/6 bg-slate-100 rounded-md" />
          </div>

          {/* Qualities / Badges placeholder */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <div className="h-5 w-18 bg-slate-100 rounded-lg" />
            <div className="h-5 w-24 bg-slate-100 rounded-lg" />
            <div className="h-5 w-20 bg-slate-100 rounded-lg" />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="h-4 w-28 bg-slate-150 rounded-md" />
            <div className="h-8 w-24 bg-blue-100 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton card for Guides view
 */
export function GuideCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4"
        >
          {/* Thumbnail */}
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-emerald-100 via-slate-100 to-slate-200 shrink-0" />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3.5 w-24 bg-emerald-100 rounded-md" />
            <div className="h-4.5 w-3/4 bg-slate-200 rounded-lg" />
            <div className="h-3 w-full bg-slate-100 rounded-md" />
          </div>

          <div className="w-6 h-6 rounded-full bg-slate-100 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton card for Profile My Items
 */
export function MyItemsCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3"
        >
          <div className="flex gap-3 items-start">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-purple-100 via-slate-200 to-slate-150 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="h-3.5 w-12 bg-purple-200 rounded-md" />
                <div className="h-4 w-16 bg-emerald-100 rounded-full" />
              </div>
              <div className="h-3.5 w-32 bg-slate-200 rounded-md" />
              <div className="h-3 w-24 bg-slate-150 rounded-md" />
            </div>
            <div className="w-7 h-7 bg-slate-200 rounded-xl" />
          </div>

          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-1">
            <div className="h-3 w-12 bg-slate-200 rounded" />
            <div className="flex gap-1">
              <div className="h-6 w-14 bg-slate-200 rounded-lg" />
              <div className="h-6 w-14 bg-slate-200 rounded-lg" />
              <div className="h-6 w-14 bg-slate-200 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Landing Page / HomeView
 */
export function HomeViewSkeleton() {
  return (
    <div className="px-6 pt-12 md:pt-20 pb-12 space-y-12 md:space-y-20 max-w-7xl mx-auto w-full animate-pulse">
      {/* Welcome & Jane Search Box Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded-xl" />
          <div className="h-6 w-3/4 bg-slate-150 rounded-lg" />
          <div className="h-4 w-full bg-slate-100 rounded-md" />
        </div>
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>

      {/* Jane AI Search Widget Skeleton */}
      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
        <div className="h-6 w-56 bg-slate-200 rounded-lg" />
        <div className="h-20 bg-white rounded-2xl border border-slate-200" />
        <div className="h-12 w-full bg-blue-200 rounded-2xl" />
      </div>

      {/* Discover Section Skeletons */}
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <div className="w-10 h-10 bg-slate-200 rounded-xl" />
              <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-5/6 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
