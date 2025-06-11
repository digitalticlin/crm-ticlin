
import { supabase } from "@/integrations/supabase/client";

export class ApiClient {
  // Método para verificar saúde do VPS - CORRIGIDO PARA HEALTH CHECK RÁPIDO
  static async checkVPSHealth(): Promise<{ success: boolean; responseTime?: number }> {
    try {
      console.log('[ApiClient] 🔍 Health check VPS via fetch direto...');
      
      const startTime = Date.now();
      
      // CORREÇÃO: Health check direto para VPS, sem Edge Function
      const response = await fetch('http://31.97.24.222:3002/health', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer 3oOb0an43kLEO6cy3bP8LteKCTxshH8eytEV9QR314dcf0b3',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log('[ApiClient] ✅ VPS Health Check Direto:', { 
        success: response.ok, 
        responseTime: `${responseTime}ms`,
        status: response.status 
      });
      
      return { 
        success: response.ok, 
        responseTime 
      };
      
    } catch (error: any) {
      console.error('[ApiClient] ❌ Erro no health check direto:', error);
      return { success: false };
    }
  }

  // CORREÇÃO: Método para criar instância via Edge Function - SEM TIMEOUT ALTO
  static async createInstance(userEmail?: string): Promise<any> {
    try {
      console.log('[ApiClient] 🚀 Criando instância via Edge Function OTIMIZADA');
      
      // Gerar nome inteligente baseado no email
      let intelligentName = 'whatsapp';
      if (userEmail) {
        intelligentName = userEmail.split('@')[0].toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      }
      
      console.log('[ApiClient] 🎯 Nome inteligente gerado:', intelligentName);
      
      const { data, error } = await supabase.functions.invoke('whatsapp_instance_manager', {
        body: {
          action: 'create_instance', // CORREÇÃO: action correta
          instanceName: intelligentName
        }
      });
      
      if (error) {
        console.error('[ApiClient] ❌ Erro do Supabase:', error);
        throw new Error(error.message);
      }
      
      if (!data?.success) {
        console.error('[ApiClient] ❌ Falha na criação:', data?.error);
        throw new Error(data?.error || 'Falha ao criar instância');
      }
      
      console.log('[ApiClient] ✅ Instância criada:', {
        instanceName: intelligentName,
        instanceId: data.instance?.id
      });
      
      return {
        success: true,
        instance: data.instance,
        qrCode: data.qrCode,
        intelligent_name: intelligentName
      };
      
    } catch (error: any) {
      console.error('[ApiClient] ❌ Erro ao criar instância:', error);
      throw error;
    }
  }

  // Método para obter QR Code
  static async getQRCode(instanceId: string): Promise<any> {
    try {
      console.log('[ApiClient] 📱 Obtendo QR Code via Edge Function:', instanceId);
      
      const { data, error } = await supabase.functions.invoke('whatsapp_qr_service', {
        body: {
          action: 'get_qr_code',
          instanceId
        }
      });
      
      if (error) {
        console.error('[ApiClient] ❌ Erro do Supabase:', error);
        return { success: false, error: error.message };
      }
      
      console.log('[ApiClient] 📥 QR Code response:', {
        success: data?.success,
        hasQrCode: !!data?.qrCode,
        waiting: data?.waiting
      });
      
      return {
        success: data?.success || false,
        data: {
          qrCode: data?.qrCode,
          waiting: data?.waiting
        },
        error: data?.error
      };
      
    } catch (error: any) {
      console.error('[ApiClient] ❌ Erro ao obter QR Code:', error);
      return { success: false, error: error.message };
    }
  }

  // Método para deletar instância - CORRIGIDO
  static async deleteInstance(instanceId: string): Promise<any> {
    try {
      console.log('[ApiClient] 🗑️ Deletando instância via Edge Function:', instanceId);
      
      const { data, error } = await supabase.functions.invoke('whatsapp_instance_manager', {
        body: {
          action: 'delete_instance_corrected', // CORREÇÃO: action correta
          instanceId
        }
      });
      
      if (error) {
        console.error('[ApiClient] ❌ Erro do Supabase:', error);
        throw new Error(error.message);
      }
      
      if (!data?.success) {
        console.error('[ApiClient] ❌ Falha na deleção:', data?.error);
        throw new Error(data?.error || 'Falha ao deletar instância');
      }
      
      console.log('[ApiClient] ✅ Instância deletada');
      
      return { success: true };
      
    } catch (error: any) {
      console.error('[ApiClient] ❌ Erro ao deletar instância:', error);
      throw error;
    }
  }

  // Método para atualizar QR Code
  static async refreshQRCode(instanceId: string): Promise<any> {
    try {
      console.log('[ApiClient] 🔄 Atualizando QR Code via Edge Function:', instanceId);
      
      const { data, error } = await supabase.functions.invoke('whatsapp_qr_service', {
        body: {
          action: 'refresh_qr_code',
          instanceId
        }
      });
      
      if (error) {
        console.error('[ApiClient] ❌ Erro do Supabase:', error);
        return { success: false, error: error.message };
      }
      
      console.log('[ApiClient] ✅ QR Code atualizado');
      
      return {
        success: data?.success || false,
        qrCode: data?.qrCode,
        error: data?.error
      };
      
    } catch (error: any) {
      console.error('[ApiClient] ❌ Erro ao atualizar QR Code:', error);
      return { success: false, error: error.message };
    }
  }

  // Método para verificar autenticação
  static async checkAuth(): Promise<{ authenticated: boolean; user?: any }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return { authenticated: false };
      }
      
      return { authenticated: true, user };
      
    } catch (error: any) {
      console.error('[ApiClient] ❌ Erro na verificação de autenticação:', error);
      return { authenticated: false };
    }
  }

  // Método para enviar mensagem
  static async sendMessage(instanceId: string, phone: string, message: string): Promise<any> {
    try {
      console.log('[ApiClient] 📤 Enviando mensagem via Edge Function');
      
      const { data, error } = await supabase.functions.invoke('whatsapp_messaging_service', {
        body: {
          action: 'send_message',
          instanceId,
          phone,
          message
        }
      });
      
      if (error) {
        console.error('[ApiClient] ❌ Erro do Supabase:', error);
        throw new Error(error.message);
      }
      
      console.log('[ApiClient] ✅ Mensagem enviada');
      
      return { success: data?.success || false };
      
    } catch (error: any) {
      console.error('[ApiClient] ❌ Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  // NOVO: Diagnósticos separados que não afetam criação de instância
  static async runVPSDiagnostics(): Promise<any> {
    try {
      console.log('[ApiClient] 🔧 Executando diagnósticos VPS via Edge Function');
      
      const { data, error } = await supabase.functions.invoke('whatsapp_instance_manager', {
        body: {
          action: 'diagnostic_health'
        }
      });
      
      if (error) {
        console.error('[ApiClient] ❌ Erro nos diagnósticos:', error);
        return { success: false, error: error.message };
      }
      
      return data;
      
    } catch (error: any) {
      console.error('[ApiClient] ❌ Erro ao executar diagnósticos:', error);
      return { success: false, error: error.message };
    }
  }

  // Método para bloquear chamadas diretas VPS
  static blockDirectVPSCall(methodName: string): never {
    const errorMessage = `❌ Método ${methodName} foi BLOQUEADO. Use apenas Edge Functions via ApiClient.`;
    console.error('[ApiClient] ' + errorMessage);
    throw new Error(errorMessage);
  }
}
