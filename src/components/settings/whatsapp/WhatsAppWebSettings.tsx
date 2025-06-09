import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Shield, AlertTriangle, Activity, CheckCircle } from "lucide-react";
import { useWhatsAppWebInstances } from "@/hooks/whatsapp/useWhatsAppWebInstances";
import { WhatsAppWebLoadingState } from "./WhatsAppWebLoadingState";
import { WhatsAppWebEmptyState } from "./WhatsAppWebEmptyState";
import { WhatsAppWebInstancesGrid } from "./WhatsAppWebInstancesGrid";
import { ImprovedConnectWhatsAppButton } from "./ImprovedConnectWhatsAppButton";
import { CleanupOrphanedInstancesButton } from "./CleanupOrphanedInstancesButton";
import { OrphanInstanceManager } from "./OrphanInstanceManager";
import { AutoQRModal } from "./AutoQRModal";
import { AsyncStatusIndicator } from "./AsyncStatusIndicator";
import { VPSHealthService } from "@/services/whatsapp/vpsHealthService";
import { WhatsAppCleanupService } from "@/services/whatsapp/cleanupService";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const WhatsAppWebSettings = () => {
  const [vpsHealth, setVpsHealth] = useState<{ online: boolean; responseTime?: number } | null>(null);
  const [orphanCount, setOrphanCount] = useState<number>(0);
  const { user } = useAuth();
  
  const {
    instances,
    isLoading,
    isConnecting,
    error,
    showQRModal,
    selectedQRCode,
    selectedInstanceName,
    isPolling,
    currentAttempt,
    isWaiting,
    maxAttempts,
    refetch,
    createInstance,
    deleteInstance,
    refreshQRCode,
    closeQRModal,
    retryQRCode,
    syncPendingInstances
  } = useWhatsAppWebInstances();

  // CORREÇÃO: Monitoramento otimizado da VPS
  useEffect(() => {
    const checkVPSHealth = async () => {
      const health = await VPSHealthService.checkVPSHealth();
      setVpsHealth({
        online: health.online,
        responseTime: health.responseTime
      });
    };

    const checkOrphanCount = async () => {
      const count = await WhatsAppCleanupService.getOrphanInstancesCount();
      setOrphanCount(count);
    };

    checkVPSHealth();
    checkOrphanCount();

    const interval = setInterval(() => {
      checkVPSHealth();
      checkOrphanCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!user?.email) {
      console.error('[WhatsApp Settings] ❌ HÍBRIDO: Email do usuário não disponível');
      return;
    }

    try {
      console.log('[WhatsApp Settings] 🎯 HÍBRIDO: Criando instância para usuário autenticado:', user.id);
      
      const timestamp = Date.now();
      const emailPrefix = user.email.split('@')[0];
      const instanceName = `whatsapp_${emailPrefix}_${timestamp}`;
      
      // HÍBRIDO: createInstance já vai abrir o modal automaticamente
      await createInstance(instanceName);
    } catch (error: any) {
      console.error('[WhatsApp Settings] ❌ HÍBRIDO: Erro ao conectar:', error);
    }
  };

  const handleShowQR = (instance: any) => {
    console.log('[WhatsApp Settings] 📱 ASYNC: Mostrando QR Code para:', instance.id);
  };

  const handleRefreshQRCodeWrapper = async (instanceId: string): Promise<{ qrCode?: string } | null> => {
    try {
      const result = await refreshQRCode(instanceId);
      if (result?.success && result.qrCode) {
        return { qrCode: result.qrCode };
      }
      return null;
    } catch (error: any) {
      console.error('[WhatsApp Settings] ❌ ASYNC: Erro ao atualizar QR Code:', error);
      return null;
    }
  };

  if (isLoading) {
    return <WhatsAppWebLoadingState />;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-700">Erro ao carregar instâncias: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // ASYNC: Contar instâncias por status com novos status
  const connectedInstances = instances.filter(i => 
    i.connection_status === 'connected' || i.connection_status === 'ready'
  ).length;
  const waitingInstances = instances.filter(i => i.connection_status === 'waiting_qr').length;
  const pendingInstances = instances.filter(i => 
    i.connection_status === 'vps_pending' || i.connection_status === 'initializing'
  ).length;
  const errorInstances = instances.filter(i => 
    i.connection_status === 'error' || i.connection_status === 'vps_error'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header com status detalhado */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-green-800">WhatsApp Web.js - Sistema Assíncrono</h2>
                <p className="text-sm text-green-600">
                  Sistema otimizado com criação assíncrona (Usuário: {user?.email})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={vpsHealth?.online ? "default" : "destructive"} className="border-green-300">
                <Activity className="h-3 w-3 mr-1" />
                VPS {vpsHealth?.online ? 'Online' : 'Offline'}
                {vpsHealth?.responseTime && ` (${vpsHealth.responseTime}ms)`}
              </Badge>
              
              <Badge variant="outline" className="border-green-300 text-green-700">
                <Shield className="h-3 w-3 mr-1" />
                Async Ativo
              </Badge>
              
              {connectedInstances > 0 && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {connectedInstances} Conectada(s)
                </Badge>
              )}
              
              {waitingInstances > 0 && (
                <Badge variant="secondary" className="bg-yellow-500 text-white">
                  <Activity className="h-3 w-3 mr-1" />
                  {waitingInstances} Aguardando QR
                </Badge>
              )}
              
              {pendingInstances > 0 && (
                <Badge variant="outline" className="bg-orange-100 text-orange-700">
                  <Activity className="h-3 w-3 mr-1" />
                  {pendingInstances} Pendente(s)
                </Badge>
              )}
              
              {errorInstances > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {errorInstances} Erro(s)
                </Badge>
              )}

              {orphanCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {orphanCount} órfã(s)
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* NOVO: Indicador de status assíncrono */}
      <AsyncStatusIndicator 
        instances={instances}
        onRefresh={refetch}
      />

      {/* Sistema de Recuperação de Órfãs */}
      <OrphanInstanceManager />

      {/* Botões de ação */}
      <div className="flex gap-3">
        <ImprovedConnectWhatsAppButton 
          onConnect={handleConnect}
          isConnecting={isConnecting}
        />
        <CleanupOrphanedInstancesButton 
          onCleanupComplete={refetch}
        />
      </div>

      {/* Grid de instâncias ou estado vazio */}
      {instances.length > 0 ? (
        <WhatsAppWebInstancesGrid
          instances={instances}
          onRefreshQR={refreshQRCode}
          onDelete={deleteInstance}
          onShowQR={handleShowQR}
        />
      ) : (
        <WhatsAppWebEmptyState
          onConnect={handleConnect}
          isConnecting={isConnecting}
        />
      )}

      {/* HÍBRIDO: Modal do QR Code com Polling Inteligente */}
      <OptimizedQRModal
        isOpen={showQRModal}
        onClose={closeQRModal}
        instanceId={currentInstanceId || ''}
        instanceName={selectedInstanceName}
        autoStartPolling={false} // Polling já foi iniciado pelo hook
      />
    </div>
  );
};
