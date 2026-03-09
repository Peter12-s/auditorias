import { useEffect, useState } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Paper,
  Title,
  Divider,
  ThemeIcon,
  ScrollArea,
  Loader,
  Center,
  Alert,
  Button,
  Accordion,
} from '@mantine/core';
import { FaExclamationTriangle, FaClock, FaCalendarTimes, FaCheckCircle, FaFire, FaBell } from 'react-icons/fa';
import { BasicPetition } from '../core/petition';

// ==========================================
// INTERFACES
// ==========================================

interface MissingDeadline {
  templatePointId: number;
  templatePointName: string;
  templateSubpointId: number;
  templateSubpointName: string;
  periodicity: string;
  periodYear: number;
  periodMonth: number;
  dueAt: string;
  daysOverdue: number;
}

interface ExpiringDeadline {
  templatePointId: number;
  templatePointName: string;
  templateSubpointId: number;
  templateSubpointName: string;
  periodicity: string;
  periodYear: number;
  periodMonth: number;
  dueAt: string;
  daysUntilDue: number;
}

interface DeadlinesResponse {
  companyUserId: number;
  generatedAt: string;
  graceDays: {
    monthly: number;
    yearly: number;
  };
  alertThresholdDays: number;
  missing: MissingDeadline[];
  expiring: ExpiringDeadline[];
}

interface DeadlinesModalProps {
  opened: boolean;
  onClose: () => void;
  companyUserId: string | null;
}

// ==========================================
// HELPERS
// ==========================================

const getMonthName = (month: number): string => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || '';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getUrgencyLevel = (daysOverdue: number): { color: string; label: string; icon: React.ReactNode } => {
  if (daysOverdue > 30) {
    return { color: 'red', label: 'CRÍTICO', icon: <FaFire size={14} /> };
  } else if (daysOverdue > 14) {
    return { color: 'orange', label: 'URGENTE', icon: <FaExclamationTriangle size={14} /> };
  } else if (daysOverdue > 7) {
    return { color: 'yellow', label: 'ATENCIÓN', icon: <FaClock size={14} /> };
  }
  return { color: 'yellow', label: 'PENDIENTE', icon: <FaClock size={14} /> };
};

const getExpiringLevel = (daysUntilDue: number): { color: string; label: string } => {
  if (daysUntilDue <= 3) {
    return { color: 'orange', label: 'MUY PRONTO' };
  } else if (daysUntilDue <= 7) {
    return { color: 'yellow', label: 'PRÓXIMO' };
  }
  return { color: 'blue', label: 'PROGRAMADO' };
};

// ==========================================
// COMPONENTE
// ==========================================

