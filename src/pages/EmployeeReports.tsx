import React from 'react';
// DashboardLayout is now handled by router; remove local wrapper
import EmployeeExport from '@/components/EmployeeExport';

const EmployeeReports: React.FC = () => {
  return (
      <EmployeeExport />
  );
};

export default EmployeeReports;