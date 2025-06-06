
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstanceActions } from './services/instanceActionsService';
import { useIntelligentNaming } from './useIntelligentNaming';
import { useInstanceQRCode } from './useInstanceQRCode';
import { useInstancesData } from './useInstancesData';

export interface WhatsAppWebInstance {
  id: string;
  instance_name: string;
  phone: string;
  connection_status: string;
  web_status?: string;
  qr_code?: string;
  date_connected?: string;
  date_disconnected?: string;
  vps_instance_id?: string;
  server_url?: string;
  updated_at?: string;
  profile_name?: string;
  profile_pic_url?: string;
}

export const useWhatsAppWebInstances = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQRCode, setSelectedQRCode] = useState<string | null>(null);
  const [selectedInstanceName, setSelectedInstanceName] = useState<string>('');
  
  const { user } = useAuth();

  // CORREÇÃO COMPLETA: Hooks especializados
  const { instances, isLoading, error, fetchInstances, refetch } = useInstancesData();
  const { generateIntelligentInstanceName } = useIntelligentNaming();
  
  const fetchInstancesVoid = async () => {
    await fetchInstances();
  };
  
  const { refreshInstanceQRCode } = useInstanceQRCode(instances, fetchInstancesVoid);
  const { createInstance, deleteInstance, refreshQRCode } = useInstanceActions(fetchInstancesVoid);

  // Close QR Modal
  const closeQRModal = () => {
    setShowQRModal(false);
    setSelectedQRCode(null);
    setSelectedInstanceName('');
  };

  // CORREÇÃO COMPLETA: QR Code polling otimizado - removido para evitar sobrecarga
  // O polling agora é feito apenas via modal quando necessário

  return {
    instances,
    isLoading,
    isConnecting,
    error,
    showQRModal,
    selectedQRCode,
    selectedInstanceName,
    refetch,
    fetchInstances,
    generateIntelligentInstanceName,
    createInstance: async (instanceName: string) => {
      setIsConnecting(true);
      try {
        console.log('[Hook] 🚀 CORREÇÃO COMPLETA - Creating instance:', instanceName);
        const result = await createInstance(instanceName);
        return result;
      } finally {
        setIsConnecting(false);
      }
    },
    deleteInstance,
    refreshQRCode: async (instanceId: string) => {
      console.log('[Hook] 🔄 CORREÇÃO COMPLETA - Refreshing QR Code:', instanceId);
      const result = await refreshInstanceQRCode(instanceId);
      return result;
    },
    closeQRModal
  };
};
