
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KanbanLead, KanbanTag } from "@/types/kanban";

/** Busca TODOS os leads do funil (ACESSO TOTAL) */
export function useLeadsDatabase(funnelId?: string) {
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ["leads", funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      
      console.log('[useLeadsDatabase] 🔓 ACESSO TOTAL - buscando todos os leads');
      
      // Buscar TODOS os leads sem filtros de usuário
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          lead_tags (
            tag_id,
            tags: tag_id (id, name, color)
          )
        `)
        .eq("funnel_id", funnelId)
        .order("kanban_stage_id")
        .order("order_position");

      if (error) throw error;

      console.log('[useLeadsDatabase] ✅ Leads encontrados (ACESSO TOTAL):', data?.length || 0);

      return (
        data?.map((lead) => ({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          lastMessage: lead.last_message,
          lastMessageTime: lead.last_message_time || "",
          tags:
            (lead.lead_tags || []).map((lt: any) =>
              lt.tags
                ? {
                    id: lt.tags.id,
                    name: lt.tags.name,
                    color: lt.tags.color,
                  }
                : null
            ).filter(Boolean),
          notes: lead.notes,
          columnId: lead.kanban_stage_id,
          purchaseValue: lead.purchase_value,
          assignedUser: lead.owner_id,
        })) ?? []
      );
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Atualização dos dados do lead (sem verificações de permissão)
  const updateLeadMutation = useMutation({
    mutationFn: async ({
      leadId,
      fields,
    }: {
      leadId: string;
      fields: Partial<KanbanLead>;
    }) => {
      const { name, notes, purchaseValue, assignedUser } = fields;
      
      console.log('[useLeadsDatabase] 🔓 ACESSO TOTAL - atualizando lead:', leadId);
      
      // Atualizar SEM verificações de permissão
      const { error } = await supabase.from("leads").update({
        name,
        notes,
        purchase_value: purchaseValue,
        owner_id: assignedUser,
      }).eq("id", leadId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", funnelId] });
    },
  });

  // Gerenciar tags do lead (sem verificações de permissão)
  const addTagMutation = useMutation({
    mutationFn: async ({
      leadId,
      tagId,
    }: {
      leadId: string;
      tagId: string;
    }) => {
      // Adiciona em lead_tags sem verificações
      const { error } = await supabase
        .from("lead_tags")
        .insert({ lead_id: leadId, tag_id: tagId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", funnelId] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async ({
      leadId,
      tagId,
    }: {
      leadId: string;
      tagId: string;
    }) => {
      // Remove de lead_tags sem verificações
      const { error } = await supabase
        .from("lead_tags")
        .delete()
        .eq("lead_id", leadId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", funnelId] });
    },
  });

  return {
    leads: leadsQuery.data ?? [],
    isLoading: leadsQuery.isLoading,
    error: leadsQuery.error,
    updateLead: updateLeadMutation.mutateAsync,
    addTagToLead: addTagMutation.mutateAsync,
    removeTagFromLead: removeTagMutation.mutateAsync,
    refetchLeads: leadsQuery.refetch,
  };
}
