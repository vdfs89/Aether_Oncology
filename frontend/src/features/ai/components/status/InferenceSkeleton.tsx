"use client"

import * as React from "react"

export function InferenceSkeleton() {
  return (
    <div className="flex flex-col gap-3 mt-2 mb-1 w-full max-w-2xl">
      <div className="h-4 bg-neutral-800/40 rounded w-3/4 animate-pulse" />
      <div className="h-4 bg-neutral-800/40 rounded w-full animate-pulse" />
      <div className="h-4 bg-neutral-800/40 rounded w-5/6 animate-pulse" />
    </div>
  )
}
