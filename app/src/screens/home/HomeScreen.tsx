import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminHome } from './AdminHome';
import { MemberHome } from './MemberHome';

/**
 * Home tab router. Admins get the org-wide overview; members and coordinators
 * get their personal dashboard.
 */
export function HomeScreen() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminHome /> : <MemberHome />;
}
