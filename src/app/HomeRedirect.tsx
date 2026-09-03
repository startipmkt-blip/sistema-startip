import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';

// Direciona conforme o tipo de usuário: cliente -> portal; equipe -> início.
export function HomeRedirect() {
  const { isCliente } = useAuth();
  return <Navigate to={isCliente ? '/portal' : '/inicio'} replace />;
}
