
import { corsHeaders, VPS_CONFIG } from './config.ts';
import { createVPSInstance } from './vpsRequestService.ts';

export async function createWhatsAppInstance(supabase: any, instanceData: any, userId: string) {
  const creationId = `create_${Date.now()}`;
  console.log(`[Instance Creation] 🚀 CORREÇÃO CRÍTICA - CRIANDO INSTÂNCIA [${creationId}]:`, instanceData);
  console.log(`[Instance Creation] 🔑 Token VPS usado: ${VPS_CONFIG.authToken}`);
  console.log(`[Instance Creation] 🌐 URL VPS: ${VPS_CONFIG.baseUrl}`);
  console.log(`[Instance Creation] 👤 User ID: ${userId}`);

  try {
    const { instanceName } = instanceData;
    
    if (!instanceName) {
      throw new Error('Nome da instância é obrigatório');
    }

    console.log(`[Instance Creation] 📝 CORREÇÃO CRÍTICA - Instance name: ${instanceName}`);

    // Verificar se já existe instância com esse nome para este usuário
    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name')
      .eq('instance_name', instanceName)
      .eq('created_by_user_id', userId)
      .single();

    if (existingInstance) {
      throw new Error(`Já existe uma instância com o nome "${instanceName}" para este usuário`);
    }

    // Gerar ID único para VPS
    const vpsInstanceId = `whatsapp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    console.log(`[Instance Creation] 📱 CORREÇÃO CRÍTICA - VPS Instance ID gerado: ${vpsInstanceId}`);

    // Buscar company_id se existe
    let companyId = null;
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (userProfile?.company_id) {
      companyId = userProfile.company_id;
      console.log(`[Instance Creation] 🏢 CORREÇÃO CRÍTICA - Company ID encontrado:`, companyId);
    } else {
      console.log(`[Instance Creation] ⚠️ CORREÇÃO CRÍTICA - Usuário sem empresa - seguindo sem company_id`);
    }

    // CORREÇÃO CRÍTICA: Criar instância na VPS com logs detalhados
    const webhookUrl = 'https://kigyebrhfoljnydfipcr.supabase.co/functions/v1/webhook_whatsapp_web';
    const vpsPayload = {
      instanceId: vpsInstanceId,
      sessionName: instanceName,
      webhookUrl: webhookUrl,
      companyId: companyId || userId,
      webhook: true,
      webhook_by_events: true,
      webhookEvents: ['messages.upsert', 'qr.update', 'connection.update']
    };

    console.log('[Instance Creation] 🌐 CORREÇÃO CRÍTICA - Enviando para VPS:', {
      url: `${VPS_CONFIG.baseUrl}${VPS_CONFIG.endpoints.createInstance}`,
      token: VPS_CONFIG.authToken,
      payload: vpsPayload
    });

    const vpsResult = await createVPSInstance(vpsPayload);
    
    console.log('[Instance Creation] 📥 CORREÇÃO CRÍTICA - Resposta da VPS:', vpsResult);
    
    if (!vpsResult.success) {
      throw new Error(`Falha ao criar instância na VPS: ${vpsResult.error || 'Erro desconhecido'}`);
    }

    console.log('[Instance Creation] ✅ CORREÇÃO CRÍTICA - Instância criada na VPS com sucesso');

    // CORREÇÃO CRÍTICA: Salvar no Supabase com logs detalhados
    const instanceRecord = {
      instance_name: instanceName,
      vps_instance_id: vpsInstanceId,
      company_id: companyId,
      created_by_user_id: userId,
      connection_type: 'web',
      server_url: VPS_CONFIG.baseUrl,
      web_status: vpsResult.qrCode ? 'waiting_scan' : 'connecting',
      connection_status: 'connecting',
      qr_code: vpsResult.qrCode || null,
      created_at: new Date().toISOString()
    };

    console.log('[Instance Creation] 💾 CORREÇÃO CRÍTICA - Salvando no Supabase:', {
      instanceName,
      vpsInstanceId,
      hasQRCode: !!vpsResult.qrCode,
      companyId,
      record: instanceRecord
    });

    const { data: savedInstance, error: saveError } = await supabase
      .from('whatsapp_instances')
      .insert(instanceRecord)
      .select()
      .single();

    if (saveError) {
      console.error('[Instance Creation] ❌ CORREÇÃO CRÍTICA - Erro ao salvar no Supabase:', saveError);
      throw new Error(`Erro ao salvar instância: ${saveError.message}`);
    }

    console.log(`[Instance Creation] ✅ CORREÇÃO CRÍTICA - Instância salva no Supabase [${creationId}]:`, savedInstance);

    return new Response(
      JSON.stringify({
        success: true,
        instance: savedInstance,
        vpsInstanceId: vpsInstanceId,
        qrCode: vpsResult.qrCode,
        creationId,
        message: 'Instância criada com sucesso - CORREÇÃO CRÍTICA APLICADA'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[Instance Creation] ❌ CORREÇÃO CRÍTICA - ERRO GERAL [${creationId}]:`, {
      error: error.message,
      stack: error.stack,
      instanceData,
      userId
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        creationId,
        timestamp: new Date().toISOString(),
        debug: {
          vpsUrl: VPS_CONFIG.baseUrl,
          token: VPS_CONFIG.authToken,
          userId,
          instanceData
        }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
