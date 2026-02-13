import { showNotification } from '@mantine/notifications';

interface PetitionOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  showNotifications?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function BasicPetition({
  endpoint,
  method = 'GET',
  data,
  headers = {},
  showNotifications = true,
}: PetitionOptions) {
  const token = localStorage.getItem('mi_app_token');

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const responseData = await response.json();

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
