import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import AddEmployee from "./pages/AddEmployee";
import ImportEmployees from "./pages/ImportEmployees";
import EmployeeReports from "./pages/EmployeeReports";
import UserManagement from "./pages/UserManagement";
import RoleMatrix from "./pages/RoleMatrix";
import UserProfile from "./pages/UserProfile";
import DashboardLayout from "./components/layout/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      {/* Nested protected routes under a persistent DashboardLayout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/employees/directory" element={<EmployeeDirectory />} />
        <Route path="/employees/add" element={<AddEmployee />} />
        <Route path="/employees/import" element={<ImportEmployees />} />
        <Route path="/reports/employee" element={<EmployeeReports />} />
        <Route path="/users/management" element={<UserManagement />} />
        <Route path="/profile" element={<UserProfile />} />
        {/* Admin-only route shares the same persistent layout instance */}
        <Route
          path="/users/role-matrix"
          element={
            <ProtectedRoute requireRole="admin">
              <RoleMatrix />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
