import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Title,
  Accordion,
  Button,
  Group,
  Stack,
  Modal,
  TextInput,
  Textarea,
  Paper,
  Text,
  ActionIcon,
  Input,
  Badge,
  Divider,
  Select,
  Switch,
  Tabs,
  Box,
  FileInput,
  Progress,
  Breadcrumbs,
  Anchor,
  Pagination,
  Loader,
  Center,
} from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaCheck, FaTimes, FaFileUpload, FaSearchPlus, FaSearchMinus, FaEye, FaSearch } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import { BasicPetition, createPoint, createSubpoint, updatePoint, updateSubpoint, deletePoint, sendMessage, getMessages, uploadAuditFile, replaceAuditFile, getLatestAuditFile, getAuditFileChanges } from '../core/petition';
import { UserRole, getRoleLabel } from '../core/constants';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { renderAsync } from 'docx-preview';

// 📋 INTERFACES
interface Cambio {
  id: string;
  version: number;
  descripcion: string;
  fecha: string;
  usuarioNombre: string;
  usuarioRol: string;
}

interface Mensaje {
  id: string;
  texto: string;
  fecha: string;
  hora: string;
  usuario: string;
  tipo: UserRole;
}

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

interface AuditPeriod {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
}

interface Subpunto {
  id: string;
  templateSubpointId?: string;
  nombre: string;
  periodicidad: string; // Diaria, Semanal, Mensual, etc.
  archivoUpload?: string; // Ruta del archivo
  archivoDownloadUrl?: string; // URL firmada para visualizar/descargar
  estado: boolean; // true = activo, false = inactivo
  archivoCargado: boolean; // true = tiene archivos, false = no tiene
  cambios: Cambio[]; // Historial de cambios
  mensajes: Mensaje[]; // Mensajes del chat
  auditPeriods?: AuditPeriod[]; // Períodos de auditoría
}

interface Punto {
  id: string;
  nombre: string;
  subpuntos: Subpunto[];
}

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


interface Empresa {
  id: string;
  empresaId?: string;
  nombre: string;
  subEmpresa?: string;
  puntos: Punto[];
  auditoresAsignados: string[]; // IDs de auditores asignados
  // Estadísticas de subpuntos desde el backend
  totalSubpoints?: number;
  subpointsWithFiles?: number;
}

interface Auditor {
  id: string;
  auditorUserId: number;
  nombre: string;
  correo: string;
  email: string;
  isActive: boolean;
  profile?: {
    nombre: string;
    paterno: string;
    materno: string;
  };
  assignedCompaniesCount?: number;
  isAssignedToCompany?: boolean;
}

interface FormPunto {
  nombre: string;
}

interface FormSubpunto {
  nombre: string;
  periodicidad: string;
  estado: boolean;
  periodoInicio: Date | null;
  periodoFin: Date | null;
  duracionAnios: string;
}

