import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import logoDoGroup from '../assets/logoG.png';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  LoadingOverlay,
    Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { BasicPetition } from '../core/petition';
import { showNotification } from '@mantine/notifications';
import { FaInfoCircle } from 'react-icons/fa';


// Tipos de usuario
type UserType = 'admin' | 'empresa' | 'auditor';

interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  role?: UserType;
  nombre?: string;
  user_type?: UserType;
  user_id?: string;
  _id?: string;
  id?: string;
  full_name?: any;
  fullName?: any;
  user_fullname?: string;
  user?: {
    fullname?: string;
    name?: string;
    fotoPerfil?: string;
    photo?: string;
  };
  fullname?: string;
  name?: string;
  company_name?: string;
  fotoPerfil?: string;
  photo?: string;
  profile_photo?: string;
}

interface FormValues {
  email: string;
  password: string;
}

// 🔐 CREDENCIALES HARDCODEADAS PARA TESTING
const MOCK_USERS = {
  'admin@dogroup.com': {
    password: 'admin123',
    userType: 'admin' as UserType,
    displayName: 'Juan Administrador',
    userId: 'admin-001',
  },
  'auditor@dogroup.com': {
    password: 'auditor123',
    userType: 'auditor' as UserType,
    displayName: 'María Auditora',
    userId: 'auditor-001',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', // Foto de prueba
  },
  'empresa@dogroup.com': {
    password: 'empresa123',
    userType: 'empresa' as UserType,
    displayName: 'Empresa Demo S.A.',
    userId: 'empresa-001',
  },
};

