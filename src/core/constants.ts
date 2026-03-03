export enum UserRole {
  ADMINISTRADOR = 'Administrador',
  EMPRESA = 'Empresa',
  AUDITOR = 'Auditor',
}

export const USER_ROLE_VALUES = Object.values(UserRole);

// Mapeo de roles en minúsculas (para compatibilidad)
export const ROLE_MAP: Record<string, UserRole> = {
  'administrador': UserRole.ADMINISTRADOR,
  'empresa': UserRole.EMPRESA,
  'auditor': UserRole.AUDITOR,
};

export const getRoleLabel = (role: string | null | undefined): UserRole => {
  if (!role) return UserRole.EMPRESA;
  if (Object.values(UserRole).includes(role as UserRole)) {
    return role as UserRole;
  }
  return ROLE_MAP[role.toLowerCase()] || UserRole.EMPRESA;
};
