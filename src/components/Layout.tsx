import { AppShell, Burger, Group, Text, Avatar, Modal, Stack, Button, FileInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useState, useEffect } from 'react';
import { FaBuilding, FaUserShield, FaClipboardCheck, FaUser, FaFileUpload, FaTrash } from 'react-icons/fa';
import { showNotification } from '@mantine/notifications';

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();

  const [userName, setUserName] = useState<string>('');
  const [userType, setUserType] = useState<string>('');
  const [userPhoto, setUserPhoto] = useState<string>('');

  useEffect(() => {
    // Obtener nombre de usuario desde localStorage
    const storedName = localStorage.getItem('mi_app_user_name');
    if (storedName) {
      setUserName(storedName);
    }

    // Obtener tipo de usuario desde localStorage
    const storedType = localStorage.getItem('mi_app_user_type');
    if (storedType) {
      setUserType(storedType);
    }

    // Obtener foto de perfil desde localStorage (solo para auditores)
    const storedPhoto = localStorage.getItem('mi_app_user_photo');
    if (storedPhoto) {
      setUserPhoto(storedPhoto);
    }

    // Escuchar cambios en el storage (por si se actualiza en otra pestaña o al hacer login)
    const handleStorageChange = () => {
      const updatedName = localStorage.getItem('mi_app_user_name');
      const updatedType = localStorage.getItem('mi_app_user_type');
      const updatedPhoto = localStorage.getItem('mi_app_user_photo');
      setUserName(updatedName || '');
      setUserType(updatedType || '');
      setUserPhoto(updatedPhoto || '');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Función para obtener el ícono según el tipo de usuario
  const getUserIcon = () => {
    switch (userType) {
      case 'admin':
        return <FaUserShield size={18} color="#495057" />;
      case 'auditor':
        return <FaClipboardCheck size={18} color="#495057" />;
      case 'empresa':
        return <FaBuilding size={18} color="#495057" />;
      default:
        return <FaUserShield size={18} color="#495057" />;
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
            src="/logoG.png"
            alt="DoGroup"
            style={{ height: 50, width: 'auto' }}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            {userName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#f1f3f5', padding: '6px 12px', borderRadius: 8 }}>
                {getUserIcon()}
                <Text size="md" fw={600} c="#495057">
                  {userName}
                </Text>
              </div>
            )}
            {/* Foto de perfil del auditor */}
            {userType === 'auditor' && (
              <Avatar
                src={userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                alt={userName}
                radius="xl"
                size="lg"
                style={{ 
                  border: '2px solid #a1a23b',
                  cursor: 'pointer'
                }}
              />
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
    </AppShell>
  );
}