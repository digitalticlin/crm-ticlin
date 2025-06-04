
import ResponsiveSidebar from "@/components/layout/ResponsiveSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCustomizer from "@/components/dashboard/customizer/DashboardCustomizer";
import { CustomizableKPIGrid } from "@/components/dashboard/CustomizableKPIGrid";
import CustomizableChartsSection from "@/components/dashboard/CustomizableChartsSection";
import PeriodFilter from "@/components/dashboard/PeriodFilter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboardConfig } from "@/hooks/dashboard/useDashboardConfig";
import { cn } from "@/lib/utils";
import { useEffect, useMemo } from "react";

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { config, forceUpdate, loading, renderCount } = useDashboardConfig();

  // CORREÇÃO: Hash baseado no config real para keys consistentes
  const configHash = useMemo(() => {
    return JSON.stringify({ kpis: config.kpis, charts: config.charts });
  }, [config.kpis, config.charts]);

  // Monitoramento robusto de mudanças do dashboard
  useEffect(() => {
    const timestamp = Date.now();
    console.log(`🏠 DASHBOARD RENDER STATE CHECK [${timestamp}]:`, {
      forceUpdate,
      renderCount,
      loading,
      configKPIs: config.kpis,
      configCharts: config.charts,
      configHash: configHash.slice(0, 50) + '...',
      enabledKpis: Object.values(config.kpis).filter(Boolean).length,
      enabledCharts: Object.values(config.charts).filter(Boolean).length
    });
  }, [forceUpdate, renderCount, config, loading, configHash]);

  return (
    <div className="flex min-h-screen bg-gray-200 relative overflow-hidden">
      {/* Gradiente radial como fundo - mesmo estilo das telas de auth */}
      <div 
        className="absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(circle at 30% 70%, #D3D800 0%, transparent 50%), 
                       radial-gradient(circle at 80% 20%, #17191c 0%, transparent 60%),
                       radial-gradient(circle at 60% 40%, #D3D800 0%, transparent 40%)`
        }}
      ></div>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gray-300/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/3 rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px] opacity-15"></div>
      </div>

      <ResponsiveSidebar />
      
      <main className="flex-1 overflow-auto relative z-10">
        <div className={cn(
          "p-4 md:p-6 space-y-6 md:space-y-8",
          isMobile && "pt-6"
        )}>
          <DashboardHeader />
          
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 md:p-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Análise de Performance</h2>
                <p className="text-sm text-gray-800">Visualize seus dados e métricas em tempo real</p>
              </div>
              
              <div className="flex justify-center md:justify-start">
                <PeriodFilter />
              </div>
              
              <div className="flex justify-end">
                <DashboardCustomizer />
              </div>
            </div>
          </div>
          
          {/* CORREÇÃO: Keys robustas baseadas no hash real do config */}
          <div key={`dashboard-kpi-${configHash.slice(-16)}`}>
            <CustomizableKPIGrid />
          </div>
          
          <div key={`dashboard-charts-${configHash.slice(-16)}`}>
            <CustomizableChartsSection />
          </div>
        </div>
      </main>
    </div>
  );
}
