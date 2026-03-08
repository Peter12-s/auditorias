import { useState } from 'react';
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
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { FaChevronDown, FaFileUpload, FaDownload, FaSearch } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import JSZip from 'jszip';

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

interface EmpresaGenerada {
  id: string;
  nombre: string;
  puntos: PuntoGenerado[];
}

// ==========================================
// DATOS DUMMY
// ==========================================

const generarPeriodosDummy = (periodicidad: string): Periodo[] => {
  const periodos: Periodo[] = [];
  const fechaInicio = new Date('2026-01-17');
  const hoy = new Date();

  const cantidad = periodicidad === 'Anual' ? 5 : 12;

  for (let i = 0; i < cantidad; i++) {
    let fechaLimite = new Date(fechaInicio);
    let nombre = '';

    if (periodicidad === 'Semanal') {
      fechaLimite.setDate(fechaInicio.getDate() + (i * 7));
      const mes = fechaLimite.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      nombre = `Semana ${i + 1} - ${mes}`;
    } else if (periodicidad === 'Mensual') {
      fechaLimite = new Date(2026, i, 17);
      nombre = fechaLimite.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    } else if (periodicidad === 'Anual') {
      fechaLimite = new Date(2026 + i, 0, 17);
      nombre = `Año ${2026 + i}`;
    }

    // Determinar estado basado en la fecha
    let estado: 'pendiente' | 'cargado' | 'vencido' = 'pendiente';
    
    if (fechaLimite < hoy) {
      // Si ya pasó la fecha límite
      estado = i % 3 === 0 ? 'vencido' : 'cargado'; // Algunos vencidos, otros cargados
    }

    // Simular algunos archivos cargados
    const tieneCargado = estado === 'cargado';

    periodos.push({
      id: `periodo-${periodicidad}-${i}`,
      nombre,
      fechaLimite: fechaLimite.toISOString(),
      estado,
      ...(tieneCargado && {
        archivoUrl: `https://storage.example.com/archivo-${i}.pdf`,
        archivoNombre: `reporte-${nombre.toLowerCase().replace(/\s/g, '-')}.pdf`,
        fechaCarga: new Date(fechaLimite.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 días antes
      }),
    });
  }

  return periodos;
};

const empresasDummy: EmpresaGenerada[] = [
  {
    id: '1',
    nombre: 'GRUPO TRASNACIONAL DE INFRAESTRUCTURA',
    puntos: [
      {
        id: '1-1',
        nombre: 'Sección para punto 1',
        subpuntos: [
          {
            id: '1-1-1',
            nombre: 'Subpunto 1.1 - Reporte de Mantenimiento',
            periodicidad: 'Mensual',
            periodos: generarPeriodosDummy('Mensual'),
          },
          {
            id: '1-1-2',
            nombre: 'Subpunto 1.2 - Inspección de Seguridad',
            periodicidad: 'Semanal',
            periodos: generarPeriodosDummy('Semanal'),
          },
        ],
      },
      {
        id: '1-2',
        nombre: 'Sección para punto 2',
        subpuntos: [
          {
            id: '1-2-1',
            nombre: 'Subpunto 2.1 - Auditoría Interna',
            periodicidad: 'Anual',
            periodos: generarPeriodosDummy('Anual'),
          },
          {
            id: '1-2-2',
            nombre: 'Subpunto 2.2 - Control de Calidad',
            periodicidad: 'Mensual',
            periodos: generarPeriodosDummy('Mensual'),
          },
        ],
      },
    ],
  },
  {
    id: '2',
    nombre: 'SNTE NACIONAL',
    puntos: [
      {
        id: '2-1',
        nombre: 'Sección para punto 1',
        subpuntos: [
          {
            id: '2-1-1',
            nombre: 'Subpunto 1.1 - Reporte Financiero',
            periodicidad: 'Mensual',
            periodos: generarPeriodosDummy('Mensual'),
          },
          {
            id: '2-1-2',
            nombre: 'Subpunto 1.2 - Capacitación Personal',
            periodicidad: 'Semanal',
            periodos: generarPeriodosDummy('Semanal'),
          },
        ],
      },
    ],
  },
  {
    id: '3',
    nombre: 'FERROMEX',
    puntos: [
      {
        id: '3-1',
        nombre: 'Sección para punto 1',
        subpuntos: [
          {
            id: '3-1-1',
            nombre: 'Subpunto 1.1 - Mantenimiento de Vías',
            periodicidad: 'Semanal',
            periodos: generarPeriodosDummy('Semanal'),
          },
        ],
      },
    ],
  },
];

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
  const [empresas] = useState<EmpresaGenerada[]>(empresasDummy);
  const [searchTerm, setSearchTerm] = useState('');

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

      {/* LISTA DE EMPRESAS */}
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
                      <Badge color="blue" size="sm">
                        {empresa.puntos.length} {empresa.puntos.length === 1 ? 'punto' : 'puntos'}
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
    </Container>
  );
}
