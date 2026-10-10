import { UserRole } from '@/context/auth-context';

export function rutaHomeSegunRol(rol: UserRole, barberoAprobado: boolean): string {
  switch (rol) {
    case 'admin':
      return '/admin/home';
    case 'barber':
      return barberoAprobado ? '/barber/home' : '/pending';
    case 'client':
    default:
      return '/client/home';
  }
}
