
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CONFIGURAÇÃO VPS CENTRALIZADA - CORREÇÃO 3: TIMEOUT AUMENTADO
const VPS_CONFIG = {
  baseUrl: 'http://31.97.24.222:3002',
  authToken: '3oOb0an43kLEO6cy3bP8LteKCTxshH8eytEV9QR314dcf0b3',
  timeout: 45000, // AUMENTADO DE 30s PARA 45s
  retryAttempts: 3,
  backoffMultiplier: 2000 // AUMENTADO DE 1500ms PARA 2000ms
};

interface LogEntry {
  timestamp: string;
  phase: string;
  action: string;
  duration?: number;
  status: 'start' | 'success' | 'error' | 'warning';
  data?: any;
}

function logStructured(entry: LogEntry) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${entry.phase}] ${entry.action} - ${entry.status}${entry.duration ? ` (${entry.duration}ms)` : ''}`;
  console.log(logLine, entry.data ? JSON.stringify(entry.data) : '');
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// FUNÇÃO PARA GERAR NOME INTELIGENTE BASEADO NO EMAIL
function generateIntelligentInstanceName(email: string): string {
  if (!email || !email.includes('@')) {
    return `whatsapp_${Date.now()}`;
  }
  
  // Converter email para nome válido (apenas parte antes do @)
  const emailPart = email.split('@')[0];
  const baseName = emailPart.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
  
  return baseName;
}

// FUNÇÃO PARA VERIFICAR E GERAR NOME ÚNICO
async function generateUniqueInstanceName(supabase: any, userEmail: string, userId: string): Promise<string> {
  const baseName = generateIntelligentInstanceName(userEmail);
  
  logStructured({
    timestamp: new Date().toISOString(),
    phase: 'INTELLIGENT_NAMING',
    action: `Generated base name: ${baseName}`,
    status: 'start',
    data: { userEmail, baseName }
  });

  // Verificar instâncias existentes do usuário
  const { data: existingInstances, error } = await supabase
    .from('whatsapp_instances')
    .select('instance_name')
    .eq('created_by_user_id', userId)
    .eq('connection_type', 'web');

  if (error) {
    console.log('[INTELLIGENT_NAMING] ⚠️ Erro ao buscar instâncias:', error);
    return `${baseName}_${Date.now()}`;
  }

  const existingNames = existingInstances?.map(i => i.instance_name) || [];
  
  // Se o nome base não existe, usar ele
  if (!existingNames.includes(baseName)) {
    logStructured({
      timestamp: new Date().toISOString(),
      phase: 'INTELLIGENT_NAMING',
      action: `Base name available: ${baseName}`,
      status: 'success',
      data: { finalName: baseName, existingCount: existingNames.length }
    });
    return baseName;
  }

  // Encontrar próximo número disponível
  let counter = 1;
  let candidateName = `${baseName}${counter}`;
  
  while (existingNames.includes(candidateName)) {
    counter++;
    candidateName = `${baseName}${counter}`;
  }

  logStructured({
    timestamp: new Date().toISOString(),
    phase: 'INTELLIGENT_NAMING',
    action: `Generated unique name: ${candidateName}`,
    status: 'success',
    data: { finalName: candidateName, counter, existingCount: existingNames.length }
  });

  return candidateName;
}

// CORREÇÃO 2 e 4: FUNÇÃO MELHORADA PARA COMUNICAÇÃO VPS COM FALLBACK
async function makeVPSRequest(endpoint: string, method: string, payload: any, attemptNumber = 1): Promise<any> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  logStructured({
    timestamp: new Date().toISOString(),
    phase: 'EDGE_VPS_REQUEST',
    action: `Edge Function attempt ${attemptNumber}/${VPS_CONFIG.retryAttempts} - ${method} ${endpoint}`,
    status: 'start',
    data: { payload, attempt: attemptNumber, requestId }
  });

  try {
    const fullUrl = `${VPS_CONFIG.baseUrl}${endpoint}`;
    console.log('[EDGE_VPS] === REQUISIÇÃO VIA EDGE FUNCTION (TIMEOUT AUMENTADO) ===');
    console.log('[EDGE_VPS] Request ID:', requestId);
    console.log('[EDGE_VPS] URL completa:', fullUrl);
    console.log('[EDGE_VPS] Método:', method);
    console.log('[EDGE_VPS] Tentativa:', attemptNumber, 'de', VPS_CONFIG.retryAttempts);
    console.log('[EDGE_VPS] Timeout configurado:', VPS_CONFIG.timeout, 'ms');
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VPS_CONFIG.authToken}`,
      'User-Agent': 'Supabase-Edge-Function/2.0',
      'X-Request-ID': requestId,
      'X-Request-Source': 'Supabase-Edge-Only',
      'X-Attempt-Number': attemptNumber.toString(),
      'X-Request-Time': new Date().toISOString(),
      'Connection': 'keep-alive'
    };
    
    console.log('[EDGE_VPS] Headers da requisição:', requestHeaders);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[EDGE_VPS] TIMEOUT de ${VPS_CONFIG.timeout}ms atingido para Request ID: ${requestId}`);
      controller.abort();
    }, VPS_CONFIG.timeout);

    console.log('[EDGE_VPS] Iniciando fetch via Edge Function...');
    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    console.log('[EDGE_VPS] === RESPOSTA VIA EDGE FUNCTION ===');
    console.log('[EDGE_VPS] Request ID:', requestId);
    console.log('[EDGE_VPS] Status da resposta:', response.status);
    console.log('[EDGE_VPS] Duração total:', duration, 'ms');

    logStructured({
      timestamp: new Date().toISOString(),
      phase: 'EDGE_VPS_REQUEST',
      action: 'Edge Function VPS response received',
      status: 'success',
      duration,
      data: { 
        requestId,
        status: response.status,
        statusText: response.statusText,
        attempt: attemptNumber
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[EDGE_VPS] ❌ Resposta de erro via Edge Function:', errorText);
      
      throw new Error(`VPS HTTP Error ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[EDGE_VPS] ✅ JSON parseado com sucesso via Edge Function');
    
    return data;

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log('[EDGE_VPS] === ERRO NA REQUISIÇÃO VIA EDGE FUNCTION ===');
    console.log('[EDGE_VPS] Request ID:', requestId);
    console.log('[EDGE_VPS] Tentativa:', attemptNumber, 'de', VPS_CONFIG.retryAttempts);
    console.log('[EDGE_VPS] Tipo do erro:', error.name);
    console.log('[EDGE_VPS] Mensagem:', error.message);
    
    logStructured({
      timestamp: new Date().toISOString(),
      phase: 'EDGE_VPS_REQUEST',
      action: `Edge Function attempt ${attemptNumber} failed`,
      status: 'error',
      duration,
      data: { 
        requestId,
        error: error.message, 
        name: error.name,
        attempt: attemptNumber
      }
    });

    // RETRY LOGIC
    if (attemptNumber < VPS_CONFIG.retryAttempts) {
      const backoffDelay = VPS_CONFIG.backoffMultiplier * attemptNumber;
      
      console.log(`[EDGE_VPS] 🔄 Tentando novamente via Edge Function em ${backoffDelay}ms...`);
      
      await wait(backoffDelay);
      return makeVPSRequest(endpoint, method, payload, attemptNumber + 1);
    }

    // CORREÇÃO 4: IMPLEMENTAR FALLBACK SE VPS FALHAR COMPLETAMENTE
    if (error.name === 'AbortError' || error.message.includes('Timeout')) {
      console.log(`[EDGE_VPS] 🚨 FALLBACK: VPS não respondeu após ${VPS_CONFIG.retryAttempts} tentativas`);
      throw new Error(`VPS indisponível: Timeout após ${VPS_CONFIG.timeout}ms em ${VPS_CONFIG.retryAttempts} tentativas. Verifique se a VPS está online.`);
    }

    throw error;
  }
}

