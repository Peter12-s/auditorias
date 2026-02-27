import { AppShell, Burger, Group, Text, Avatar, Modal, Stack, Button, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import logoDoGroup from '../assets/logoG.png';
import { useState, useEffect, useRef } from 'react';
import { FaBuilding, FaUserShield, FaClipboardCheck, FaUser, FaEdit } from 'react-icons/fa';
import { showNotification } from '@mantine/notifications';

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const [openedPhoto, setOpenedPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userName, setUserName] = useState<string>('');
  const [userType, setUserType] = useState<string>('');
  const [userPhoto, setUserPhoto] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Obtener nombre de usuario desde localStorage
    const storedName = localStorage.getItem('mi_app_user_name') || localStorage.getItem('fullName');
    if (storedName) {
      setUserName(storedName);
    }

    // Obtener tipo de usuario desde localStorage
    const storedType = localStorage.getItem('mi_app_user_type') || localStorage.getItem('role');
    if (storedType) {
      setUserType(storedType);
    }

    // Obtener foto de perfil desde localStorage (solo para auditores)
    const storedPhoto = localStorage.getItem('mi_app_user_photo');
    if (storedPhoto) {
      setUserPhoto(storedPhoto);
    }

    // Obtener ID de usuario
    const storedId = localStorage.getItem('mi_app_user_id');
    if (storedId) {
      setUserId(storedId);
    }

    // Escuchar cambios en el storage (por si se actualiza en otra pestaña o al hacer login)
    const handleStorageChange = () => {
      const updatedName = localStorage.getItem('mi_app_user_name') || localStorage.getItem('fullName');
      const updatedType = localStorage.getItem('mi_app_user_type') || localStorage.getItem('role');
      const updatedPhoto = localStorage.getItem('mi_app_user_photo');
      const updatedId = localStorage.getItem('mi_app_user_id');
      setUserName(updatedName || '');
      setUserType(updatedType || '');
      setUserPhoto(updatedPhoto || '');
      setUserId(updatedId || '');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Función para obtener el ícono según el tipo de usuario
  const getUserIcon = () => {
    const normalizedType = userType.toLowerCase();
    switch (normalizedType) {
      case 'admin':
      case 'administrador':
        return <FaUserShield size={18} color="#495057" />;
      case 'auditor':
        return <FaClipboardCheck size={18} color="#495057" />;
      case 'empresa':
        return <FaBuilding size={18} color="#495057" />;
      default:
        return <FaUserShield size={18} color="#495057" />;
    }
  };

  // Renderizar nombre formateado (empresas con guión en dos líneas)
  const renderUserName = () => {
    if (!userName) return null;
    
    // Si el nombre contiene guión medio, es una empresa
    if (userName.includes(' - ')) {
      const [empresa, sucursal] = userName.split(' - ');
      return (
        <Box style={{ textAlign: 'right', lineHeight: 1.2 }}>
          <Text size="sm" fw={600} c="#495057" style={{ marginBottom: 0 }}>
            {empresa}
          </Text>
          <Text size="xs" c="dimmed">
            {sucursal}
          </Text>
        </Box>
      );
    }
    
    return (
      <Text size="md" fw={600} c="#495057">
        {userName}
      </Text>
    );
  };

  // 🖊️ ABRIR SELECTOR DE ARCHIVOS DIRECTAMENTE
  const handleClickEditPhoto = () => {
    fileInputRef.current?.click();
  };

  // 📁 MANEJAR SELECCIÓN DE ARCHIVO
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
   
    if (file) {
      setPhotoFile(file);
      setIsEditingPhoto(true);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    event.target.value = '';
  };

  // 💾 GUARDAR FOTO DE PERFIL
  const handleUploadPhoto = async () => {
    console.log('handleUploadPhoto - photoFile:', photoFile, 'userId:', userId);
    
    if (!photoFile) {
      showNotification({
        title: 'Error',
        message: 'Por favor seleccione una foto',
        color: 'red',
      });
      return;
    }

    if (!userId) {
      showNotification({
        title: 'Error',
        message: 'No se pudo identificar el usuario',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    
    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', photoFile);

      // Subir la foto a la API
      const response = await fetch(`/users/${userId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('mi_app_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la foto');
      }

      const data = await response.json();
      
      // Actualizar la foto actual con la nueva
      const newPhotoUrl = data?.url || data?.photo || data?.downloadUrl || URL.createObjectURL(photoFile);
      setUserPhoto(newPhotoUrl);
      localStorage.setItem('mi_app_user_photo', newPhotoUrl);
      
      showNotification({
        title: 'Foto actualizada',
        message: 'La foto de perfil se actualizó correctamente',
        color: 'green',
      });
      
      // Volver al modo de visualización
      setIsEditingPhoto(false);
      setPhotoFile(null);
      setOpenedPhoto(false);
      
    } catch (error) {
     
      showNotification({
        title: 'Error',
        message: 'No se pudo subir la foto. Intente nuevamente.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
          />
          <img
            src={logoDoGroup}
            alt="DoGroup"
            style={{ height: 50, width: 'auto', objectFit: 'contain' }}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            {userName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#f1f3f5', padding: '6px 12px', borderRadius: 8 }}>
                {getUserIcon()}
                {renderUserName()}
              </div>
            )}
            {/* Foto de perfil del auditor */}
            {(userType.toLowerCase() === 'auditor') && (
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setOpenedPhoto(true)}>
                {userPhoto ? (
                  <Avatar
                    src={userPhoto}
                    alt={userName}
                    radius="xl"
                    size="lg"
                    style={{ 
                      border: '2px solid #a1a23b',
                    }}
                  />
                ) : (
                  <Avatar
                    radius="xl"
                    size="lg"
                    style={{ 
                      border: '2px solid #ddd',
                      backgroundColor: '#f1f3f5',
                    }}
                  >
                    <FaUser size={24} color="#adb5bd" />
                  </Avatar>
                )}
              </div>
            )}
          </div>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" w="250px">
        <Navbar onLinkClick={close} />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      {/* 📷 MODAL DE FOTO DE PERFIL */}
      <Modal
        opened={openedPhoto}
        onClose={() => {
          setOpenedPhoto(false);
          setPhotoFile(null);
          setIsEditingPhoto(false);
        }}
        title="Foto de Perfil"
        size="md"
        centered
      >
        <Stack gap="md">
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            marginBottom: '8px'
          }}>
            <Text size="sm" fw={500}>{userName}</Text>
            <Text size="xs" c="dimmed">Auditor</Text>
          </div>

          {/* Mostrar foto actual o placeholder */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '16px',
            padding: '20px'
          }}>
            <div style={{ position: 'relative' }}>
              {userPhoto ? (
                <Avatar
                  src={userPhoto}
                  size={120}
                  radius="xl"
                  style={{ border: '3px solid #9775FA' }}
                />
              ) : (
                <Avatar
                  size={120}
                  radius="xl"
                  style={{ border: '3px solid #ddd', backgroundColor: '#f1f3f5' }}
                >
                  <FaUser size={50} color="#adb5bd" />
                </Avatar>
              )}
              
              {/* Botón de editar/lápiz - Abre selector de archivos directamente */}
              <Button
                size="xs"
                radius="xl"
                color="grape"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 36,
                  height: 36,
                  padding: 0,
                }}
                onClick={handleClickEditPhoto}
              >
                <FaEdit size={14} />
              </Button>
            </div>

            {/* Input de archivo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {userPhoto && !isEditingPhoto && (
              <Text size="sm" c="dimmed">
                Foto actual
              </Text>
            )}

            {/* Mostrar preview de archivo seleccionado */}
            {photoFile && (
              <div style={{ textAlign: 'center' }}>
                <Text size="sm" fw={500} c="grape">
                  Nueva foto seleccionada
                </Text>
                <Text size="xs" c="dimmed">
                  {photoFile.name}
                </Text>
              </div>
            )}
          </div>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                if (isEditingPhoto) {
                  setIsEditingPhoto(false);
                  setPhotoFile(null);
                } else {
                  setOpenedPhoto(false);
                  setPhotoFile(null);
                  setIsEditingPhoto(false);
                }
              }}
            >
              {isEditingPhoto ? 'Cancelar Edición' : 'Cerrar'}
            </Button>
            {isEditingPhoto && (
              <Button
                color="grape"
                onClick={handleUploadPhoto}
                disabled={!photoFile}
                loading={loading}
              >
                Subir Foto
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}