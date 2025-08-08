import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeExport from '@/components/EmployeeExport';

const EmployeeReports: React.FC = () => {
  return (
    <DashboardLayout>
      <EmployeeExport />
    </DashboardLayout>
  );
};

export default EmployeeReports;