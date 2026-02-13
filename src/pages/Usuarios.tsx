import { useState } from 'react';
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
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { ResponsiveDataTable, type Column } from '../components/ResponsiveDataTable';
import { FaEdit,FaFile,FaTrash ,FaFileUpload} from 'react-icons/fa';

// 📝 TIPOS DE USUARIO
type UserType = 'admin' | 'auditor' | 'empresa';

// 📋 INTERFAZ DE USUARIO
interface Usuario {
  id: string;
  tipo: UserType;
  correo: string;
  
  // Campos comunes para Admin y Auditor
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  
  // Campos Admin
  telefono?: string;
  
  // Campos Empresa
  nombreEmpresa?: string;
  rfc?: string;
  telefonoEmpresa?: string;
  responsableLegal?: string;
  subempresa?: string;
  
  // Campos Auditor
  curp?: string;
  rfcAuditor?: string;
  nss?: string;
  whatsapp?: string;
  contactoEmergencia?: string;
  fotoPerfil?: string;
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

  // 🗂️ DATOS MOCK - Aquí se conectaría con la API
  const [usuarios, setUsuarios] = useState<Usuario[]>([
    {
      id: '1',
      tipo: 'admin',
      correo: 'admin@dogroup.com',
      nombre: 'Juan',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'García',
      telefono: '1234567890',
    },
    {
      id: '2',
      tipo: 'auditor',
      correo: 'auditor@dogroup.com',
      nombre: 'María',
      apellidoPaterno: 'López',
      apellidoMaterno: 'Martínez',
      curp: 'LOPM850101MDFPPR03',
      rfcAuditor: 'LOPM850101XXX',
      nss: '12345678901',
      whatsapp: '5551234567',
      contactoEmergencia: 'Juan López - 5559876543',
    },
    {
      id: '3',
      tipo: 'empresa',
      correo: 'empresa@dogroup.com',
      nombreEmpresa: 'Empresa Demo S.A. de C.V.',
      rfc: 'EDE123456XXX',
      telefonoEmpresa: '5551234567',
      responsableLegal: 'Carlos Ramírez',
      subempresa: 'Sucursal Norte',
    },{
        id: '4',
        tipo: 'empresa',
        correo: 'empresa2@dogroup.com',
        nombreEmpresa: 'Otra Empresa S.A. de C.V.',
        rfc: 'OEE123456XXX',
        telefonoEmpresa: '5557654321',
        responsableLegal: 'Ana Gómez',
        subempresa: 'Sucursal Sur',
    },
    {
        id: '4',
        tipo: 'empresa',
        correo: 'empresa2@dogroup.com',
        nombreEmpresa: 'Otra Empresa S.A. de C.V.',
        rfc: 'OEE123456XXX',
        telefonoEmpresa: '5557654321',
        responsableLegal: 'Ana Gómez',
        subempresa: 'Sucursal Sur',
    },
    {
        id: '4',
        tipo: 'empresa',
        correo: 'empresa2@dogroup.com',
        nombreEmpresa: 'Otra Empresa S.A. de C.V.',
        rfc: 'OEE123456XXX',
        telefonoEmpresa: '5557654321',
        responsableLegal: 'Ana Gómez',
        subempresa: 'Sucursal Sur',
    }
  ]);

  // 📝 FORMULARIO
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

  // 🔧 ABRIR MODAL PARA NUEVO USUARIO
  const handleOpenNew = () => {
    setEditingUser(null);
    form.reset();
    setOpened(true);
  };

