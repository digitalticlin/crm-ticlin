
import { makeVPSRequest } from './vpsRequest.ts';

export async function checkServerHealth(supabase: any) {
  try {
    const vpsResponse = await makeVPSRequest('/health', 'GET');
    
    return {
      success: vpsResponse.success,
      vps_status: vpsResponse.success ? 'online' : 'offline',
      error: vpsResponse.error
    };
  } catch (error) {
    return {
      success: false,
      vps_status: 'offline',
      error: error.message
    };
  }
}
