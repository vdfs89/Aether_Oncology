'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { PrecisionDashboard } from './PrecisionDashboard'
import { OpsClient } from '../../features/ai/telemetry/OpsClient'

export function DashboardContainer() {
  const [activeTab, setActiveTab] = useState<'precision' | 'ops'>('precision')

  if (activeTab === 'precision') {
    return (
      <PrecisionDashboard 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
    )
  }

  return (
    <div className="ao-dash">
      <div className="bg-fx" />
      <div className="stage">
        {/* ---------- TOPBAR ---------- */}
        <header className="topbar flex items-center justify-between gap-6 flex-wrap">
          <div className="brand flex items-center gap-4">
            <Image
              src="/brand-logo.png"
              alt="Aether Oncology"
              width={211}
              height={187}
              className="brand-mark"
              priority
            />
            <div className="brand-text text-left">
              <div className="brand-name">Aether Oncology</div>
              <div className="brand-sub">PRECISION FOR LIFE</div>
            </div>
          </div>

          <div className="seg">
            <button 
              type="button" 
              className={(activeTab as string) === 'precision' ? 'active' : ''} 
              onClick={() => setActiveTab('precision')}
            >
              Precision
            </button>
            <button 
              type="button" 
              className={(activeTab as string) === 'ops' ? 'active' : ''} 
              onClick={() => setActiveTab('ops')}
            >
              Clinical Ops
            </button>
          </div>

          <div className="eyebrow-pill">
            <span className="dot" />
            Clinical Ops · v3.1.0
          </div>
        </header>

        <div className="text-left mt-8">
          <OpsClient />
        </div>
      </div>
    </div>
  )
}