export function DeadlinesModal({ opened, onClose, companyUserId }: DeadlinesModalProps) {
  const [loading, setLoading] = useState(true);
  const [deadlines, setDeadlines] = useState<DeadlinesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Log cada vez que el componente renderiza
  console.log('🎯 DeadlinesModal RENDER:', { opened, companyUserId, loading, error });

  useEffect(() => {
    console.log('📋 DeadlinesModal useEffect TRIGGER:', { opened, companyUserId });
    if (opened && companyUserId) {
      console.log('✅ Condición cumplida, llamando fetchDeadlines');
      fetchDeadlines();
    } else {
      console.log('❌ Condición NO cumplida:', { opened, companyUserId });
    }
  }, [opened, companyUserId]);

  const fetchDeadlines = async () => {
    if (!companyUserId) return;

    console.log('📡 Fetching deadlines for company:', companyUserId);
    setLoading(true);
    setError(null);

    try {
      const response = await BasicPetition({
        endpoint: `/audits/companies/${companyUserId}/deadlines`,
        method: 'GET',
      });

      console.log('📥 Deadlines response:', response);

      if (response && typeof response === 'object') {
        setDeadlines(response as DeadlinesResponse);
      }
    } catch (err) {
      console.error('Error al cargar deadlines:', err);
      setError('No se pudieron cargar los plazos de entrega');
    } finally {
      setLoading(false);
    }
  };

  const totalMissing = deadlines?.missing?.length || 0;
  const totalExpiring = deadlines?.expiring?.length || 0;
  const hasCritical = deadlines?.missing?.some(m => m.daysOverdue > 30) || false;
  const hasUrgent = deadlines?.missing?.some(m => m.daysOverdue > 14 && m.daysOverdue <= 30) || false;

  // Agrupar missing por punto
  const missingByPoint = deadlines?.missing?.reduce((acc, item) => {
    const key = item.templatePointId;
    if (!acc[key]) {
      acc[key] = {
        pointName: item.templatePointName,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<number, { pointName: string; items: MissingDeadline[] }>) || {};

  // Agrupar expiring por punto
  const expiringByPoint = deadlines?.expiring?.reduce((acc, item) => {
    const key = item.templatePointId;
    if (!acc[key]) {
      acc[key] = {
        pointName: item.templatePointName,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<number, { pointName: string; items: ExpiringDeadline[] }>) || {};

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon 
            size="lg" 
            radius="xl" 
            color={hasCritical ? 'red' : hasUrgent ? 'orange' : totalMissing > 0 ? 'yellow' : 'green'}
            variant="light"
          >
            {totalMissing > 0 ? <FaExclamationTriangle size={18} /> : <FaCheckCircle size={18} />}
          </ThemeIcon>
          <Title order={3}>Estado de Entregas</Title>
        </Group>
      }
      size="lg"
      centered
      zIndex={9999}
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      styles={{
        header: {
          borderBottom: '1px solid #e9ecef',
          paddingBottom: 12,
        },
      }}
    >
      {loading ? (
        <Center py="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Cargando estado de entregas...</Text>
          </Stack>
        </Center>
      ) : error ? (
        <Alert color="red" title="Error" icon={<FaExclamationTriangle />}>
          {error}
        </Alert>
      ) : (
        <Stack gap="md">
          {/* RESUMEN GENERAL */}
          <Paper p="md" radius="md" withBorder bg={totalMissing > 0 ? '#fff5f5' : '#f0fff4'}>
            <Group justify="space-between" align="center">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">Resumen General</Text>
                <Group gap="lg">
                  <Group gap="xs">
                    <Badge 
                      size="lg" 
                      color={totalMissing > 0 ? 'red' : 'green'} 
                      variant="filled"
                      leftSection={<FaCalendarTimes size={12} />}
                    >
                      {totalMissing} Vencidos
                    </Badge>
                  </Group>
                  <Group gap="xs">
                    <Badge 
                      size="lg" 
                      color={totalExpiring > 0 ? 'yellow' : 'gray'} 
                      variant="filled"
                      leftSection={<FaBell size={12} />}
                    >
                      {totalExpiring} Por vencer
                    </Badge>
                  </Group>
                </Group>
              </Stack>
              {totalMissing === 0 && totalExpiring === 0 && (
                <ThemeIcon size={48} radius="xl" color="green" variant="light">
                  <FaCheckCircle size={24} />
                </ThemeIcon>
              )}
            </Group>
          </Paper>

          {/* MENSAJE SI TODO ESTÁ AL DÍA */}
          {totalMissing === 0 && totalExpiring === 0 && (
            <Alert color="green" title="¡Excelente!" icon={<FaCheckCircle />}>
              Todas tus entregas están al día. No tienes documentos pendientes ni próximos a vencer.
            </Alert>
          )}

          <ScrollArea.Autosize mah={400}>
            <Stack gap="md">
              {/* SECCIÓN: DOCUMENTOS VENCIDOS (EXTEMPORÁNEOS) */}
              {totalMissing > 0 && (
                <>
                  <Divider 
                    label={
                      <Group gap="xs">
                        <FaCalendarTimes size={14} color="#e03131" />
                        <Text fw={600} c="red">Documentos Vencidos (Extemporáneos)</Text>
                      </Group>
                    } 
                    labelPosition="left" 
                  />
                  
                  <Alert color="red" variant="light" icon={<FaExclamationTriangle />}>
                    <Text size="sm">
                      Estos documentos ya pasaron su fecha límite. Si los subes ahora, serán marcados como <strong>extemporáneos</strong>.
                    </Text>
                  </Alert>

                  <Accordion variant="separated">
                    {Object.entries(missingByPoint).map(([pointId, { pointName, items }]) => (
                      <Accordion.Item key={pointId} value={pointId}>
                        <Accordion.Control>
                          <Group justify="space-between" style={{ flex: 1 }} pr="md">
                            <Text fw={500}>📁 {pointName}</Text>
                            <Badge color="red" size="sm">{items.length} pendiente{items.length > 1 ? 's' : ''}</Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="xs">
                            {items
                              .sort((a, b) => b.daysOverdue - a.daysOverdue) // Más urgentes primero
                              .map((item, idx) => {
                                const urgency = getUrgencyLevel(item.daysOverdue);
                                return (
                                  <Paper 
                                    key={idx} 
                                    p="sm" 
                                    withBorder 
                                    radius="sm"
                                    style={{ 
                                      borderLeft: `4px solid var(--mantine-color-${urgency.color}-6)`,
                                      backgroundColor: `var(--mantine-color-${urgency.color}-0)`,
                                    }}
                                  >
                                    <Group justify="space-between" wrap="nowrap">
                                      <Stack gap={2}>
                                        <Text fw={500} size="sm">📄 {item.templateSubpointName}</Text>
                                        <Group gap="xs">
                                          <Badge size="xs" color="gray" variant="outline">
                                            {item.periodicity === 'monthly' ? 'Mensual' : 'Anual'}
                                          </Badge>
                                          <Text size="xs" c="dimmed">
                                            Período: {getMonthName(item.periodMonth)} {item.periodYear}
                                          </Text>
                                        </Group>
                                        <Text size="xs" c="dimmed">
                                          Venció: {formatDate(item.dueAt)}
                                        </Text>
                                      </Stack>
                                      <Stack gap={4} align="flex-end">
                                        <Badge 
                                          color={urgency.color} 
                                          size="sm"
                                          leftSection={urgency.icon}
                                        >
                                          {urgency.label}
                                        </Badge>
                                        <Text size="sm" fw={700} c={urgency.color}>
                                          {item.daysOverdue} días de retraso
                                        </Text>
                                      </Stack>
                                    </Group>
                                  </Paper>
                                );
                              })}
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </>
              )}

              {/* SECCIÓN: PRÓXIMOS A VENCER */}
              {totalExpiring > 0 && (
                <>
                  <Divider 
                    label={
                      <Group gap="xs">
                        <FaBell size={14} color="#f59f00" />
                        <Text fw={600} c="yellow.8">Próximos a Vencer</Text>
                      </Group>
                    } 
                    labelPosition="left" 
                    mt={totalMissing > 0 ? 'md' : 0}
                  />

                  <Alert color="yellow" variant="light" icon={<FaClock />}>
                    <Text size="sm">
                      Estos documentos están por vencer. Te recomendamos subirlos lo antes posible.
                    </Text>
                  </Alert>

                  <Accordion variant="separated">
                    {Object.entries(expiringByPoint).map(([pointId, { pointName, items }]) => (
                      <Accordion.Item key={pointId} value={`exp-${pointId}`}>
                        <Accordion.Control>
                          <Group justify="space-between" style={{ flex: 1 }} pr="md">
                            <Text fw={500}>📁 {pointName}</Text>
                            <Badge color="yellow" size="sm">{items.length} por vencer</Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="xs">
                            {items
                              .sort((a, b) => a.daysUntilDue - b.daysUntilDue) // Más próximos primero
                              .map((item, idx) => {
                                const level = getExpiringLevel(item.daysUntilDue);
                                return (
                                  <Paper 
                                    key={idx} 
                                    p="sm" 
                                    withBorder 
                                    radius="sm"
                                    style={{ 
                                      borderLeft: `4px solid var(--mantine-color-${level.color}-6)`,
                                    }}
                                  >
                                    <Group justify="space-between" wrap="nowrap">
                                      <Stack gap={2}>
                                        <Text fw={500} size="sm">📄 {item.templateSubpointName}</Text>
                                        <Group gap="xs">
                                          <Badge size="xs" color="gray" variant="outline">
                                            {item.periodicity === 'monthly' ? 'Mensual' : 'Anual'}
                                          </Badge>
                                          <Text size="xs" c="dimmed">
                                            Período: {getMonthName(item.periodMonth)} {item.periodYear}
                                          </Text>
                                        </Group>
                                        <Text size="xs" c="dimmed">
                                          Vence: {formatDate(item.dueAt)}
                                        </Text>
                                      </Stack>
                                      <Stack gap={4} align="flex-end">
                                        <Badge color={level.color} size="sm">
                                          {level.label}
                                        </Badge>
                                        <Text size="sm" fw={600} c={level.color}>
                                          {item.daysUntilDue} días restantes
                                        </Text>
                                      </Stack>
                                    </Group>
                                  </Paper>
                                );
                              })}
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </>
              )}
            </Stack>
          </ScrollArea.Autosize>

          {/* BOTÓN CERRAR */}
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={onClose}>
              Entendido
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
