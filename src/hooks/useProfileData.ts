
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook for managing user profile data with enhanced company integration
 */
export const useProfileData = () => {
  const [fullName, setFullName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  /**
   * Loads complete profile data including company information
   * @param userId The ID of the user to load data for
   * @returns Object with profile data and company information
   */
  const loadCompleteProfileData = async (userId: string) => {
    try {
      console.log('[Profile Data] 🔄 Carregando dados completos do perfil para:', userId);
      
      // Buscar os dados do perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) {
        console.error("❌ Erro ao carregar perfil:", profileError);
        toast.error("Não foi possível carregar os dados do perfil");
        return { profile: null, company: null };
      } 
      
      if (profile) {
        console.log('[Profile Data] ✅ Perfil encontrado:', {
          userId: profile.id,
          name: profile.full_name,
          role: profile.role,
          companyId: profile.company_id
        });
        
        // Definir dados do perfil
        setFullName(profile.full_name || "");
        setDocumentId(profile.document_id || "");
        setWhatsapp(profile.whatsapp || "");
        setAvatarUrl(profile.avatar_url);
        setUserRole(profile.role);
        
        let company = null;
        
        // Se o perfil tem company_id, buscar os dados da empresa
        if (profile.company_id) {
          console.log('[Profile Data] 🏢 Buscando dados da empresa:', profile.company_id);
          
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profile.company_id)
            .maybeSingle();
            
          if (companyError) {
            console.error("❌ Erro ao carregar empresa:", companyError);
          } else if (companyData) {
            console.log('[Profile Data] ✅ Empresa encontrada:', companyData.name);
            company = {
              id: companyData.id,
              name: companyData.name,
              document_id: companyData.document_id,
              phone: companyData.phone,
              email: companyData.email,
              active: companyData.active
            };
          }
        }
        
        // Retornar dados estruturados
        return {
          profile: {
            id: profile.id,
            full_name: profile.full_name,
            document_id: profile.document_id,
            whatsapp: profile.whatsapp,
            avatar_url: profile.avatar_url,
            role: profile.role,
            company_id: profile.company_id
          },
          company
        };
      } else {
        console.log('[Profile Data] ⚠️ Perfil não encontrado para usuário:', userId);
        return { profile: null, company: null };
      }
    } catch (error) {
      console.error("❌ Erro crítico ao carregar perfil:", error);
      return { profile: null, company: null };
    }
  };
  
  /**
   * Legacy method - maintains compatibility but now uses complete loader
   */
  const loadProfileData = async (userId: string): Promise<string | null> => {
    const { profile, company } = await loadCompleteProfileData(userId);
    return profile?.company_id || null;
  };
  
  /**
   * Saves profile data to the database
   * @param userId User ID
   * @param companyId Company ID
   */
  const saveProfileData = async (userId: string, companyId: string | null) => {
    try {
      const updateData: any = {
        full_name: fullName,
        document_id: documentId,
        whatsapp: whatsapp,
        updated_at: new Date().toISOString()
      };
      
      if (companyId) {
        updateData.company_id = companyId;
      }
      
      console.log('[Profile Data] 💾 Salvando dados do perfil:', updateData);
      
      // Atualizar o perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
        
      if (profileError) {
        throw profileError;
      }
      
      console.log('[Profile Data] ✅ Perfil salvo com sucesso');
      return true;
    } catch (error: any) {
      console.error("❌ Erro ao atualizar perfil:", error);
      toast.error(error.message || "Não foi possível atualizar o perfil");
      return false;
    }
  };
  
  return {
    fullName,
    setFullName,
    documentId,
    setDocumentId,
    whatsapp,
    setWhatsapp,
    avatarUrl,
    setAvatarUrl,
    userRole,
    setUserRole,
    loadProfileData,
    loadCompleteProfileData,
    saveProfileData
  };
};
