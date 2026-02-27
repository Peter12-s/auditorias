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
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaCheck, FaTimes, FaFileUpload, FaSearchPlus, FaSearchMinus, FaEye } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import { BasicPetition, createPoint, createSubpoint, updatePoint, updateSubpoint } from '../core/petition';
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
  tipo: 'empresa' | 'auditor' | 'admin';
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

interface Subpunto {
  id: string;
  nombre: string;
  periodicidad: string; // Diaria, Semanal, Mensual, etc.
  archivoUpload?: string; // Ruta del archivo
  estado: boolean; // true = activo, false = inactivo
  archivoCargado: boolean; // true = tiene archivos, false = no tiene
  cambios: Cambio[]; // Historial de cambios
  mensajes: Mensaje[]; // Mensajes del chat
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
  nombre: string;
  subEmpresa?: string;
  puntos: Punto[];
  auditoresAsignados: string[]; // IDs de auditores asignados
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
}

export function SGI() {
  const auth = useAuth();
  
  // Tab activo
  const [activeTab, setActiveTab] = useState<string>('configuracion');
  
  const [searchQuery, setSearchQuery] = useState('');
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
  const [viewingContext, setViewingContext] = useState<{ empresa: string; punto: string } | null>(null);
  const [openedAuditores, setOpenedAuditores] = useState(false);
  const [selectedEmpresaForAuditores, setSelectedEmpresaForAuditores] = useState<string | null>(null);
  const [searchAuditor, setSearchAuditor] = useState('');
  const [editingPeriodicidad, setEditingPeriodicidad] = useState(false);
  const [tempPeriodicidad, setTempPeriodicidad] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  
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

  // Estados para la parrilla de cambios
  const [openedCambio, setOpenedCambio] = useState(false);
  const [nuevoCambio, setNuevoCambio] = useState('');

  // Estados para el chat
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  // Función para detectar tipo de archivo
  const getFileType = (filename: string): 'pdf' | 'image' | 'doc' | 'excel' | 'unknown' => {
    if (!filename) return 'unknown';
    const ext = filename.toLowerCase().split('.').pop();
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

  // 🔄 useEffect para cargar archivos automáticamente
  useEffect(() => {
    if (openedViewer && viewingSubpunto?.archivoUpload && viewingSubpunto?.archivoCargado) {
      const fileType = getFileType(viewingSubpunto.archivoUpload);
      const fileUrl = `/${viewingSubpunto.archivoUpload}`;
      
      // Cargar Excel si es necesario
      if (fileType === 'excel' && excelData.length === 0 && !loadingExcel) {
        loadExcelFile(fileUrl);
      }
      
      // Cargar Word si es necesario
      if (fileType === 'doc' && !wordLoaded && !loadingWord) {
        // Esperar a que el DOM esté listo
        setTimeout(() => {
          const wordContainerId = `word-container-${viewingSubpunto.id}`;
          const container = document.getElementById(wordContainerId);
          if (container) {
            loadWordFile(fileUrl, container as HTMLDivElement);
          }
        }, 100);
      }
    }
  }, [openedViewer, viewingSubpunto?.id, viewingSubpunto?.archivoCargado]);

  // Función para mapear periodicidad del backend a UI
  const mapPeriodicityToUI = (periodicity: string | undefined): string => {
    if (!periodicity) return 'Mensual';
    const map: { [key: string]: string } = {
      'monthly': 'Mensual',
      'yearly': 'Anual',
      'weekly': 'Semanal',
      'Mensual': 'Mensual',
      'Anual': 'Anual',
      'Semanal': 'Semanal',
    };
    return map[periodicity.toLowerCase()] || 'Mensual';
  };

  // Función para mapear periodicidad de UI a backend
  const mapPeriodicityToAPI = (periodicidad: string): 'monthly' | 'yearly' => {
    const map: { [key: string]: 'monthly' | 'yearly' } = {
      'Mensual': 'monthly',
      'Anual': 'yearly',
      'Semanal': 'monthly', // Default a monthly si es semanal
    };
    return map[periodicidad] || 'monthly';
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
        const response = await BasicPetition({
          endpoint: '/templates/companies',
          method: 'GET',
          data: {},
          showNotifications: false,
        });
        
        
        if (response && Array.isArray(response)) {
          // Mapear respuesta de la API a la estructura Empresa
          const empresasFromAPI = response.map((company: any) => ({
            id: company.companyUserId || company.id || company._id,
            nombre: company.profile?.nombreEmpresa || company.name || company.nombre || 'Sin nombre',
            subEmpresa: company.profile?.subEmpresa,
            auditoresAsignados: [],
            puntos: [],
          }));
          
          setEmpresas(empresasFromAPI);
        }
      } catch (error) {
      }
    };

    const isAdmin = auth?.userType?.toLowerCase() === 'admin' || 
                   auth?.userType === 'Administrador';
    
    if (isAdmin && !empresasCargadasRef.current) {
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
    },
    validate: {
      nombre: (value) => (!value ? 'El nombre es requerido' : null),
      periodicidad: (value) => (!value ? 'La periodicidad es requerida' : null),
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
        console.log('✏️ Actualizando punto:', editingPunto.punto.id);
        await updatePoint(parseInt(editingPunto.punto.id), values.nombre);

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
      } catch (error) {
        console.error('❌ Error actualizando punto:', error);
        showNotification({
          title: 'Error',
          message: 'No se pudo actualizar el punto',
          color: 'red',
        });
      }
    } else {
      // Crear nuevo punto con POST al API
      try {
        console.log('🆕 Creando punto para empresa:', selectedEmpresa);
        const response = await createPoint(parseInt(selectedEmpresa), values.nombre);

        console.log('✅ Punto creado:', response);

        // Recargar puntos después de crear
        await handleLoadPuntos(selectedEmpresa);

        showNotification({
          title: 'Punto creado',
          message: 'El punto se creó correctamente',
          color: 'green',
        });
      } catch (error) {
        console.error('❌ Error creando punto:', error);
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
  const handleDeletePunto = (empresaId: string, puntoId: string) => {
    setDeleteMessage('¿Eliminar este punto y todos sus subpuntos?');
    setDeleteAction(() => () => {
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
      setOpenedConfirm(false);
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
    formSubpunto.setValues({ 
      nombre: subpunto.nombre,
      periodicidad: subpunto.periodicidad,
      estado: subpunto.estado,
    });
    setOpenedSubpunto(true);
  };

  // 💾 GUARDAR SUBPUNTO
  const handleSubmitSubpunto = async (values: FormSubpunto) => {
    if (!selectedEmpresa || !selectedPunto) return;

    // Mapear periodicidad a valores de API
    const periodicity = mapPeriodicityToAPI(values.periodicidad);

    if (editingSubpunto) {
      // Editar subpunto existente con PATCH
      try {
        console.log('✏️ Actualizando subpunto:', editingSubpunto.subpunto.id);
        await updateSubpoint(
          parseInt(editingSubpunto.subpunto.id),
          values.nombre,
          periodicity
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
        console.error('❌ Error actualizando subpunto:', error);
        showNotification({
          title: 'Error',
          message: 'No se pudo actualizar el subpunto',
          color: 'red',
        });
      }
    } else {
      // Crear nuevo subpunto con POST al API
      try {
        console.log('🆕 Creando subpunto para punto:', selectedPunto);
        
        const response = await createSubpoint(
          parseInt(selectedPunto),
          values.nombre,
          periodicity
        );

        console.log('✅ Subpunto creado:', response);

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
        console.error('❌ Error creando subpunto:', error);
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
    console.log('📋 Abriendo modal de auditores para empresa:', empresaId);
    setSelectedEmpresaForAuditores(empresaId);
    setOpenedAuditores(true);
    
    // Cargar lista completa de auditores para el modal
    setLoadingAuditores(true);
    try {
      console.log('🔄 Llamando a /templates/auditors con companyUserId:', empresaId);
      const response = await BasicPetition({
        endpoint: `/templates/auditors?companyUserId=${empresaId}`,
        method: 'GET',
        showNotifications: false,
      });

      console.log('✅ Respuesta de auditores:', response);

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
        console.log('👥 Auditores procesados:', auditoresFromAPI.length);
        setAuditores(auditoresFromAPI);
      }
    } catch (error) {
      console.error('❌ Error cargando auditores:', error);
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
    console.log('👥 Cargando auditores para empresa:', empresaId);
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
        
        console.log('✅ Auditores asignados:', auditoresAsignados.length);

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
      console.error('❌ Error cargando auditores:', error);
    }
  };

  // � CARGAR DATOS DE EMPRESA (puntos y auditores al expandir)
  const handleLoadEmpresaData = async (empresaId: string) => {
    // Si ya tiene datos cargados, no volver a cargar
    if (empresasConDatos.has(empresaId)) {
      console.log('✅ Empresa ya tiene datos cargados:', empresaId);
      return;
    }

    console.log('🔄 Cargando datos completos para empresa:', empresaId);

    // Marcar empresa como cargando
    setEmpresasCargando((prev) => new Set([...prev, empresaId]));

    try {
      // Cargar en paralelo puntos y auditores
      await Promise.all([
        handleLoadPuntos(empresaId),
        handleLoadAuditores(empresaId)

      ]);

      // Marcar empresa como cargada
      setEmpresasConDatos((prev) => new Set([...prev, empresaId]));
      console.log('✅ Datos completos cargados para empresa:', empresaId);
    } catch (error) {
      console.error('❌ Error cargando datos de empresa:', error);
    } finally {
      // Quitar empresa de la lista de cargando
      setEmpresasCargando((prev) => {
        const newSet = new Set(prev);
        newSet.delete(empresaId);
        return newSet;
      });
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

      console.log('✅ Subpuntos cargados para punto:', pointId, response);

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Error cargando subpuntos para punto:', pointId, error);
      return [];
    }
  };
  // �📋 CARGAR PUNTOS DE UNA EMPRESA
  const handleLoadPuntos = async (empresaId: string) => {
    console.log('📋 Cargando puntos para empresa:', empresaId);
    try {
      const response = await BasicPetition({
        endpoint: `/templates/companies/${empresaId}/points`,
        method: 'GET',
        showNotifications: false,
      });

      console.log('✅ Respuesta de puntos:', response);

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
                    nombre: sub.nombre || sub.name,
                    periodicidad: mapPeriodicityToUI(sub.periodicidad || sub.periodicity),
                    archivoUpload: sub.archivoUpload || '',
                    estado: sub.estado !== false,
                    archivoCargado: !!sub.archivoUpload,
                    cambios: [],
                    mensajes: [],
                  }))
                : [],
            };
          })
        );

        console.log('📋 Puntos con subpuntos procesados:', puntosWithSubpoints.length);

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
      console.error('❌ Error cargando puntos:', error);
    }
  };

  const handleToggleAuditor = async (auditorId: string) => {
    if (!selectedEmpresaForAuditores) return;

    try {
      console.log('🔄 Asignando auditor:', {
        auditorUserId: Number(auditorId),
        companyUserId: Number(selectedEmpresaForAuditores)
      });

      await BasicPetition({
        endpoint: '/templates/auditor-company-assignments',
        method: 'POST',
        data: {
          auditorUserId: Number(auditorId),
          companyUserId: Number(selectedEmpresaForAuditores)
        },
        showNotifications: false,
      });

      console.log('✅ Auditor asignado correctamente');

      // Actualizar estado local
      setEmpresas((prev) =>
        prev.map((empresa) => {
          if (empresa.id === selectedEmpresaForAuditores) {
            const isAssigned = empresa.auditoresAsignados.includes(auditorId);
            return {
              ...empresa,
              auditoresAsignados: isAssigned
                ? empresa.auditoresAsignados.filter((id) => id !== auditorId)
                : [...empresa.auditoresAsignados, auditorId],
            };
          }
          return empresa;
        })
      );

      showNotification({
        title: 'Asignación actualizada',
        message: 'El auditor se asignó correctamente',
        color: 'green',
      });
    } catch (error) {
      console.error('❌ Error asignando auditor:', error);
      showNotification({
        title: 'Error',
        message: 'No se pudo asignar el auditor',
        color: 'red',
      });
    }
  };

  // 📅 ACTUALIZAR PERIODICIDAD
  const handleUpdatePeriodicidad = async () => {
    if (!viewingSubpunto || !viewingContext) return;

    try {
      // Mapear periodicidad a valores de API
      const periodicity = mapPeriodicityToAPI(tempPeriodicidad);
      
      console.log('📅 Actualizando periodicidad del subpunto:', {
        subpointId: viewingSubpunto.id,
        periodicity: periodicity
      });

      await updateSubpoint(parseInt(viewingSubpunto.id), viewingSubpunto.nombre, periodicity);

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
      console.error('❌ Error actualizando periodicidad:', error);
      showNotification({
        title: 'Error',
        message: 'No se pudo actualizar la periodicidad',
        color: 'red',
      });
    }
  };

  // 📎 MANEJAR SUBIDA DE ARCHIVO
  const handleFileUpload = (file: File | null) => {
    if (!file || !viewingSubpunto || !viewingContext) return;

    setUploadingFile(true);

    // Crear URL temporal del archivo para visualización
    const fileUrl = URL.createObjectURL(file);

    // Simular upload (aquí iría la lógica de subida real)
    setTimeout(() => {
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
                        ? { ...sp, archivoCargado: true, archivoUpload: file.name }
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
        prev ? { ...prev, archivoCargado: true, archivoUpload: file.name } : null
      );
      
      // Guardar la URL del archivo temporalmente
      sessionStorage.setItem(`file_${viewingSubpunto.id}`, fileUrl);
      
      setUploadingFile(false);
      showNotification({
        title: viewingSubpunto.archivoCargado ? 'Archivo actualizado' : 'Archivo subido',
        message: `El archivo "${file.name}" se ${viewingSubpunto.archivoCargado ? 'actualizó' : 'subió'} correctamente`,
        color: 'green',
      });
    }, 1000);
  };

  // 📝 AGREGAR CAMBIO
  const handleAgregarCambio = () => {
    if (!nuevoCambio.trim() || !viewingSubpunto || !viewingContext) return;

    // Obtener nombre del usuario según el tipo
    let nombreUsuario = '';
    let rolUsuario = '';
    
    if (auth.userType === 'admin') {
      nombreUsuario = 'Administrador del Sistema';
      rolUsuario = 'Administrador';
    } else if (auth.userType === 'auditor') {
      // Buscar el nombre del auditor en la lista de auditores
      const auditor = auditores.find(a => a.correo === 'auditor@dogroup.com'); // Aquí debería usar el correo del usuario logueado
      nombreUsuario = auditor ? auditor.nombre : 'Auditor';
      rolUsuario = 'Auditor';
    }

    const cambio: Cambio = {
      id: `${viewingSubpunto.id}-cambio-${Date.now()}`,
      version: viewingSubpunto.cambios.length,
      descripcion: nuevoCambio,
      fecha: new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }),
      usuarioNombre: nombreUsuario,
      usuarioRol: rolUsuario,
    };

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
                      ? { ...sp, cambios: [...sp.cambios, cambio] }
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
      prev ? { ...prev, cambios: [...prev.cambios, cambio] } : null
    );

    setNuevoCambio('');
    setOpenedCambio(false);
    showNotification({
      title: 'Cambio registrado',
      message: `Versión ${cambio.version} agregada correctamente`,
      color: 'green',
    });
  };

  // 📥 DESCARGAR REPORTE DE CAMBIOS
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
  const handleEnviarMensaje = () => {
    if (!nuevoMensaje.trim() || !viewingSubpunto || !viewingContext) return;

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
      usuario: auth.userType === 'admin' ? 'Administrador' : 
               auth.userType === 'auditor' ? 'Auditor' : 
               viewingContext.empresa,
      tipo: auth.userType as 'empresa' | 'auditor' | 'admin'
    };

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
  };

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="lg">
        SGI - Sistema de Gestión Información
      </Title>

      {/* 🔍 BUSCADOR */}
      <Group justify="flex-end" mb="xl">
        <Input
          placeholder="Buscar empresa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          size="md"
          style={{ width: '40%' }}
        />
       
      </Group>

      {/* 📋 LISTA DE EMPRESAS CON ACCORDION */}
      <Stack gap="md">
        {empresasPaginadas.map((empresa) => {
          // Calcular progreso total de la empresa
          const totalSubpuntos = empresa.puntos.reduce((sum, punto) => sum + punto.subpuntos.length, 0);
          const subpuntosConArchivo = empresa.puntos.reduce(
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
                        <Text fw={600}>{empresa.nombre}</Text>
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
                    <Group justify="space-between" align="center">
                      <Stack gap={4}>
                        <Text size="sm" fw={600} c="dimmed">Auditores Asignados:</Text>
                        {empresa.auditoresAsignados.length === 0 ? (
                          <Text size="sm" c="dimmed" fs="italic">Sin auditores asignados</Text>
                        ) : (
                          <Group gap="xs">
                            {empresa.auditoresAsignados.map((auditorId) => {
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
                      {auth.userType === 'Administrador' && (
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
                  </Paper>

                  {/* BOTÓN PARA AÑADIR PUNTO */}
                  {auth.userType !== 'empresa' && (
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

                  {/* LISTA DE PUNTOS */}
                  
                  { auth.userType !== 'empresa' && empresa.puntos.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">
                      No hay puntos registrados. Haz clic en "Añadir Punto" para crear uno.
                    </Text>
                  ) : (
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
                          <Group justify="space-between" mb="sm">
                            <Text fw={600} size="lg" c="#4a4a4a">
                              {punto.nombre}
                            </Text>
                            <Group gap={8}>
                              {auth.userType !== 'empresa' && (
                                <ActionIcon
                                  color="blue"
                                  variant="light"
                                  onClick={() => handleEditPunto(empresa.id, punto)}
                                >
                                  <FaEdit size={16} />
                                </ActionIcon>
                              )}
                              {auth.userType === 'admin' && (
                                <ActionIcon
                                  color="red"
                                  variant="light"
                                  onClick={() => handleDeletePunto(empresa.id, punto.id)}
                                >
                                  <FaTrash size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          </Group>

                          {/* BARRA DE PROGRESO DEL PUNTO */}
                          {punto.subpuntos.length > 0 && (
                            <Box mb="sm">
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
                              <Text size="xs" ta="center" mt={2} fw={500} c="dimmed">
                                {punto.subpuntos.filter((s) => s.archivoCargado).length} / {punto.subpuntos.length} completados
                              </Text>
                            </Box>
                          )}

                          <Divider my="sm" />

                          {/* SUBPUNTOS - ACCORDION */}
                          {punto.subpuntos.length > 0 ? (
                            <Accordion 
                              chevronPosition="right"
                              defaultValue={null}
                              styles={{
                                chevron: {
                                  fontSize: 14,
                                  marginRight: 0,
                                }
                              }}
                            >
                              {punto.subpuntos.map((subpunto) => (
                                <Accordion.Item 
                                  key={subpunto.id}
                                  value={subpunto.id}
                                  style={{
                                    backgroundColor: '#f5f7d0',
                                    border: '1px solid #e0e3a8',
                                    marginBottom: 8,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Accordion.Control 
                                    style={{
                                      padding: '10px 12px',
                                    }}
                                  >
                                    <Group justify="space-between" style={{ flex: 1, marginRight: 16 }}>
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
                                        <Text size="xs" c="dimmed">
                                          Periodicidad: {subpunto.periodicidad}
                                        </Text>
                                      </Stack>
                                    </Group>
                                  </Accordion.Control>

                                  <Accordion.Panel style={{ padding: '12px' }}>
                                    <Stack gap="sm">
                                      {/* BOTONES DE ACCIÓN */}
                                      <Group justify="space-between" gap={8}>
                                        <Button
                                          size="xs"
                                          variant="light"
                                          color="#a1a23b"
                                          onClick={() => {
                                            setViewingSubpunto(subpunto);
                                            setViewingContext({ empresa: empresa.nombre, punto: punto.nombre });
                                            setOpenedViewer(true);
                                          }}
                                          leftSection={<FaEye size={12} />}
                                          fullWidth
                                        >
                                          Ver Detalles
                                        </Button>
                                        {auth.userType !== 'empresa' && (
                                          <ActionIcon
                                            size="md"
                                            color="blue"
                                            variant="light"
                                            onClick={() => handleEditSubpunto(empresa.id, punto.id, subpunto)}
                                            title="Editar"
                                          >
                                            <FaEdit size={14} />
                                          </ActionIcon>
                                        )}
                                        {auth.userType === 'admin' && (
                                          <ActionIcon
                                            size="md"
                                            color="red"
                                            variant="light"
                                            onClick={() => handleDeleteSubpunto(empresa.id, punto.id, subpunto.id)}
                                            title="Eliminar"
                                          >
                                            <FaTrash size={14} />
                                          </ActionIcon>
                                        )}
                                      </Group>
                                    </Stack>
                                  </Accordion.Panel>
                                </Accordion.Item>
                              ))}
                            </Accordion>
                          ) : (
                            <Text c="dimmed" size="sm" ta="center" py="md">
                              No hay subpuntos. {auth.userType !== 'empresa' && 'Haz clic en "Añadir Subpunto" para crear uno.'}
                            </Text>
                          )}

                          {/* BOTÓN PARA AÑADIR SUBPUNTO */}
                          {auth.userType !== 'empresa' && (
                            <Button
                              size="xs"
                              variant="light"
                              color="gray"
                              leftSection={<FaPlus size={12} />}
                              onClick={() => handleOpenNewSubpunto(empresa.id, punto.id)}
                              mt="sm"
                              fullWidth
                            >
                              Añadir Subpunto
                            </Button>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  )}
                    </>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Paper>
          );
        })}

        {empresasFiltradas.length === 0 && (
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
        size="md"
      >
        <form onSubmit={formSubpunto.onSubmit(handleSubmitSubpunto)}>
          <Stack gap="md">
            <TextInput
              label="Nombre del Subpunto"
              placeholder="Ej: Subpunto 4.1"
              required
              {...formSubpunto.getInputProps('nombre')}
            />

            <Select
              label="Periodicidad"
              placeholder="Seleccione periodicidad"
              required
              data={[
             
                { value: 'Semanal', label: 'Semanal' },
                { value: 'Mensual', label: 'Mensual' },
                { value: 'Anual', label: 'Anual' },
              ]}
              {...formSubpunto.getInputProps('periodicidad')}
            />


            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  setOpenedSubpunto(false);
                  formSubpunto.reset();
                  setEditingSubpunto(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" color="#a1a23b">
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
                {/* Periodicidad con opción de editar */}
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <Text size="sm" fw={600}>Periodicidad:</Text>
                    {editingPeriodicidad ? (
                      <Group gap="xs">
                        <Select
                          size="xs"
                          value={tempPeriodicidad}
                          onChange={(value) => setTempPeriodicidad(value || '')}
                          data={[
                            { value: 'Semanal', label: 'Semanal' },
                            { value: 'Mensual', label: 'Mensual' },
                            { value: 'Anual', label: 'Anual' },
                          ]}
                          style={{ width: 150 }}
                        />
                        <ActionIcon
                          size="sm"
                          color="green"
                          variant="light"
                          onClick={handleUpdatePeriodicidad}
                        >
                          <FaCheck size={12} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="light"
                          onClick={() => setEditingPeriodicidad(false)}
                        >
                          <FaTimes size={12} />
                        </ActionIcon>
                      </Group>
                    ) : (
                      <Group gap="xs">
                        <Text size="sm">{viewingSubpunto.periodicidad}</Text>
                        {auth.userType !== 'empresa' && (
                          <ActionIcon
                            size="xs"
                            color="blue"
                            variant="subtle"
                            onClick={() => {
                              setTempPeriodicidad(viewingSubpunto.periodicidad);
                              setEditingPeriodicidad(true);
                            }}
                          >
                            <FaEdit size={10} />
                          </ActionIcon>
                        )}
                      </Group>
                    )}
                  </Group>
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
                  {(auth.userType === 'admin' || 
                    auth.userType === 'auditor' || 
                    (auth.userType === 'empresa' && !viewingSubpunto.archivoCargado)) && (
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
                          href={`/${viewingSubpunto.archivoUpload || 'sample.pdf'}`}
                          download
                        >
                          Descargar
                        </Button>
                      </Group>
                    </Paper>

                    {/* Controles según tipo de archivo */}
                    {(() => {
                      const fileType = getFileType(viewingSubpunto.archivoUpload || 'documento.pdf');
                      
                      // El iframe de PDF tiene sus propios controles nativos
                      if (fileType === 'pdf') {
                        return null;
                      }
                      
                      if (fileType === 'image') {
                        return (
                          <Group justify="center" gap="md" wrap="wrap">
                            <Group gap="xs">
                              <ActionIcon
                                size="lg"
                                variant="light"
                                color="blue"
                                onClick={() => setScale(prev => Math.max(0.5, prev - 0.2))}
                                disabled={scale <= 0.5}
                              >
                                <FaSearchMinus size={16} />
                              </ActionIcon>
                              <Text size="sm" fw={500}>
                                {Math.round(scale * 100)}%
                              </Text>
                              <ActionIcon
                                size="lg"
                                variant="light"
                                color="blue"
                                onClick={() => setScale(prev => Math.min(2.0, prev + 0.2))}
                                disabled={scale >= 2.0}
                              >
                                <FaSearchPlus size={16} />
                              </ActionIcon>
                            </Group>
                          </Group>
                        );
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
                        const fileType = getFileType(viewingSubpunto.archivoUpload || 'documento.pdf');
                        // Para PDF e imágenes, usar blob si existe. Para Word/Excel, usar solo ruta directa
                        const storedFileUrl = sessionStorage.getItem(`file_${viewingSubpunto.id}`);
                        let fileUrl = `/${viewingSubpunto.archivoUpload || 'sample.pdf'}`;
                        
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
                            return (
                              <Box style={{ 
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                overflow: 'auto'
                              }}>
                                <img 
                                  src={fileUrl} 
                                  alt="Archivo cargado"
                                  style={{ 
                                    maxWidth: `${scale * 100}%`,
                                    maxHeight: '65vh',
                                    objectFit: 'contain',
                                    transition: 'all 0.3s ease'
                                  }}
                                />
                              </Box>
                            );

                          case 'excel':
                            // Para Excel, mostrar interfaz de carga
                            return (
                                <Stack gap="md">
                                  {/* Selector de hojas */}
                                  {excelSheets.length > 1 && (
                                    <Group gap="xs">
                                      <Text size="sm" fw={600}>Hoja:</Text>
                                      {excelSheets.map((sheet) => (
                                        <Button
                                          key={sheet}
                                          size="xs"
                                          variant={selectedSheet === sheet ? 'filled' : 'light'}
                                          color="#a1a23b"
                                          onClick={() => changeExcelSheet(sheet, fileUrl)}
                                        >
                                          {sheet}
                                        </Button>
                                      ))}
                                    </Group>
                                  )}

                                  {loadingExcel ? (
                                    <Stack align="center" gap="md" p="xl">
                                      <Text>📊 Cargando Excel...</Text>
                                    </Stack>
                                  ) : excelData.length > 0 ? (
                                    <Box style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                                      <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '0.875rem',
                                        backgroundColor: 'white'
                                      }}>
                                        <tbody>
                                          {excelData.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                              {row.map((cell, cellIndex) => (
                                                <td
                                                  key={cellIndex}
                                                  style={{
                                                    border: '1px solid #dee2e6',
                                                    padding: '8px',
                                                    backgroundColor: rowIndex === 0 ? '#f1f3f5' : 'white',
                                                    fontWeight: rowIndex === 0 ? 600 : 400,
                                                    minWidth: '100px'
                                                  }}
                                                >
                                                  {cell !== null && cell !== undefined ? String(cell) : ''}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </Box>
                                  ) : (
                                    <Stack align="center" gap="md" p="xl">
                                      <Text style={{ fontSize: '60px' }}>📊</Text>
                                      <Text size="lg" fw={600} c="#a1a23b">Documento Excel</Text>
                                      <Text size="sm" c="dimmed">Haz clic para cargar y visualizar el archivo</Text>
                                      <Button
                                        size="md"
                                        leftSection={<FaFileUpload size={16} />}
                                        color="#a1a23b"
                                        onClick={() => loadExcelFile(fileUrl)}
                                      >
                                        Cargar Excel
                                      </Button>
                                    </Stack>
                                  )}
                                </Stack>
                              );

                          case 'doc':
                            // Para Word, mostrar interfaz de carga con docx-preview
                            const wordContainerId = `word-container-${viewingSubpunto.id}`;
                            
                            return (
                                <Stack gap="md">
                                  {loadingWord && (
                                    <Stack align="center" gap="md" p="xl">
                                      <Text>📄 Cargando documento Word...</Text>
                                    </Stack>
                                  )}
                                  
                                  <Paper
                                    p="md"
                                    withBorder
                                    style={{
                                      backgroundColor: 'white',
                                      maxHeight: '600px',
                                      overflowY: 'auto',
                                      minHeight: wordLoaded || loadingWord ? '400px' : '100px'
                                    }}
                                  >
                                    <div
                                      id={wordContainerId}
                                      style={{
                                        minHeight: '400px'
                                      }}
                                    />
                                  </Paper>
                                </Stack>
                              );

                          default:
                            return (
                              <Stack align="center" gap="md" p="xl">
                                <FaFileUpload size={40} color="#868e96" />
                                <Text c="dimmed" fw={500}>Tipo de archivo no soportado</Text>
                                <Text size="sm" c="dimmed" ta="center">
                                  Este tipo de archivo no se puede previsualizar. Descárgalo para verlo.
                                </Text>
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
                      {auth.userType === 'empresa' && (
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
                    {auth.userType !== 'empresa' && (
                      <Button
                        size="sm"
                        variant="light"
                        color="#a1a23b"
                        leftSection={<FaPlus size={14} />}
                        onClick={() => setOpenedCambio(true)}
                      >
                        Agregar Cambio
                      </Button>
                    )}
                    {(auth.userType === 'admin' || auth.userType === 'auditor') && viewingSubpunto.cambios.length > 0 && (
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
                          Usa el botón "Agregar Cambio" para registrar modificaciones
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
                              fontWeight: 600,
                              width: '150px'
                            }}>
                              Usuario
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
                                color: '#495057'
                              }}>
                                {cambio.usuarioNombre}
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
                        const isEmpresa = mensaje.tipo === 'empresa';
                        const isAuditor = mensaje.tipo === 'auditor' || mensaje.tipo === 'admin';
                        
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
                                backgroundColor: isEmpresa ? '#4dabf7' : '#51cf66',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                fontSize: '18px'
                              }}
                            >
                              {isEmpresa ? '🏢' : '👤'}
                            </Box>
                            
                            {/* Contenido del mensaje */}
                            <Stack gap={4} style={{ flex: 1 }}>
                              <Group gap="xs" wrap="nowrap">
                                <Text size="sm" fw={600} c={isEmpresa ? '#1971c2' : '#2f9e44'}>
                                  {mensaje.usuario}
                                </Text>
                                <Badge 
                                  size="xs" 
                                  color={isEmpresa ? 'blue' : 'green'}
                                  variant="light"
                                >
                                  {isEmpresa ? 'Empresa' : mensaje.tipo === 'admin' ? 'Admin' : 'Auditor'}
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
                                  border: `1px solid ${isEmpresa ? '#a5d8ff' : '#b2f2bb'}`
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
                {auth.userType !== 'admin' ? (
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

      {/* 📝 MODAL PARA AGREGAR CAMBIO */}
      <Modal
        opened={openedCambio}
        onClose={() => {
          setOpenedCambio(false);
          setNuevoCambio('');
        }}
        title="Agregar Cambio"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Registra un nuevo cambio para este subpunto. Se asignará automáticamente la versión {viewingSubpunto?.cambios.length || 0}.
          </Text>

          <Textarea
            label="Descripción del Cambio"
            placeholder="Describe el cambio realizado..."
            value={nuevoCambio}
            onChange={(e) => setNuevoCambio(e.currentTarget.value)}
            required
            minRows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                setOpenedCambio(false);
                setNuevoCambio('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              color="#a1a23b"
              onClick={handleAgregarCambio}
              disabled={!nuevoCambio.trim()}
            >
              Registrar Cambio
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
