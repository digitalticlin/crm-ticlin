
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppInstanceState, useWhatsAppInstanceActions } from './whatsappInstanceStore';
import { toast } from 'sonner';

export const useWhatsAppRealtime = (userEmail: string) => {
  const { instances } = useWhatsAppInstanceState();
  const { updateInstance } = useWhatsAppInstanceActions();
  
  // CORREÇÃO: Debounce melhorado para responsividade
  const lastUpdateRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userEmail || !isMountedRef.current) return;

    console.log('[WhatsApp Realtime] 🔄 Configurando real-time otimizado (responsivo)');
    
    // CORREÇÃO: Canal único consolidado para evitar múltiplas subscriptions
    if (channelRef.current) {
      console.log('[WhatsApp Realtime] 🧹 Removendo canal anterior');
      supabase.removeChannel(channelRef.current);
    }

    // Canal consolidado para todas as mudanças relacionadas ao WhatsApp
    channelRef.current = supabase
      .channel(`whatsapp-realtime-${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_instances'
        },
        (payload) => {
          if (!isMountedRef.current) return;
          console.log('[WhatsApp Realtime] 📡 Instance change (responsivo):', payload);
          handleInstanceChangeDebounced(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (!isMountedRef.current) return;
          console.log('[WhatsApp Realtime] 💬 New message:', payload);
          handleNewMessage(payload);
        }
      )
      .subscribe();

    // CORREÇÃO: Debounce reduzido de 3s para 500ms para responsividade
    const handleInstanceChangeDebounced = (payload: any) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // CRÍTICO: Reduzir debounce de 3s para 500ms para melhor UX
      if (timeSinceLastUpdate < 500) {
        console.log('[WhatsApp Realtime] ⏸️ Update debounced (responsivo)');
        return;
      }

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          processInstanceUpdate(payload);
          lastUpdateRef.current = Date.now();
        }
      }, 200); // 200ms de delay para responsividade
    };

    const handleNewMessage = (payload: any) => {
      const messageData = payload.new;
      
      // Notificar apenas mensagens importantes
      if (!messageData.from_me && messageData.text) {
        toast.info(`Nova mensagem recebida`, {
          description: `${messageData.text.substring(0, 50)}${messageData.text.length > 50 ? '...' : ''}`,
          duration: 3000
        });
      }
    };

    const processInstanceUpdate = (payload: any) => {
      const instancePrefix = userEmail.split('@')[0].replace(/[^a-z0-9]/gi, "").toLowerCase();
      
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const newRecord = payload.new as any;
        
        if (newRecord.instance_name?.toLowerCase().startsWith(instancePrefix)) {
          // CORREÇÃO: Mapeamento otimizado de status
          const isConnected = ['open', 'ready', 'connected'].includes(newRecord.connection_status);

          // Log apenas mudanças significativas de status
          if (payload.eventType === 'UPDATE' && payload.old) {
            const oldStatus = payload.old.connection_status;
            const newStatus = newRecord.connection_status;
            
            if (oldStatus !== newStatus) {
              console.log('[WhatsApp Realtime] 📊 Status change:', { 
                instance: newRecord.instance_name,
                oldStatus, 
                newStatus,
                timestamp: new Date().toISOString()
              });
              
              // Notificações apenas para mudanças críticas
              if (oldStatus === 'connecting' && isConnected) {
                toast.success(`WhatsApp conectado`, {
                  description: `${newRecord.instance_name} está pronto`,
                  duration: 5000
                });
              } else if (isConnected && newStatus === 'disconnected') {
                toast.warning(`WhatsApp desconectado`, {
                  description: `${newRecord.instance_name} foi desconectada`,
                  duration: 5000
                });
              }
            }
          }

          // Atualizar estado local apenas se realmente necessário
          const mappedInstance = {
            id: newRecord.id,
            instanceName: newRecord.instance_name,
            connected: isConnected,
            qrCodeUrl: newRecord.qr_code,
            phoneNumber: newRecord.phone,
            vps_instance_id: newRecord.vps_instance_id,
            phone: newRecord.phone || "",
            connection_status: newRecord.connection_status || "disconnected",
            web_status: newRecord.web_status || "",
            company_id: newRecord.company_id,
            connection_type: newRecord.connection_type || "web",
            server_url: newRecord.server_url || "",
            owner_jid: newRecord.owner_jid,
            profile_name: newRecord.profile_name,
            profile_pic_url: newRecord.profile_pic_url,
            client_name: newRecord.client_name,
            date_connected: newRecord.date_connected,
            date_disconnected: newRecord.date_disconnected,
            created_at: newRecord.created_at,
            updated_at: newRecord.updated_at
          };

          updateInstance(newRecord.id, mappedInstance);
        }
      }
    };

    // CORREÇÃO: Cleanup melhorado
    return () => {
      console.log('[WhatsApp Realtime] 🧹 Cleanup completo executado');
      isMountedRef.current = false;
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userEmail, updateInstance]);

  return {
    isConnected: instances.length > 0,
    activeChannels: channelRef.current ? 1 : 0 // Para debug
  };
};
