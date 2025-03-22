import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isUserAdmin } from '@/utils/admin-auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        if (loading) return;

        if (!currentUser) {
          navigate('/login');
          return;
        }

        if (requireAdmin) {
          const adminStatus = await isUserAdmin(currentUser.uid);
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            navigate('/');
            return;
          }
        }
        
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking access:', error);
        navigate('/');
      }
    };

    checkAccess();
  }, [currentUser, loading, navigate, requireAdmin]);

  if (loading || (requireAdmin && isChecking)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-3">Verifying access...</span>
      </div>
    );
  }

  if (!currentUser) {
    return null; // useEffect will handle navigation
  }

  if (requireAdmin && !isAdmin) {
    return null; // useEffect will handle navigation
  }

  return <>{children}</>;
};

export default ProtectedRoute;
