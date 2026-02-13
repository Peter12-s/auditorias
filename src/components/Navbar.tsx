import { NavLink } from '@mantine/core';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  FaSignInAlt,
  FaSignOutAlt,
  FaFileAlt,
  FaBookOpen,
  FaUser,
} from 'react-icons/fa';


export function Navbar({ onLinkClick }: { onLinkClick?: () => void }) {
  const location = useLocation();
  const auth = useAuth();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <>
      {/* Menú de ADMINISTRADOR */}
      {auth.isAuthenticated && auth.userType === 'admin' && (
        <>
          <NavLink
            label="Usuarios"
            leftSection={<FaUser size={16} />}
            component={Link}
            to="/usuarios"
            active={isActive('/usuarios')}
            onClick={() => onLinkClick?.()}
          />

          <NavLink
            label="SGI"
            leftSection={<FaFileAlt size={16} />}
            component={Link}
            to="/"
            active={isActive('/') || isActive('/sgi')}
            onClick={() => onLinkClick?.()}
          />

          <NavLink
            label="SGI (Generado)"
            leftSection={<FaBookOpen size={16} />}
            component={Link}
            to="/sgi-generado"
            active={isActive('/sgi-generado')}
            onClick={() => onLinkClick?.()}
          />
        </>
      )}

      {/* Menú de AUDITOR */}
      {auth.isAuthenticated && auth.userType === 'auditor' && (
        <>
          <NavLink
            label="SGI"
            leftSection={<FaFileAlt size={16} />}
            component={Link}
            to="/"
            active={isActive('/') || isActive('/sgi')}
            onClick={() => onLinkClick?.()}
          />

          <NavLink
            label="SGI Generado"
            leftSection={<FaBookOpen size={16} />}
            component={Link}
            to="/sgi-generado"
            active={isActive('/sgi-generado')}
            onClick={() => onLinkClick?.()}
          />
        </>
      )}

      {/* Menú de EMPRESA */}
      {auth.isAuthenticated && auth.userType === 'empresa' && (
        <>
          <NavLink
            label="SGI"
            leftSection={<FaFileAlt size={16} />}
            component={Link}
            to="/"
            active={isActive('/') || isActive('/sgi')}
            onClick={() => onLinkClick?.()}
          />

          <NavLink
            label="SGI Generado"
            leftSection={<FaBookOpen size={16} />}
            component={Link}
            to="/sgi-generado"
            active={isActive('/sgi-generado')}
            onClick={() => onLinkClick?.()}
          />
        </>
      )}

      {/* Login o Cerrar Sesión */}
      {!auth.isAuthenticated ? (
        <NavLink
          label="Login"
          leftSection={<FaSignInAlt size={16} />}
          component={Link}
          to="/login"
          active={isActive('/login')}
          onClick={() => onLinkClick?.()}
        />
      ) : (
        <NavLink
          label="Cerrar Sesión"
          leftSection={<FaSignOutAlt size={16} />}
          color="red"
          onClick={() => {
            auth.logout(() => navigate('/login'));
            onLinkClick?.();
          }}
        />
      )}
    </>
  );
}