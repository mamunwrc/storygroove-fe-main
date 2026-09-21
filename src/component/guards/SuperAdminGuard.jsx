import { Navigate, Outlet } from "react-router-dom";

const isSuperAdmin = () => {
  return localStorage.getItem("role") === "superadmin";
};

const SuperAdminGuard = ({ children }) => {
  if (!isSuperAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children || <Outlet />;
};

export default SuperAdminGuard;
