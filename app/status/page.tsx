"use client"

import { SystemStatusDashboard } from "@/components/system-status-dashboard"
import { Button } from "@/components/ui/button"
import { Shield, Download } from "lucide-react"

export default function StatusPage() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-background via-background to-secondary/5 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">CipherChat System Status</h1>
                <p className="text-muted-foreground">Real-time monitoring and diagnostics</p>
              </div>
            </div>
            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Dashboard */}
        <SystemStatusDashboard />

        {/* Footer */}
        <div className="mt-8 p-4 rounded-lg bg-secondary/20 border border-border/50 text-center text-xs text-muted-foreground">
          <p>Last updated: {new Date().toLocaleString()}</p>
          <p className="mt-1">All systems operational. No issues detected.</p>
        </div>
      </div>
    </main>
  )
}
