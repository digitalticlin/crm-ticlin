
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoQRPollingHook {
  isPolling: boolean;
  startPolling: (instanceId: string, instanceName: string, onQRCodeFound: (qrCode: string) => void) => Promise<void>;
  stopPolling: () => void;
}

export const useAutomaticQRPolling = (): AutoQRPollingHook => {
  const [isPolling, setIsPolling] = useState(false);
  const [pollingTimeoutId, setPollingTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingTimeoutId) {
      clearTimeout(pollingTimeoutId);
      setPollingTimeoutId(null);
    }
    setIsPolling(false);
  }, [pollingTimeoutId]);

  const startPolling = useCallback(async (
    instanceId: string, 
    instanceName: string,
    onQRCodeFound: (qrCode: string) => void
  ) => {
    console.log('[Auto QR Polling] 🚀 Iniciando polling automático para:', instanceName);
    setIsPolling(true);

    const maxAttempts = 12; // 2 minutos total
    const baseDelay = 10000; // 10 segundos base
    let attempt = 0;

    const pollForQR = async () => {
      attempt++;
      console.log(`[Auto QR Polling] 📱 Tentativa ${attempt}/${maxAttempts} para ${instanceName}`);

      try {
        const { data, error } = await supabase.functions.invoke('whatsapp_web_server', {
          body: {
            action: 'get_qr_code_async',
            instanceData: { instanceId }
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.success && data.qrCode) {
          console.log('[Auto QR Polling] ✅ QR Code encontrado!');
          setIsPolling(false);
          onQRCodeFound(data.qrCode);
          return;
        }

        if (data.waiting && attempt < maxAttempts) {
          const delay = data.retryAfter || baseDelay;
          console.log(`[Auto QR Polling] ⏳ Aguardando ${delay/1000}s para próxima tentativa...`);
          
          const timeoutId = setTimeout(pollForQR, delay);
          setPollingTimeoutId(timeoutId);
        } else if (attempt >= maxAttempts) {
          console.log('[Auto QR Polling] ⏰ Timeout atingido');
          setIsPolling(false);
          toast.info(`QR Code para "${instanceName}" não está pronto ainda. Use o botão "Ver QR" quando disponível.`);
        }

      } catch (error: any) {
        console.error('[Auto QR Polling] ❌ Erro:', error);
        
        if (attempt < maxAttempts) {
          const timeoutId = setTimeout(pollForQR, baseDelay);
          setPollingTimeoutId(timeoutId);
        } else {
          setIsPolling(false);
          toast.error(`Erro ao obter QR Code para "${instanceName}". Tente usar o botão "Ver QR".`);
        }
      }
    };

    // Iniciar polling imediatamente
    await pollForQR();
  }, []);

  return {
    isPolling,
    startPolling,
    stopPolling
  };
};
