import { showNotification } from '@mantine/notifications';

interface PetitionOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  showNotifications?: boolean;
  skipRefresh?: boolean; // Para evitar loops infinitos en refresh
}

// En desarrollo, usa rutas relativas que serán proxy por Vite
// En producción, usa la variable de entorno o la URL completa del backend
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://sgi-gservice-708746088485.us-central1.run.app');
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Refresh token inválido');
    }

    const data = await response.json();
    const newAccessToken = data.access_token;

    if (newAccessToken) {
      localStorage.setItem('access_token', newAccessToken);
      localStorage.setItem('mi_app_token', newAccessToken);
      return newAccessToken;
    }

    return null;
  } catch (error) {
    // Si el refresh falla, limpiar tokens y redirigir al login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('mi_app_token');
    window.location.href = '/login';
    return null;
  }
}

export async function BasicPetition({
  endpoint,
  method = 'GET',
  data,
  headers = {},
  showNotifications = true,
  skipRefresh = false,
}: PetitionOptions) {
  const token = localStorage.getItem('access_token') || localStorage.getItem('mi_app_token');

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(method === 'GET' && {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    }),
    ...headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const config: RequestInit = {
    method,
    ...(method === 'GET' && { cache: 'no-store' }),
    headers: requestHeaders,
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    // Si data es FormData, no establecer Content-Type
    if (data instanceof FormData) {
      delete requestHeaders['Content-Type'];
      config.body = data;
    } else {
      config.body = JSON.stringify(data);
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    console.log(`🔍 Response status: ${response.status}, Content-Type: ${response.headers.get('content-type')}, URL: ${endpoint}`);
    
    // Manejar 304 Not Modified - retornar array vacío
    if (response.status === 304) {
      console.log('📦 Respuesta 304 Not Modified, retornando array vacío');
      return [];
    }
    
    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    if (!isJson) {
      const responseText = await response.text();
      console.error('❌ Respuesta no-JSON recibida:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        responseText: responseText.substring(0, 300),
        url: `${API_BASE_URL}${endpoint}`,
      });
      
      // Si es un error, mostrar el estado HTTP
      if (!response.ok) {
        throw new Error(`Error ${response.status} ${response.statusText} en ${endpoint}. La respuesta no es JSON.`);
      }
      
      // Si es OK pero no es JSON, asumir que es un array vacío
      console.warn('⚠️ Respuesta OK pero no es JSON, retornando array vacío');
      return [];
    }
    
    const responseData = await response.json();

    // Si obtenemos 401 y no estamos en el endpoint de refresh, intentar renovar el token
    if (response.status === 401 && !skipRefresh && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;

        if (newToken) {
          onRefreshed(newToken);
          // Reintentar la petición original con el nuevo token
          return BasicPetition({
            endpoint,
            method,
            data,
            headers,
            showNotifications,
            skipRefresh: true, // Evitar loop infinito
          });
        }
      } else {
        // Si ya se está refrescando, esperar a que termine
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken: string) => {
            // Reintentar con el nuevo token
            BasicPetition({
              endpoint,
              method,
              data,
              headers: {
                ...headers,
                Authorization: `Bearer ${newToken}`,
              },
              showNotifications,
              skipRefresh: true,
            })
              .then(resolve)
              .catch(reject);
          });
        });
      }
    }

    if (!response.ok) {
      const error: any = new Error(responseData.message || 'Error en la petición');
      error.status = response.status;
      error.statusCode = response.status;
      error.data = responseData;
      
      if (showNotifications) {
        showNotification({
          title: 'Error',
          message: responseData.message || 'Error en la petición',
          color: 'red',
        });
      }
      
      throw error;
    }

    if (showNotifications && method !== 'GET') {
      showNotification({
        title: 'Éxito',
        message: responseData.message || 'Operación exitosa',
        color: 'green',
      });
    }

    return responseData;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      if (showNotifications) {
        showNotification({
          title: 'Error de conexión',
          message: 'No se pudo conectar con el servidor',
          color: 'red',
        });
      }
      const netError: any = new Error('No se pudo conectar con el servidor');
      netError.status = 0;
      netError.data = {};
      throw netError;
    }
    throw error;
  }
}

