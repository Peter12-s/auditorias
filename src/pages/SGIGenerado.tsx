import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Accordion,
  Group,
  Stack,
  Paper,
  Text,
  Badge,
  Divider,
  FileInput,
  Button,
  Box,
  TextInput,
  Loader,
  Center,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { FaChevronDown, FaFileUpload, FaDownload, FaSearch } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import JSZip from 'jszip';
import { BasicPetition } from '../core/petition';

// ==========================================
// INTERFACES
// ==========================================

interface Periodo {
  id: string;
  nombre: string; // "Enero 2026", "Semana 1 Enero 2026"
  fechaLimite: string; // Fecha en formato ISO
  estado: 'pendiente' | 'cargado' | 'vencido';
  archivoUrl?: string;
  archivoNombre?: string;
  fechaCarga?: string;
}

interface SubpuntoGenerado {
  id: string;
  nombre: string;
  periodicidad: string;
  periodos: Periodo[];
}

interface PuntoGenerado {
  id: string;
  nombre: string;
  subpuntos: SubpuntoGenerado[];
}

// Interface para datos del API
interface CompanyProfile {
  nombreEmpresa: string;
  rfc: string;
  telefono: string;
  responsableLegal: string;
  subEmpresa: string | null;
}

interface SubpointsStats {
  totalSubpoints: number;
  subpointsWithFiles: number;
}

interface CompanyFromAPI {
  companyUserId: number;
  email: string;
  isActive: boolean;
  profile: CompanyProfile;
  subpointsStats: SubpointsStats;
}

interface EmpresaGenerada {
  id: string;
  nombre: string;
  puntos: PuntoGenerado[];
  // Campos adicionales del API
  companyUserId?: number;
  email?: string;
  isActive?: boolean;
  profile?: CompanyProfile;
  subpointsStats?: SubpointsStats;
}

// ==========================================
// FUNCIONES HELPER
// ==========================================

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'vencido':
      return { bg: '#ffe0e0', border: '#fa5252', badge: 'red' };
    case 'cargado':
      return { bg: '#d3f9d8', border: '#37b24d', badge: 'green' };
    case 'pendiente':
    default:
      return { bg: '#fff4e0', border: '#fab005', badge: 'yellow' };
  }
};

const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case 'vencido':
      return '❌';
    case 'cargado':
      return '✅';
    case 'pendiente':
    default:
      return '📤';
  }
};

const getEstadoTexto = (estado: string) => {
  switch (estado) {
    case 'vencido':
      return 'VENCIDO';
    case 'cargado':
      return 'Cargado';
    case 'pendiente':
    default:
      return 'Pendiente';
  }
};