export function Login() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [useMockAuth] = useState(false); // 🔄 Usar API real

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [auth.isAuthenticated, navigate]);

  // Configuración del formulario
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (!value ? 'El email es requerido' : null),
      password: (value) => (!value ? 'La contraseña es requerida' : null),
    },
  });

  // Extraer nombre completo de la respuesta del servidor
  const extractDisplayName = (login: LoginResponse): string => {
    let displayName = '';
    
    const fullNameObj = login?.full_name ?? login?.fullName ?? null;
    
    if (fullNameObj) {
      if (typeof fullNameObj === 'object') {
        const parts = [
          fullNameObj.name,
          fullNameObj.f_surname,
          fullNameObj.s_surname,
        ]
          .filter(Boolean)
          .map(String);
        displayName = parts.join(' ');
      } else {
        displayName = String(fullNameObj);
      }
    }

    if (!displayName) {
      displayName =
        login?.user_fullname ??
        login?.user?.fullname ??
        login?.user?.name ??
        login?.fullname ??
        login?.name ??
        login?.company_name ??
        '';
    }

    return displayName.trim();
  };

  // Guardar datos del usuario en localStorage
  const saveUserData = (userId: string, displayName: string, photoUrl?: string) => {
    if (displayName) {
      localStorage.setItem('mi_app_user_name', displayName);
    }
    if (userId) {
      localStorage.setItem('mi_app_user_id', userId);
    }
    if (photoUrl) {
      localStorage.setItem('mi_app_user_photo', photoUrl);
    }
  };

  // Mostrar notificación de bienvenida personalizada
  const showWelcomeNotification = (displayName: string, userType?: UserType) => {
    const roleLabel = userType === 'admin' 
      ? 'Administrador' 
      : userType === 'auditor' 
      ? 'Auditor' 
      : userType === 'empresa'
      ? 'Empresa'
      : '';
    
    const message = displayName 
      ? `Bienvenido${roleLabel ? ` ${roleLabel}` : ''}, ${displayName}` 
      : `Bienvenido${roleLabel ? ` ${roleLabel}` : ''}`;

    showNotification({
      title: 'Inicio de sesión exitoso',
      message,
      color: 'green',
      autoClose: 4000,
    });
  };

  // 🎭 LOGIN SIMULADO (MOCK)
  const handleMockLogin = async (values: FormValues) => {
    setLoading(true);

    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockUser = MOCK_USERS[values.email as keyof typeof MOCK_USERS];

    if (!mockUser) {
      showNotification({
        title: 'Error de autenticación',
        message: 'Usuario no encontrado',
        color: 'red',
        autoClose: 5000,
      });
      setLoading(false);
      return;
    }

    if (mockUser.password !== values.password) {
      showNotification({
        title: 'Error de autenticación',
        message: 'Usuario o contraseña incorrectos',
        color: 'red',
        autoClose: 5000,
      });
      setLoading(false);
      return;
    }

    // Login exitoso
    const mockToken = `mock_token_${mockUser.userType}_${Date.now()}`;
    
    saveUserData(mockUser.userId, mockUser.displayName, (mockUser as any).photoUrl);

    auth.login(mockToken, () => {
      showWelcomeNotification(mockUser.displayName, mockUser.userType);
      navigate('/', { replace: true });
    }, mockUser.userType, mockUser.userId);
  };

  // Manejar errores de login real
  const handleLoginError = (err: any) => {
    const errorData = err?.data || {};
    const errorMessage = errorData?.message || err?.message || '';
    const statusCode = err?.status || err?.statusCode || 0;

    if (
      statusCode === 401 ||
      errorMessage.toLowerCase().includes('password') ||
      errorMessage.toLowerCase().includes('contraseña') ||
      errorMessage.toLowerCase().includes('unauthorized')
    ) {
      showNotification({
        title: 'Error de autenticación',
        message: 'Usuario o contraseña incorrectos',
        color: 'red',
        autoClose: 5000,
      });
    } else {
      showNotification({
        title: 'Error',
        message: errorMessage || 'Error al iniciar sesión. Intente nuevamente.',
        color: 'red',
        autoClose: 5000,
      });
    }
  };

  // 🌐 LOGIN REAL (API)
  const handleRealLogin = async (values: FormValues) => {
    setLoading(true);

    try {
      const login: LoginResponse = await BasicPetition({
        endpoint: '/auth/login',
        method: 'POST',
        data: values,
        showNotifications: false,
      });

      if (login.access_token) {
        // Extraer datos de la respuesta
        const displayName = login.fullName || login.nombre || extractDisplayName(login);
        const userType = login.role || login.user_type;
        const userId = login.user_id ?? login._id ?? login.id ?? '';
        const photoUrl = login.fotoPerfil ?? login.photo ?? login.profile_photo ?? login.user?.fotoPerfil ?? login.user?.photo;

        saveUserData(userId, displayName, photoUrl);

        // Login con todos los datos separados
        auth.login(
          login.access_token,
          () => {
            showWelcomeNotification(displayName, userType);
            navigate('/', { replace: true });
          },
          userType,
          userId,
          login.refresh_token, // refresh_token
          displayName // fullName
        );
      }
    } catch (err: any) {
      handleLoginError(err);
      setLoading(false);
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (values: FormValues) => {
    if (useMockAuth) {
      await handleMockLogin(values);
    } else {
      await handleRealLogin(values);
    }
  };

  // Mostrar loading mientras verifica autenticación
  if (auth.isAuthenticated) {
    return <LoadingOverlay visible={true} />;
  }

  return (
    <>
      <Container size={800} my={40} className="login-container">
        <Paper
          withBorder
          shadow="md"
          p={30}
          mt={30}
          radius="md"
          pos="relative"
          className="login-box"
        >
          <LoadingOverlay visible={loading} />

          <form onSubmit={form.onSubmit(handleSubmit)}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img
                src={logoDoGroup}
                alt="DO-GROUP Logo"
                style={{
                  width: '200px',
                  height: 'auto',
                  maxWidth: '100%',
                  display: 'inline-block'
                }}
              />
            </div>

            {/* Título SGI con tipografía mejorada */}
            <Title
              order={1}
              size="h2"
              ta="center"
              mb={20}
              style={{
                fontFamily: "'Roboto', 'Segoe UI', 'Helvetica Neue', sans-serif",
                fontWeight: 700,
                fontSize: '2rem',
                color: '#141e54ff',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              SGI
            </Title>

            {/* Alerta de modo de prueba */}
            {useMockAuth && (
              <Alert
                icon={<FaInfoCircle size={16} />}
                title="Modo de Prueba"
                color="blue"
                mb="md"
                variant="light"
              >
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Usuarios de prueba:</strong>
                  <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.2rem' }}>
                    <li>Admin: admin@dogroup.com / admin123</li>
                    <li>Auditor: auditor@dogroup.com / auditor123</li>
                    <li>Empresa: empresa@dogroup.com / empresa123</li>
                  </ul>
                </div>
              </Alert>
            )}

            {/* Campo de Email */}
            <TextInput
              label="Email"
              placeholder="correo@email.com"
              required
              size="md"
              mb="md"
              {...form.getInputProps('email')}
            />

            {/* Campo de Contraseña */}
            <PasswordInput
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              size="md"
              mb="xl"
              {...form.getInputProps('password')}
            />

            {/* Botón de envío */}
            <Button
              fullWidth
              type="submit"
              size="md"
              color="#a1a23b"
              styles={{
                root: {
                  backgroundColor: '#a1a23b',
                  '&:hover': {
                    backgroundColor: '#8a8b32',
                  },
                },
              }}
            >
              Iniciar Sesión
            </Button>
          </form>
        </Paper>
      </Container>

      {/* Decoración inferior */}
      <div className="app-container"></div>
    </>
  );
}