serve(async (req) => {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  console.log('🚀 EDGE FUNCTION INICIOU EXECUÇÃO (TIMEOUT AUMENTADO)');
  console.log('Execution ID:', executionId);
  console.log('Timestamp:', new Date().toISOString());
  console.log('Método HTTP:', req.method);
  console.log('URL Completa:', req.url);

  if (req.method === 'OPTIONS') {
    console.log('[PREFLIGHT] Respondendo CORS preflight para Execution ID:', executionId);
    return new Response(null, { headers: corsHeaders });
  }

  const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  console.log('[EDGE_ONLY] === NOVA OPERAÇÃO VIA EDGE FUNCTION (CORRIGIDA) ===');
  console.log('[EDGE_ONLY] Operation ID:', operationId);
  console.log('[EDGE_ONLY] Execution ID:', executionId);
  
  logStructured({
    timestamp: new Date().toISOString(),
    phase: 'OPERATION_START_EDGE_ONLY',
    action: `Edge-only operation ${operationId} started - Execution ${executionId}`,
    status: 'start',
    data: { method: req.method, url: req.url }
  });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[EDGE_ONLY] Cliente Supabase criado para Operation ID:', operationId);

    // CORREÇÃO FINAL: Autenticação OBRIGATÓRIA
    const authHeader = req.headers.get('Authorization');
    let currentUser = null;
    
    console.log('[EDGE_ONLY] Auth header presente:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[EDGE_ONLY] ❌ Token de autorização ausente ou inválido');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Token de autorização obrigatório. Faça login novamente.',
        operationId,
        executionId,
        requiresAuth: true
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      console.log('[EDGE_ONLY] Validando token JWT...');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.log('[EDGE_ONLY] ❌ Token inválido ou usuário não encontrado:', userError);
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Token inválido ou expirado. Faça login novamente.',
          operationId,
          executionId,
          requiresAuth: true
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      currentUser = user;
      console.log('[EDGE_ONLY] ✅ Usuário autenticado:', user.id, user.email);
      
    } catch (authError) {
      console.log('[EDGE_ONLY] ❌ Exceção na autenticação:', authError);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro na validação do token. Tente fazer login novamente.',
        operationId,
        executionId,
        requiresAuth: true
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[EDGE_ONLY] Fazendo parse do body para Operation ID:', operationId);
    const { action, instanceName, instanceId } = await req.json();
    
    console.log('[EDGE_ONLY] Body parseado:', { action, instanceName, instanceId });

    if (action === 'create_instance') {
      console.log('[EDGE_ONLY] Redirecionando para createInstanceViaEdge (CORRIGIDO)');
      return await createInstanceViaEdge(supabase, currentUser, operationId);
    }

    if (action === 'delete_instance_corrected') {
      console.log('[EDGE_ONLY] Redirecionando para deleteInstanceViaEdge');
      return await deleteInstanceViaEdge(supabase, instanceId, currentUser, operationId);
    }

    console.log('[EDGE_ONLY] Ação desconhecida:', action);

    return new Response(JSON.stringify({
      success: false,
      error: 'Ação não reconhecida: ' + action,
      operationId,
      executionId
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.log('[EDGE_ONLY] === ERRO GERAL NA EDGE FUNCTION ===');
    console.log('[EDGE_ONLY] Execution ID:', executionId);
    console.log('[EDGE_ONLY] Operation ID:', operationId);
    console.log('[EDGE_ONLY] Erro:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      operationId,
      executionId,
      details: 'Erro na Edge Function (apenas Edge)'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// FUNÇÃO CREATEINSTANCE VIA EDGE FUNCTION COM FALLBACK
async function createInstanceViaEdge(supabase: any, user: any, operationId: string) {
  console.log('[EDGE_ONLY] === CRIAR INSTÂNCIA VIA EDGE FUNCTION (CORRIGIDA) ===');
  console.log('[EDGE_ONLY] User ID:', user.id);
  console.log('[EDGE_ONLY] User Email:', user.email);
  console.log('[EDGE_ONLY] Operation ID:', operationId);
  
  logStructured({
    timestamp: new Date().toISOString(),
    phase: 'CREATE_INSTANCE_EDGE_ONLY',
    action: `Starting Edge-only instance creation for user ${user.email}`,
    status: 'start',
    data: { userId: user.id, userEmail: user.email, operationId }
  });

  try {
    if (!user.email) {
      throw new Error('Email do usuário é obrigatório para gerar nome da instância');
    }

    // GERAR NOME INTELIGENTE ÚNICO
    console.log('[EDGE_ONLY] === GERAÇÃO DE NOME INTELIGENTE ===');
    const intelligentInstanceName = await generateUniqueInstanceName(supabase, user.email, user.id);
    
    console.log('[EDGE_ONLY] Nome inteligente gerado:', intelligentInstanceName);

    // COMUNICAÇÃO VPS VIA EDGE FUNCTION COM FALLBACK
    console.log('[EDGE_ONLY] === COMUNICAÇÃO VPS VIA EDGE FUNCTION (TIMEOUT AUMENTADO) ===');
    const vpsPayload = {
      instanceId: intelligentInstanceName,
      sessionName: intelligentInstanceName,
      webhookUrl: 'https://kigyebrhfoljnydfipcr.supabase.co/functions/v1/webhook_whatsapp_web'
    };

    console.log('[EDGE_ONLY] Payload para VPS via Edge Function:', vpsPayload);

    let vpsData;
    let vpsSuccess = false;
    
    try {
      vpsData = await makeVPSRequest('/instance/create', 'POST', vpsPayload);
      vpsSuccess = true;
      console.log('[EDGE_ONLY] ✅ Resposta da VPS via Edge Function:', vpsData);
    } catch (vpsError) {
      console.log('[EDGE_ONLY] 🚨 FALLBACK: VPS falhou, criando instância local apenas:', vpsError.message);
      
      // CORREÇÃO 4: FALLBACK - Criar instância no banco mesmo se VPS falhar
      vpsData = {
        success: true,
        instanceId: intelligentInstanceName,
        fallback: true,
        vpsError: vpsError.message
      };
      vpsSuccess = false;
    }

    if (!vpsData.success && !vpsData.fallback) {
      throw new Error(vpsData.error || 'VPS retornou success: false');
    }

    // SALVAR NO SUPABASE
    console.log('[EDGE_ONLY] === SALVAR NO SUPABASE ===');

    const instanceData = {
      instance_name: intelligentInstanceName,
      connection_type: 'web',
      server_url: VPS_CONFIG.baseUrl,
      vps_instance_id: vpsData.instanceId || intelligentInstanceName,
      web_status: vpsSuccess ? 'initializing' : 'vps_failed',
      connection_status: vpsSuccess ? 'vps_created' : 'local_only',
      created_by_user_id: user.id,
      company_id: null
    };
    
    console.log('[EDGE_ONLY] Dados para inserir no Supabase:', instanceData);

    const { data: newInstance, error: dbError } = await supabase
      .from('whatsapp_instances')
      .insert(instanceData)
      .select()
      .single();

    if (dbError) {
      console.log('[EDGE_ONLY] Erro no banco:', dbError);
      throw new Error(`Erro ao salvar instância no banco: ${dbError.message}`);
    }

    console.log('[EDGE_ONLY] ✅ Instância salva no banco:', newInstance);

    logStructured({
      timestamp: new Date().toISOString(),
      phase: 'OPERATION_END',
      action: `Edge-only Operation ${operationId} completed ${vpsSuccess ? 'successfully' : 'with VPS fallback'}`,
      status: vpsSuccess ? 'success' : 'warning',
      data: { 
        instanceId: newInstance.id, 
        instanceName: newInstance.instance_name,
        method: 'EDGE_FUNCTION_ONLY',
        userEmail: user.email,
        vpsSuccess,
        fallback: !vpsSuccess
      }
    });

    console.log('[EDGE_ONLY] === SUCESSO COMPLETO VIA EDGE FUNCTION ===');

    return new Response(JSON.stringify({
      success: true,
      instance: newInstance,
      vps_response: vpsData,
      user_id: user.id,
      operationId,
      method: 'EDGE_FUNCTION_ONLY',
      intelligent_name: intelligentInstanceName,
      user_email: user.email,
      vps_success: vpsSuccess,
      fallback_used: !vpsSuccess,
      message: vpsSuccess ? 'Instância criada via Edge Function com VPS' : 'Instância criada via Edge Function (VPS indisponível, usando fallback)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.log('[EDGE_ONLY] === ERRO NA CRIAÇÃO VIA EDGE FUNCTION ===');
    console.log('[EDGE_ONLY] Erro:', error);
    
    logStructured({
      timestamp: new Date().toISOString(),
      phase: 'OPERATION_END',
      action: `Edge-only Operation ${operationId} failed`,
      status: 'error',
      data: { error: error.message, method: 'EDGE_FUNCTION_ONLY' }
    });
    
    let errorMessage = error.message;
    let errorType = 'UNKNOWN_ERROR';
    
    if (error.name === 'AbortError' || error.message.includes('Timeout')) {
      errorMessage = 'Timeout na criação via Edge Function - VPS pode estar offline';
      errorType = 'VPS_TIMEOUT_EDGE_FUNCTION';
    } else if (error.message.includes('HTTP')) {
      errorType = 'VPS_HTTP_ERROR_EDGE_FUNCTION';
    } else if (error.message.includes('indisponível')) {
      errorType = 'VPS_UNAVAILABLE';
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      errorType,
      operationId,
      action: 'create_instance',
      method: 'EDGE_FUNCTION_ONLY',
      user_email: user?.email,
      suggestion: 'Verifique se a VPS está online e acessível'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// FUNÇÃO DELETE VIA EDGE FUNCTION
async function deleteInstanceViaEdge(supabase: any, instanceId: string, user: any, operationId: string) {
  console.log('[EDGE_ONLY] === DELETAR INSTÂNCIA VIA EDGE FUNCTION ===');
  console.log('[EDGE_ONLY] Instance ID:', instanceId);
  console.log('[EDGE_ONLY] User ID:', user.id);
  
  try {
    const { data: instance, error: fetchError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (fetchError) {
      throw new Error('Instância não encontrada: ' + fetchError.message);
    }

    console.log('[EDGE_ONLY] Instância encontrada:', instance);

    // Deletar da VPS via Edge Function
    if (instance.vps_instance_id) {
      try {
        console.log('[EDGE_ONLY] Deletando da VPS via Edge Function:', instance.vps_instance_id);
        
        await makeVPSRequest(`/instance/${instance.vps_instance_id}`, 'DELETE', {});
        
        console.log('[EDGE_ONLY] ✅ Deletado da VPS com sucesso via Edge Function');
      } catch (vpsError) {
        console.log('[EDGE_ONLY] ⚠️ Erro ao deletar da VPS (continuando):', vpsError);
      }
    }

    // Deletar do banco
    console.log('[EDGE_ONLY] Deletando do banco via Edge Function...');
    const { error: deleteError } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', instanceId);

    if (deleteError) {
      throw new Error(`Erro ao deletar do banco: ${deleteError.message}`);
    }

    console.log('[EDGE_ONLY] ✅ Instância deletada com sucesso via Edge Function');

    return new Response(JSON.stringify({
      success: true,
      message: 'Instância deletada com sucesso via Edge Function',
      operationId,
      method: 'EDGE_FUNCTION_ONLY'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.log('[EDGE_ONLY] === ERRO NA DELEÇÃO VIA EDGE FUNCTION ===');
    console.log('[EDGE_ONLY] Erro:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      operationId,
      method: 'EDGE_FUNCTION_ONLY'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
