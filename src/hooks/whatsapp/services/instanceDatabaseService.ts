
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppWebInstance } from '../types/whatsappWebTypes';

export const useInstanceDatabase = (userId: string | null, userLoading: boolean) => {
  const isMountedRef = useRef(true);

  // Fetch instances from database
  const fetchInstances = useCallback(async (): Promise<WhatsAppWebInstance[]> => {
    if (!userId || userLoading) {
      console.log('[Hook] ⏭️ Fetch skipped - no user ID or loading');
      return [];
    }

    try {
      console.log('[Hook] 📊 Fetching instances from database for user:', userId);
      
      const { data, error: fetchError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('created_by_user_id', userId)
        .eq('connection_type', 'web')
        .order('created_at', { ascending: false });

      if (!isMountedRef.current) return [];

      if (fetchError) {
        throw fetchError;
      }

      const mappedInstances: WhatsAppWebInstance[] = (data || []).map(instance => ({
        id: instance.id,
        instance_name: instance.instance_name,
        connection_type: instance.connection_type || 'web',
        server_url: instance.server_url || '',
        vps_instance_id: instance.vps_instance_id || '',
        web_status: instance.web_status || '',
        connection_status: instance.connection_status || '',
        qr_code: instance.qr_code,
        phone: instance.phone,
        profile_name: instance.profile_name,
        profile_pic_url: instance.profile_pic_url,
        date_connected: instance.date_connected,
        date_disconnected: instance.date_disconnected,
        company_id: instance.company_id
      }));

      console.log(`✅ Instâncias carregadas: ${mappedInstances.length} (modo usuário)`);
      return mappedInstances;
      
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('[Hook] ❌ Error fetching instances:', error);
        throw error;
      }
      return [];
    }
  }, [userId, userLoading]);

  return {
    fetchInstances,
    isMountedRef
  };
};
