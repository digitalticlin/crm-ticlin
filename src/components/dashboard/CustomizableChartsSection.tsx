
import { useDashboardConfig } from "@/hooks/dashboard/useDashboardConfig";
import ChartsSection from "./ChartsSection";
import FunnelChart from "./charts/FunnelChart";
import PerformanceChart from "./charts/PerformanceChart";
import TagsChart from "./charts/TagsChart";
import DistributionChart from "./charts/DistributionChart";
import { useMemo, useEffect } from "react";

const chartComponents = {
  funil_conversao: FunnelChart,
  performance_vendedores: PerformanceChart,
  evolucao_temporal: ChartsSection,
  leads_etiquetas: TagsChart,
  distribuicao_fonte: DistributionChart
};

export default function CustomizableChartsSection() {
  const { config, loading, forceUpdate, renderCount } = useDashboardConfig();

  // CORREÇÃO: Keys baseadas no hash real do config + timestamp
  const configHash = useMemo(() => {
    return JSON.stringify(config.charts) + JSON.stringify(config.layout.chart_order);
  }, [config.charts, config.layout.chart_order]);

  // CORREÇÃO: Simplified visible charts calculation
  const visibleCharts = useMemo(() => {
    const visible = config.layout.chart_order.filter(
      chartKey => config.charts[chartKey as keyof typeof config.charts]
    );
    const timestamp = Date.now();
    console.log(`✅ CHARTS VISIBLE RECALCULATED [${timestamp}]:`, {
      visible,
      forceUpdate,
      renderCount,
      configHash: configHash.slice(0, 50) + '...'
    });
    return visible;
  }, [config.layout.chart_order, config.charts, configHash]);

  // Monitoramento robusto de mudanças
  useEffect(() => {
    const timestamp = Date.now();
    console.log(`📈 CHARTS REACTIVE UPDATE [${timestamp}]:`, {
      forceUpdate,
      renderCount,
      configCharts: config.charts,
      visibleCharts,
      configHash: configHash.slice(0, 50) + '...'
    });
  }, [forceUpdate, renderCount, config.charts, visibleCharts, configHash]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-96 bg-white/20 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (visibleCharts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 animate-fade-in">
        <p>Nenhum gráfico selecionado. Configure o dashboard para visualizar os gráficos.</p>
      </div>
    );
  }

  const getGridCols = (count: number) => {
    if (count === 1) return "grid-cols-1 max-w-4xl mx-auto";
    if (count === 2) return "grid-cols-1 lg:grid-cols-2";
    if (count === 3) return "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3";
    return "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
  };

  return (
    <div 
      className={`grid ${getGridCols(visibleCharts.length)} gap-6 transition-all duration-300 ease-in-out transform`}
      style={{
        animation: "fade-in 0.3s ease-out"
      }}
    >
      {visibleCharts.map((chartKey, index) => {
        const ChartComponent = chartComponents[chartKey as keyof typeof chartComponents];
        const isEnabled = config.charts[chartKey as keyof typeof config.charts];
        
        if (!ChartComponent) {
          console.error(`❌ Component not found for chart key: ${chartKey}`);
          return (
            <div key={chartKey} className="rounded-3xl bg-white/35 backdrop-blur-lg border border-white/30 shadow-2xl p-6">
              <p className="text-gray-600">Componente não encontrado para: {chartKey}</p>
            </div>
          );
        }
        
        const timestamp = Date.now();
        console.log(`📊 Rendering Chart [${timestamp}]: ${chartKey} enabled:${isEnabled}`);
        
        // CORREÇÃO: Key robusta baseada no hash real do config
        const robustKey = `chart-${chartKey}-${configHash.slice(-8)}-${isEnabled}-${index}`;
        
        return (
          <div
            key={robustKey}
            className="animate-fade-in transform transition-all duration-200"
            style={{ 
              animationDelay: `${index * 100}ms`,
              transform: "scale(1)"
            }}
          >
            <ChartComponent />
          </div>
        );
      })}
    </div>
  );
}