export async function createPoint(companyUserId: number, name: string) {
  return BasicPetition({
    endpoint: `/templates/companies/${companyUserId}/points`,
    method: 'POST',
    data: {
      name,
    },
    showNotifications: true,
  });
}

export async function createSubpoint(
  pointId: number, 
  name: string, 
  periodicity: 'monthly' | 'yearly',
  auditPeriods?: { startMonth: number; startYear: number; endMonth: number; endYear: number }[]
) {
  return BasicPetition({
    endpoint: `/templates/points/${pointId}/subpoints`,
    method: 'POST',
    data: {
      name,
      periodicity,
      auditPeriods: auditPeriods || [],
    },
    showNotifications: true,
  });
}

export async function updatePoint(companyUserId: number, pointId: number, name: string) {
  return BasicPetition({
    endpoint: `/templates/companies/${companyUserId}/points/${pointId}`,
    method: 'PATCH',
    data: {
      name,
    },
    showNotifications: true,
  });
}

export async function updateSubpoint(
  pointId: number, 
  subpointId: number, 
  name: string, 
  periodicity?: 'monthly' | 'yearly',
  auditPeriods?: { startMonth: number; startYear: number; endMonth: number; endYear: number }[]
) {
  const data: any = { name };
  if (periodicity) {
    data.periodicity = periodicity;
  }
  if (auditPeriods && auditPeriods.length > 0) {
    data.auditPeriods = auditPeriods;
  }
  
  return BasicPetition({
    endpoint: `/templates/points/${pointId}/subpoints/${subpointId}`,
    method: 'PATCH',
    data,
    showNotifications: true,
  });
}

export async function deletePoint(companyUserId: number, pointId: number) {
  return BasicPetition({
    endpoint: `/templates/companies/${companyUserId}/points/${pointId}`,
    method: 'DELETE',
    showNotifications: true,
  });
}

export async function sendMessage(templateSubpointId: number, message: string) {
  return BasicPetition({
    endpoint: '/chat/messages',
    method: 'POST',
    data: {
      templateSubpointId,
      message,
    },
    showNotifications: false,
  });
}

export async function getMessages(templateSubpointId: number) {
  const timestamp = Date.now();
  return BasicPetition({
    endpoint: `/chat/messages?templateSubpointId=${templateSubpointId}&_=${timestamp}`,
    method: 'GET',
    showNotifications: false,
  });
}

export async function getLatestAuditFile(templateSubpointId: number) {
  return BasicPetition({
    endpoint: `/templates/subpoints/${templateSubpointId}/audit-files/latest`,
    method: 'GET',
    showNotifications: false,
  });
}

export async function uploadAuditFile(templateSubpointId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return BasicPetition({
    endpoint: `/templates/subpoints/${templateSubpointId}/audit-files`,
    method: 'POST',
    data: formData,
    showNotifications: true,
  });
}

export async function replaceAuditFile(templateSubpointId: number, file: File, comment: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('comment', comment);

  return BasicPetition({
    endpoint: `/templates/subpoints/${templateSubpointId}/audit-files/replacements`,
    method: 'POST',
    data: formData,
    showNotifications: true,
  });
}

export async function getAuditFileChanges(templateSubpointId: number) {
  const timestamp = Date.now();
  return BasicPetition({
    endpoint: `/templates/subpoints/${templateSubpointId}/audit-files/changes?_=${timestamp}`,
    method: 'GET',
    showNotifications: false,
  });
}

export async function deactivateAuditorFromCompany(auditorUserId: number, companyUserId: number) {
  return BasicPetition({
    endpoint: '/templates/auditor-company-assignments/deactivate',
    method: 'PATCH',
    data: {
      auditorUserId,
      companyUserId,
    },
    showNotifications: true,
  });
}
