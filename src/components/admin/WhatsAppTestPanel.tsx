
import { VPSCompleteDiagnostic } from "./VPSCompleteDiagnostic";
import { VPSConnectivityTest } from "../settings/whatsapp/VPSConnectivityTest";
import { VPSTestTrigger } from "./VPSTestTrigger";
import { ModularTestPanel } from "./ModularTestPanel";
import { VPSEndpointDiscoveryPanel } from "./VPSEndpointDiscovery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TestTube, Settings, Monitor, Activity, Search } from "lucide-react";

export const WhatsAppTestPanel = () => {
  return (
    <div className="space-y-6">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            Centro de Diagnóstico WhatsApp Completo
          </CardTitle>
          <p className="text-orange-700">
            🎯 <strong>PRIORIDADE:</strong> Execute primeiro a "Descoberta de Endpoints" para identificar os endpoints corretos da VPS
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="discovery" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="discovery" className="gap-2">
            <Search className="h-4 w-4" />
            Descoberta
          </TabsTrigger>
          <TabsTrigger value="diagnostic" className="gap-2">
            <TestTube className="h-4 w-4" />
            Diagnóstico
          </TabsTrigger>
          <TabsTrigger value="connectivity" className="gap-2">
            <Monitor className="h-4 w-4" />
            Conectividade
          </TabsTrigger>
          <TabsTrigger value="modular" className="gap-2">
            <Settings className="h-4 w-4" />
            Modular
          </TabsTrigger>
          <TabsTrigger value="triggers" className="gap-2">
            <Activity className="h-4 w-4" />
            Triggers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discovery" className="space-y-6">
          <VPSEndpointDiscoveryPanel />
        </TabsContent>

        <TabsContent value="diagnostic" className="space-y-6">
          <VPSCompleteDiagnostic />
        </TabsContent>

        <TabsContent value="connectivity" className="space-y-6">
          <VPSConnectivityTest />
        </TabsContent>

        <TabsContent value="modular" className="space-y-6">
          <ModularTestPanel />
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          <VPSTestTrigger />
        </TabsContent>
      </Tabs>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>🔄 Fluxo Recomendado:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li><strong>Descoberta:</strong> Execute primeiro para identificar endpoints funcionais</li>
              <li><strong>Diagnóstico:</strong> Teste a situação atual do sistema</li>
              <li><strong>Correção:</strong> Implemente as correções baseadas nos endpoints descobertos</li>
              <li><strong>Validação:</strong> Use outros painéis para validar as correções</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
