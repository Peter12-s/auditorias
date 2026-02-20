import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Title,
  Modal,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Select,
  Stack,
  FileInput,
  Text,
  Box,
  Avatar,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { ResponsiveDataTable, type Column } from '../components/ResponsiveDataTable';
import { FaEdit,FaFile,FaTrash ,FaFileUpload, FaCamera, FaUser} from 'react-icons/fa';
import { BasicPetition } from '../core/petition';

// 📝 TIPOS DE USUARIO
type UserType = 'admin' | 'auditor' | 'empresa' | 'Administrador' | 'Auditor' | 'Empresa';

// 📋 INTERFAZ DE USUARIO (API Response)
interface Usuario {
  id: number;
  email: string;
  role: string;
  userType: number;
  nombre: string;
  isActive: boolean;
  subEmpresa: string | null;
  
  // Campos opcionales que pueden venir al obtener detalles del usuario
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  telefono?: string;
  nombreEmpresa?: string;
  rfc?: string;
  telefonoEmpresa?: string;
  responsableLegal?: string;
  curp?: string;
  rfcAuditor?: string;
  nss?: string;
  whatsapp?: string;
  contactoEmergencia?: string;
}

// 🎯 FORMULARIO - Diferentes campos según tipo de usuario
interface FormValues {
  tipo: UserType;
  correo: string;
  password: string;
  
  // Campos Admin
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  
  // Campos Empresa
  nombreEmpresa: string;
  rfc: string;
  telefonoEmpresa: string;
  responsableLegal: string;
  subempresa: string;
  
  // Campos Auditor
  nombreAuditor: string;
  apellidoPaternoAuditor: string;
  apellidoMaternoAuditor: string;
  curp: string;
  rfcAuditor: string;
  nss: string;
  whatsapp: string;
  contactoEmergencia: string;
  fotoPerfil: string;
}

