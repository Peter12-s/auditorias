import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Accordion,
  Group,
  Stack,
  Paper,
  Text,
  Badge,
  FileInput,
  Button,
  Box,
  TextInput,
  Loader,
  Center,
  Tooltip,
  Modal,
  Table,
  ScrollArea,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { FaChevronDown, FaFileUpload, FaDownload, FaSearch, FaTrash, FaEye, FaFilePdf } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import { BasicPetition } from '../core/petition';

// ==========================================
// INTERFACES
// ==========================================

interface Periodo {
  id: string;
  nombre: string; // "Enero 2026", "Semana 1 Enero 2026"
  fechaLimite: string; // Fecha en formato ISO
  estado: 'pendiente' | 'cargado' | 'vencido' | 'futuro';
  archivoUrl?: string;
  archivoNombre?: string;
  fechaCarga?: string;
  isOnTime?: boolean | null;
  auditFileId?: number | null;
  disabled?: boolean;
  templateSubpointId?: number;
  periodYear?: number;
  periodMonth?: number | null;
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

// Interfaces para la respuesta del API de audit-periods/tree
interface FileFromAPI {
  originalName: string;
}

interface PeriodFromAPI {
  periodYear: number;
  periodMonth: number | null;
  hasActiveFile: boolean;
  auditFileId: number | null;
  uploadedAt: string | null;
  dueAt: string;
  isOnTime: boolean | null;
  file?: FileFromAPI | null;
}

interface AuditPeriodFromAPI {
  id: number;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  periods: PeriodFromAPI[];
}

interface SubpointFromAPI {
  templateSubpointId: number;
  templateSubpointName: string;
  periodicity: 'monthly' | 'yearly';
  auditPeriods: AuditPeriodFromAPI[];
}

interface PointFromAPI {
  templatePointId: number;
  templatePointName: string;
  subpoints: SubpointFromAPI[];
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
  loadingPeriods?: boolean;
  periodsLoaded?: boolean;
}

// Interface para el reporte de alertas
interface AlertPeriod {
  templatePointId: number;
  templatePointName: string;
  templateSubpointId: number;
  templateSubpointName: string;
  periodicity: string;
  periodYear: number;
  periodMonth: number | null;
  dueAt: string;
  daysOverdue?: number;
  daysUntilDue?: number;
}

interface AlertReport {
  companyUserId: number;
  generatedAt: string;
  graceDays: {
    monthly: number;
    yearly: number;
  };
  alertThresholdDays: number;
  missing: AlertPeriod[];
  expiring: AlertPeriod[];
}

// ==========================================
// FUNCIONES HELPER
// ==========================================

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'vencido':
      return { bg: '#ffe0e0', border: '#fa5252', badge: 'red' };
    case 'cargado':
      return { bg: '#d3f9d8', border: '#37b24d', badge: 'green' };
    case 'futuro':
      return { bg: '#e9ecef', border: '#adb5bd', badge: 'gray' };
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
    case 'futuro':
      return '🔒';
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
    case 'futuro':
      return 'Próximo';
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
  const isEmpresa = auth.userType === 'Empresa';
  const [uploadingFile, setUploadingFile] = useState(false);
  const [downloadingZipId, setDownloadingZipId] = useState<number | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaGenerada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);
  
  // Estados para el modal de reporte de alertas
  const [reportModalOpened, setReportModalOpened] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [alertReport, setAlertReport] = useState<AlertReport | null>(null);
  const [reportEmpresaNombre, setReportEmpresaNombre] = useState<string>('');

  // Función para obtener el nombre del período
  const getPeriodName = (period: PeriodFromAPI, periodicity: string): string => {
    if (periodicity === 'yearly') {
      return `Año ${period.periodYear}`;
    }
    const monthName = period.periodMonth ? MONTH_NAMES[period.periodMonth - 1] : '';
    return `${monthName} ${period.periodYear}`;
  };

  // Función para determinar el estado del período
  const getPeriodState = (period: PeriodFromAPI): 'pendiente' | 'cargado' | 'vencido' | 'futuro' => {
    const today = new Date();
    const dueDate = new Date(period.dueAt);
    
    if (period.hasActiveFile) {
      return 'cargado';
    }
    
    // Si la fecha de vencimiento ya pasó y no hay archivo
    if (dueDate < today && !period.hasActiveFile) {
      return 'vencido';
    }
    
    return 'pendiente';
  };

  // Función para filtrar períodos según las reglas
  const filterPeriods = (periods: PeriodFromAPI[], periodicity: string): { period: PeriodFromAPI; disabled: boolean }[] => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    
    const result: { period: PeriodFromAPI; disabled: boolean }[] = [];
    
    if (periodicity === 'yearly') {
      // Para anuales: mostrar solo el del año actual y vencidos de años anteriores
      periods.forEach(period => {
        const dueDate = new Date(period.dueAt);
        const isExpired = dueDate < today && !period.hasActiveFile;
        const isCurrentYear = period.periodYear === currentYear;
        const hasFile = period.hasActiveFile;
        
        if (isExpired || isCurrentYear || hasFile) {
          result.push({ period, disabled: false });
        }
      });
    } else {
      // Para mensuales: mostrar vencidos, actual, y 2 futuros deshabilitados
      let futureCount = 0;
      const maxFuture = 2;
      
      periods.forEach(period => {
        const periodDate = new Date(period.periodYear, (period.periodMonth || 1) - 1);
        const currentDate = new Date(currentYear, currentMonth - 1);
        const dueDate = new Date(period.dueAt);
        
        const isExpired = dueDate < today && !period.hasActiveFile;
        const isCurrent = period.periodYear === currentYear && period.periodMonth === currentMonth;
        const isPast = periodDate < currentDate;
        const isFuture = periodDate > currentDate;
        const hasFile = period.hasActiveFile;
        
        if (isExpired || hasFile) {
          // Mostrar todos los vencidos y los que tienen archivo
          result.push({ period, disabled: false });
        } else if (isPast || isCurrent) {
          // Período actual o pasado sin vencer
          result.push({ period, disabled: false });
        } else if (isFuture && futureCount < maxFuture) {
          // Solo mostrar 2 períodos futuros, deshabilitados
          result.push({ period, disabled: true });
          futureCount++;
        }
      });
    }
    
    return result;
  };

  // Función para transformar los datos del API al formato interno
  const transformAPIData = (data: PointFromAPI[]): PuntoGenerado[] => {
    return data.map(point => ({
      id: String(point.templatePointId),
      nombre: point.templatePointName,
      subpuntos: point.subpoints.map(subpoint => {
        // Combinar todos los períodos de todos los auditPeriods
        const allPeriods: PeriodFromAPI[] = [];
        subpoint.auditPeriods.forEach(ap => {
          allPeriods.push(...ap.periods);
        });
        
        // Filtrar períodos según las reglas
        const filteredPeriods = filterPeriods(allPeriods, subpoint.periodicity);
        
        return {
          id: String(subpoint.templateSubpointId),
          nombre: subpoint.templateSubpointName,
          periodicidad: subpoint.periodicity === 'monthly' ? 'Mensual' : 'Anual',
          periodos: filteredPeriods.map(({ period, disabled }) => ({
            id: `${subpoint.templateSubpointId}-${period.periodYear}-${period.periodMonth || 0}`,
            nombre: getPeriodName(period, subpoint.periodicity),
            fechaLimite: period.dueAt,
            estado: disabled ? 'futuro' as const : getPeriodState(period),
            archivoUrl: period.auditFileId ? `/api/files/${period.auditFileId}` : undefined,
            archivoNombre: period.file?.originalName || (period.hasActiveFile ? `archivo_${period.periodYear}_${period.periodMonth || 'anual'}.pdf` : undefined),
            fechaCarga: period.uploadedAt || undefined,
            isOnTime: period.isOnTime,
            auditFileId: period.auditFileId,
            disabled,
            templateSubpointId: subpoint.templateSubpointId,
            periodYear: period.periodYear,
            periodMonth: period.periodMonth,
          })),
        };
      }),
    }));
  };

  // Función para cargar los períodos de una empresa
  const loadCompanyPeriods = useCallback(async (companyUserId: number) => {
    try {
      // Marcar empresa como cargando
      setEmpresas(prev => prev.map(emp => 
        emp.companyUserId === companyUserId 
          ? { ...emp, loadingPeriods: true }
          : emp
      ));

      const response = await BasicPetition({
        endpoint: `/audits/companies/${companyUserId}/audit-periods/tree`,
        method: 'GET',
      });

      if (Array.isArray(response)) {
        const puntos = transformAPIData(response);
        
        setEmpresas(prev => prev.map(emp => 
          emp.companyUserId === companyUserId 
            ? { ...emp, puntos, loadingPeriods: false, periodsLoaded: true }
            : emp
        ));
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudieron cargar los períodos de auditoría',
        color: 'red',
      });
      setEmpresas(prev => prev.map(emp => 
        emp.companyUserId === companyUserId 
          ? { ...emp, loadingPeriods: false }
          : emp
      ));
    }
  }, []);

  // Manejar expansión de empresa
  const handleAccordionChange = (value: string | null) => {
    setExpandedEmpresa(value);
    
    if (value) {
      const empresa = empresas.find(e => e.id === value);
      if (empresa && empresa.companyUserId && !empresa.periodsLoaded && !empresa.loadingPeriods) {
        loadCompanyPeriods(empresa.companyUserId);
      }
    }
  };
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        setLoading(true);

        // Para rol Empresa: cargar únicamente su propia empresa
        if (auth.userType === 'Empresa' && auth.userId) {
          const companyUserId = Number(auth.userId);
          const empresaPropia: EmpresaGenerada = {
            id: String(auth.userId),
            nombre: auth.fullName || 'Mi Empresa',
            puntos: [],
            companyUserId,
            email: undefined,
            isActive: true,
            profile: {
              nombreEmpresa: auth.fullName || 'Mi Empresa',
              rfc: '',
              telefono: '',
              responsableLegal: '',
              subEmpresa: null,
            },
            subpointsStats: {
              totalSubpoints: 0,
              subpointsWithFiles: 0,
            },
            loadingPeriods: false,
            periodsLoaded: false,
          };

          setEmpresas([empresaPropia]);
          setExpandedEmpresa(String(auth.userId));

          if (!Number.isNaN(companyUserId)) {
            await loadCompanyPeriods(companyUserId);
          }
          return;
        }

        const response = await BasicPetition({
          endpoint: '/templates/companies',
          method: 'GET',
        });

        if (Array.isArray(response)) {
          // Transformar datos del API al formato esperado
          const empresasTransformadas: EmpresaGenerada[] = response.map((company: CompanyFromAPI) => ({
            id: String(company.companyUserId),
            nombre: company.profile.nombreEmpresa,
            puntos: [], // Los puntos se cargarán al expandir la empresa
            companyUserId: company.companyUserId,
            email: company.email,
            isActive: company.isActive,
            profile: company.profile,
            subpointsStats: company.subpointsStats,
            loadingPeriods: false,
            periodsLoaded: false,
          }));
          setEmpresas(empresasTransformadas);
        }
      } catch (error) {
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
  }, [auth.userId, auth.userType, auth.fullName, loadCompanyPeriods]);

  // Filtrar empresas por término de búsqueda
  const empresasFiltradas = empresas.filter((empresa) =>
    empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Descargar todos los archivos de una empresa en ZIP
  const handleDescargarEmpresaZip = async (empresa: EmpresaGenerada) => {
    if (!empresa.companyUserId) return;
    
    setDownloadingZipId(empresa.companyUserId);

    try {
      // Obtener el token de autenticación
      const token = localStorage.getItem('access_token');
      const baseUrl = import.meta.env.VITE_API_URL || 'https://sgi-gservice-708746088485.us-central1.run.app';
      
      const response = await fetch(`${baseUrl}/audits/companies/${empresa.companyUserId}/audit-files/zip`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      // Verificar si hay contenido
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0') {
        showNotification({
          title: 'Sin archivos',
          message: 'No hay archivos disponibles para descargar',
          color: 'yellow',
        });
        return;
      }

      // Obtener el blob del ZIP
      const blob = await response.blob();
      
      // Crear URL temporal y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${empresa.nombre.replace(/[^a-z0-9]/gi, '_')}_archivos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification({
        title: 'Descarga completada',
        message: `Archivos de ${empresa.nombre} descargados`,
        color: 'green',
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo descargar el archivo ZIP',
        color: 'red',
      });
    } finally {
      setDownloadingZipId(null);
    }
  };

  // Manejar carga de archivo por periodo
  const handleCargarArchivoPeriodo = async (file: File | null, periodo: Periodo, companyUserId: number) => {
    if (!file || !periodo.templateSubpointId) return;

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('year', String(periodo.periodYear));
      if (periodo.periodMonth) {
        formData.append('month', String(periodo.periodMonth));
      }

      await BasicPetition({
        endpoint: `/audits/subpoints/${periodo.templateSubpointId}/file`,
        method: 'POST',
        data: formData,
      });

      showNotification({
        title: 'Archivo cargado',
        message: `El archivo "${file.name}" se cargó correctamente para ${periodo.nombre}`,
        color: 'green',
      });

      // Recargar los períodos de la empresa
      loadCompanyPeriods(companyUserId);
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo subir el archivo',
        color: 'red',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Manejar eliminación de archivo (solo admin)
  const handleEliminarArchivo = async (periodo: Periodo, companyUserId: number) => {
    if (!periodo.templateSubpointId || !periodo.auditFileId) return;

    try {
      // Construir query params para DELETE
      let queryParams = `year=${periodo.periodYear}`;
      if (periodo.periodMonth) {
        queryParams += `&month=${periodo.periodMonth}`;
      }

      await BasicPetition({
        endpoint: `/audits/subpoints/${periodo.templateSubpointId}/file?${queryParams}`,
        method: 'DELETE',
      });

      showNotification({
        title: 'Archivo eliminado',
        message: `El archivo de ${periodo.nombre} fue eliminado correctamente`,
        color: 'green',
      });

      // Recargar los períodos de la empresa
      loadCompanyPeriods(companyUserId);
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo eliminar el archivo',
        color: 'red',
      });
    }
  };

  // Manejar ver archivo (GET con descarga)
  const handleVerArchivo = async (periodo: Periodo) => {
    if (!periodo.templateSubpointId) return;

    try {
      // Construir query params
      let queryParams = `year=${periodo.periodYear}`;
      if (periodo.periodMonth) {
        queryParams += `&month=${periodo.periodMonth}`;
      }

      const response = await BasicPetition({
        endpoint: `/audits/subpoints/${periodo.templateSubpointId}/file?${queryParams}`,
        method: 'GET',
      });

      // La respuesta tiene downloadUrl
      if (response?.downloadUrl) {
        // Abrir la URL en una nueva pestaña
        window.open(response.downloadUrl, '_blank');
      } else {
        showNotification({
          title: 'Error',
          message: 'No se pudo obtener la URL del archivo',
          color: 'red',
        });
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo obtener el archivo',
        color: 'red',
      });
    }
  };

  // Manejar generación de reporte de alertas
  const handleGenerarReporte = async (empresa: EmpresaGenerada) => {
    if (!empresa.companyUserId) return;

    setLoadingReport(true);
    setReportEmpresaNombre(empresa.nombre);
    setReportModalOpened(true);

    try {
      const response = await BasicPetition({
        endpoint: `/audits/companies/${empresa.companyUserId}/deadlines`,
        method: 'GET',
      });

      setAlertReport(response);
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo generar el reporte de alertas',
        color: 'red',
      });
      setReportModalOpened(false);
    } finally {
      setLoadingReport(false);
    }
  };

  // Formatear nombre del período para el reporte
  const formatPeriodNameReport = (period: AlertPeriod): string => {
    if (period.periodicity === 'yearly') {
      return `Año ${period.periodYear}`;
    }
    const monthName = period.periodMonth ? MONTH_NAMES[period.periodMonth - 1] : '';
    return `${monthName} ${period.periodYear}`;
  };

  // Descargar reporte como PDF
  const handleDescargarReportePDF = () => {
    if (!alertReport) return;

    // Crear contenido HTML para el PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reporte de Alertas - ${reportEmpresaNombre}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #a1a23b; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 30px; }
          .info { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #a1a23b; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .badge-red { background: #ff6b6b; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
          .badge-yellow { background: #ffd43b; color: #333; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
          .empty { text-align: center; color: #888; padding: 20px; }
          .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Reporte de Alertas</h1>
        <h2>${reportEmpresaNombre}</h2>
        
        <div class="info">
          <p><strong>Generado:</strong> ${new Date(alertReport.generatedAt).toLocaleString('es-MX')}</p>
          <p><strong>Días de gracia:</strong> Mensual: ${alertReport.graceDays.monthly} días, Anual: ${alertReport.graceDays.yearly} días</p>
        </div>

        <h2>❌ Períodos Vencidos (${alertReport.missing.length})</h2>
        ${alertReport.missing.length === 0 ? 
          '<p class="empty">✅ No hay períodos vencidos</p>' :
          `<table>
            <thead>
              <tr>
                <th>Punto</th>
                <th>Subpunto</th>
                <th>Período</th>
                <th>Fecha límite</th>
                <th>Días vencido</th>
              </tr>
            </thead>
            <tbody>
              ${alertReport.missing.map(item => `
                <tr>
                  <td>${item.templatePointName}</td>
                  <td>${item.templateSubpointName}</td>
                  <td>${formatPeriodNameReport(item)}</td>
                  <td>${formatFecha(item.dueAt)}</td>
                  <td><span class="badge-red">${item.daysOverdue} días</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }

        <h2>⚠️ Próximos a Vencer (${alertReport.expiring.length})</h2>
        ${alertReport.expiring.length === 0 ? 
          '<p class="empty">✅ No hay períodos próximos a vencer</p>' :
          `<table>
            <thead>
              <tr>
                <th>Punto</th>
                <th>Subpunto</th>
                <th>Período</th>
                <th>Fecha límite</th>
                <th>Días restantes</th>
              </tr>
            </thead>
            <tbody>
              ${alertReport.expiring.map(item => `
                <tr>
                  <td>${item.templatePointName}</td>
                  <td>${item.templateSubpointName}</td>
                  <td>${formatPeriodNameReport(item)}</td>
                  <td>${formatFecha(item.dueAt)}</td>
                  <td><span class="badge-yellow">${item.daysUntilDue} días</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }

        <div class="footer">
          <p>Sistema de Gestión Integral - Reporte generado</p>
        </div>
      </body>
      </html>
    `;

    // Abrir ventana de impresión para guardar como PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="lg">
        {isEmpresa ? 'SGI Generado - Mi empresa' : 'SGI Generado - Control'}
      </Title>

      <Text size="sm" c="dimmed" mb="xl">
        Sistema de gestión por periodos.
      </Text>

      {/* BUSCADOR DE EMPRESAS */}
      {!isEmpresa && (
        <TextInput
          placeholder="Buscar empresa..."
          leftSection={<FaSearch size={14} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          mb="lg"
          size="md"
        />
      )}

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
            <Accordion 
              value={expandedEmpresa === empresa.id ? empresa.id : null}
              onChange={(value) => handleAccordionChange(value === empresa.id ? empresa.id : null)}
            >
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
                    <Group gap="xs">
                      {(auth.userType === 'Administrador') && (
                        <Button
                          size="xs"
                          variant="light"
                          color="blue"
                          leftSection={<FaDownload size={12} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDescargarEmpresaZip(empresa);
                          }}
                          loading={downloadingZipId !== null && downloadingZipId === empresa.companyUserId}
                          disabled={downloadingZipId !== null && downloadingZipId !== empresa.companyUserId}
                        >
                          Descargar ZIP
                        </Button>
                      )}
                      {auth.userType === 'Administrador' && (
                        <Tooltip label="Ver reporte de alertas">
                          <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<FaEye size={12} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerarReporte(empresa);
                            }}
                          >
                            Alertas
                          </Button>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>
                </Accordion.Control>

                <Accordion.Panel>
                  {/* LOADER mientras se cargan los períodos */}
                  {empresa.loadingPeriods && (
                    <Center py="xl">
                      <Stack align="center" gap="xs">
                        <Loader size="md" />
                        <Text size="sm" c="dimmed">Cargando períodos...</Text>
                      </Stack>
                    </Center>
                  )}

                  {/* Mensaje si no hay puntos */}
                  {!empresa.loadingPeriods && empresa.periodsLoaded && empresa.puntos.length === 0 && (
                    <Paper p="md" withBorder>
                      <Text c="dimmed" ta="center">
                        No hay puntos de auditoría  para esta empresa
                      </Text>
                    </Paper>
                  )}

                  <Stack gap="sm">
                    {empresa.puntos.map((punto) => (
                      <Accordion key={punto.id} variant="separated">
                        <Accordion.Item value={punto.id}>
                          <Accordion.Control
                            style={{
                              backgroundColor: '#e8eaa6',
                              borderRadius: '8px',
                            }}
                          >
                            <Group gap="xs">
                              <Text fw={600} size="lg" c="#4a4a4a">
                                📁 {punto.nombre}
                              </Text>
                              <Badge color="teal" size="sm" variant="light">
                                {punto.subpuntos.length} {punto.subpuntos.length === 1 ? 'subpunto' : 'subpuntos'}
                              </Badge>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            {/* Mensaje si no hay subpuntos */}
                            {punto.subpuntos.length === 0 && (
                              <Text size="sm" c="dimmed" ta="center" py="md">
                                No hay subpuntos 
                              </Text>
                            )}

                            {/* LISTA DE SUBPUNTOS */}
                            <Accordion variant="contained" mt="sm">
                              {punto.subpuntos.map((subpunto) => (
                                <Accordion.Item key={subpunto.id} value={subpunto.id}>
                                  <Accordion.Control
                                    style={{
                                      backgroundColor: '#f5f7d0',
                                    }}
                                  >
                                    <Group justify="space-between" style={{ flex: 1 }}>
                                      <Group gap="xs">
                                        <Text fw={600} size="md">
                                          📄 {subpunto.nombre}
                                        </Text>
                                        <Badge color="blue" size="sm">
                                          {subpunto.periodicidad}
                                        </Badge>
                                        <Badge 
                                          color={subpunto.periodos.some(p => p.estado === 'vencido') ? 'red' : 
                                                 subpunto.periodos.some(p => p.estado === 'pendiente') ? 'yellow' : 'green'} 
                                          size="sm" 
                                          variant="light"
                                        >
                                          {subpunto.periodos.length} {subpunto.periodos.length === 1 ? 'período' : 'períodos'}
                                        </Badge>
                                      </Group>
                                    </Group>
                                  </Accordion.Control>
                                  <Accordion.Panel>
                                    {/* Mensaje si no hay períodos */}
                                    {subpunto.periodos.length === 0 && (
                                      <Text size="sm" c="dimmed" ta="center" py="sm">
                                        No hay períodos de auditoría configurados
                                      </Text>
                                    )}

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
                                              opacity: periodo.disabled ? 0.6 : 1,
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

                                                {/* Indicador de tiempo (a tiempo o tarde) */}
                                                {periodo.estado === 'cargado' && periodo.isOnTime !== null && (
                                                  <Badge 
                                                    size="xs" 
                                                    color={periodo.isOnTime ? 'green' : 'orange'}
                                                    variant="light"
                                                  >
                                                    {periodo.isOnTime ? '✓ A tiempo' : '⚠ Con retraso'}
                                                  </Badge>
                                                )}
                                              </Stack>

                                              {/* ACCIONES */}
                                              <Box>
                                                {/* Solo Empresa y Administrador pueden subir archivos en períodos pendientes */}
                                                {periodo.estado === 'pendiente' && (auth.userType === 'Empresa' || auth.userType === 'Administrador') && (
                                                  <FileInput
                                                    placeholder="Subir"
                                                    size="xs"
                                                    accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                                                    onChange={(file) => handleCargarArchivoPeriodo(file, periodo, empresa.companyUserId!)}
                                                    disabled={uploadingFile}
                                                    leftSection={<FaFileUpload size={12} />}
                                                    style={{ width: 140 }}
                                                  />
                                                )}

                                                {/* Auditor solo puede ver en períodos pendientes */}
                                                {periodo.estado === 'pendiente' && auth.userType === 'Auditor' && (
                                                  <Badge color="yellow" size="sm" variant="outline">
                                                    Pendiente
                                                  </Badge>
                                                )}

                                                {periodo.estado === 'cargado' && (
                                                  <Group gap="xs">
                                                    <Button
                                                      size="xs"
                                                      variant="light"
                                                      color="gray"
                                                      onClick={() => handleVerArchivo(periodo)}
                                                    >
                                                      Ver archivo
                                                    </Button>
                                                    {auth.userType === 'Administrador' && (
                                                      <Tooltip label="Eliminar archivo para permitir nueva carga">
                                                        <Button
                                                          size="xs"
                                                          variant="light"
                                                          color="red"
                                                          onClick={() => handleEliminarArchivo(periodo, empresa.companyUserId!)}
                                                          leftSection={<FaTrash size={10} />}
                                                        >
                                                          Eliminar
                                                        </Button>
                                                      </Tooltip>
                                                    )}
                                                  </Group>
                                                )}

                                                {periodo.estado === 'vencido' && (
                                                  (auth.userType === 'Administrador' || auth.userType === 'Empresa') ? (
                                                    <FileInput
                                                      placeholder="Subir (*Retraso)"
                                                      size="xs"
                                                      accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                                                      onChange={(file) => handleCargarArchivoPeriodo(file, periodo, empresa.companyUserId!)}
                                                      disabled={uploadingFile}
                                                      leftSection={<FaFileUpload size={12} />}
                                                      style={{ width: 150 }}
                                                    />
                                                  ) : (
                                                    <Badge color="red" size="sm">
                                                      🔒 Vencido
                                                    </Badge>
                                                  )
                                                )}

                                                {periodo.estado === 'futuro' && (
                                                  <Tooltip label="Este período aún no está disponible para carga">
                                                    <Badge color="gray" size="sm" variant="outline">
                                                      🔒 Próximamente
                                                    </Badge>
                                                  </Tooltip>
                                                )}
                                              </Box>
                                            </Group>
                                          </Paper>
                                        );
                                      })}
                                    </Stack>
                                  </Accordion.Panel>
                                </Accordion.Item>
                              ))}
                            </Accordion>
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>
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

      {/* MODAL DE REPORTE DE ALERTAS */}
      <Modal
        opened={reportModalOpened}
        onClose={() => {
          setReportModalOpened(false);
          setAlertReport(null);
        }}
        title={`Reporte de Alertas - ${reportEmpresaNombre}`}
        size="xl"
        centered
      >
        {loadingReport ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <Loader size="lg" />
              <Text size="sm" c="dimmed">Generando reporte...</Text>
            </Stack>
          </Center>
        ) : alertReport ? (
          <Stack gap="md">
            {/* Información general */}
            <Paper p="sm" withBorder bg="gray.0">
              <Group justify="space-between">
                <Text size="sm">
                  <strong>Generado:</strong> {new Date(alertReport.generatedAt).toLocaleString('es-MX')}
                </Text>
                <Text size="sm">
                  <strong>Días de gracia:</strong> Mensual: {alertReport.graceDays.monthly}, Anual: {alertReport.graceDays.yearly}
                </Text>
              </Group>
            </Paper>

            {/* Períodos vencidos (missing) */}
            <Paper p="md" withBorder>
              <Group gap="xs" mb="sm">
                <Badge color="red" size="lg">❌ Períodos Vencidos</Badge>
                <Badge color="red" variant="outline">{alertReport.missing.length}</Badge>
              </Group>
              
              {alertReport.missing.length === 0 ? (
                <Text c="dimmed" ta="center" py="md">
                  ✅ No hay períodos vencidos
                </Text>
              ) : (
                <ScrollArea h={alertReport.missing.length > 5 ? 250 : 'auto'}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Punto</Table.Th>
                        <Table.Th>Subpunto</Table.Th>
                        <Table.Th>Período</Table.Th>
                        <Table.Th>Fecha límite</Table.Th>
                        <Table.Th>Días vencido</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {alertReport.missing.map((item, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>{item.templatePointName}</Table.Td>
                          <Table.Td>{item.templateSubpointName}</Table.Td>
                          <Table.Td>{formatPeriodNameReport(item)}</Table.Td>
                          <Table.Td>{formatFecha(item.dueAt)}</Table.Td>
                          <Table.Td>
                            <Badge color="red" size="sm">
                              {item.daysOverdue} días
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              )}
            </Paper>

            {/* Períodos por vencer (expiring) */}
            <Paper p="md" withBorder>
              <Group gap="xs" mb="sm">
                <Badge color="yellow" size="lg">⚠️ Próximos a Vencer</Badge>
                <Badge color="yellow" variant="outline">{alertReport.expiring.length}</Badge>
              </Group>
              
              {alertReport.expiring.length === 0 ? (
                <Text c="dimmed" ta="center" py="md">
                  ✅ No hay períodos próximos a vencer
                </Text>
              ) : (
                <ScrollArea h={alertReport.expiring.length > 5 ? 250 : 'auto'}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Punto</Table.Th>
                        <Table.Th>Subpunto</Table.Th>
                        <Table.Th>Período</Table.Th>
                        <Table.Th>Fecha límite</Table.Th>
                        <Table.Th>Días restantes</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {alertReport.expiring.map((item, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>{item.templatePointName}</Table.Td>
                          <Table.Td>{item.templateSubpointName}</Table.Td>
                          <Table.Td>{formatPeriodNameReport(item)}</Table.Td>
                          <Table.Td>{formatFecha(item.dueAt)}</Table.Td>
                          <Table.Td>
                            <Badge color="yellow" size="sm">
                              {item.daysUntilDue} días
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              )}
            </Paper>

            {/* Botones */}
            <Group justify="flex-end">
              <Button
                variant="light"
                color="red"
                leftSection={<FaFilePdf size={14} />}
                onClick={handleDescargarReportePDF}
              >
                Descargar PDF
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setReportModalOpened(false);
                  setAlertReport(null);
                }}
              >
                Cerrar
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </Container>
  );
}