  // 🔧 ABRIR MODAL PARA EDITAR
  const handleEdit = (usuario: Usuario) => {
    setEditingUser(usuario);
    
    if (usuario.tipo === 'admin') {
      form.setValues({
        tipo: usuario.tipo,
        correo: usuario.correo,
        password: '',
        nombre: usuario.nombre || '',
        apellidoPaterno: usuario.apellidoPaterno || '',
        apellidoMaterno: usuario.apellidoMaterno || '',
        telefono: usuario.telefono || '',
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
        fotoPerfil: '',
      });
    } else if (usuario.tipo === 'empresa') {
      form.setValues({
        tipo: usuario.tipo,
        correo: usuario.correo,
        password: '',
        nombreEmpresa: usuario.nombreEmpresa || '',
        rfc: usuario.rfc || '',
        telefonoEmpresa: usuario.telefonoEmpresa || '',
        responsableLegal: usuario.responsableLegal || '',
        subempresa: usuario.subempresa || '',
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
    } else if (usuario.tipo === 'auditor') {
      form.setValues({
        tipo: usuario.tipo,
        correo: usuario.correo,
        password: '',
        nombreAuditor: usuario.nombre || '',
        apellidoPaternoAuditor: usuario.apellidoPaterno || '',
        apellidoMaternoAuditor: usuario.apellidoMaterno || '',
        curp: usuario.curp || '',
        rfcAuditor: usuario.rfcAuditor || '',
        nss: usuario.nss || '',
        whatsapp: usuario.whatsapp || '',
        contactoEmergencia: usuario.contactoEmergencia || '',
        fotoPerfil: usuario.fotoPerfil || '',
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
    
    setOpened(true);
  };

  // 💾 GUARDAR USUARIO
  const handleSubmit = (values: FormValues) => {
    if (editingUser) {
      // Editar usuario existente
      setUsuarios((prev) =>
        prev.map((u) => {
          if (u.id !== editingUser.id) return u;
          
          const baseUpdate = {
            ...u,
            tipo: values.tipo,
            correo: values.correo,
          };
          
          if (values.tipo === 'admin') {
            return {
              ...baseUpdate,
              nombre: values.nombre,
              apellidoPaterno: values.apellidoPaterno,
              apellidoMaterno: values.apellidoMaterno,
              telefono: values.telefono,
            };
          } else if (values.tipo === 'empresa') {
            return {
              ...baseUpdate,
              nombreEmpresa: values.nombreEmpresa,
              rfc: values.rfc,
              telefonoEmpresa: values.telefonoEmpresa,
              responsableLegal: values.responsableLegal,
              subempresa: values.subempresa,
            };
          } else {
            return {
              ...baseUpdate,
              nombre: values.nombreAuditor,
              apellidoPaterno: values.apellidoPaternoAuditor,
              apellidoMaterno: values.apellidoMaternoAuditor,
              curp: values.curp,
              rfcAuditor: values.rfcAuditor,
              nss: values.nss,
              whatsapp: values.whatsapp,
              contactoEmergencia: values.contactoEmergencia,
              fotoPerfil: values.fotoPerfil,
            };
          }
        })
      );
      showNotification({
        title: 'Usuario actualizado',
        message: 'El usuario se actualizó correctamente',
        color: 'green',
      });
    } else {
      // Crear nuevo usuario
      let nuevoUsuario: Usuario;
      
      if (values.tipo === 'admin') {
        nuevoUsuario = {
          id: Date.now().toString(),
          tipo: values.tipo,
          correo: values.correo,
          nombre: values.nombre,
          apellidoPaterno: values.apellidoPaterno,
          apellidoMaterno: values.apellidoMaterno,
          telefono: values.telefono,
        };
      } else if (values.tipo === 'empresa') {
        nuevoUsuario = {
          id: Date.now().toString(),
          tipo: values.tipo,
          correo: values.correo,
          nombreEmpresa: values.nombreEmpresa,
          rfc: values.rfc,
          telefonoEmpresa: values.telefonoEmpresa,
          responsableLegal: values.responsableLegal,
          subempresa: values.subempresa,
        };
      } else {
        nuevoUsuario = {
          id: Date.now().toString(),
          tipo: values.tipo,
          correo: values.correo,
          nombre: values.nombreAuditor,
          apellidoPaterno: values.apellidoPaternoAuditor,
          apellidoMaterno: values.apellidoMaternoAuditor,
          curp: values.curp,
          rfcAuditor: values.rfcAuditor,
          nss: values.nss,
          whatsapp: values.whatsapp,
          contactoEmergencia: values.contactoEmergencia,
          fotoPerfil: values.fotoPerfil,
        };
      }
      
      setUsuarios((prev) => [...prev, nuevoUsuario]);
      showNotification({
        title: 'Usuario creado',
        message: 'El usuario se creó correctamente',
        color: 'green',
      });
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
  const confirmDelete = () => {
    if (userToDelete) {
      setUsuarios((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showNotification({
        title: 'Usuario eliminado',
        message: 'El usuario se eliminó correctamente',
        color: 'red',
      });
      setOpenedConfirm(false);
      setUserToDelete(null);
    }
  };

  // 📊 COLUMNAS DE LA TABLA
  const columns: Column<Usuario>[] = [
    {
      accessor: 'nombre',
      label: 'Nombre',
      render: (row) => {
        if (row.tipo === 'empresa') {
          return row.nombreEmpresa || '-';
        }
        return `${row.nombre || ''} ${row.apellidoPaterno || ''} ${row.apellidoMaterno || ''}`.trim() || '-';
      },
    },
    {
      accessor: 'tipo',
      label: 'Tipo',
      render: (row) => {
        const tipos = {
          admin: 'ADMINISTRADOR',
          auditor: 'AUDITOR',
          empresa: 'EMPRESA',
        };
        return tipos[row.tipo];
      },
    },
    {
      accessor: 'correo',
      label: 'Correo',
    },
  ];

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="lg">
        Gestión de Usuarios
      </Title>

      <ResponsiveDataTable
        columns={columns}
        data={usuarios}
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
            {/* 👤 TIPO DE USUARIO */}
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

                <FileInput
                  label="Foto de Perfil"
                  placeholder="Seleccione una imagen"
                  accept="image/*"
                  leftSection={<FaFileUpload size={16} />}
                  {...form.getInputProps('fotoPerfil')}
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
    </Container>
  );
}