export function Usuarios() {
  const [opened, setOpened] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [openedConfirm, setOpenedConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [openedPhoto, setOpenedPhoto] = useState(false);
  const [userForPhoto, setUserForPhoto] = useState<Usuario | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🗂️ DATOS DE USUARIOS
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // � CARGAR USUARIOS DESDE LA API
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await BasicPetition({
        endpoint: '/users',
        method: 'GET',
        showNotifications: false,
      });
      setUsuarios(response);
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudieron cargar los usuarios',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔍 OBTENER DETALLES DE UN USUARIO ESPECÍFICO
  const fetchUserDetails = async (id: number): Promise<Usuario | null> => {
    try {
      const response = await BasicPetition({
        endpoint: `/users/${id}`,
        method: 'GET',
        showNotifications: false,
      });
      return response;
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudieron cargar los detalles del usuario',
        color: 'red',
      });
      return null;
    }
  };

  // 📷 OBTENER FOTO ACTUAL DEL USUARIO
  const fetchUserPhoto = async (id: number): Promise<string | null> => {
    try {
      const response = await BasicPetition({
        endpoint: `/users/${id}/photo/signed-download`,
        method: 'GET',
        showNotifications: false,
      });
      // La respuesta tiene la URL en downloadUrl
      return response?.downloadUrl || null;
    } catch (error) {
      console.log('No se pudo cargar la foto del usuario');
      return null;
    }
  };

  // �📝 FORMULARIO
  const form = useForm<FormValues>({
    initialValues: {
      tipo: 'admin',
      correo: '',
      password: '',
      // Admin
      nombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      telefono: '',
      // Empresa
      nombreEmpresa: '',
      rfc: '',
      telefonoEmpresa: '',
      responsableLegal: '',
      subempresa: '',
      // Auditor
      nombreAuditor: '',
      apellidoPaternoAuditor: '',
      apellidoMaternoAuditor: '',
      curp: '',
      rfcAuditor: '',
      nss: '',
      whatsapp: '',
      contactoEmergencia: '',
      fotoPerfil: '',
    },
    validate: {
      correo: (value) =>
        !value
          ? 'El correo es requerido'
          : !/^\S+@\S+\.\S+$/.test(value)
          ? 'Correo inválido'
          : null,
      password: (value, values) =>
        !editingUser && !value ? 'La contraseña es requerida' : null,
      
      // Validaciones Admin
      nombre: (value, values) =>
        values.tipo === 'admin' && !value ? 'El nombre es requerido' : null,
      apellidoPaterno: (value, values) =>
        values.tipo === 'admin' && !value ? 'El apellido paterno es requerido' : null,
      apellidoMaterno: (value, values) =>
        values.tipo === 'admin' && !value ? 'El apellido materno es requerido' : null,
      telefono: (value, values) =>
        values.tipo === 'admin' && !value ? 'El teléfono es requerido' : null,
      
      // Validaciones Empresa
      nombreEmpresa: (value, values) =>
        values.tipo === 'empresa' && !value ? 'El nombre de la empresa es requerido' : null,
      rfc: (value, values) =>
        values.tipo === 'empresa' && !value ? 'El RFC es requerido' : null,
      telefonoEmpresa: (value, values) =>
        values.tipo === 'empresa' && !value ? 'El teléfono es requerido' : null,
      responsableLegal: (value, values) =>
        values.tipo === 'empresa' && !value ? 'El responsable legal es requerido' : null,
      
      // Validaciones Auditor
      nombreAuditor: (value, values) =>
        values.tipo === 'auditor' && !value ? 'El nombre es requerido' : null,
      apellidoPaternoAuditor: (value, values) =>
        values.tipo === 'auditor' && !value ? 'El apellido paterno es requerido' : null,
      apellidoMaternoAuditor: (value, values) =>
        values.tipo === 'auditor' && !value ? 'El apellido materno es requerido' : null,
      curp: (value, values) =>
        values.tipo === 'auditor' && !value ? 'La CURP es requerida' : null,
      rfcAuditor: (value, values) =>
        values.tipo === 'auditor' && !value ? 'El RFC es requerido' : null,
      nss: (value, values) =>
        values.tipo === 'auditor' && !value ? 'El NSS es requerido' : null,
      whatsapp: (value, values) =>
        values.tipo === 'auditor' && !value ? 'El WhatsApp es requerido' : null,
      contactoEmergencia: (value, values) =>
        values.tipo === 'auditor' && !value ? 'El contacto de emergencia es requerido' : null,
    },
  });

  // � SINCRONIZAR CAMPOS COMUNES AL CAMBIAR EL TIPO DE USUARIO
  useEffect(() => {
    if (!editingUser) return; // Solo aplica cuando estamos editando
    
    const values = form.values;
    const tipoActual = values.tipo;
    
    // Detectar cambio de tipo y copiar campos comunes
    const handleTipoChange = () => {
      if (tipoActual === 'admin') {
        // Si cambió a Admin, copiar de Auditor si tiene datos
        if (values.nombreAuditor) {
          form.setFieldValue('nombre', values.nombreAuditor);
          form.setFieldValue('apellidoPaterno', values.apellidoPaternoAuditor);
          form.setFieldValue('apellidoMaterno', values.apellidoMaternoAuditor);
        }
      } else if (tipoActual === 'auditor') {
        // Si cambió a Auditor, copiar de Admin si tiene datos
        if (values.nombre) {
          form.setFieldValue('nombreAuditor', values.nombre);
          form.setFieldValue('apellidoPaternoAuditor', values.apellidoPaterno);
          form.setFieldValue('apellidoMaternoAuditor', values.apellidoMaterno);
        }
        // Copiar teléfono a WhatsApp si WhatsApp está vacío
        if (values.telefono && !values.whatsapp) {
          form.setFieldValue('whatsapp', values.telefono);
        }
      } else if (tipoActual === 'empresa') {
        // Si cambió a Empresa, intentar usar nombre como nombreEmpresa
        const nombreCompleto = values.nombre || values.nombreAuditor;
        if (nombreCompleto && !values.nombreEmpresa) {
          form.setFieldValue('nombreEmpresa', nombreCompleto);
        }
        // Copiar teléfono
        const telefono = values.telefono || values.whatsapp;
        if (telefono && !values.telefonoEmpresa) {
          form.setFieldValue('telefonoEmpresa', telefono);
        }
      }
    };
    
    handleTipoChange();
  }, [form.values.tipo, editingUser]);

  // �🔧 ABRIR MODAL PARA NUEVO USUARIO
  const handleOpenNew = () => {
    setEditingUser(null);
    form.reset();
    setOpened(true);
  };

  // 🔧 ABRIR MODAL PARA EDITAR
  const handleEdit = async (usuario: Usuario) => {
    setEditingUser(usuario);
    
    // Abrir modal inmediatamente
    setOpened(true);
    setLoading(true);
    
    // Obtener detalles completos del usuario
    const response = await fetchUserDetails(usuario.id);
    setLoading(false);
    
    if (!response) {
      // Si falla, usar los datos básicos que ya tenemos
      form.setValues({
        tipo: 'admin',
        correo: usuario.email,
        password: '',
        nombre: usuario.nombre || '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefono: '',
        nombreEmpresa: '',
        rfc: '',
        telefonoEmpresa: '',
        responsableLegal: '',
        subempresa: '',
        nombreAuditor: '',
        apellidoPaternoAuditor: '',
        apellidoMaternoAuditor: '',
        curp: '',
        rfcAuditor: '',
        nss: '',
        whatsapp: '',
        contactoEmergencia: '',
        fotoPerfil: '',
      });
      return;
    }
    
    // Extraer datos de la respuesta {user, profile, photo}
    const userDetails = response.user || response;
    const profile = response.profile || {};
    const photo = response.photo;
    
    // Determinar tipo de usuario basado en role o userType
    const userRole = userDetails.role?.toLowerCase() || '';
    let tipoUsuario: UserType = 'admin';
    
    if (userRole.includes('admin')) {
      tipoUsuario = 'admin';
    } else if (userRole.includes('auditor')) {
      tipoUsuario = 'auditor';
    } else if (userRole.includes('empresa')) {
      tipoUsuario = 'empresa';
    }
    
    if (tipoUsuario === 'admin') {
      form.setValues({
        tipo: tipoUsuario,
        correo: userDetails.email,
        password: '',
        nombre: profile.nombre || '',
        apellidoPaterno: profile.paterno || '',
        apellidoMaterno: profile.materno || '',
        telefono: profile.telefono || '',
        // Reset otros campos
        nombreEmpresa: '',
        rfc: '',
        telefonoEmpresa: '',
        responsableLegal: '',
        subempresa: '',
        nombreAuditor: '',
        apellidoPaternoAuditor: '',
        apellidoMaternoAuditor: '',
        curp: '',
        rfcAuditor: '',
        nss: '',
        whatsapp: '',
        contactoEmergencia: '',
        fotoPerfil: photo || '',
      });
    } else if (tipoUsuario === 'empresa') {
      form.setValues({
        tipo: tipoUsuario,
        correo: userDetails.email,
        password: '',
        nombreEmpresa: profile.nombreEmpresa || profile.nombre || '',
        rfc: profile.rfc || '',
        telefonoEmpresa: profile.telefono || '',
        responsableLegal: profile.responsableLegal || '',
        subempresa: profile.subEmpresa || '',
        // Reset otros campos
        nombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefono: '',
        nombreAuditor: '',
        apellidoPaternoAuditor: '',
        apellidoMaternoAuditor: '',
        curp: '',
        rfcAuditor: '',
        nss: '',
        whatsapp: '',
        contactoEmergencia: '',
        fotoPerfil: '',
      });
    } else if (tipoUsuario === 'auditor') {
      form.setValues({
        tipo: tipoUsuario,
        correo: userDetails.email,
        password: '',
        nombreAuditor: profile.nombre || '',
        apellidoPaternoAuditor: profile.paterno || '',
        apellidoMaternoAuditor: profile.materno || '',
        curp: profile.curp || '',
        rfcAuditor: profile.rfc || '',
        nss: profile.nss || '',
        whatsapp: profile.whatsapp || profile.telefono || '',
        contactoEmergencia: profile.contactoEmergencia || '',
        fotoPerfil: photo || '',
        // Reset otros campos
        nombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefono: '',
        nombreEmpresa: '',
        rfc: '',
        telefonoEmpresa: '',
        responsableLegal: '',
        subempresa: '',
      });
    }
  };

  // 💾 GUARDAR USUARIO
  const handleSubmit = async (values: FormValues) => {
    if (editingUser) {
      // Editar usuario existente con PATCH /users/{id}
      setLoading(true);
      
      try {
        // Mapear tipo de usuario a userType numérico
        const userTypeMap: { [key: string]: number } = {
          'admin': 1,
          'auditor': 2,
          'empresa': 3,
        };
        
        let requestBody: any = {
          email: values.correo,
          userType: userTypeMap[values.tipo],
        };
        
        // Solo incluir password si se proporciona uno nuevo
        if (values.password) {
          requestBody.password = values.password;
        }
        
        if (values.tipo === 'admin') {
          requestBody = {
            ...requestBody,
            nombre: values.nombre,
            paterno: values.apellidoPaterno,
            materno: values.apellidoMaterno,
            telefono: values.telefono,
          };
        } else if (values.tipo === 'empresa') {
          requestBody = {
            ...requestBody,
            nombre: values.nombreEmpresa,
            rfc: values.rfc,
            telefono: values.telefonoEmpresa,
            responsableLegal: values.responsableLegal,
            subEmpresa: values.subempresa || undefined,
          };
        } else if (values.tipo === 'auditor') {
          requestBody = {
            ...requestBody,
            nombre: values.nombreAuditor,
            paterno: values.apellidoPaternoAuditor,
            materno: values.apellidoMaternoAuditor,
            telefono: values.whatsapp,
            curp: values.curp,
            rfc: values.rfcAuditor,
            nss: values.nss,
            whatsapp: values.whatsapp,
            contactoEmergencia: values.contactoEmergencia,
          };
        }
        
        await BasicPetition({
          endpoint: `/users/${editingUser.id}`,
          method: 'PATCH',
          data: requestBody,
          showNotifications: false,
        });
        
        showNotification({
          title: 'Usuario actualizado',
          message: 'El usuario se actualizó correctamente',
          color: 'green',
        });
        
        // Recargar la lista de usuarios
        await fetchUsers();
        
      } catch (error) {
        console.error('Error al actualizar usuario:', error);
        showNotification({
          title: 'Error',
          message: 'No se pudo actualizar el usuario. Verifique los datos.',
          color: 'red',
        });
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    } else {
      // Crear nuevo usuario con POST /users
      setLoading(true);
      
      try {
        // Mapear tipo de usuario a userType numérico
        const userTypeMap: { [key: string]: number } = {
          'admin': 1,
          'auditor': 2,
          'empresa': 3,
        };
        
        let requestBody: any = {
          email: values.correo,
          password: values.password,
          userType: userTypeMap[values.tipo],
        };
        
        if (values.tipo === 'admin') {
          requestBody = {
            ...requestBody,
            nombre: values.nombre,
            paterno: values.apellidoPaterno,
            materno: values.apellidoMaterno,
            telefono: values.telefono,
          };
        } else if (values.tipo === 'empresa') {
          requestBody = {
            ...requestBody,
            nombre: values.nombreEmpresa,
            rfc: values.rfc,
            telefono: values.telefonoEmpresa,
            responsableLegal: values.responsableLegal,
            subEmpresa: values.subempresa || undefined,
          };
        } else if (values.tipo === 'auditor') {
          requestBody = {
            ...requestBody,
            nombre: values.nombreAuditor,
            paterno: values.apellidoPaternoAuditor,
            materno: values.apellidoMaternoAuditor,
            telefono: values.whatsapp,
            curp: values.curp,
            rfc: values.rfcAuditor,
            nss: values.nss,
            whatsapp: values.whatsapp,
            contactoEmergencia: values.contactoEmergencia,
          };
        }
        
        const response = await BasicPetition({
          endpoint: '/users',
          method: 'POST',
          data: requestBody,
          showNotifications: false,
        });
        
        showNotification({
          title: 'Usuario creado',
          message: 'El usuario se creó correctamente',
          color: 'green',
        });
        
        // Recargar la lista de usuarios
        await fetchUsers();
        
      } catch (error) {
        console.error('Error al crear usuario:', error);
        showNotification({
          title: 'Error',
          message: 'No se pudo crear el usuario. Verifique los datos.',
          color: 'red',
        });
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }
    setOpened(false);
    form.reset();
  };

  // 🗑️ ELIMINAR USUARIO
  const handleDelete = (usuario: Usuario) => {
    setUserToDelete(usuario);
    setOpenedConfirm(true);
  };

  // ✅ CONFIRMAR ELIMINACIÓN
  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    setLoading(true);
    
    try {
      await BasicPetition({
        endpoint: `/users/${userToDelete.id}`,
        method: 'DELETE',
        showNotifications: false,
      });
      
      showNotification({
        title: 'Usuario eliminado',
        message: 'El usuario se eliminó correctamente',
        color: 'red',
      });
      
      setOpenedConfirm(false);
      setUserToDelete(null);
      
      // Recargar la lista de usuarios
      await fetchUsers();
      
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      showNotification({
        title: 'Error',
        message: 'No se pudo eliminar el usuario.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // 📷 ABRIR MODAL PARA SUBIR FOTO
  const handleOpenPhoto = async (usuario: Usuario) => {
    setUserForPhoto(usuario);
    setPhotoFile(null);
    setIsEditingPhoto(false);
    setOpenedPhoto(true);
    
    // Obtener foto actual
    setLoading(true);
    const photo = await fetchUserPhoto(usuario.id);
    setCurrentPhoto(photo);
    setLoading(false);
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
  };

  // 💾 GUARDAR FOTO DE PERFIL
  const handleUploadPhoto = async () => {
    if (!userForPhoto || !photoFile) {
      showNotification({
        title: 'Error',
        message: 'Por favor seleccione una foto',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    
    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', photoFile); // El campo se llama 'file' según la API

      // Subir la foto a la API
      const response = await fetch(`/api/users/${userForPhoto.id}/photo`, {
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
      const newPhotoUrl = data?.url || data?.photo || URL.createObjectURL(photoFile);
      setCurrentPhoto(newPhotoUrl);
      
      showNotification({
        title: 'Foto actualizada',
        message: 'La foto de perfil se actualizó correctamente',
        color: 'green',
      });
      
      // Volver al modo de visualización
      setIsEditingPhoto(false);
      setPhotoFile(null);
      
      // Recargar la lista de usuarios para reflejar el cambio
      fetchUsers();
      
    } catch (error) {
      console.error('Error al subir la foto:', error);
      showNotification({
        title: 'Error',
        message: 'No se pudo subir la foto. Intente nuevamente.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // 📊 COLUMNAS DE LA TABLA
  const columns: Column<Usuario>[] = [
    {
      accessor: 'nombre',
      label: 'Nombre',
      render: (row) => {
        const nombre = row.nombre || '-';
        
        // Si tiene guión medio, es una empresa - mostrar en dos líneas
        if (nombre.includes(' - ')) {
          const [empresa, sucursal] = nombre.split(' - ');
          return (
            <Box>
              <Text size="sm" fw={500}>{empresa}</Text>
              <Text size="xs" c="dimmed">{sucursal}</Text>
            </Box>
          );
        }
        
        return nombre;
      },
    },
    {
      accessor: 'role',
      label: 'Tipo',
      render: (row) => row.role || '-',
    },
    {
      accessor: 'email',
      label: 'Correo',
      render: (row) => row.email || row.correo || '-',
    },
  ];

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="lg">
        Gestión de Usuarios
      </Title>

      <ResponsiveDataTable
        columns={columns}
        data={usuarios.filter(u => u.isActive)}
        initialPageSize={10}
        onAddClick={handleOpenNew}
        addLabel="+ Nuevo Usuario"
        addColor="#a1a23b"
        actions={(row) => (
          <Group gap={8} justify="center">
            <Button
              size="sm"
              color="blue"
              onClick={() => handleEdit(row)}
            >
              <FaEdit></FaEdit>
            </Button>
            {/* Botón de cámara solo para auditores */}
            {(row.role?.toLowerCase() === 'auditor' || row.role === 'Auditor') && (
              <Button
                size="sm"
                color="grape"
                onClick={() => handleOpenPhoto(row)}
                title="Subir foto de perfil"
              >
                <FaCamera></FaCamera>
              </Button>
            )}
            <Button
              size="sm"
              color="red"
              onClick={() => handleDelete(row)}
            >
              <FaTrash></FaTrash>
            </Button>
          </Group>
        )}
      />

      {/* 📝 MODAL DE FORMULARIO */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          form.reset();
          setEditingUser(null);
        }}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="xl"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* 👤 TIPO DE USUARIO - Solo al crear */}
            {!editingUser && (
              <Select
                label="Tipo de usuario"
                placeholder="Selecciona un tipo"
                required
                data={[
                  { value: 'admin', label: 'Administrador' },
                  { value: 'auditor', label: 'Auditor' },
                  { value: 'empresa', label: 'Empresa' },
                ]}
                {...form.getInputProps('tipo')}
              />
            )}

            {/* ======================================
                CAMPOS PARA ADMIN
            ====================================== */}
            {form.values.tipo === 'admin' && (
              <>
                <TextInput
                  label="Nombre"
                  placeholder="Nombre"
                  required
                  {...form.getInputProps('nombre')}
                />

                <TextInput
                  label="Apellido paterno"
                  placeholder="Ingrese un apellido paterno"
                  required
                  {...form.getInputProps('apellidoPaterno')}
                />

                <TextInput
                  label="Apellido materno"
                  placeholder="Ingrese un apellido materno"
                  required
                  {...form.getInputProps('apellidoMaterno')}
                />

                <TextInput
                  label="Teléfono"
                  placeholder="Ingrese un teléfono"
                  required
                  {...form.getInputProps('telefono')}
                />
              </>
            )}

            {/* ======================================
                CAMPOS PARA EMPRESA
            ====================================== */}
            {form.values.tipo === 'empresa' && (
              <>
                <TextInput
                  label="Nombre de la Empresa"
                  placeholder="Ingrese el nombre de la empresa"
                  required
                  {...form.getInputProps('nombreEmpresa')}
                />

                <TextInput
                  label="RFC"
                  placeholder="Ingrese el RFC"
                  required
                  {...form.getInputProps('rfc')}
                />

                <TextInput
                  label="Teléfono"
                  placeholder="Ingrese el teléfono"
                  required
                  {...form.getInputProps('telefonoEmpresa')}
                />

                <TextInput
                  label="Responsable Legal"
                  placeholder="Ingrese el nombre del responsable legal"
                  required
                  {...form.getInputProps('responsableLegal')}
                />

                <TextInput
                  label="SubEmpresa (Opcional)"
                  placeholder="Ingrese subEmpresa si aplica"
                  {...form.getInputProps('subempresa')}
                  styles={{
                    input: {
                      backgroundColor: '#f8f9fa',
                      fontStyle: 'italic',
                    },
                    label: {
                      color: '#868e96',
                      fontStyle: 'italic',
                    },
                  }}
                />
              </>
            )}

            {/* ======================================
                CAMPOS PARA AUDITOR
            ====================================== */}
            {form.values.tipo === 'auditor' && (
              <>
                <TextInput
                  label="Nombre"
                  placeholder="Nombre"
                  required
                  {...form.getInputProps('nombreAuditor')}
                />

                <TextInput
                  label="Apellido paterno"
                  placeholder="Ingrese un apellido paterno"
                  required
                  {...form.getInputProps('apellidoPaternoAuditor')}
                />

                <TextInput
                  label="Apellido materno"
                  placeholder="Ingrese un apellido materno"
                  required
                  {...form.getInputProps('apellidoMaternoAuditor')}
                />

                <TextInput
                  label="CURP"
                  placeholder="Ingrese la CURP"
                  required
                  {...form.getInputProps('curp')}
                />

                <TextInput
                  label="RFC"
                  placeholder="Ingrese el RFC"
                  required
                  {...form.getInputProps('rfcAuditor')}
                />

                <TextInput
                  label="NSS"
                  placeholder="Ingrese el NSS"
                  required
                  {...form.getInputProps('nss')}
                />

                <TextInput
                  label="WhatsApp"
                  placeholder="Ingrese el número de WhatsApp"
                  required
                  {...form.getInputProps('whatsapp')}
                />

                <TextInput
                  label="Contacto de Emergencia"
                  placeholder="Nombre y teléfono del contacto"
                  required
                  {...form.getInputProps('contactoEmergencia')}
                />
              </>
            )}

            {/* ======================================
                CAMPOS COMUNES PARA TODOS
            ====================================== */}
            <TextInput
              label="Correo"
              placeholder="correo@ejemplo.com"
              required
              type="email"
              {...form.getInputProps('correo')}
            />

            <PasswordInput
              label="Contraseña"
              placeholder="Ingrese una contraseña"
              required={!editingUser}
              description={
                editingUser ? 'Dejar vacío para mantener la actual' : ''
              }
              {...form.getInputProps('password')}
            />

            {/* 🔘 BOTONES */}
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  setOpened(false);
                  form.reset();
                  setEditingUser(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                style={{
                  backgroundColor: '#a1a23b',
                }}
              >
                {editingUser ? 'Actualizar' : 'Agregar Usuario'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* 🗑️ MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Modal
        opened={openedConfirm}
        onClose={() => {
          setOpenedConfirm(false);
          setUserToDelete(null);
        }}
        title="Confirmar eliminación"
        size="sm"
        centered
      >
        <Stack gap="md">
          <div>
            <p style={{ margin: 0, marginBottom: '8px' }}>¿Estás seguro de que deseas eliminar este usuario?</p>
            {userToDelete && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#fff3f3', 
                borderRadius: '8px',
                border: '1px solid #ffe0e0'
              }}>
                <strong style={{ color: '#c92a2a' }}>
                  {userToDelete.tipo === 'empresa' 
                    ? userToDelete.nombreEmpresa
                    : `${userToDelete.nombre || ''} ${userToDelete.apellidoPaterno || ''} ${userToDelete.apellidoMaterno || ''}`.trim()}
                </strong>
                <div style={{ fontSize: '0.875rem', color: '#868e96', marginTop: '4px' }}>
                  {userToDelete.correo}
                </div>
              </div>
            )}
            <p style={{ margin: 0, marginTop: '12px', fontSize: '0.875rem', color: '#868e96' }}>
              Esta acción no se puede deshacer.
            </p>
          </div>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                setOpenedConfirm(false);
                setUserToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={confirmDelete}
            >
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 📷 MODAL DE FOTO DE PERFIL */}
      <Modal
        opened={openedPhoto}
        onClose={() => {
          setOpenedPhoto(false);
          setUserForPhoto(null);
          setPhotoFile(null);
          setCurrentPhoto(null);
          setIsEditingPhoto(false);
        }}
        title="Foto de Perfil"
        size="md"
        centered
      >
        <Stack gap="md">
          {userForPhoto && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              marginBottom: '8px'
            }}>
              <Text size="sm" fw={500}>{userForPhoto.nombre}</Text>
              <Text size="xs" c="dimmed">{userForPhoto.email}</Text>
            </div>
          )}

          {/* Mostrar foto actual o placeholder */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '16px',
            padding: '20px'
          }}>
            <div style={{ position: 'relative' }}>
              {currentPhoto ? (
                <Avatar
                  src={currentPhoto}
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

            {currentPhoto && !isEditingPhoto && (
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
                  setUserForPhoto(null);
                  setPhotoFile(null);
                  setCurrentPhoto(null);
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
              >
                Subir Foto
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