const formatFecha = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function SGIGenerado() {
  const auth = useAuth();
  const [uploadingFile, setUploadingFile] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [empresas, setEmpresas] = useState<EmpresaGenerada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar empresas desde el API
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        setLoading(true);
        const response = await BasicPetition({
          endpoint: '/templates/companies',
          method: 'GET',
        });

        if (Array.isArray(response)) {
          // Transformar datos del API al formato esperado
          const empresasTransformadas: EmpresaGenerada[] = response.map((company: CompanyFromAPI) => ({
            id: String(company.companyUserId),
            nombre: company.profile.nombreEmpresa,
            puntos: [], // Los puntos se cargarán por separado si es necesario
            companyUserId: company.companyUserId,
            email: company.email,
            isActive: company.isActive,
            profile: company.profile,
            subpointsStats: company.subpointsStats,
          }));
          setEmpresas(empresasTransformadas);
        }
      } catch (error) {
        console.error('Error al cargar empresas:', error);
        showNotification({
          title: 'Error',
          message: 'No se pudieron cargar las empresas',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, []);

  // Filtrar empresas por término de búsqueda
  const empresasFiltradas = empresas.filter((empresa) =>
    empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Descargar todos los archivos de una empresa en ZIP
  const handleDescargarEmpresaZip = async (empresa: EmpresaGenerada) => {
    setDownloadingZip(true);

    try {
      const zip = new JSZip();
      const empresaNombre = empresa.nombre.replace(/[^a-z0-9]/gi, '_');
      let archivosEncontrados = 0;

      // Recorrer puntos
      empresa.puntos.forEach((punto) => {
        const puntoNombre = punto.nombre.replace(/[^a-z0-9]/gi, '_');

        // Recorrer subpuntos
        punto.subpuntos.forEach((subpunto) => {
          const subpuntoNombre = subpunto.nombre.replace(/[^a-z0-9]/gi, '_');

          // Recorrer periodos cargados
          subpunto.periodos.forEach((periodo) => {
            if (periodo.estado === 'cargado' && periodo.archivoUrl && periodo.archivoNombre) {
              // Crear estructura: Empresa/Punto/Subpunto/archivo.pdf
              const rutaArchivo = `${empresaNombre}/${puntoNombre}/${subpuntoNombre}/${periodo.archivoNombre}`;
              
              // En un caso real, aquí se descargaría el archivo desde periodo.archivoUrl
              // Por ahora simulamos con contenido de texto
              const contenidoSimulado = `Archivo simulado para ${periodo.nombre}\nEmpresa: ${empresa.nombre}\nPunto: ${punto.nombre}\nSubpunto: ${subpunto.nombre}\nPeriodo: ${periodo.nombre}\nFecha carga: ${periodo.fechaCarga}`;
              
              zip.file(rutaArchivo, contenidoSimulado);
              archivosEncontrados++;
            }
          });
        });
      });

      if (archivosEncontrados === 0) {
        showNotification({
          title: 'Sin archivos',
          message: 'No hay archivos cargados para descargar',
          color: 'yellow',
        });
        setDownloadingZip(false);
        return;
      }

      // Generar y descargar ZIP
      const contenidoZip = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(contenidoZip);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${empresaNombre}_archivos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification({
        title: 'Descarga completada',
        message: `Se descargaron ${archivosEncontrados} archivos de ${empresa.nombre}`,
        color: 'green',
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo generar el archivo ZIP',
        color: 'red',
      });
    } finally {
      setDownloadingZip(false);
    }
  };

  // Manejar carga de archivo por periodo
  const handleCargarArchivoPeriodo = (file: File | null, periodo: Periodo) => {
    if (!file) return;

    setUploadingFile(true);

    // Simular subida
    setTimeout(() => {
      setUploadingFile(false);
      showNotification({
        title: 'Archivo cargado',
        message: `El archivo "${file.name}" se cargó correctamente para ${periodo.nombre}`,
        color: 'green',
      });
    }, 1000);
  };

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="lg">
        SGI Generado - Control 
      </Title>

      <Text size="sm" c="dimmed" mb="xl">
        Sistema de gestión por periodos.
      </Text>

      {/* BUSCADOR DE EMPRESAS */}
      <TextInput
        placeholder="Buscar empresa..."
        leftSection={<FaSearch size={14} />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.currentTarget.value)}
        mb="lg"
        size="md"
      />

      {/* LOADER */}
      {loading && (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      )}

      {/* LISTA DE EMPRESAS */}
      {!loading && (
      <Stack gap="md">
        {empresasFiltradas.map((empresa) => (
          <Paper key={empresa.id} shadow="sm" p="md" radius="md" withBorder>
            <Accordion>
              <Accordion.Item value={empresa.id}>
                <Accordion.Control
                  icon={<FaChevronDown size={14} />}
                  styles={{
                    control: {
                      fontSize: '1.1rem',
                      fontWeight: 600,
                    },
                  }}
                >
                  <Group justify="space-between" style={{ flex: 1 }} wrap="nowrap">
                    <Group gap="xs">
                      <Text>🏢</Text>
                      <Text fw={600}>{empresa.nombre}</Text>
                      {empresa.profile?.subEmpresa && (
                        <Badge color="gray" size="sm" variant="outline">
                          {empresa.profile.subEmpresa}
                        </Badge>
                      )}
                      <Badge color="blue" size="sm">
                        {empresa.subpointsStats?.totalSubpoints ?? 0} {(empresa.subpointsStats?.totalSubpoints ?? 0) === 1 ? 'subpunto' : 'subpuntos'}
                      </Badge>
                      
                    </Group>
                    {(auth.userType === 'admin' || auth.userType === 'auditor') && (
                      <Button
                        size="xs"
                        variant="light"
                        color="blue"
                        leftSection={<FaDownload size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDescargarEmpresaZip(empresa);
                        }}
                        loading={downloadingZip}
                        disabled={downloadingZip}
                      >
                        Descargar ZIP
                      </Button>
                    )}
                  </Group>
                </Accordion.Control>

                <Accordion.Panel>
                  <Stack gap="sm">
                    {empresa.puntos.map((punto) => (
                      <Paper
                        key={punto.id}
                        p="md"
                        radius="md"
                        style={{
                          backgroundColor: '#e8eaa6',
                          border: '1px solid #d4d68f',
                        }}
                      >
                        <Text fw={600} size="lg" c="#4a4a4a" mb="sm">
                          📁 {punto.nombre}
                        </Text>

                        <Divider my="sm" />

                        {/* LISTA DE SUBPUNTOS */}
                        <Stack gap="md" mt="sm">
                          {punto.subpuntos.map((subpunto) => (
                            <Paper
                              key={subpunto.id}
                              p="md"
                              radius="sm"
                              withBorder
                              style={{
                                backgroundColor: '#f5f7d0',
                                border: '1px solid #e0e3a8',
                              }}
                            >
                              {/* HEADER DEL SUBPUNTO */}
                              <Group justify="space-between" mb="sm">
                                <Stack gap={4}>
                                  <Text fw={600} size="md">
                                    📄 {subpunto.nombre}
                                  </Text>
                                  <Badge color="blue" size="sm">
                                    Periodicidad: {subpunto.periodicidad}
                                  </Badge>
                                </Stack>
                              </Group>

                              <Divider my="sm" />

                              {/* LISTA DE PERIODOS */}
                              <Text size="sm" fw={600} c="dimmed" mb="xs">
                                Periodos:
                              </Text>
                              <Stack gap="xs">
                                {subpunto.periodos.map((periodo) => {
                                  const colors = getEstadoColor(periodo.estado);
                                  const icon = getEstadoIcon(periodo.estado);
                                  const estadoTexto = getEstadoTexto(periodo.estado);

                                  return (
                                    <Paper
                                      key={periodo.id}
                                      p="sm"
                                      withBorder
                                      radius="sm"
                                      style={{
                                        backgroundColor: colors.bg,
                                        borderColor: colors.border,
                                        borderWidth: '2px',
                                      }}
                                    >
                                      <Group justify="space-between" wrap="nowrap">
                                        <Stack gap={4} style={{ flex: 1 }}>
                                          <Group gap="xs" wrap="nowrap">
                                            <Text size="sm" fw={600}>
                                              {icon} {periodo.nombre}
                                            </Text>
                                            <Badge size="xs" color={colors.badge}>
                                              {estadoTexto}
                                            </Badge>
                                          </Group>
                                          <Text size="xs" c="dimmed">
                                            Fecha límite: {formatFecha(periodo.fechaLimite)}
                                          </Text>
                                          
                                          {/* INFORMACIÓN DE ARCHIVO CARGADO */}
                                          {periodo.estado === 'cargado' && periodo.archivoNombre && (
                                            <>
                                              <Text size="xs" c="green" fw={500}>
                                                📎 Archivo: {periodo.archivoNombre}
                                              </Text>
                                              {periodo.fechaCarga && (
                                                <Text size="xs" c="dimmed">
                                                  Cargado: {formatFecha(periodo.fechaCarga)}
                                                </Text>
                                              )}
                                            </>
                                          )}

                                          {/* TEXTO DE VENCIDO */}
                                          {periodo.estado === 'vencido' && (
                                            <Text size="xs" c="red" fw={500}>
                                              ⚠️ No se subió archivo a tiempo
                                            </Text>
                                          )}
                                        </Stack>

                                        {/* ACCIONES */}
                                        <Box>
                                          {periodo.estado === 'pendiente' && (
                                            <FileInput
                                              placeholder="Subir"
                                              size="xs"
                                              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                                              onChange={(file) => handleCargarArchivoPeriodo(file, periodo)}
                                              disabled={uploadingFile}
                                              leftSection={<FaFileUpload size={12} />}
                                              style={{ width: 140 }}
                                            />
                                          )}

                                          {periodo.estado === 'cargado' && periodo.archivoUrl && (
                                            <Button
                                              size="xs"
                                              variant="light"
                                              color="gray"
                                              component="a"
                                              href={periodo.archivoUrl}
                                              target="_blank"
                                            >
                                              Ver archivo
                                            </Button>
                                          )}

                                          {periodo.estado === 'vencido' && (
                                            auth.userType !== 'empresa' ? (
                                              <FileInput
                                                placeholder="Subir (*Restraso)"
                                                size="xs"
                                                accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                                                onChange={(file) => handleCargarArchivoPeriodo(file, periodo)}
                                                disabled={uploadingFile}
                                                leftSection={<FaFileUpload size={12} />}
                                                style={{ width: 150 }}
                                              />
                                            ) : (
                                              <Badge color="red" size="sm">
                                                🔒 Bloqueado
                                              </Badge>
                                            )
                                          )}
                                        </Box>
                                      </Group>
                                    </Paper>
                                  );
                                })}
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Paper>
        ))}

        {empresasFiltradas.length === 0 && (
          <Paper p="xl" withBorder>
            <Text c="dimmed" ta="center">
              {searchTerm
                ? `No se encontraron empresas que coincidan con "${searchTerm}"`
                : 'No hay empresas configuradas en el sistema'}
            </Text>
          </Paper>
        )}
      </Stack>
      )}
    </Container>
  );
}
