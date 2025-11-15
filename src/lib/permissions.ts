export type Permission =
  | 'customers:read'
  | 'customers:write'
  | 'customers:delete'
  | 'packages:read'
  | 'packages:write'
  | 'packages:delete'
  | 'staff:read'
  | 'staff:write'
  | 'transactions:read'
  | 'transactions:refund'
  | 'reports:view'
  | 'broadcasts:send';

export type AdminRole = 'super_admin' | 'admin' | 'support';

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    'customers:read', 'customers:write', 'customers:delete',
    'packages:read', 'packages:write', 'packages:delete',
    'staff:read', 'staff:write',
    'transactions:read', 'transactions:refund',
    'reports:view',
    'broadcasts:send',
  ],
  admin: [
    'customers:read', 'customers:write',
    'packages:read', 'packages:write',
    'transactions:read',
    'reports:view',
    'broadcasts:send',
  ],
  support: [
    'customers:read',
    'packages:read',
    'reports:view',
  ],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
