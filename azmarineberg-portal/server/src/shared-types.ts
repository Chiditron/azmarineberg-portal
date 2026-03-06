/** Server-local copy of UserRole so build works when root is server/ (e.g. Render). */
export type UserRole = 'super_admin' | 'admin' | 'staff' | 'client';
