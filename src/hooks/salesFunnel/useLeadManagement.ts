
import { useState } from "react";
import { KanbanLead, KanbanTag } from "@/types/kanban";

export function useLeadManagement(setColumns: React.Dispatch<React.SetStateAction<any[]>>) {
  const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  
  // Open lead detail
  const openLeadDetail = (lead: KanbanLead) => {
    setSelectedLead(lead);
    setIsLeadDetailOpen(true);
  };

  // Toggle tag on lead
  const toggleTagOnLead = (tagId: string) => {
    if (!selectedLead) return;
    
    // Find the tag in the lead's tags
    const hasTag = selectedLead.tags.some(t => t.id === tagId);
    
    const updatedLead = {
      ...selectedLead,
      tags: hasTag
        ? selectedLead.tags.filter(t => t.id !== tagId)
        : [...selectedLead.tags, { id: tagId } as KanbanTag]
    };
    
    setSelectedLead(updatedLead);
    
    // Update the lead in the columns
    setColumns(columns => columns.map(col => ({
      ...col,
      leads: col.leads.map(l => 
        l.id === selectedLead.id ? updatedLead : l
      )
    })));
  };

  // Update lead notes
  const updateLeadNotes = (notes: string) => {
    if (!selectedLead) return;
    
    const updatedLead = {
      ...selectedLead,
      notes
    };
    
    setSelectedLead(updatedLead);
    
    // Update the lead in the columns
    updateLeadInColumns(updatedLead);
  };

  // Update lead purchase value
  const updateLeadPurchaseValue = (purchaseValue: number | undefined) => {
    if (!selectedLead) return;
    
    const updatedLead = {
      ...selectedLead,
      purchaseValue
    };
    
    setSelectedLead(updatedLead);
    
    // Update the lead in the columns
    updateLeadInColumns(updatedLead);
  };

  // Update lead assigned user
  const updateLeadAssignedUser = (assignedUser: string) => {
    if (!selectedLead) return;
    
    const updatedLead = {
      ...selectedLead,
      assignedUser
    };
    
    setSelectedLead(updatedLead);
    
    // Update the lead in the columns
    updateLeadInColumns(updatedLead);
  };

  // Update lead name
  const updateLeadName = (name: string) => {
    if (!selectedLead) return;
    
    const updatedLead = {
      ...selectedLead,
      name
    };
    
    setSelectedLead(updatedLead);
    
    // Update the lead in the columns
    updateLeadInColumns(updatedLead);
  };

  // Helper function to update lead in columns
  const updateLeadInColumns = (updatedLead: KanbanLead) => {
    setColumns(columns => columns.map(col => ({
      ...col,
      leads: col.leads.map(l => 
        l.id === updatedLead.id ? updatedLead : l
      )
    })));
  };

  return {
    selectedLead,
    isLeadDetailOpen,
    setIsLeadDetailOpen,
    openLeadDetail,
    toggleTagOnLead,
    updateLeadNotes,
    updateLeadPurchaseValue,
    updateLeadAssignedUser,
    updateLeadName
  };
}