export function SGI() {
  const auth = useAuth();
  
  // Tab activo
  const [activeTab, setActiveTab] = useState<string>('configuracion');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPuntoQuery, setSearchPuntoQuery] = useState('');
  const [openedPunto, setOpenedPunto] = useState(false);
  const [openedSubpunto, setOpenedSubpunto] = useState(false);
  const [openedConfirm, setOpenedConfirm] = useState(false);
  const [openedViewer, setOpenedViewer] = useState(false);
  const [deleteAction, setDeleteAction] = useState<(() => void) | null>(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [editingPunto, setEditingPunto] = useState<{ empresaId: string; punto: Punto } | null>(null);
  const [editingSubpunto, setEditingSubpunto] = useState<{ empresaId: string; puntoId: string; subpunto: Subpunto } | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);
  const [selectedPunto, setSelectedPunto] = useState<string | null>(null);
  const [viewingSubpunto, setViewingSubpunto] = useState<Subpunto | null>(null);
  const [viewingContext, setViewingContext] = useState<{ empresa: string; punto: string; puntoId: string } | null>(null);
  const [openedAuditores, setOpenedAuditores] = useState(false);
  const [selectedEmpresaForAuditores, setSelectedEmpresaForAuditores] = useState<string | null>(null);
  const [searchAuditor, setSearchAuditor] = useState('');
  const [editingPeriodicidad, setEditingPeriodicidad] = useState(false);
  const [tempPeriodicidad, setTempPeriodicidad] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [openedCommentModal, setOpenedCommentModal] = useState(false);
  const [commentForUpdate, setCommentForUpdate] = useState('');
  const [pendingFileForUpdate, setPendingFileForUpdate] = useState<File | null>(null);
  
  // Estados para Excel
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [loadingExcel, setLoadingExcel] = useState(false);
  
  // Estados para Word
  const [wordLoaded, setWordLoaded] = useState(false);
  const [loadingWord, setLoadingWord] = useState(false);
  const wordContainerRef = useState<HTMLDivElement | null>(null)[0];
  
  // Estados para el visor PDF
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState(false);

  // Estados para el chat
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const currentUserRole = getRoleLabel(auth.userType);
  const canPostMessages = currentUserRole === UserRole.AUDITOR || currentUserRole === UserRole.EMPRESA;

  const extractMessagesArray = (response: any): any[] => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.messages)) return response.messages;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.items)) return response.items;
    return [];
  };

  const mapChatMessage = (msg: any): Mensaje => {
    const role = getRoleLabel(
      msg?.senderRole ||
      msg?.user?.role ||
      msg?.role ||
      msg?.tipo
    );
    const createdAt = msg?.createdAt || msg?.fecha || new Date().toISOString();
    const createdAtDate = new Date(createdAt);

    return {
      id: String(msg?.id || msg?.messageId || `msg-${Date.now()}-${Math.random()}`),
      texto: msg?.message || msg?.texto || '',
      fecha: !Number.isNaN(createdAtDate.getTime())
        ? createdAtDate.toLocaleDateString('es-ES')
        : '',
      hora: !Number.isNaN(createdAtDate.getTime())
        ? createdAtDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : '',
      usuario:
        msg?.senderName ||
        msg?.user?.fullname ||
        msg?.user?.name ||
        msg?.usuario ||
        (role === UserRole.EMPRESA ? 'Empresa' : role),
      tipo: role,
    };
  };

  const getTemplateSubpointId = (subpunto: Subpunto): number => {
    const rawId = subpunto.templateSubpointId || subpunto.id;
    const parsed = Number(rawId);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const getSubpointFileUrl = (subpunto: Subpunto): string => {
    if (subpunto.archivoDownloadUrl) return subpunto.archivoDownloadUrl;
    if (subpunto.archivoUpload) return `/${subpunto.archivoUpload}`;
    return '/sample.pdf';
  };

  const getFilenameFromDownloadUrl = (url: string): string => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const rawName = urlObj.pathname.split('/').pop() || '';
      return decodeURIComponent(rawName);
    } catch {
      const rawName = url.split('?')[0].split('/').pop() || '';
      try {
        return decodeURIComponent(rawName);
      } catch {
        return rawName;
      }
    }
  };

  // Función para detectar tipo de archivo
  const getFileType = (filename: string): 'pdf' | 'image' | 'doc' | 'excel' | 'unknown' => {
    if (!filename) return 'unknown';
    const normalized = filename.toLowerCase().split('?')[0].split('#')[0];
    const ext = normalized.split('/').pop()?.split('.').pop();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return 'image';
    if (['doc', 'docx'].includes(ext || '')) return 'doc';
    if (['xls', 'xlsx'].includes(ext || '')) return 'excel';
    return 'unknown';
  };

  // � Función para cargar archivo Excel
  const loadExcelFile = async (fileUrl: string) => {
    setLoadingExcel(true);
    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Obtener nombres de todas las hojas
      const sheetNames = workbook.SheetNames;
      setExcelSheets(sheetNames);
      
      // Cargar la primera hoja por defecto
      if (sheetNames.length > 0) {
        const firstSheet = workbook.Sheets[sheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        setExcelData(data as any[][]);
        setSelectedSheet(sheetNames[0]);
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo cargar el archivo Excel',
        color: 'red',
      });
    } finally {
      setLoadingExcel(false);
    }
  };

  // 📊 Función para cambiar de hoja en Excel
  const changeExcelSheet = async (sheetName: string, fileUrl: string) => {
    setLoadingExcel(true);
    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      setExcelData(data as any[][]);
      setSelectedSheet(sheetName);
    } catch (error) {
    } finally {
      setLoadingExcel(false);
    }
  };

  // 📄 Función para cargar archivo Word
  const loadWordFile = async (fileUrl: string, container: HTMLDivElement | null) => {
    if (!container) return;
    
    setLoadingWord(true);
    try {
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Limpiar contenedor
      container.innerHTML = '';
      
      // Renderizar documento
      await renderAsync(blob, container, undefined, {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });
      
      setWordLoaded(true);
      
      showNotification({
        title: 'Documento cargado',
        message: 'Visualización correcta del archivo Word',
        color: 'green',
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: `No se pudo cargar el archivo Word: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        color: 'red',
      });
    } finally {
      setLoadingWord(false);
    }
  };

  // 📄 Cargar último archivo del subpunto al abrir el visor
  useEffect(() => {
    let isCancelled = false;

    const loadLatestSubpointFile = async () => {
      if (!openedViewer || !viewingSubpunto?.id) return;

      const templateSubpointId = getTemplateSubpointId(viewingSubpunto);
      if (!templateSubpointId) return;

      try {
        const latestFile = await getLatestAuditFile(templateSubpointId);
        const latestDownloadUrl =
          latestFile?.downloadUrl ||
          latestFile?.file?.downloadUrl ||
          '';

        if (!latestDownloadUrl || isCancelled) return;

        const latestFileName =
          latestFile?.fileName ||
          latestFile?.filename ||
          latestFile?.originalName ||
          latestFile?.file?.name ||
          latestFile?.file?.fileName ||
          getFilenameFromDownloadUrl(latestDownloadUrl) ||
          viewingSubpunto.archivoUpload ||
          '';

        setViewingSubpunto((prev) =>
          prev
            ? {
                ...prev,
                archivoCargado: true,
                archivoUpload: latestFileName,
                archivoDownloadUrl: latestDownloadUrl,
              }
            : null
        );

        setEmpresas((prev) =>
          prev.map((empresa) => {
            if (empresa.nombre !== viewingContext?.empresa) return empresa;

            return {
              ...empresa,
              puntos: empresa.puntos.map((punto) => {
                if (punto.id !== viewingContext?.puntoId) return punto;

                return {
                  ...punto,
                  subpuntos: punto.subpuntos.map((sp) =>
                    sp.id === viewingSubpunto.id
                      ? {
                          ...sp,
                          archivoCargado: true,
                          archivoUpload: latestFileName,
                          archivoDownloadUrl: latestDownloadUrl,
                        }
                      : sp
                  ),
                };
              }),
            };
          })
        );
      } catch (error: any) {
        if (error?.status !== 404 && error?.statusCode !== 404) {
        }
      }
    };

    loadLatestSubpointFile();

    return () => {
      isCancelled = true;
    };
  }, [openedViewer, viewingSubpunto?.id]);

  // 🔄 useEffect para cargar archivos automáticamente
  useEffect(() => {
    if (openedViewer && viewingSubpunto?.archivoCargado) {
      const fileSource = viewingSubpunto.archivoUpload || viewingSubpunto.archivoDownloadUrl;
      if (!fileSource) return;

      const fileType = getFileType(fileSource);
      // Solo previsualizamos PDFs en el visor.
      if (fileType !== 'pdf') return;
    }
  }, [openedViewer, viewingSubpunto?.id, viewingSubpunto?.archivoCargado, viewingSubpunto?.archivoUpload, viewingSubpunto?.archivoDownloadUrl]);

  // 💬 useEffect para cargar mensajes del chat
  useEffect(() => {
    let intervalId: number | undefined;

    const loadChatMessages = async () => {
      if (!openedViewer || !viewingSubpunto?.id) return;

      try {
        const templateSubpointId = getTemplateSubpointId(viewingSubpunto);
        if (!templateSubpointId) return;

        const response = await getMessages(templateSubpointId);
        const messages = extractMessagesArray(response).map(mapChatMessage);

        setViewingSubpunto((prev) =>
          prev ? { ...prev, mensajes: messages } : null
        );
      } catch (error) {
      }
    };
    
    loadChatMessages();

    if (openedViewer && viewingSubpunto?.id) {
      intervalId = window.setInterval(loadChatMessages, 600000); // 10 minutos
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [openedViewer, viewingSubpunto?.id]);

  // 📋 useEffect para cargar cambios desde el backend
  useEffect(() => {
    const loadChanges = async () => {
      if (!openedViewer || !viewingSubpunto?.id) return;

      try {
        const templateSubpointId = getTemplateSubpointId(viewingSubpunto);
        if (!templateSubpointId) return;

        const response = await getAuditFileChanges(templateSubpointId);

        // Mapear respuesta del backend a la estructura de Cambio
        // El backend devuelve { events: [...] }
        const events = response?.events || [];
        const cambios = Array.isArray(events) ? events.map((event: any, index: number) => {
          const fecha = event.at ? new Date(event.at).toLocaleDateString('es-MX', { 
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }) : new Date().toLocaleDateString('es-MX');
          
          const fileName = event.file?.originalName || 'archivo';
          const status = event.status === 'uploaded' ? 'Carga inicial' : 'Actualización';
          
          return {
            id: String(event.submissionId || event.id || index + 1),
            version: index + 1, // La versión es el índice + 1
            descripcion: event.comment || `${status} - ${fileName}`,
            fecha,
            usuarioNombre: event.userFullName || event.user?.fullName || event.user?.name || getUserNameById(event.userId),
            usuarioRol: event.user?.role || status,
          };
        }) : [];


        setViewingSubpunto((prev) =>
          prev ? { ...prev, cambios } : null
        );
      } catch (error) {
      }
    };

    loadChanges();
  }, [openedViewer, viewingSubpunto?.id]);

  // Función para mapear periodicidad del backend a UI
  const mapPeriodicityToUI = (periodicity: string | undefined): string => {
    if (!periodicity) return 'Mensual';
    const map: { [key: string]: string } = {
      'monthly': 'Mensual',
      'yearly': 'Anual',
    };
    return map[periodicity.toLowerCase()] || 'Mensual';
  };

  // Función para mapear periodicidad de UI a backend
  const mapPeriodicityToAPI = (periodicidad: string): 'monthly' | 'yearly' => {
    const map: { [key: string]: 'monthly' | 'yearly' } = {
      'Mensual': 'monthly',
      'Anual': 'yearly',
    };
    return map[periodicidad] || 'monthly';
  };

  const [auditores, setAuditores] = useState<Auditor[]>([]);
  const [loadingAuditores, setLoadingAuditores] = useState(false);
  const [empresasConDatos, setEmpresasConDatos] = useState<Set<string>>(new Set());
  const [empresasCargando, setEmpresasCargando] = useState<Set<string>>(new Set());

  // 👤 Función para obtener nombre de usuario por ID
  const getUserNameById = (userId: number | string | undefined): string => {
    if (!userId) return 'Usuario desconocido';
    const id = String(userId);
    
    // Buscar en auditores
    const auditor = auditores.find(a => String(a.id) === id);
    if (auditor) return auditor.nombre;
    
    // Buscar en empresas
    const empresa = empresas.find(e => String(e.id) === id || String(e.empresaId) === id);
    if (empresa) return empresa.nombre;
    
    // Verificar si es el usuario actual
    if (auth?.userId && String(auth.userId) === id) {
      return 'Usuario actual';
    }
    
    return `Usuario ID: ${id}`;
  };

  // 🗂️ DATOS MOCK DE EMPRESAS
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const empresasCargadasRef = useRef<boolean>(false);

  // � CARGAR EMPRESAS DESDE API
  useEffect(() => {
    const loadEmpresas = async () => {
      if (empresasCargadasRef.current) return;
      empresasCargadasRef.current = true;
      
      try {
        
        // Si es Empresa, solo cargar datos de su propia empresa
        if (auth?.userType === 'Empresa' && auth?.userId) {
          
          // Crear una empresa con su ID
          const empresaData: Empresa = {
            id: String(auth.userId),
            empresaId: String(auth.userId),
            nombre: auth.fullName || 'Mi Empresa',
            subEmpresa: undefined,
            auditoresAsignados: [],
            puntos: [],
          };
          
          setEmpresas([empresaData]);
          
          // Cargar inmediatamente los puntos y auditores de su empresa
          await new Promise(r => setTimeout(r, 100));
          await Promise.all([
            handleLoadPuntos(auth.userId),
            handleLoadAuditores(auth.userId),
          ]);
        } else {
          // Para otros roles (Admin, Auditor), cargar todas las empresas
          const response = await BasicPetition({
            endpoint: '/templates/companies',
            method: 'GET',
            showNotifications: false,
          });
          
          
          if (response && Array.isArray(response)) {
            // Mapear respuesta de la API a la estructura Empresa
            const empresasFromAPI = response.map((company: any) => ({
              id: String(company.companyUserId),
              empresaId: company.companyUserId,
              nombre: company.profile?.nombreEmpresa || 'Sin nombre',
              subEmpresa: company.profile?.subEmpresa,
              auditoresAsignados: [],
              puntos: [],
            }));
            
            setEmpresas(empresasFromAPI);
          } else {
          }
        }
      } catch (error) {
        showNotification({
          title: 'Error al cargar empresas',
          message: error instanceof Error ? error.message : 'No se pudieron cargar las empresas',
          color: 'red',
          autoClose: false,
        });
      }
    };
    
    if (!empresasCargadasRef.current) {
      loadEmpresas();
    }
  }, [auth]);

  // �📝 FORMULARIO PARA PUNTO
  const formPunto = useForm<FormPunto>({
    initialValues: {
      nombre: '',
    },
    validate: {
      nombre: (value) => (!value ? 'El nombre es requerido' : null),
    },
  });

  // 📝 FORMULARIO PARA SUBPUNTO
  const formSubpunto = useForm<FormSubpunto>({
    initialValues: {
      nombre: '',
      periodicidad: 'Mensual',
      estado: true,
      periodoInicio: null,
      periodoFin: null,
      duracionAnios: '1',
    },
    validate: {
      nombre: (value) => (!value ? 'El nombre es requerido' : null),
      periodicidad: (value) => (!value ? 'La periodicidad es requerida' : null),
      periodoInicio: (value, values) => {
        // Solo validar si es Mensual
        if (values.periodicidad === 'Mensual' && !value) {
          return 'El periodo de inicio es requerido';
        }
        return null;
      },
      periodoFin: (value, values) => {
        // Solo validar si es Mensual
        if (values.periodicidad === 'Mensual') {
          if (!value) return 'El periodo de fin es requerido';
          if (values.periodoInicio && value < values.periodoInicio) {
            return 'El periodo de fin debe ser posterior al inicio';
          }
        }
        return null;
      },
      duracionAnios: (value, values) => {
        // Solo validar si es Anual
        if (values.periodicidad === 'Anual' && !value) {
          return 'La duración es requerida';
        }
        return null;
      },
    },
  });

  // 🔍 FILTRAR EMPRESAS
  const empresasFiltradas = empresas.filter((empresa) =>
    empresa.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 📄 PAGINACIÓN
  const totalPages = Math.ceil(empresasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const empresasPaginadas = empresasFiltradas.slice(startIndex, endIndex);

  // 🆕 ABRIR MODAL PARA NUEVO PUNTO
  const handleOpenNewPunto = (empresaId: string) => {
    setSelectedEmpresa(empresaId);
    setEditingPunto(null);
    formPunto.reset();
    setOpenedPunto(true);
  };

  // ✏️ ABRIR MODAL PARA EDITAR PUNTO
  const handleEditPunto = (empresaId: string, punto: Punto) => {
    setSelectedEmpresa(empresaId);
    setEditingPunto({ empresaId, punto });
    formPunto.setValues({ nombre: punto.nombre });
    setOpenedPunto(true);
  };

  const handleSubmitPunto = async (values: FormPunto) => {
    if (!selectedEmpresa) return;

    if (editingPunto) {
      // Editar punto existente con PATCH
      try {
        await updatePoint(parseInt(editingPunto.empresaId), parseInt(editingPunto.punto.id), values.nombre);

        setEmpresas((prev) =>
          prev.map((empresa) =>
            empresa.id === selectedEmpresa
              ? {
                  ...empresa,
                  puntos: empresa.puntos.map((p) =>
                    p.id === editingPunto.punto.id ? { ...p, nombre: values.nombre } : p
                  ),
                }
              : empresa
          )
        );
        showNotification({
          title: 'Punto actualizado',
          message: 'El punto se actualizó correctamente',
          color: 'green',
        });
      } catch (error) {        showNotification({
          title: 'Error',
          message: 'No se pudo actualizar el punto',
          color: 'red',
        });
      }
    } else {
      // Crear nuevo punto con POST al API
      try {
        const response = await createPoint(parseInt(selectedEmpresa), values.nombre);


        // Recargar puntos después de crear
        await handleLoadPuntos(selectedEmpresa);

        showNotification({
          title: 'Punto creado',
          message: 'El punto se creó correctamente',
          color: 'green',
        });
      } catch (error) {
        showNotification({
          title: 'Error',
          message: 'No se pudo crear el punto',
          color: 'red',
        });
      }
    }
    setOpenedPunto(false);
    formPunto.reset();
  };

  // 🗑️ ELIMINAR PUNTO
  const handleDeletePunto = (empresaId: string, companyUserId: string, puntoId: string) => {
    setDeleteMessage('¿Eliminar este punto y todos sus subpuntos?');
    setDeleteAction(() => () => {
      void deletePoint(parseInt(companyUserId), parseInt(puntoId))
        .then(() => {
          setEmpresas((prev) =>
            prev.map((empresa) =>
              empresa.id === empresaId
                ? {
                    ...empresa,
                    puntos: empresa.puntos.filter((p) => p.id !== puntoId),
                  }
                : empresa
            )
          );

          showNotification({
            title: 'Punto eliminado',
            message: 'El punto se eliminó correctamente',
            color: 'red',
          });
        })
        .catch((error) => {
          showNotification({
            title: 'Error',
            message: 'No se pudo eliminar el punto',
            color: 'red',
          });
        })
        .finally(() => {
          setOpenedConfirm(false);
        });
    });
    setOpenedConfirm(true);
  };

  // 🆕 ABRIR MODAL PARA NUEVO SUBPUNTO
  const handleOpenNewSubpunto = (empresaId: string, puntoId: string) => {
    setSelectedEmpresa(empresaId);
    setSelectedPunto(puntoId);
    setEditingSubpunto(null);
    formSubpunto.reset();
    setOpenedSubpunto(true);
  };

  // ✏️ ABRIR MODAL PARA EDITAR SUBPUNTO
  const handleEditSubpunto = (empresaId: string, puntoId: string, subpunto: Subpunto) => {
    setSelectedEmpresa(empresaId);
    setSelectedPunto(puntoId);
    setEditingSubpunto({ empresaId, puntoId, subpunto });
    
    // Prellenar períodos de auditoría si existen
    let periodoInicio: Date | null = null;
    let periodoFin: Date | null = null;
    let duracionAnios = '1';
    
    if (subpunto.auditPeriods && subpunto.auditPeriods.length > 0) {
      const firstPeriod = subpunto.auditPeriods[0];
      
      if (subpunto.periodicidad === 'Mensual') {
        // Para mensual, usar startMonth/startYear y endMonth/endYear
        // Usar Date.UTC para crear fechas en UTC y evitar problemas de zona horaria
        periodoInicio = new Date(Date.UTC(firstPeriod.startYear, firstPeriod.startMonth - 1, 1));
        periodoFin = new Date(Date.UTC(firstPeriod.endYear, firstPeriod.endMonth - 1, 1));
      } else if (subpunto.periodicidad === 'Anual') {
        // Para anual, calcular la duración en años
        duracionAnios = String((firstPeriod.endYear - firstPeriod.startYear) + 1);
      }
    }
    
    formSubpunto.setValues({ 
      nombre: subpunto.nombre,
      periodicidad: subpunto.periodicidad,
      estado: subpunto.estado,
      periodoInicio,
      periodoFin,
      duracionAnios,
    });
    setOpenedSubpunto(true);
  };

  // 💾 GUARDAR SUBPUNTO
  const handleSubmitSubpunto = async (values: FormSubpunto) => {
    if (!selectedEmpresa || !selectedPunto) return;

    // Mapear periodicidad a valores de API
    const periodicity = mapPeriodicityToAPI(values.periodicidad);

    // Construir auditPeriods dependiendo de la periodicidad
    let auditPeriods: { startMonth: number; startYear: number; endMonth: number; endYear: number }[] = [];
    
    if (values.periodicidad === 'Mensual' && values.periodoInicio && values.periodoFin) {
      // Convertir a Date si no lo son
      const inicio = values.periodoInicio instanceof Date ? values.periodoInicio : new Date(values.periodoInicio);
      const fin = values.periodoFin instanceof Date ? values.periodoFin : new Date(values.periodoFin);
      
      // Usar getUTCMonth para evitar problemas de zona horaria
      // MonthPickerInput puede devolver fechas en UTC que al convertir a local cambian de mes
      auditPeriods = [{
        startMonth: inicio.getUTCMonth() + 1,
        startYear: inicio.getUTCFullYear(),
        endMonth: fin.getUTCMonth() + 1,
        endYear: fin.getUTCFullYear(),
      }];
    } else if (values.periodicidad === 'Anual') {
      const currentYear = new Date().getFullYear();
      const duracion = parseInt(values.duracionAnios) || 1;
      auditPeriods = [{
        startMonth: 1,
        startYear: currentYear,
        endMonth: 12,
        endYear: currentYear + duracion - 1,
      }];
    }

    if (editingSubpunto) {
      // Editar subpunto existente con PATCH
      try {
        await updateSubpoint(
          parseInt(editingSubpunto.puntoId),
          parseInt(editingSubpunto.subpunto.id),
          values.nombre,
          periodicity,
          auditPeriods
        );

        setEmpresas((prev) =>
          prev.map((empresa) =>
            empresa.id === selectedEmpresa
              ? {
                  ...empresa,
                  puntos: empresa.puntos.map((punto) =>
                    punto.id === selectedPunto
                      ? {
                          ...punto,
                          subpuntos: punto.subpuntos.map((sp) =>
                            sp.id === editingSubpunto.subpunto.id
                              ? { 
                                  ...sp, 
                                  nombre: values.nombre,
                                  periodicidad: values.periodicidad,
                                  estado: values.estado,
                                }
                              : sp
                          ),
                        }
                      : punto
                  ),
                }
              : empresa
          )
        );
        showNotification({
          title: 'Subpunto actualizado',
          message: 'El subpunto se actualizó correctamente',
          color: 'green',
        });
      } catch (error) {
        showNotification({
          title: 'Error',
          message: 'No se pudo actualizar el subpunto',
          color: 'red',
        });
      }
    } else {
      // Crear nuevo subpunto con POST al API
      try {

        const response = await createSubpoint(
          parseInt(selectedPunto),
          values.nombre,
          periodicity,
          auditPeriods
        );

        // Actualizar estado local
        setEmpresas((prev) =>
          prev.map((empresa) =>
            empresa.id === selectedEmpresa
              ? {
                  ...empresa,
                  puntos: empresa.puntos.map((punto) =>
                    punto.id === selectedPunto
                      ? {
                          ...punto,
                          subpuntos: [
                            ...punto.subpuntos,
                            {
                              id: String(response.subpointId || `${punto.id}-${punto.subpuntos.length + 1}`),
                              templateSubpointId: String(
                                response.templateSubpointId ||
                                response.template_subpoint_id ||
                                response.subpointId ||
                                `${punto.id}-${punto.subpuntos.length + 1}`
                              ),
                              nombre: values.nombre,
                              periodicidad: values.periodicidad,
                              estado: values.estado,
                              archivoCargado: false,
                              cambios: [],
                              mensajes: [],
                            },
                          ],
                        }
                      : punto
                  ),
                }
              : empresa
          )
        );

        showNotification({
          title: 'Subpunto creado',
          message: 'El subpunto se creó correctamente',
          color: 'green',
        });
      } catch (error) {
        showNotification({
          title: 'Error',
          message: 'No se pudo crear el subpunto',
          color: 'red',
        });
      }
    }
    setOpenedSubpunto(false);
    formSubpunto.reset();
  };

  // 🗑️ ELIMINAR SUBPUNTO
  const handleDeleteSubpunto = (empresaId: string, puntoId: string, subpuntoId: string) => {
    setDeleteMessage('¿Eliminar este subpunto?');
    setDeleteAction(() => () => {
      setEmpresas((prev) =>
        prev.map((empresa) =>
          empresa.id === empresaId
            ? {
                ...empresa,
                puntos: empresa.puntos.map((punto) =>
                  punto.id === puntoId
                    ? {
                        ...punto,
                        subpuntos: punto.subpuntos.filter((sp) => sp.id !== subpuntoId),
                      }
                    : punto
                ),
              }
            : empresa
        )
      );
      showNotification({
        title: 'Subpunto eliminado',
        message: 'El subpunto se eliminó correctamente',
        color: 'red',
      });
      setOpenedConfirm(false);
    });
    setOpenedConfirm(true);
  };

  // 👥 GESTIÓN DE AUDITORES - ABRIR MODAL
  const handleOpenAuditores = async (empresaId: string) => {
    setSelectedEmpresaForAuditores(empresaId);
    setOpenedAuditores(true);
    
    // Cargar lista completa de auditores para el modal
    setLoadingAuditores(true);
    try {
      const response = await BasicPetition({
        endpoint: `/templates/auditors?companyUserId=${empresaId}`,
        method: 'GET',
        showNotifications: false,
      });


      if (response && Array.isArray(response)) {
        const auditoresFromAPI = response.map((auditor: any) => ({
          id: String(auditor.auditorUserId),
          auditorUserId: auditor.auditorUserId,
          nombre: `${auditor.profile?.nombre || ''} ${auditor.profile?.paterno || ''} ${auditor.profile?.materno || ''}`.trim(),
          correo: auditor.email,
          email: auditor.email,
          isActive: auditor.isActive,
          profile: auditor.profile,
          assignedCompaniesCount: auditor.assignedCompaniesCount,
          isAssignedToCompany: auditor.isAssignedToCompany,
        }));
        setAuditores(auditoresFromAPI);
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudieron cargar los auditores',
        color: 'red',
      });
    } finally {
      setLoadingAuditores(false);
    }
  };

  // � CARGAR AUDITORES PARA UNA EMPRESA (sin abrir modal)
  const handleLoadAuditores = async (empresaId: string) => {
    try {
      const response = await BasicPetition({
        endpoint: `/templates/auditors?companyUserId=${empresaId}`,
        method: 'GET',
        showNotifications: false,
      });

      if (response && Array.isArray(response)) {
        // Mapear datos completos de los auditores
        const auditoresCompletos = response.map((auditor: any) => ({
          id: String(auditor.auditorUserId),
          auditorUserId: auditor.auditorUserId,
          nombre: `${auditor.profile?.nombre || ''} ${auditor.profile?.paterno || ''} ${auditor.profile?.materno || ''}`.trim(),
          correo: auditor.email,
          email: auditor.email,
          isActive: auditor.isActive,
          profile: auditor.profile,
          assignedCompaniesCount: auditor.assignedCompaniesCount,
          isAssignedToCompany: auditor.isAssignedToCompany,
        }));

        // Guardar datos completos en el estado global de auditores, evitando duplicados
        setAuditores((prev) => {
          const auditoresMap = new Map(prev.map(a => [a.id, a]));
          auditoresCompletos.forEach(auditor => {
            auditoresMap.set(auditor.id, auditor);
          });
          return Array.from(auditoresMap.values());
        });

        // Filtrar solo los IDs de los auditores asignados
        const auditoresAsignados = response
          .filter((auditor: any) => auditor.isAssignedToCompany)
          .map((auditor: any) => String(auditor.auditorUserId));
        

        // Actualizar el estado de empresas con los auditores asignados
        setEmpresas((prev) =>
          prev.map((emp) =>
            emp.empresaId === empresaId || emp.id === empresaId
              ? { ...emp, auditoresAsignados }
              : emp
          )
        );
      }
    } catch (error) {
    }
  };

  // � CARGAR DATOS DE EMPRESA (puntos y auditores al expandir)
  const handleLoadEmpresaData = async (empresaId: string) => {
    // Si ya tiene datos cargados, no volver a cargar
    if (empresasConDatos.has(empresaId)) {
      return;
    }


    // Marcar empresa como cargando
    setEmpresasCargando((prev) => new Set([...prev, empresaId]));

    try {
      // Cargar en paralelo puntos, auditores y estadísticas de subpuntos
      await Promise.all([
        handleLoadPuntos(empresaId),
        handleLoadAuditores(empresaId),
        handleLoadSubpointStats(empresaId)
      ]);

      // Marcar empresa como cargada
      setEmpresasConDatos((prev) => new Set([...prev, empresaId]));
    } catch (error) {
    } finally {
      // Quitar empresa de la lista de cargando
      setEmpresasCargando((prev) => {
        const newSet = new Set(prev);
        newSet.delete(empresaId);
        return newSet;
      });
    }
  };

  // 📊 CARGAR ESTADÍSTICAS DE SUBPUNTOS
  const handleLoadSubpointStats = async (empresaId: string) => {
    try {
      const response = await BasicPetition({
        endpoint: `/templates/companies/${empresaId}/subpoints/stats`,
        method: 'GET',
        showNotifications: false,
      });


      if (response && typeof response.totalSubpoints === 'number') {
        setEmpresas((prev) =>
          prev.map((emp) =>
            emp.id === empresaId || emp.empresaId === empresaId
              ? {
                  ...emp,
                  totalSubpoints: response.totalSubpoints,
                  subpointsWithFiles: response.subpointsWithFiles || 0,
                }
              : emp
          )
        );
      }
    } catch (error) {
    }
  };


  // 🏗️ CARGAR SUBPUNTOS DE UN PUNTO
  const handleLoadSubpoints = async (pointId: string) => {
    try {
      const response = await BasicPetition({
        endpoint: `/templates/points/${pointId}/subpoints`,
        method: 'GET',
        showNotifications: false,
      });


      return Array.isArray(response) ? response : [];
    } catch (error) {
      return [];
    }
  };
  // �📋 CARGAR PUNTOS DE UNA EMPRESA
  const handleLoadPuntos = async (empresaId: string) => {
    try {
      const response = await BasicPetition({
        endpoint: `/templates/companies/${empresaId}/points`,
        method: 'GET',
        showNotifications: false,
      });


      if (response && Array.isArray(response)) {
        // Cargar subpuntos para cada punto en paralelo
        const puntosWithSubpoints = await Promise.all(
          response.map(async (punto: any) => {
            const pointId = String(punto.pointId || punto.id);
            const subpuntosFromAPI = await handleLoadSubpoints(pointId);
            
            return {
              id: pointId,
              nombre: punto.nombre || punto.name,
              subpuntos: Array.isArray(subpuntosFromAPI)
                ? subpuntosFromAPI.map((sub: any) => ({
                    id: String(sub.subpointId || sub.id),
                    templateSubpointId: String(sub.templateSubpointId || sub.template_subpoint_id || sub.subpointId || sub.id),
                    nombre: sub.nombre || sub.name,
                    periodicidad: mapPeriodicityToUI(sub.periodicidad || sub.periodicity),
                    archivoUpload: sub.archivoUpload || '',
                  archivoDownloadUrl: sub.downloadUrl || sub.archivoDownloadUrl || sub.file?.downloadUrl || '',
                    estado: sub.estado !== false,
                    archivoCargado: sub.hasFiles === true || !!(sub.archivoUpload || sub.downloadUrl || sub.archivoDownloadUrl || sub.file?.downloadUrl),
                    cambios: [],
                    mensajes: [],
                    auditPeriods: sub.auditPeriods || [],
                  }))
                : [],
            };
          })
        );


        // Actualizar empresa con los puntos y subpuntos cargados
        setEmpresas((prev) =>
          prev.map((emp) =>
            emp.id === empresaId || emp.empresaId === empresaId
              ? { ...emp, puntos: puntosWithSubpoints }
              : emp
          )
        );
      }
    } catch (error) {
    }
  };

  const handleToggleAuditor = async (auditorId: string) => {
    if (!selectedEmpresaForAuditores) return;

    // Obtener empresa actual y verificar si el auditor ya está asignado
    const empresaActual = empresas.find(e => e.id === selectedEmpresaForAuditores);
    const isCurrentlyAssigned = empresaActual?.auditoresAsignados.includes(auditorId) || false;

    try {
      if (isCurrentlyAssigned) {
        // DESASIGNAR - usar PATCH /deactivate
    

        await BasicPetition({
          endpoint: '/templates/auditor-company-assignments/deactivate',
          method: 'PATCH',
          data: {
            auditorUserId: Number(auditorId),
            companyUserId: Number(selectedEmpresaForAuditores)
          },
          showNotifications: false,
        });

        showNotification({
          title: 'Auditor desasignado',
          message: 'El auditor ha sido removido de esta empresa',
          color: 'orange',
        });
      } else {
        // ASIGNAR - usar POST
  

        await BasicPetition({
          endpoint: '/templates/auditor-company-assignments',
          method: 'POST',
          data: {
            auditorUserId: Number(auditorId),
            companyUserId: Number(selectedEmpresaForAuditores)
          },
          showNotifications: false,
        });

        showNotification({
          title: 'Auditor asignado',
          message: 'El auditor se asignó correctamente',
          color: 'green',
        });
      }

      // Actualizar estado local - toggle la asignación
      setEmpresas((prev) =>
        prev.map((empresa) => {
          if (empresa.id === selectedEmpresaForAuditores) {
            return {
              ...empresa,
              auditoresAsignados: isCurrentlyAssigned
                ? empresa.auditoresAsignados.filter((id) => id !== auditorId)
                : [...empresa.auditoresAsignados, auditorId],
            };
          }
          return empresa;
        })
      );

    } catch (error) {
      showNotification({
        title: 'Error',
        message: isCurrentlyAssigned ? 'No se pudo desasignar el auditor' : 'No se pudo asignar el auditor',
        color: 'red',
      });
    }
  };

  // � DESACTIVAR AUDITOR DE UNA EMPRESA
  const handleDesactivarAuditor = async (auditorUserId: number, empresaId: string) => {
    try {
      await BasicPetition({
        endpoint: '/templates/auditor-company-assignments/deactivate',
        method: 'PATCH',
        data: {
          auditorUserId,
          companyUserId: Number(empresaId)
        },
        showNotifications: false,
      });
      // Actualizar estado local
      setEmpresas((prev) =>
        prev.map((empresa) => {
          if (empresa.id === empresaId) {
            return {
              ...empresa,
              auditoresAsignados: empresa.auditoresAsignados.filter((id) => id !== String(auditorUserId)),
            };
          }
          return empresa;
        })
      );

      showNotification({
        title: 'Auditor desactivado',
        message: 'El auditor ha sido removido de esta empresa',
        color: 'orange',
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo desactivar el auditor',
        color: 'red',
      });
    }
  };

  // �📅 ACTUALIZAR PERIODICIDAD
  const handleUpdatePeriodicidad = async () => {
    if (!viewingSubpunto || !viewingContext) return;

    try {
      // Mapear periodicidad a valores de API
      const periodicity = mapPeriodicityToAPI(tempPeriodicidad);
      

      await updateSubpoint(parseInt(viewingContext.puntoId), parseInt(viewingSubpunto.id), viewingSubpunto.nombre, periodicity);

      setEmpresas((prev) =>
        prev.map((empresa) => {
          if (empresa.nombre === viewingContext.empresa) {
            return {
              ...empresa,
              puntos: empresa.puntos.map((punto) => {
                if (punto.id === viewingContext.puntoId) {
                  return {
                    ...punto,
                    subpuntos: punto.subpuntos.map((sp) =>
                      sp.id === viewingSubpunto.id
                        ? { ...sp, periodicidad: tempPeriodicidad }
                        : sp
                    ),
                  };
                }
                return punto;
              }),
            };
          }
          return empresa;
        })
      );

      setViewingSubpunto((prev) => prev ? { ...prev, periodicidad: tempPeriodicidad } : null);
      setEditingPeriodicidad(false);
      showNotification({
        title: 'Periodicidad actualizada',
        message: 'La periodicidad se actualizó correctamente',
        color: 'green',
      });
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo actualizar la periodicidad',
        color: 'red',
      });
    }
  };

  // � FUNCIÓN PARA CARGAR CAMBIOS DESDE BACKEND
  const loadChangesFromBackend = async () => {
    if (!viewingSubpunto?.id) return;

    try {
      const templateSubpointId = getTemplateSubpointId(viewingSubpunto);
      if (!templateSubpointId) return;

      const response = await getAuditFileChanges(templateSubpointId);
      

      // Mapear respuesta del backend a la estructura de Cambio
      // El backend devuelve { events: [...] }
      const events = response?.events || [];
      const cambios = Array.isArray(events) ? events.map((event: any, index: number) => {
        const fecha = event.at ? new Date(event.at).toLocaleDateString('es-MX', { 
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) : new Date().toLocaleDateString('es-MX');
        
        const fileName = event.file?.originalName || 'archivo';
        const status = event.status === 'uploaded' ? 'Carga inicial' : 'Actualización';
        
        return {
          id: String(event.submissionId || event.id || index + 1),
          version: index + 1, // La versión es el índice + 1
          descripcion: event.comment || `${status} - ${fileName}`,
          fecha,
          usuarioNombre: event.userFullName || event.user?.fullName || event.user?.name || getUserNameById(event.userId),
          usuarioRol: event.user?.role || status,
        };
      }) : [];


      setViewingSubpunto((prev) =>
        prev ? { ...prev, cambios } : null
      );
    } catch (error) {
    }
  };

  // �📎 MANEJAR SUBIDA DE ARCHIVO
  const handleFileUpload = async (file: File | null) => {
    if (!file || !viewingSubpunto || !viewingContext) return;

    const templateSubpointId = getTemplateSubpointId(viewingSubpunto);
    if (!templateSubpointId) {
      showNotification({
        title: 'Error',
        message: 'No se pudo identificar el templateSubpointId para subir el archivo',
        color: 'red',
      });
      return;
    }

    // Detectar si es actualización (ya hay archivo cargado)
    const isUpdate = viewingSubpunto.archivoCargado;

    if (isUpdate) {
      // Abrir modal para solicitar comentario
      setPendingFileForUpdate(file);
      setCommentForUpdate('');
      setOpenedCommentModal(true);
      return;
    }

    // Es una carga inicial (no hay archivo previo)
    await handleUploadNewFile(file);
  };

  // 📤 SUBIR ARCHIVO NUEVO (sin comentario)
  const handleUploadNewFile = async (file: File) => {
    if (!file || !viewingSubpunto || !viewingContext) return;

    const templateSubpointId = getTemplateSubpointId(viewingSubpunto);
    if (!templateSubpointId) return;

    setUploadingFile(true);

    try {
      
      // Usar endpoint normal de upload
      const uploadResponse = await uploadAuditFile(templateSubpointId, file);
      const downloadUrl =
        uploadResponse?.downloadUrl ||
        uploadResponse?.archivoDownloadUrl ||
        uploadResponse?.file?.downloadUrl ||
        '';

      // Actualizar estado local
      setEmpresas((prev) =>
        prev.map((empresa) => {
          if (empresa.nombre === viewingContext.empresa) {
            return {
              ...empresa,
              puntos: empresa.puntos.map((punto) => {
                if (punto.nombre === viewingContext.punto) {
                  return {
                    ...punto,
                    subpuntos: punto.subpuntos.map((sp) =>
                      sp.id === viewingSubpunto.id
                        ? { ...sp, archivoCargado: true, archivoUpload: file.name, archivoDownloadUrl: downloadUrl }
                        : sp
                    ),
                  };
                }
                return punto;
              }),
            };
          }
          return empresa;
        })
      );

      setViewingSubpunto((prev) => 
        prev ? { ...prev, archivoCargado: true, archivoUpload: file.name, archivoDownloadUrl: downloadUrl } : null
      );

      showNotification({
        title: 'Archivo cargado',
        message: 'El archivo ha sido cargado correctamente',
        color: 'green',
      });
    } catch (error) {
    } finally {
      setUploadingFile(false);
    }
  };

  // 🔄 PROCESAR ACTUALIZACIÓN DE ARCHIVO CON COMENTARIO
  const handleConfirmFileUpdate = async () => {
    if (!pendingFileForUpdate || !viewingSubpunto || !viewingContext) return;

    // Validar comentario
    if (!commentForUpdate.trim()) {
      showNotification({
        title: 'Comentario requerido',
        message: 'Debes proporcionar un comentario para actualizar el archivo',
        color: 'red',
      });
      return;
    }

    const templateSubpointId = getTemplateSubpointId(viewingSubpunto);
    if (!templateSubpointId) {
      showNotification({
        title: 'Error',
        message: 'No se pudo identificar el templateSubpointId',
        color: 'red',
      });
      return;
    }

    setUploadingFile(true);
    setOpenedCommentModal(false);

    try {
      
      // Usar endpoint de replacement
      const uploadResponse = await replaceAuditFile(templateSubpointId, pendingFileForUpdate, commentForUpdate);
      const downloadUrl =
        uploadResponse?.downloadUrl ||
        uploadResponse?.archivoDownloadUrl ||
        uploadResponse?.file?.downloadUrl ||
        '';

      // Actualizar estado local
      setEmpresas((prev) =>
        prev.map((empresa) => {
          if (empresa.nombre === viewingContext.empresa) {
            return {
              ...empresa,
              puntos: empresa.puntos.map((punto) => {
                if (punto.nombre === viewingContext.punto) {
                  return {
                    ...punto,
                    subpuntos: punto.subpuntos.map((sp) =>
                      sp.id === viewingSubpunto.id
                        ? { ...sp, archivoCargado: true, archivoUpload: pendingFileForUpdate.name, archivoDownloadUrl: downloadUrl }
                        : sp
                    ),
                  };
                }
                return punto;
              }),
            };
          }
          return empresa;
        })
      );

      setViewingSubpunto((prev) => 
        prev ? { ...prev, archivoCargado: true, archivoUpload: pendingFileForUpdate.name, archivoDownloadUrl: downloadUrl } : null
      );

      // Recargar los cambios después de actualizar
      await loadChangesFromBackend();

      showNotification({
        title: 'Archivo actualizado',
        message: 'El archivo ha sido actualizado correctamente',
        color: 'green',
      });

      // Limpiar estados
      setPendingFileForUpdate(null);
      setCommentForUpdate('');
    } catch (error) {
    } finally {
      setUploadingFile(false);
    }
  };

  //  DESCARGAR REPORTE DE CAMBIOS
  const handleDescargarReporte = () => {
    if (!viewingSubpunto || !viewingContext) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Título principal
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE CAMBIOS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    // Información del subpunto
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Empresa:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(viewingContext.empresa, 50, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Punto:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(viewingContext.punto, 50, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Subpunto:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(viewingSubpunto.nombre, 50, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Periodicidad:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(viewingSubpunto.periodicidad, 50, yPosition);
    yPosition += 15;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    // Título de historial
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIAL DE CAMBIOS', 20, yPosition);
    yPosition += 10;

    if (viewingSubpunto.cambios.length === 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text('No hay cambios registrados.', 20, yPosition);
    } else {
      viewingSubpunto.cambios.forEach((cambio, index) => {
        // Verificar si necesitamos una nueva página
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        // Encabezado del cambio con fondo gris
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPosition - 5, pageWidth - 40, 8, 'F');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Versión ${cambio.version}`, 22, yPosition);
        yPosition += 10;

        // Fecha
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Fecha:', 22, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(cambio.fecha, 42, yPosition);
        yPosition += 6;

        // Usuario
        doc.setFont('helvetica', 'bold');
        doc.text('Usuario:', 22, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(`${cambio.usuarioNombre} (${cambio.usuarioRol})`, 42, yPosition);
        yPosition += 6;

        // Descripción
        doc.setFont('helvetica', 'bold');
        doc.text('Descripción:', 22, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        
        // Dividir descripción en líneas si es muy larga
        const descripcionLines = doc.splitTextToSize(cambio.descripcion, pageWidth - 50);
        descripcionLines.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 22, yPosition);
          yPosition += 5;
        });

        // Línea separadora entre cambios
        yPosition += 5;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 10;
      });
    }

    // Footer con fecha de generación
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages} - Generado el ${new Date().toLocaleDateString('es-MX')}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Guardar el PDF
    const filename = `Cambios_${viewingContext.empresa.replace(/\s+/g, '_')}_${viewingContext.punto.replace(/\s+/g, '_')}_${viewingSubpunto.nombre.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);

    showNotification({
      title: 'Reporte descargado',
      message: 'El reporte de cambios se descargó correctamente en PDF',
      color: 'green',
    });
  };

  // � GENERAR PERIODOS AUTOMÁTICAMENTE
  const generarPeriodos = (periodicidad: string, cantidad: number = 12): Periodo[] => {
    const periodos: Periodo[] = [];
    const fechaInicio = new Date('2026-01-17'); // 17 de enero de 2026
    const hoy = new Date();

    for (let i = 0; i < cantidad; i++) {
      let fechaLimite = new Date(fechaInicio);
      let nombre = '';

      if (periodicidad === 'Semanal') {
        fechaLimite.setDate(fechaInicio.getDate() + (i * 7));
        nombre = `Semana ${i + 1} - ${fechaLimite.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
      } else if (periodicidad === 'Mensual') {
        fechaLimite = new Date(2026, i, 17); // Día 17 de cada mes
        nombre = fechaLimite.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      } else if (periodicidad === 'Anual') {
        fechaLimite = new Date(2026 + i, 0, 17);
        nombre = `Año ${2026 + i}`;
      }

      // Determinar estado
      let estado: 'pendiente' | 'cargado' | 'vencido' = 'pendiente';
      if (fechaLimite < hoy) {
        estado = 'vencido';
      }

      periodos.push({
        id: `periodo-${i}-${Date.now()}`,
        nombre,
        fechaLimite: fechaLimite.toISOString(),
        estado,
      });
    }

    return periodos;
  };

  // 🏗️ GENERAR EMPRESAS CON PERIODOS
  const empresasGeneradas: EmpresaGenerada[] = empresas.map((empresa) => ({
    id: empresa.id,
    nombre: empresa.nombre,
    puntos: empresa.puntos.map((punto) => ({
      id: punto.id,
      nombre: punto.nombre,
      subpuntos: punto.subpuntos.map((subpunto) => ({
        id: subpunto.id,
        nombre: subpunto.nombre,
        periodicidad: subpunto.periodicidad,
        periodos: generarPeriodos(subpunto.periodicidad, subpunto.periodicidad === 'Anual' ? 5 : 12),
      })),
    })),
  }));

  // 📎 MANEJAR CARGA DE ARCHIVO POR PERIODO
  const handleCargarArchivoPeriodo = (file: File | null, empresaId: string, puntoId: string, subpuntoId: string, periodoId: string) => {
    if (!file) return;

    // Aquí iría la lógica real de subida

    showNotification({
      title: 'Archivo cargado',
      message: `El archivo "${file.name}" se cargó correctamente para este periodo`,
      color: 'green',
    });
  };

  // �💬 ENVIAR MENSAJE DE CHAT
  const handleEnviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !viewingSubpunto || !viewingContext) return;
    if (!canPostMessages) return;

    try {
      const templateSubpointId = getTemplateSubpointId(viewingSubpunto);
      if (!templateSubpointId) {
        showNotification({
          title: 'Error',
          message: 'No se pudo identificar el templateSubpointId para enviar el mensaje',
          color: 'red',
        });
        return;
      }

      // Enviar mensaje al API
      await sendMessage(templateSubpointId, nuevoMensaje);

      const mensaje: Mensaje = {
        id: `${viewingSubpunto.id}-msg-${Date.now()}`,
        texto: nuevoMensaje,
        fecha: new Date().toLocaleDateString('es-MX', { 
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        hora: new Date().toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        }),
        usuario: currentUserRole === UserRole.AUDITOR ? UserRole.AUDITOR : viewingContext.empresa,
        tipo: currentUserRole,
      };

      setEmpresas((prev) =>
        prev.map((empresa) => {
          if (empresa.nombre === viewingContext.empresa) {
            return {
              ...empresa,
              puntos: empresa.puntos.map((punto) => {
                if (punto.id === viewingContext.puntoId) {
                  return {
                    ...punto,
                    subpuntos: punto.subpuntos.map((sp) =>
                      sp.id === viewingSubpunto.id
                        ? { ...sp, mensajes: [...sp.mensajes, mensaje] }
                        : sp
                    ),
                  };
                }
                return punto;
              }),
            };
          }
          return empresa;
        })
      );

      setViewingSubpunto((prev) => 
        prev ? { ...prev, mensajes: [...prev.mensajes, mensaje] } : null
      );

      setNuevoMensaje('');
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'No se pudo enviar el mensaje',
        color: 'red',
      });
    }
  };

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="lg">
        SGI - Sistema de Gestión Información
      </Title>

      {/* 🔍 BUSCADOR - Solo mostrar si no es Empresa */}
      {auth?.userType !== 'Empresa' && (
        <Group justify="flex-end" mb="xl">
          <Input
            placeholder="Buscar empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="md"
            style={{ width: '40%' }}
          />
         
        </Group>
      )}

      {/* 📋 VISTA PARA EMPRESA - Mostrar directamente los puntos sin accordion de empresa */}
      {auth?.userType === 'Empresa' ? (
        <Stack gap="md">
          {empresas.length === 0 ? (
            <Paper p="xl" withBorder style={{ backgroundColor: '#f8f9fa' }}>
              <Text c="dimmed" ta="center">
                Cargando datos de tu empresa...
              </Text>
            </Paper>
          ) : (
            <Stack gap="md">
              {/* 🔍 BUSCADOR DE PUNTOS PARA EMPRESA */}
              <Input
                placeholder="Buscar punto..."
                value={searchPuntoQuery}
                onChange={(e) => setSearchPuntoQuery(e.currentTarget.value)}
                size="md"
                leftSection={<FaSearch size={14} />}
              />

              {/* BARRA DE PROGRESO GENERAL */}
              {(() => {
                const totalSubpuntos = empresas[0].puntos.reduce(
                  (sum, punto) => sum + punto.subpuntos.length,
                  0
                );
                const subpuntosConArchivo = empresas[0].puntos.reduce(
                  (sum, punto) => sum + punto.subpuntos.filter((s) => s.archivoCargado).length,
                  0
                );
                const progreso = totalSubpuntos > 0 ? (subpuntosConArchivo / totalSubpuntos) * 100 : 0;

                return (
                  <Paper p="md" withBorder style={{ backgroundColor: '#f0f9ff', borderColor: '#74c0fc' }}>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" fw={600} c="blue.7">
                          Progreso General de Documentación
                        </Text>
                        <Badge size="lg" color={progreso === 100 ? 'green' : progreso > 50 ? 'blue' : 'orange'}>
                          {subpuntosConArchivo} / {totalSubpuntos} completados
                        </Badge>
                      </Group>
                      <Progress
                        value={progreso}
                        size="lg"
                        radius="xl"
                        color={progreso === 100 ? 'green' : progreso > 50 ? 'blue' : 'orange'}
                        striped={progreso < 100}
                        animated={progreso < 100 && progreso > 0}
                      />
                      <Text size="xs" c="dimmed" ta="center">
                        {progreso === 100
                          ? '✅ ¡Todos los documentos han sido cargados!'
                          : `${Math.round(progreso)}% completado - Faltan ${totalSubpuntos - subpuntosConArchivo} subpuntos por cargar`}
                      </Text>
                    </Stack>
                  </Paper>
                );
              })()}

              <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                <Stack gap="sm">
                  <Text size="sm" fw={600} c="dimmed">Auditores Asignados:</Text>
                  {empresas[0].auditoresAsignados.length === 0 ? (
                    <Text size="sm" c="dimmed" fs="italic">Sin auditores asignados</Text>
                  ) : (
                    <Group gap="xs" wrap="wrap">
                      {empresas[0].auditoresAsignados.map((auditorId) => {
                        const auditor = auditores.find(a => a.id === auditorId);
                        return auditor ? (
                          <Badge key={auditor.id} size="lg" color="teal" variant="dot">
                            {auditor.nombre}
                          </Badge>
                        ) : null;
                      })}
                    </Group>
                  )}
                </Stack>
              </Paper>

              {(() => {
                const puntosFiltrados = empresas[0].puntos.filter((punto) =>
                  punto.nombre.toLowerCase().includes(searchPuntoQuery.toLowerCase())
                );

                if (empresas[0].puntos.length === 0) {
                  return (
                    <Paper p="xl" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                      <Text c="dimmed" ta="center" py="xl">
                        No hay puntos registrados para tu empresa
                      </Text>
                    </Paper>
                  );
                }

                if (puntosFiltrados.length === 0) {
                  return (
                    <Paper p="xl" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                      <Text c="dimmed" ta="center" py="xl">
                        No se encontraron puntos que coincidan con "{searchPuntoQuery}"
                      </Text>
                    </Paper>
                  );
                }

                return (
                  <Accordion
                    chevronPosition="right"
                    defaultValue={null}
                    styles={{
                      chevron: {
                        fontSize: 16,
                        marginRight: 0,
                      }
                    }}
                  >
                    {puntosFiltrados.map((punto) => (
                      <Accordion.Item
                        key={punto.id}
                        value={punto.id}
                        style={{
                          backgroundColor: '#e8eaa6',
                          border: '1px solid #d4d68f',
                          marginBottom: 8,
                          borderRadius: 6,
                        }}
                      >
                        <Accordion.Control
                          style={{
                            padding: '12px 14px',
                        }}
                      >
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Text fw={600} size="lg" c="#4a4a4a">
                            {punto.nombre}
                          </Text>
                          {punto.subpuntos.length > 0 && (
                            <Text size="xs" c="dimmed">
                              {punto.subpuntos.filter((s) => s.archivoCargado).length} / {punto.subpuntos.length} completados
                            </Text>
                          )}
                        </Stack>
                      </Accordion.Control>

                      <Accordion.Panel style={{ padding: '14px' }}>
                        <Stack gap="md">
                          {/* LISTA DE SUBPUNTOS */}
                          {punto.subpuntos.length === 0 ? (
                            <Text c="dimmed" ta="center" py="md">
                              No hay subpuntos registrados para este punto
                            </Text>
                          ) : (
                            <Stack gap="sm">
                              {punto.subpuntos.map((subpunto) => (
                                <Paper
                                  key={subpunto.id}
                                  p="sm"
                                  withBorder
                                  radius="sm"
                                  style={{
                                    backgroundColor: subpunto.archivoCargado ? '#e7f5ff' : '#f8f9fa',
                                    borderLeft: `4px solid ${subpunto.archivoCargado ? '#1971c2' : '#ced4da'}`
                                  }}
                                >
                                  <Group justify="space-between" align="center">
                                    <Stack gap={4} style={{ flex: 1 }}>
                                      <Group gap="xs" align="center">
                                        <Text fw={500}>{subpunto.nombre}</Text>
                                        <Badge size="sm" variant="light">
                                          {subpunto.periodicidad}
                                        </Badge>
                                        {subpunto.archivoCargado && (
                                          <Badge size="sm" color="green" leftSection={<FaCheck size={12} />}>
                                            Completado
                                          </Badge>
                                        )}
                                      </Group>
                                    </Stack>
                                    <Group gap="xs">
                                      <Button
                                        size="xs"
                                        variant="light"
                                        color="blue"
                                        onClick={() => {
                                          setViewingSubpunto(subpunto);
                                          setViewingContext({ empresa: empresas[0].nombre, punto: punto.nombre, puntoId: punto.id });
                                          setOpenedViewer(true);
                                        }}
                                        leftSection={<FaEye size={12} />}
                                      >
                                        Ver
                                      </Button>
                                    </Group>
                                  </Group>
                                </Paper>
                              ))}
                            </Stack>
                          )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                  </Accordion>
                );
              })()}
            </Stack>
          )}
        </Stack>
      ) : (
        /* 📋 VISTA PARA ADMIN/AUDITOR - Lista de empresas con accordion */
        <Stack gap="md">
        {empresasPaginadas.length === 0 ? (
          <Paper p="xl" withBorder style={{ backgroundColor: '#f8f9fa' }}>
            <Text c="dimmed" ta="center">
              {empresas.length === 0 
                ? 'Cargando empresas...' 
                : 'No se encontraron empresas que coincidan con tu búsqueda'}
            </Text>
          </Paper>
        ) : (
          empresasPaginadas.map((empresa) => {
          // Usar estadísticas del backend si están disponibles, sino calcular localmente
          const totalSubpuntos = empresa.totalSubpoints !== undefined 
            ? empresa.totalSubpoints 
            : empresa.puntos.reduce((sum, punto) => sum + punto.subpuntos.length, 0);
          const subpuntosConArchivo = empresa.subpointsWithFiles !== undefined 
            ? empresa.subpointsWithFiles 
            : empresa.puntos.reduce(
                (sum, punto) => sum + punto.subpuntos.filter(s => s.archivoCargado).length,
                0
              );
          const progresoEmpresa = totalSubpuntos > 0 ? (subpuntosConArchivo / totalSubpuntos) * 100 : 0;

          return (
            <Paper key={empresa.id} shadow="sm" p="md" radius="md" withBorder>
              <Accordion>
                <Accordion.Item value={String(empresa.id)}>
                  <Accordion.Control
                    icon={<FaChevronDown size={14} />}
                    onClick={() => handleLoadEmpresaData(empresa.empresaId || empresa.id)}
                    styles={{
                      control: {
                        fontSize: '1.1rem',
                        fontWeight: 600,
                      },
                    }}
                  >
                  
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Group justify="space-between" wrap="nowrap">
                        <Stack gap={0}>
                          <Text fw={600}>{empresa.nombre}</Text>
                          {empresa.subEmpresa ? (
                            <Text size="xs" c="dimmed" fw={500}>
                               {empresa.subEmpresa}
                            </Text>
                          ) : null}
                        </Stack>
                        {empresasConDatos.has(empresa.empresaId || empresa.id) && (
                          <Group gap="xs">
                            <Badge color="teal" size="lg" variant="light">
                              👥 {empresa.auditoresAsignados.length} {empresa.auditoresAsignados.length === 1 ? 'auditor' : 'auditores'}
                            </Badge>
                            <Badge color="blue" size="lg">
                              {empresa.puntos.length} {empresa.puntos.length === 1 ? 'punto' : 'puntos'}
                            </Badge>
                          </Group>
                        )}
                      </Group>
                      {totalSubpuntos > 0 && (
                        <Box>
                          <Progress
                            value={progresoEmpresa}
                            size="xl"
                            radius="md"
                            color={
                              progresoEmpresa === 100
                                ? 'green'
                                : progresoEmpresa > 0
                                ? 'yellow'
                                : 'gray'
                            }
                            styles={{
                              label: { fontWeight: 600, fontSize: '0.875rem' }
                            }}
                          />
                          <Text size="xs" ta="center" mt={2} fw={500}>
                            {subpuntosConArchivo} / {totalSubpuntos} subpuntos completados
                          </Text>
                        </Box>
                      )}
                    </Stack>
                  </Accordion.Control>

                <Accordion.Panel>
                  {empresasCargando.has(empresa.empresaId || empresa.id) ? (
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <Loader size="lg" color="#a1a23b" />
                        <Text size="sm" c="dimmed">Cargando información de la empresa...</Text>
                      </Stack>
                    </Center>
                  ) : (
                    <>
                  {/* AUDITORES ASIGNADOS Y BOTONES */}
                  <Paper p="md" mb="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                    <Stack gap="md">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Text size="sm" fw={600} c="dimmed">Auditores Asignados:</Text>
                          {empresa.auditoresAsignados.length === 0 ? (
                            <Text size="sm" c="dimmed" fs="italic">Sin auditores asignados</Text>
                          ) : (
                            <Stack gap="xs">
                              {empresa.auditoresAsignados.map((auditorId) => {
                                const auditor = auditores.find(a => a.id === auditorId);
                                return auditor ? (
                                  <Badge key={auditor.id} size="lg" color="teal" variant="dot">
                                    {auditor.nombre}
                                  </Badge>
                                ) : null;
                              })}
                            </Stack>
                          )}
                        </Stack>
                        {getRoleLabel(auth.userType) === UserRole.ADMINISTRADOR && (
                          <Button
                            size="sm"
                            variant="light"
                            color="teal"
                            onClick={() => handleOpenAuditores(empresa.id)}
                          >
                            Gestionar Auditores
                          </Button>
                        )}
                      </Group>
                    </Stack>
                  </Paper>

                  {/* BOTÓN PARA AÑADIR PUNTO */}
                  {getRoleLabel(auth.userType) !== UserRole.EMPRESA && (
                    <Group justify="flex-end" mb="md">
                      <Button
                        leftSection={<FaPlus size={14} />}
                        color="#a1a23b"
                        onClick={() => handleOpenNewPunto(empresa.id)}
                      >
                        Añadir Punto
                      </Button>
                    </Group>
                  )}

                  {/* LISTA DE PUNTOS - ACCORDION */}
                  
                  { getRoleLabel(auth.userType) !== UserRole.EMPRESA && empresa.puntos.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">
                      No hay puntos registrados. Haz clic en "Añadir Punto" para crear uno.
                    </Text>
                  ) : empresa.puntos.length > 0 ? (
                    <Accordion
                      chevronPosition="right"
                      defaultValue={null}
                      styles={{
                        chevron: {
                          fontSize: 16,
                          marginRight: 0,
                        }
                      }}
                    >
                      {empresa.puntos.map((punto) => (
                        <Accordion.Item
                          key={punto.id}
                          value={punto.id}
                          style={{
                            backgroundColor: '#e8eaa6',
                            border: '1px solid #d4d68f',
                            marginBottom: 8,
                            borderRadius: 6,
                          }}
                        >
                          <Accordion.Control
                            style={{
                              padding: '12px 14px',
                            }}
                          >
                            <Stack gap={4} style={{ flex: 1 }}>
                              <Text fw={600} size="lg" c="#4a4a4a">
                                {punto.nombre}
                              </Text>
                              {punto.subpuntos.length > 0 && (
                                <Text size="xs" c="dimmed">
                                  {punto.subpuntos.filter((s) => s.archivoCargado).length} / {punto.subpuntos.length} completados
                                </Text>
                              )}
                            </Stack>
                          </Accordion.Control>

                          <Accordion.Panel style={{ padding: '14px' }}>
                            <Stack gap="md">
                              {/* BOTONES DE ACCIÓN DEL PUNTO */}
                              <Group justify="flex-end" gap={6} wrap="nowrap">
                                {getRoleLabel(auth.userType) !== UserRole.EMPRESA && (
                                  <Button
                                    size="xs"
                                    variant="light"
                                    color="blue"
                                    onClick={() => handleEditPunto(empresa.id, punto)}
                                    leftSection={<FaEdit size={12} />}
                                  >
                                    Editar
                                  </Button>
                                )}
                                {getRoleLabel(auth.userType) === UserRole.ADMINISTRADOR && (
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    onClick={() => handleDeletePunto(empresa.id, empresa.empresaId || empresa.id, punto.id)}
                                    leftSection={<FaTrash size={12} />}
                                  >
                                    Eliminar
                                  </Button>
                                )}
                              </Group>

                              {/* BARRA DE PROGRESO DEL PUNTO */}
                              {punto.subpuntos.length > 0 && (
                                <Box>
                                  <Progress
                                    value={
                                      (punto.subpuntos.filter((s) => s.archivoCargado).length / punto.subpuntos.length) * 100
                                    }
                                    size="lg"
                                    radius="md"
                                    color={
                                      punto.subpuntos.filter((s) => s.archivoCargado).length === punto.subpuntos.length
                                        ? 'green'
                                        : punto.subpuntos.some((s) => s.archivoCargado)
                                        ? 'yellow'
                                        : 'gray'
                                    }
                                    styles={{
                                      label: { fontWeight: 600, fontSize: '0.875rem' }
                                    }}
                                  />
                                </Box>
                              )}

                              {/* SUBPUNTOS - ACCORDION GRUPAL */}
                              {punto.subpuntos.length > 0 ? (
                                <Accordion 
                                  chevronPosition="right"
                                  defaultValue={null}
                                >
                                  <Accordion.Item value="subpuntos">
                                    <Accordion.Control>
                                      <Text fw={500} size="sm">
                                        Subpuntos ({punto.subpuntos.length})
                                      </Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                      <Stack gap="xs">
                                        {punto.subpuntos.map((subpunto) => (
                                          <Paper
                                            key={subpunto.id}
                                            p="sm"
                                            radius="md"
                                            style={{
                                              backgroundColor: '#f5f7d0',
                                              border: '1px solid #e0e3a8',
                                            }}
                                          >
                                            <Group justify="space-between" gap={8}>
                                              <Stack gap={4} style={{ flex: 1 }}>
                                                <Group gap={8}>
                                                  <Text size="sm" fw={600}>{subpunto.nombre}</Text>
                                                  <Badge 
                                                    size="xs" 
                                                    color={subpunto.archivoCargado ? 'green' : 'gray'}
                                                    leftSection={subpunto.archivoCargado ? <FaCheck size={10} /> : <FaTimes size={10} />}
                                                  >
                                                    {subpunto.archivoCargado ? 'Con archivo' : 'Sin archivo'}
                                                  </Badge>
                                                </Group>
                                              </Stack>

                                              {/* BOTONES DE ACCIÓN */}
                                              <Group gap={6} wrap="nowrap">
                                                <Button
                                                  size="xs"
                                                  variant="light"
                                                  color="#a1a23b"
                                                  onClick={() => {
                                                    setViewingSubpunto(subpunto);
                                                    setViewingContext({ empresa: empresa.nombre, punto: punto.nombre, puntoId: punto.id });
                                                    setOpenedViewer(true);
                                                  }}
                                                  leftSection={<FaEye size={12} />}
                                                >
                                                  Ver
                                                </Button>
                                                {getRoleLabel(auth.userType) !== UserRole.EMPRESA && (
                                                  <Button
                                                    size="xs"
                                                    variant="light"
                                                    color="blue"
                                                    onClick={() => handleEditSubpunto(empresa.id, punto.id, subpunto)}
                                                    leftSection={<FaEdit size={12} />}
                                                  >
                                                    Editar
                                                  </Button>
                                                )}
                                                {getRoleLabel(auth.userType) === UserRole.ADMINISTRADOR && (
                                                  <Button
                                                    size="xs"
                                                    variant="light"
                                                    color="red"
                                                    onClick={() => handleDeleteSubpunto(empresa.id, punto.id, subpunto.id)}
                                                    leftSection={<FaTrash size={12} />}
                                                  >
                                                    Eliminar
                                                  </Button>
                                                )}
                                              </Group>
                                            </Group>
                                          </Paper>
                                        ))}
                                      </Stack>
                                    </Accordion.Panel>
                                  </Accordion.Item>
                                </Accordion>
                              ) : (
                                <Text c="dimmed" size="sm" ta="center" py="md">
                                  No hay subpuntos. {getRoleLabel(auth.userType) !== UserRole.EMPRESA && 'Haz clic en "Añadir Subpunto" para crear uno.'}
                                </Text>
                              )}

                              {/* BOTÓN PARA AÑADIR SUBPUNTO */}
                              {getRoleLabel(auth.userType) !== UserRole.EMPRESA && (
                                <Button
                                  size="xs"
                                  variant="light"
                                  color="gray"
                                  leftSection={<FaPlus size={12} />}
                                  onClick={() => handleOpenNewSubpunto(empresa.id, punto.id)}
                                  fullWidth
                                >
                                  Añadir Subpunto
                                </Button>
                              )}
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  ) : null}
                    </>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Paper>
          );
        })
        )}

        {empresasPaginadas.length === 0 && empresas.length > 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No se encontraron empresas
          </Text>
        )}

        {/* PAGINACIÓN */}
        {empresasFiltradas.length > itemsPerPage && (
          <Group justify="center" mt="xl">
            <Stack gap="xs" align="center">
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                size="lg"
                color="#a1a23b"
              />
              <Text size="sm" c="dimmed">
                Mostrando {startIndex + 1} - {Math.min(endIndex, empresasFiltradas.length)} de {empresasFiltradas.length} empresas
              </Text>
            </Stack>
          </Group>
        )}
        </Stack>
      )}

      {/* 📝 MODAL PARA PUNTO */}
      <Modal
        opened={openedPunto}
        onClose={() => {
          setOpenedPunto(false);
          formPunto.reset();
          setEditingPunto(null);
        }}
        title={editingPunto ? 'Editar Punto' : 'Nuevo Punto'}
        size="md"
      >
        <form onSubmit={formPunto.onSubmit(handleSubmitPunto)}>
          <Stack gap="md">
            <TextInput
              label="Nombre del Punto"
              placeholder="Ej: Sección para punto 4"
              required
              {...formPunto.getInputProps('nombre')}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  setOpenedPunto(false);
                  formPunto.reset();
                  setEditingPunto(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" color="#a1a23b">
                {editingPunto ? 'Actualizar' : 'Crear'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* 📝 MODAL PARA SUBPUNTO */}
      <Modal
        opened={openedSubpunto}
        onClose={() => {
          setOpenedSubpunto(false);
          formSubpunto.reset();
          setEditingSubpunto(null);
        }}
        title={editingSubpunto ? 'Editar Subpunto' : 'Nuevo Subpunto'}
        size="lg"
        centered
      >
        <form onSubmit={formSubpunto.onSubmit(handleSubmitSubpunto)}>
          <Stack gap="lg">
            <TextInput
              label="Nombre del Subpunto"
              placeholder="Ej: Capacitación, Permisos, etc."
              required
              size="md"
              {...formSubpunto.getInputProps('nombre')}
            />

            <Select
              label="Periodicidad"
              placeholder="Seleccione periodicidad"
              required
              size="md"
              data={[
                { value: 'Mensual', label: 'Mensual' },
                { value: 'Anual', label: 'Anual' },
              ]}
              {...formSubpunto.getInputProps('periodicidad')}
            />

            {/* SECCIÓN DE PERIODO DE AUDITORÍA */}
            <Paper p="md" withBorder radius="md" style={{ backgroundColor: '#f8f9fa' }}>
              <Stack gap="md">
                <Text fw={600} size="sm" c="dimmed">📅 Periodo de Auditoría</Text>
                
                {formSubpunto.values.periodicidad === 'Mensual' ? (
                  <>
                    <Group grow>
                      <MonthPickerInput
                        label="Mes de inicio"
                        placeholder="Seleccione mes de inicio"
                        required
                        size="md"
                        valueFormat="MMMM YYYY"
                        locale="es"
                        minDate={new Date()}
                        maxDate={new Date(new Date().getFullYear() + 2, 11, 31)}
                        {...formSubpunto.getInputProps('periodoInicio')}
                      />
                      
                      <MonthPickerInput
                        label="Mes de fin"
                        placeholder="Seleccione mes de fin"
                        required
                        size="md"
                        valueFormat="MMMM YYYY"
                        locale="es"
                        minDate={formSubpunto.values.periodoInicio instanceof Date ? formSubpunto.values.periodoInicio : new Date()}
                        maxDate={new Date(new Date().getFullYear() + 2, 11, 31)}
                        {...formSubpunto.getInputProps('periodoFin')}
                      />
                    </Group>

                    {formSubpunto.values.periodoInicio instanceof Date && formSubpunto.values.periodoFin instanceof Date && (
                      <Paper p="sm" withBorder radius="sm" style={{ backgroundColor: '#e7f5ff' }}>
                        <Group gap="xs">
                          <Badge color="blue" variant="light" size="lg">
                            📆 {formSubpunto.values.periodoInicio.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                          </Badge>
                          <Text size="sm" c="dimmed">hasta</Text>
                          <Badge color="blue" variant="light" size="lg">
                            📆 {formSubpunto.values.periodoFin.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                          </Badge>
                        </Group>
                      </Paper>
                    )}
                  </>
                ) : (
                  <>
                    <Select
                      label="Duración del periodo"
                      placeholder="Seleccione duración"
                      required
                      size="md"
                      data={[
                        { value: '1', label: `1 año (${new Date().getFullYear()})` },
                        { value: '2', label: `2 años (${new Date().getFullYear()} - ${new Date().getFullYear() + 1})` },
                      ]}
                      {...formSubpunto.getInputProps('duracionAnios')}
                    />

                    <Paper p="sm" withBorder radius="sm" style={{ backgroundColor: '#e7f5ff' }}>
                      <Group gap="xs">
                        <Badge color="green" variant="light" size="lg">
                          📆 Enero {new Date().getFullYear()}
                        </Badge>
                        <Text size="sm" c="dimmed">hasta</Text>
                        <Badge color="green" variant="light" size="lg">
                          📆 Diciembre {new Date().getFullYear() + parseInt(formSubpunto.values.duracionAnios || '1') - 1}
                        </Badge>
                      </Group>
                    </Paper>
                  </>
                )}
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="lg">
              <Button
                variant="default"
                size="md"
                onClick={() => {
                  setOpenedSubpunto(false);
                  formSubpunto.reset();
                  setEditingSubpunto(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" color="#a1a23b" size="md">
                {editingSubpunto ? 'Actualizar' : 'Crear'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* 🗑️ MODAL DE CONFIRMACIÓN */}
      <Modal
        opened={openedConfirm}
        onClose={() => setOpenedConfirm(false)}
        title="Confirmar eliminación"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text>{deleteMessage}</Text>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setOpenedConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (deleteAction) {
                  deleteAction();
                }
              }}
            >
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 👁️ MODAL VISOR DE SUBPUNTO */}
      <Modal
        opened={openedViewer}
        onClose={() => {
          setOpenedViewer(false);
          setViewingSubpunto(null);
          setViewingContext(null);
          setExcelData([]);
          setExcelSheets([]);
          setSelectedSheet('');
          setWordLoaded(false);
        }}
        title="Detalle de Subpunto"
        size="xl"
        styles={{
          body: { maxHeight: '80vh', overflowY: 'auto' }
        }}
      >
        {viewingSubpunto && viewingContext && (
          <Stack gap="lg">
            {/* BREADCRUMB DE CONTEXTO */}
            <Paper p="sm" withBorder style={{ backgroundColor: '#f8f9fa' }}>
              <Breadcrumbs separator="›">
                <Text size="sm" fw={500}>{viewingContext.empresa}</Text>
                <Text size="sm" fw={500}>{viewingContext.punto}</Text>
                <Text size="sm" fw={600} c="#a1a23b">{viewingSubpunto.nombre}</Text>
              </Breadcrumbs>
            </Paper>

            {/* INFORMACIÓN DEL SUBPUNTO */}
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Group justify="flex-end" align="center">
                  <Badge 
                    size="lg" 
                    color={viewingSubpunto.archivoCargado ? 'green' : 'gray'}
                    leftSection={viewingSubpunto.archivoCargado ? <FaCheck size={12} /> : <FaTimes size={12} />}
                  >
                    {viewingSubpunto.archivoCargado ? 'Con archivo' : 'Sin archivo'}
                  </Badge>
                </Group>
              </Stack>
            </Paper>

            {/* SECCIÓN: VISOR DE ARCHIVOS */}
            <Paper p="lg" withBorder radius="md">
              <Stack gap="md">
                <Group gap="xs" justify="space-between">
                  <Group gap="xs">
                    <FaFileUpload size={20} color="#a1a23b" />
                    <Title order={4}>Visor de Archivos</Title>
                  </Group>
                  {/* Botón de subir/actualizar archivo */}
                  {(getRoleLabel(auth.userType) === UserRole.ADMINISTRADOR || 
                    getRoleLabel(auth.userType) === UserRole.AUDITOR || 
                    (getRoleLabel(auth.userType) === UserRole.EMPRESA && !viewingSubpunto.archivoCargado)) && (
                    <FileInput
                      placeholder={viewingSubpunto.archivoCargado ? "Actualizar archivo" : "Subir archivo"}
                      accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      leftSection={<FaFileUpload size={14} />}
                      clearable
                    />
                  )}
                </Group>
                
                {viewingSubpunto.archivoCargado ? (
                  <Stack gap="md">
                    {/* Información del archivo */}
                    <Paper p="sm" withBorder style={{ backgroundColor: '#e7f5ff' }}>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Text size="sm" fw={600}>Archivo:</Text>
                          <Text size="sm" c="dimmed">
                            {viewingSubpunto.archivoUpload || 'documento.pdf'}
                          </Text>
                          <Badge color="green" size="sm">Cargado</Badge>
                        </Group>
                        <Button 
                          size="xs" 
                          variant="light" 
                          color="gray"
                          component="a"
                          href={getSubpointFileUrl(viewingSubpunto)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Descargar
                        </Button>
                      </Group>
                    </Paper>

                    {/* Controles según tipo de archivo */}
                    {(() => {
                      const fileType = getFileType(viewingSubpunto.archivoUpload || viewingSubpunto.archivoDownloadUrl || 'documento.pdf');
                      
                      // El iframe de PDF tiene sus propios controles nativos
                      if (fileType === 'pdf') {
                        return null;
                      }
                      
                      return null;
                    })()}

                    {/* Visor dinámico según tipo de archivo */}
                    <Paper 
                      p="md" 
                      withBorder 
                      style={{ 
                        backgroundColor: '#f8f9fa',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: 500,
                        maxHeight: '70vh',
                        overflow: 'auto'
                      }}
                    >
                      {(() => {
                        const fileType = getFileType(viewingSubpunto.archivoUpload || viewingSubpunto.archivoDownloadUrl || 'documento.pdf');
                        // Para PDF e imágenes, usar blob si existe. Para Word/Excel, usar solo ruta directa
                        const storedFileUrl = sessionStorage.getItem(`file_${viewingSubpunto.id}`);
                        let fileUrl = getSubpointFileUrl(viewingSubpunto);
                        
                        // Solo usar blob URL para PDF e imágenes (iframe puede manejarlos)
                        if ((fileType === 'pdf' || fileType === 'image') && storedFileUrl) {
                          fileUrl = storedFileUrl;
                        }

                        switch (fileType) {
                          case 'pdf':
                            return (
                              <iframe
                                src={fileUrl}
                                style={{
                                  width: '100%',
                                  height: '600px',
                                  border: 'none',
                                  borderRadius: '8px'
                                }}
                                title="Visor de PDF"
                              />
                            );

                          case 'image':
                          case 'excel':
                          case 'doc':
                          default:
                            return (
                              <Stack align="center" gap="md" p="xl">
                                <FaFileUpload size={40} color="#4c6ef5" />
                                <Text fw={700} c="#4c6ef5">Previsualización no disponible</Text>
                                <Text size="sm" c="dimmed" ta="center">
                                  Este archivo no es PDF. Descárgalo para visualizarlo.
                                </Text>
                                <Button
                                  component="a"
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  color="#a1a23b"
                                  variant="light"
                                  download
                                >
                                  Descargar archivo
                                </Button>
                              </Stack>
                            );
                        }
                      })()}
                    </Paper>
                  </Stack>
                ) : (
                  <Paper p="xl" style={{ backgroundColor: '#f8f9fa', minHeight: 150 }} radius="sm">
                    <Stack gap="md" align="center">
                      <FaTimes size={40} color="#adb5bd" />
                      <Text c="dimmed" ta="center">
                        No hay archivos cargados aún
                      </Text>
                      {getRoleLabel(auth.userType) === UserRole.EMPRESA && (
                        <Text size="xs" c="dimmed" ta="center">
                          Puedes subir un archivo usando el botón de arriba
                        </Text>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Paper>

            {/* SECCIÓN: PARRILLA DE CAMBIOS */}
            <Paper p="xs" withBorder radius="md">
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <Text ></Text>
                    <Title order={5}>Parrilla de Cambios</Title>
                  </Group>
                  <Group gap="xs">
                    {(getRoleLabel(auth.userType) === UserRole.ADMINISTRADOR || getRoleLabel(auth.userType) === UserRole.AUDITOR) && viewingSubpunto.cambios.length > 0 && (
                      <Button
                        size="sm"
                        variant="light"
                        color="blue"
                        leftSection={<FaFileUpload size={14} />}
                        onClick={handleDescargarReporte}
                      >
                        Descargar Reporte
                      </Button>
                    )}
                  </Group>
                </Group>

                {viewingSubpunto.cambios.length === 0 ? (
                  <Paper p="md" style={{ backgroundColor: '#f8f9fa', minHeight: 100 }} radius="sm">
                    <Stack gap="xs" align="center">
                      <Text c="dimmed" ta="center">
                        No hay cambios registrados aún
                      </Text>
                      {auth.userType !== 'empresa' && (
                        <Text size="xs" c="dimmed" ta="center">
                        </Text>
                      )}
                    </Stack>
                  </Paper>
                ) : (
                  <Paper withBorder radius="sm" style={{ overflow: 'hidden' }}>
                    <Box style={{ overflowX: 'auto' }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '0.875rem'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <th style={{ 
                              padding: '12px', 
                              textAlign: 'left', 
                              borderBottom: '2px solid #dee2e6',
                              fontWeight: 600,
                              width: '80px'
                            }}>
                              Versión
                            </th>
                            <th style={{ 
                              padding: '12px', 
                              textAlign: 'left', 
                              borderBottom: '2px solid #dee2e6',
                              fontWeight: 600,
                              width: '120px'
                            }}>
                              Fecha
                            </th>
                            <th style={{ 
                              padding: '12px', 
                              textAlign: 'left', 
                              borderBottom: '2px solid #dee2e6',
                              fontWeight: 600
                            }}>
                              Descripción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingSubpunto.cambios.map((cambio, index) => (
                            <tr 
                              key={cambio.id}
                              style={{ 
                                backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                                transition: 'background-color 0.2s'
                              }}
                            >
                              <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #dee2e6'
                              }}>
                                <Badge color="#a1a23b" variant="filled">
                                  v{cambio.version}
                                </Badge>
                              </td>
                              <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #dee2e6',
                                color: '#495057'
                              }}>
                                {cambio.fecha}
                              </td>
                              <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid #dee2e6',
                                color: '#212529'
                              }}>
                                {cambio.descripcion}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  </Paper>
                )}
              </Stack>
            </Paper>

            {/* SECCIÓN: CHAT */}
            <Paper p="xs" withBorder radius="md">
              <Stack gap="xs">
                <Group gap="xs">
                  <Text></Text>
                  <Title order={5}>Chat</Title>
                </Group>
                
                {/* Área de mensajes */}
                <Paper 
                  p="sm" 
                  withBorder 
                  style={{ 
                    backgroundColor: '#f8f9fa', 
                    minHeight: 200,
                    maxHeight: 400,
                    overflowY: 'auto'
                  }} 
                  radius="sm"
                >
                  {viewingSubpunto.mensajes.length === 0 ? (
                    <Stack gap="xs" align="center" justify="center" style={{ minHeight: 180 }}>
                      <Text c="dimmed" ta="center">
                        No hay mensajes aún
                      </Text>
                      <Text size="xs" c="dimmed" ta="center">
                        Inicia la conversación escribiendo un mensaje
                      </Text>
                    </Stack>
                  ) : (
                    <Stack gap="sm">
                      {viewingSubpunto.mensajes.map((mensaje) => {
                        const isEmpresa = mensaje.tipo === UserRole.EMPRESA;
                        const isAdmin = mensaje.tipo === UserRole.ADMINISTRADOR;
                        
                        return (
                          <Group 
                            key={mensaje.id} 
                            gap="xs" 
                            align="flex-start"
                            wrap="nowrap"
                          >
                            {/* Icono del usuario */}
                            <Box
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                backgroundColor: isEmpresa ? '#4dabf7' : isAdmin ? '#ffd43b' : '#51cf66',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                fontSize: '18px'
                              }}
                            >
                              {isEmpresa ? '🏢' : isAdmin ? '🛡️' : '👤'}
                            </Box>
                            
                            {/* Contenido del mensaje */}
                            <Stack gap={4} style={{ flex: 1 }}>
                              <Group gap="xs" wrap="nowrap">
                                <Text size="sm" fw={600} c={isEmpresa ? '#1971c2' : isAdmin ? '#e67700' : '#2f9e44'}>
                                  {mensaje.usuario}
                                </Text>
                                <Badge 
                                  size="xs" 
                                  color={isEmpresa ? 'blue' : isAdmin ? 'yellow' : 'green'}
                                  variant="light"
                                >
                                  {isEmpresa ? 'Empresa' : mensaje.tipo === UserRole.ADMINISTRADOR ? 'Admin' : 'Auditor'}
                                </Badge>
                                <Text size="xs" c="dimmed">
                                  {mensaje.fecha} {mensaje.hora}
                                </Text>
                              </Group>
                              <Paper 
                                p="sm" 
                                radius="sm"
                                style={{ 
                                  backgroundColor: 'white',
                                  border: `1px solid ${isEmpresa ? '#a5d8ff' : isAdmin ? '#ffe066' : '#b2f2bb'}`
                                }}
                              >
                                <Text size="sm">
                                  {mensaje.texto}
                                </Text>
                              </Paper>
                            </Stack>
                          </Group>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>

                {/* Input para nuevo mensaje - Solo para auditor y empresa */}
                {canPostMessages ? (
                  <Group gap="xs" align="flex-end" wrap="nowrap">
                    <TextInput
                      placeholder="Escribe un mensaje..."
                      value={nuevoMensaje}
                      onChange={(e) => setNuevoMensaje(e.currentTarget.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleEnviarMensaje();
                        }
                      }}
                      style={{ flex: 1 }}
                      size="sm"
                    />
                    <Button 
                      size="sm"
                      color="#a1a23b"
                      onClick={handleEnviarMensaje}
                      disabled={!nuevoMensaje.trim()}
                    >
                      Enviar
                    </Button>
                  </Group>
                ) : null}
              </Stack>
            </Paper>
          </Stack>
        )}
      </Modal>

      {/* 👥 MODAL DE GESTIÓN DE AUDITORES */}
      <Modal
        opened={openedAuditores}
        onClose={() => {
          setOpenedAuditores(false);
          setSelectedEmpresaForAuditores(null);
          setSearchAuditor('');
        }}
        title="Gestionar Auditores Asignados"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Selecciona los auditores que deseas asignar a esta empresa. Puedes asignar múltiples auditores.
          </Text>

          {/* 🔍 BUSCADOR DE AUDITORES */}
          <Input
            placeholder="Buscar auditor por nombre o correo..."
            value={searchAuditor}
            onChange={(e) => setSearchAuditor(e.currentTarget.value)}
            size="sm"
          />

          {loadingAuditores ? (
            <Text c="dimmed" ta="center" py="xl">
              Cargando auditores...
            </Text>
          ) : auditores.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No hay auditores registrados en el sistema
            </Text>
          ) : (
            <Stack gap="xs">
              {auditores
                .filter((auditor) => {
                  const query = searchAuditor.toLowerCase();
                  return (
                    auditor.nombre.toLowerCase().includes(query) ||
                    auditor.correo.toLowerCase().includes(query)
                  );
                })
                .map((auditor) => {
                const isAssigned = selectedEmpresaForAuditores
                  ? empresas.find(e => e.id === selectedEmpresaForAuditores)?.auditoresAsignados.includes(auditor.id)
                  : false;

                return (
                  <Paper
                    key={auditor.id}
                    p="md"
                    withBorder
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isAssigned ? '#e7f5ff' : 'white',
                      borderColor: isAssigned ? '#339af0' : '#dee2e6',
                    }}
                    onClick={() => handleToggleAuditor(auditor.id)}
                  >
                    <Group justify="space-between">
                      <Stack gap={4}>
                        <Text fw={600}>{auditor.nombre}</Text>
                        <Text size="xs" c="dimmed">{auditor.correo}</Text>
                      </Stack>
                      {isAssigned && (
                        <Badge color="blue" size="lg" leftSection={<FaCheck size={12} />}>
                          Asignado
                        </Badge>
                      )}
                    </Group>
                  </Paper>
                );
              })}
              
              {auditores.filter((auditor) => {
                const query = searchAuditor.toLowerCase();
                return (
                  auditor.nombre.toLowerCase().includes(query) ||
                  auditor.correo.toLowerCase().includes(query)
                );
              }).length === 0 && searchAuditor && (
                <Text c="dimmed" ta="center" py="md">
                  No se encontraron auditores con "{searchAuditor}"
                </Text>
              )}
            </Stack>
          )}

          <Group justify="flex-end" mt="md">
            <Button onClick={() => {
              setOpenedAuditores(false);
              setSelectedEmpresaForAuditores(null);
              setSearchAuditor('');
              showNotification({
                title: 'Auditores actualizados',
                message: 'Los auditores se han asignado correctamente',
                color: 'teal',
              });
            }}>
              Cerrar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 💬 MODAL PARA COMENTARIO DE ACTUALIZACIÓN */}
      <Modal
        opened={openedCommentModal}
        onClose={() => {
          setOpenedCommentModal(false);
          setCommentForUpdate('');
          setPendingFileForUpdate(null);
        }}
        title="Actualización de Archivo"
        size="md"
        centered
      >
        <Stack gap="md">
          <Paper p="sm" withBorder style={{ backgroundColor: '#fff9db', borderColor: '#ffd43b' }}>
            <Text size="sm" fw={500}>
              ⚠️ Este subpunto ya tiene un archivo cargado
            </Text>
          </Paper>

          <Text size="sm" c="dimmed">
            Por favor proporciona un comentario que describa esta actualización. Este comentario se registrará en el historial de cambios.
          </Text>

          <Textarea
            label="Comentario de actualización"
            placeholder='Ejemplo: "fecha actualizada", "correcciones aplicadas", "nueva versión"...'
            value={commentForUpdate}
            onChange={(e) => setCommentForUpdate(e.currentTarget.value)}
            required
            minRows={3}
            autoFocus
          />

          {pendingFileForUpdate && (
            <Paper p="xs" withBorder style={{ backgroundColor: '#f8f9fa' }}>
              <Group gap="xs">
                <FaFileUpload size={14} color="#a1a23b" />
                <Text size="xs" c="dimmed">
                  Archivo: <strong>{pendingFileForUpdate.name}</strong>
                </Text>
              </Group>
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                setOpenedCommentModal(false);
                setCommentForUpdate('');
                setPendingFileForUpdate(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              color="#a1a23b"
              onClick={handleConfirmFileUpdate}
              disabled={!commentForUpdate.trim() || uploadingFile}
              loading={uploadingFile}
            >
              Actualizar Archivo
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
