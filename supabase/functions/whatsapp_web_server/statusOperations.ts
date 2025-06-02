
import { VPS_CONFIG, corsHeaders, getVPSHeaders } from './config.ts';

// Função para fazer requisições VPS com retry
async function makeVPSRequest(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[VPS Request] Attempt ${i + 1}/${retries} to: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30 segundos timeout
      });
      
      console.log(`[VPS Response] Status: ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      console.error(`[VPS Request] Error (attempt ${i + 1}):`, error);
      
      if (i === retries - 1) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function getInstanceStatus(instanceId: string) {
  try {
    console.log(`[Status] Getting status for instance: ${instanceId}`);
    
    const response = await makeVPSRequest(`${VPS_CONFIG.baseUrl}/instance/status`, {
      method: 'POST',
      headers: getVPSHeaders(),
      body: JSON.stringify({ instanceId })
    });

    if (response.ok) {
      const data = await response.json();
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: data.status,
          permanent_mode: data.permanent_mode || false,
          auto_reconnect: data.auto_reconnect || false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorText = await response.text();
      throw new Error(`Status request failed: ${response.status} - ${errorText}`);
    }

  } catch (error) {
    console.error('[Status] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

export async function getQRCode(instanceId: string) {
  try {
    console.log(`[QR Code] Getting QR code for instance: ${instanceId}`);
    
    const response = await makeVPSRequest(`${VPS_CONFIG.baseUrl}/instance/qr`, {
      method: 'POST',
      headers: getVPSHeaders(),
      body: JSON.stringify({ instanceId })
    });

    if (response.ok) {
      const data = await response.json();
      return new Response(
        JSON.stringify({ 
          success: true, 
          qrCode: data.qrCode,
          permanent_mode: data.permanent_mode || false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorText = await response.text();
      console.error(`[QR Code] VPS request failed: ${response.status} - ${errorText}`);
      throw new Error(`VPS QR request failed: ${response.status} - ${errorText}`);
    }

  } catch (error) {
    console.error('[QR Code] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

export async function checkServerHealth() {
  try {
    console.log('[Health] Checking WhatsApp Web.js server health...');
    
    const response = await makeVPSRequest(`${VPS_CONFIG.baseUrl}/health`, {
      method: 'GET',
      headers: getVPSHeaders()
    }, 2);

    if (response.ok) {
      const data = await response.json();
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            status: data.status || 'online',
            server: data.server,
            version: data.version,
            permanent_mode: data.permanent_mode || false,
            health_check_enabled: data.health_check_enabled || false,
            auto_reconnect_enabled: data.auto_reconnect_enabled || false,
            active_instances: data.active_instances || 0,
            timestamp: data.timestamp || new Date().toISOString()
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(`Server health check failed: ${response.status}`);
    }

  } catch (error) {
    console.error('[Health] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

export async function getServerInfo() {
  try {
    console.log('[Server Info] Getting server information...');
    
    const response = await makeVPSRequest(`${VPS_CONFIG.baseUrl}/status`, {
      method: 'GET',
      headers: getVPSHeaders()
    });

    if (response.ok) {
      const data = await response.json();
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            ...data,
            permanent_mode: data.permanent_mode || false,
            auto_reconnect: data.auto_reconnect || false
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(`Server info request failed: ${response.status}`);
    }

  } catch (error) {
    console.error('[Server Info] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Função para sincronizar instâncias com lógica mais conservadora
export async function syncInstances(supabase: any, companyId: string) {
  try {
    console.log(`[Sync] 🔄 INICIANDO sync conservador para empresa: ${companyId}`);
    
    // Buscar instâncias do banco
    const { data: dbInstances, error: dbError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('company_id', companyId)
      .eq('connection_type', 'web');

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`[Sync] 📊 Instâncias no banco: ${dbInstances?.length || 0}`);

    // Buscar instâncias do VPS
    let vpsInstances = [];
    let vpsError = null;
    
    try {
      const vpsResponse = await makeVPSRequest(`${VPS_CONFIG.baseUrl}/instances`, {
        method: 'GET',
        headers: getVPSHeaders()
      });

      if (vpsResponse.ok) {
        const vpsData = await vpsResponse.json();
        vpsInstances = vpsData.instances || [];
        console.log(`[Sync] 🖥️ Instâncias no VPS: ${vpsInstances.length}`);
      } else {
        vpsError = `VPS responded with status: ${vpsResponse.status}`;
        console.error(`[Sync] ❌ VPS error: ${vpsError}`);
      }
    } catch (error) {
      vpsError = error.message;
      console.error(`[Sync] ❌ Failed to fetch VPS instances: ${vpsError}`);
    }

    const syncResults = [];
    let updatedCount = 0;
    let preservedCount = 0;
    let errorCount = 0;

    // Se há erro no VPS, apenas registrar mas NÃO remover instâncias
    if (vpsError) {
      console.log(`[Sync] ⚠️ VPS inacessível: ${vpsError}. Preservando instâncias existentes.`);
      
      for (const dbInstance of dbInstances || []) {
        syncResults.push({
          instanceId: dbInstance.id,
          action: 'preserved',
          reason: 'vps_unreachable',
          vps_error: vpsError
        });
        preservedCount++;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          results: syncResults,
          summary: {
            updated: 0,
            preserved: preservedCount,
            errors: 1,
            vps_error: vpsError
          },
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Sincronizar status das instâncias apenas SE conseguimos acessar o VPS
    for (const dbInstance of dbInstances || []) {
      try {
        console.log(`[Sync] 🔍 Processando instância: ${dbInstance.instance_name} (${dbInstance.vps_instance_id})`);
        
        const vpsInstance = vpsInstances.find(v => v.instanceId === dbInstance.vps_instance_id);
        
        if (vpsInstance) {
          console.log(`[Sync] ✅ Instância encontrada no VPS: ${vpsInstance.status}`);
          
          // Atualizar status APENAS se houver mudanças significativas
          const updates: any = {};
          let hasChanges = false;
          
          // Verificar mudanças de status
          if (vpsInstance.status && vpsInstance.status !== dbInstance.connection_status) {
            updates.connection_status = vpsInstance.status;
            hasChanges = true;
            console.log(`[Sync] 📝 Status changed: ${dbInstance.connection_status} -> ${vpsInstance.status}`);
          }
          
          // Verificar mudanças de telefone
          if (vpsInstance.phone && vpsInstance.phone !== dbInstance.phone) {
            updates.phone = vpsInstance.phone;
            hasChanges = true;
            console.log(`[Sync] 📱 Phone updated: ${dbInstance.phone} -> ${vpsInstance.phone}`);
          }
          
          // Verificar mudanças de profile
          if (vpsInstance.profileName && vpsInstance.profileName !== dbInstance.profile_name) {
            updates.profile_name = vpsInstance.profileName;
            hasChanges = true;
            console.log(`[Sync] 👤 Profile updated: ${dbInstance.profile_name} -> ${vpsInstance.profileName}`);
          }
          
          if (hasChanges) {
            updates.updated_at = new Date().toISOString();
            
            await supabase
              .from('whatsapp_instances')
              .update(updates)
              .eq('id', dbInstance.id);
              
            syncResults.push({
              instanceId: dbInstance.id,
              action: 'updated',
              changes: updates,
              vps_status: vpsInstance.status
            });
            
            updatedCount++;
            console.log(`[Sync] ✅ Instância atualizada: ${dbInstance.instance_name}`);
          } else {
            syncResults.push({
              instanceId: dbInstance.id,
              action: 'unchanged',
              current_status: dbInstance.connection_status
            });
            preservedCount++;
            console.log(`[Sync] ➡️ Instância inalterada: ${dbInstance.instance_name}`);
          }
        } else {
          // Instância no banco mas não no VPS - MARCAR como desconectada, mas NÃO remover
          console.log(`[Sync] ⚠️ Instância órfã detectada: ${dbInstance.instance_name}. Marcando como desconectada.`);
          
          // Apenas marcar como desconectada se não estava já desconectada
          if (dbInstance.connection_status !== 'disconnected') {
            await supabase
              .from('whatsapp_instances')
              .update({
                connection_status: 'disconnected',
                web_status: 'disconnected',
                updated_at: new Date().toISOString()
              })
              .eq('id', dbInstance.id);
              
            syncResults.push({
              instanceId: dbInstance.id,
              action: 'marked_disconnected',
              reason: 'not_found_in_vps',
              previous_status: dbInstance.connection_status
            });
            updatedCount++;
          } else {
            syncResults.push({
              instanceId: dbInstance.id,
              action: 'already_disconnected',
              reason: 'not_found_in_vps'
            });
            preservedCount++;
          }
        }
      } catch (instanceError) {
        console.error(`[Sync] ❌ Erro ao processar instância ${dbInstance.instance_name}:`, instanceError);
        syncResults.push({
          instanceId: dbInstance.id,
          action: 'error',
          error: instanceError.message
        });
        errorCount++;
      }
    }

    console.log(`[Sync] 🏁 Sync finalizado: ${updatedCount} atualizadas, ${preservedCount} preservadas, ${errorCount} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: syncResults,
        summary: {
          updated: updatedCount,
          preserved: preservedCount,
          errors: errorCount,
          total_processed: (dbInstances?.length || 0)
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Sync] ❌ ERRO GERAL no sync:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
