
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  MessageSquare, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Play,
  Trash2,
  QrCode,
  Clock
} from "lucide-react";

interface InstanceTestResult {
  step: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
  timestamp: string;
}

export const VPSInstanceCreationTester = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testInstanceName, setTestInstanceName] = useState('');
  const [testResults, setTestResults] = useState<InstanceTestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null);
  const [qrCodePolling, setQrCodePolling] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[Instance Creation Test] ${message}`);
  };

  const updateTestResult = (step: string, updates: Partial<InstanceTestResult>) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        return prev.map(r => r.step === step ? { ...r, ...updates } : r);
      } else {
        return [...prev, { step, success: false, duration: 0, timestamp: new Date().toISOString(), ...updates }];
      }
    });
  };

  // CORREÇÃO ROBUSTA: Polling QR Code com parâmetros corretos e retry inteligente
  const pollForQRCode = async (instanceId: string) => {
    setQrCodePolling(true);
    addLog("🔄 PASSO 4B: Iniciando polling ROBUSTO para QR Code...");
    
    const maxAttempts = 8; // Aumentado para 8 tentativas
    const delayMs = 10000; // Aumentado para 10 segundos entre tentativas
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        addLog(`📱 Tentativa ${attempt}/${maxAttempts} para obter QR Code (delay: ${delayMs}ms)`);
        
        // CORREÇÃO: Usar instanceId do banco (não vps_instance_id)
        const { data: qrData, error: qrError } = await supabase.functions.invoke('whatsapp_web_server', {
          body: { 
            action: 'get_qr_code_async',
            instanceData: { 
              instanceId: instanceId // ID do banco, não vps_instance_id
            }
          }
        });

        addLog(`📋 Resposta tentativa ${attempt}: ${JSON.stringify(qrData, null, 2)}`);

        if (qrError) {
          addLog(`❌ Erro Supabase na tentativa ${attempt}: ${JSON.stringify(qrError)}`);
          throw new Error(qrError.message);
        }

        if (qrData.success && qrData.qrCode) {
          addLog(`✅ QR Code obtido com sucesso na tentativa ${attempt}!`);
          updateTestResult('qr_code_polling', {
            success: true,
            duration: attempt * delayMs,
            details: { 
              attempts: attempt, 
              hasQrCode: true, 
              cached: qrData.cached,
              qrCodeLength: qrData.qrCode.length,
              instanceName: qrData.instanceName,
              message: qrData.message
            },
            timestamp: new Date().toISOString()
          });
          setQrCodePolling(false);
          return;
        } else if (qrData.waiting) {
          addLog(`⏳ QR Code ainda não disponível (tentativa ${attempt}) - ${qrData.message || 'Aguardando...'}`);
          
          if (attempt < maxAttempts) {
            const actualDelay = qrData.retryAfter || delayMs;
            addLog(`😴 Aguardando ${actualDelay/1000}s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, actualDelay));
          }
        } else {
          const errorMsg = qrData.error || 'Falha ao obter QR Code';
          addLog(`❌ Erro na tentativa ${attempt}: ${errorMsg}`);
          
          // Se for erro definitivo (não de timing), parar
          if (!qrData.waiting && !errorMsg.includes('ainda não')) {
            throw new Error(errorMsg);
          }
          
          if (attempt < maxAttempts) {
            addLog(`😴 Aguardando ${delayMs/1000}s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }

      } catch (error: any) {
        addLog(`❌ Erro na tentativa ${attempt}: ${error.message}`);
        
        if (attempt === maxAttempts) {
          updateTestResult('qr_code_polling', {
            success: false,
            duration: maxAttempts * delayMs,
            error: `QR Code não disponível após ${maxAttempts} tentativas: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        } else {
          // Para erros de rede/timeout, aguardar antes de tentar novamente
          if (error.message.includes('timeout') || error.message.includes('network')) {
            addLog(`🔄 Erro de rede/timeout - aguardando antes de retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
    }
    
    setQrCodePolling(false);
    addLog("⏰ Polling finalizado - QR Code pode estar disponível posteriormente");
  };

  const runInstanceCreationTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setLogs([]);
    setCreatedInstanceId(null);

    const instanceName = testInstanceName || `test_instance_${Date.now()}`;
    
    try {
      addLog(`🚀 Iniciando teste de criação de instância (CORREÇÃO ROBUSTA): ${instanceName}`);

      // PASSO 1: Testar conectividade VPS
      addLog("🔍 PASSO 1: Testando conectividade VPS...");
      const step1Start = Date.now();
      
      try {
        const { data: connectivityData, error: connectivityError } = await supabase.functions.invoke('vps_diagnostic', {
          body: { test: 'vps_connectivity' }
        });

        const step1Duration = Date.now() - step1Start;

        if (connectivityError || !connectivityData.success) {
          throw new Error(connectivityData?.error || connectivityError?.message || 'Conectividade falhou');
        }

        updateTestResult('vps_connectivity', {
          success: true,
          duration: step1Duration,
          details: connectivityData.details,
          timestamp: new Date().toISOString()
        });
        addLog("✅ PASSO 1: VPS acessível");

      } catch (error: any) {
        const step1Duration = Date.now() - step1Start;
        updateTestResult('vps_connectivity', {
          success: false,
          duration: step1Duration,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        addLog(`❌ PASSO 1: ${error.message}`);
        throw error;
      }

      // PASSO 2: Testar autenticação VPS
      addLog("🔐 PASSO 2: Testando autenticação VPS...");
      const step2Start = Date.now();
      
      try {
        const { data: authData, error: authError } = await supabase.functions.invoke('vps_diagnostic', {
          body: { test: 'vps_auth' }
        });

        const step2Duration = Date.now() - step2Start;

        if (authError || !authData.success) {
          throw new Error(authData?.error || authError?.message || 'Autenticação falhou');
        }

        updateTestResult('vps_authentication', {
          success: true,
          duration: step2Duration,
          details: authData.details,
          timestamp: new Date().toISOString()
        });
        addLog("✅ PASSO 2: Autenticação OK");

      } catch (error: any) {
        const step2Duration = Date.now() - step2Start;
        updateTestResult('vps_authentication', {
          success: false,
          duration: step2Duration,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        addLog(`❌ PASSO 2: ${error.message}`);
        throw error;
      }

      // PASSO 3: Criar instância WhatsApp (CORREÇÃO ROBUSTA)
      addLog(`📱 PASSO 3: Criando instância WhatsApp (CORREÇÃO ROBUSTA): ${instanceName}...`);
      const step3Start = Date.now();
      
      try {
        const { data: createData, error: createError } = await supabase.functions.invoke('whatsapp_web_server', {
          body: { 
            action: 'create_instance',
            instanceData: { instanceName }
          }
        });

        const step3Duration = Date.now() - step3Start;

        // Log detalhado da resposta para debug
        addLog(`📋 Resposta completa da criação: ${JSON.stringify(createData, null, 2)}`);
        
        if (createError) {
          addLog(`❌ Erro do Supabase: ${JSON.stringify(createError, null, 2)}`);
          throw new Error(createError.message || 'Erro na invocação da função');
        }

        if (!createData || !createData.success) {
          const errorMsg = createData?.error || 'Resposta de erro da função';
          addLog(`❌ Função retornou erro: ${errorMsg}`);
          throw new Error(errorMsg);
        }

        const instanceId = createData.instance?.id;
        if (!instanceId) {
          addLog(`❌ ID da instância não encontrado na resposta`);
          throw new Error('ID da instância não retornado');
        }
        
        setCreatedInstanceId(instanceId);

        updateTestResult('instance_creation', {
          success: true,
          duration: step3Duration,
          details: {
            instanceId: instanceId,
            hasImmediateQR: !!createData.instance?.qr_code,
            vpsInstanceId: createData.instance?.vps_instance_id,
            connectionStatus: createData.instance?.connection_status,
            webStatus: createData.instance?.web_status,
            instanceName: createData.instance?.instance_name
          },
          timestamp: new Date().toISOString()
        });
        addLog(`✅ PASSO 3: Instância criada com sucesso - ID: ${instanceId}`);

        // PASSO 4: Verificar QR Code (CORREÇÃO ROBUSTA)
        if (createData.instance?.qr_code) {
          addLog("✅ PASSO 4A: QR Code já disponível na criação!");
          updateTestResult('immediate_qr_code', {
            success: true,
            duration: 0,
            details: { qrCodeLength: createData.instance.qr_code.length },
            timestamp: new Date().toISOString()
          });
        } else {
          addLog("⏳ PASSO 4A: QR Code não disponível imediatamente - iniciando polling ROBUSTO!");
          updateTestResult('immediate_qr_code', {
            success: true, // Não é erro!
            duration: 0,
            details: { message: "QR Code será gerado assincronamente" },
            timestamp: new Date().toISOString()
          });
          
          // Iniciar polling para QR Code com correção robusta
          await pollForQRCode(instanceId);
        }

      } catch (error: any) {
        const step3Duration = Date.now() - step3Start;
        addLog(`❌ Erro detalhado no PASSO 3: ${error.message}`);
        addLog(`❌ Stack trace: ${error.stack}`);
        
        updateTestResult('instance_creation', {
          success: false,
          duration: step3Duration,
          error: error.message,
          details: { fullError: error },
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      addLog("🎉 Teste de criação de instância concluído com sucesso (CORREÇÃO ROBUSTA)!");
      toast.success("Teste de instância concluído com sucesso!");

    } catch (error: any) {
      addLog(`💥 Teste falhou: ${error.message}`);
      toast.error(`Teste de instância falhou: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const cleanupTestInstance = async () => {
    if (!createdInstanceId) {
      toast.error('Nenhuma instância de teste para limpar');
      return;
    }

    try {
      addLog(`🧹 Removendo instância de teste: ${createdInstanceId}`);
      
      const { data, error } = await supabase.functions.invoke('whatsapp_web_server', {
        body: { 
          action: 'delete_instance',
          instanceData: { instanceId: createdInstanceId }
        }
      });

      if (error || !data.success) {
        throw new Error(data?.error || error?.message || 'Falha ao remover instância');
      }

      addLog("✅ Instância de teste removida com sucesso");
      toast.success("Instância de teste removida");
      setCreatedInstanceId(null);

    } catch (error: any) {
      addLog(`❌ Erro ao remover instância: ${error.message}`);
      toast.error(`Erro ao remover instância: ${error.message}`);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? 'SUCESSO' : 'FALHA'}
      </Badge>
    );
  };

  const getStepTitle = (step: string) => {
    const titles = {
      vps_connectivity: 'Conectividade VPS',
      vps_authentication: 'Autenticação VPS',
      instance_creation: 'Criação de Instância',
      immediate_qr_code: 'QR Code Imediato',
      qr_code_polling: 'Polling QR Code ROBUSTO'
    };
    return titles[step as keyof typeof titles] || step;
  };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-purple-600" />
            Teste de Criação de Instância WhatsApp (CORREÇÃO ROBUSTA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertDescription>
              <strong>CORREÇÃO ROBUSTA APLICADA:</strong> Este teste agora inclui validação robusta do polling QR Code,
              com retry inteligente, timeouts ajustados (10s), melhor tratamento de erros, e parâmetros corretos.
              O sistema agora é mais tolerante a timing da VPS e fornece feedback claro sobre o progresso.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="testInstanceName">Nome da Instância de Teste (opcional)</Label>
            <Input
              id="testInstanceName"
              value={testInstanceName}
              onChange={(e) => setTestInstanceName(e.target.value)}
              placeholder="Ex: teste_instancia_robusta_001"
            />
            <p className="text-xs text-muted-foreground">
              Se vazio, será gerado automaticamente
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runInstanceCreationTest}
              disabled={isRunning || qrCodePolling}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Executando Teste...
                </>
              ) : qrCodePolling ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-pulse" />
                  Polling QR Code ROBUSTO...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Executar Teste ROBUSTO
                </>
              )}
            </Button>

            {createdInstanceId && (
              <Button 
                onClick={cleanupTestInstance}
                variant="outline"
                disabled={isRunning || qrCodePolling}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Teste
              </Button>
            )}
          </div>

          {createdInstanceId && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Instância de teste criada:</strong> {createdInstanceId}
                <br />
                <small>Lembre-se de remover após o teste</small>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resultados dos Testes */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-600" />
              Resultados do Teste (CORREÇÃO ROBUSTA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResults.map((result, index) => (
              <div key={result.step} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.success)}
                    <span className="font-medium">
                      {index + 1}. {getStepTitle(result.step)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(result.success)}
                    <span className="text-xs text-muted-foreground">
                      {result.duration}ms
                    </span>
                  </div>
                </div>
                
                {result.details && (
                  <details className="text-xs mt-2">
                    <summary className="cursor-pointer text-muted-foreground">
                      Ver detalhes técnicos
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}

                {result.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <strong>Erro:</strong> {result.error}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Logs de Execução (CORREÇÃO ROBUSTA)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40 w-full">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono bg-black/5 p-2 rounded">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
