import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Employee } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';  // Assuming you have this
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/types/user';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface EmployeeEditFormProps {
    employee: Employee;
    onClose: () => void;
    onUpdated?: (updatedEmployee: Employee) => void;  // optional callback on success
}

const EmployeeEditForm: React.FC<EmployeeEditFormProps> = ({ employee, onClose, onUpdated }) => {
    const { user, token } = useAuth();
    const [formData, setFormData] = useState<Employee>(employee);
    const [errors, setErrors] = useState<{ [key in keyof Partial<Employee>]?: string }>({});
    const [loading, setLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const canEditEmployees = user?.role ? hasPermission(user.role, 'employees', 'update') : false;
    const isAuthorized = !!user && (
        (user.role === 'superadmin' || user.role === 'admin' || user.role === 'hr_general') && canEditEmployees
    );
    
    // Parse HTML date input (YYYY-MM-DD) into Date | null
    const parseDateInput = (value: string): Date | null => {
        if (!value) return null;
        return new Date(value);
    };
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    useEffect(() => {
        setFormData(employee);
        setErrors({});
    }, [employee]);

    // Map field keys to human-friendly labels for banner display
    const requiredLabelMap: Record<string, string> = {
        employee_id: 'Employee ID',
        name: 'Name',
        date_of_birth: 'Date of Birth',
        join_date: 'Join Date',
        department: 'Department',
        employment_status: 'Employment Status',
        end_contract: 'End Contract',
        status: 'Status'
    };

    const handleChange = <K extends keyof Employee>(field: K, value: Employee[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: undefined }));
        setIsDirty(true);
    };

    const validate = () => {
        const newErrors: typeof errors = {};
        // Always required (read-only in edit but must exist)
        if (!formData.employee_id || (typeof formData.employee_id === 'string' && formData.employee_id.trim() === '')) {
            newErrors.employee_id = 'Employee ID is required';
        }

        // Required text fields
        if (!formData.name || (typeof formData.name === 'string' && formData.name.trim() === '')) {
            newErrors.name = 'Name is required';
        }

        // Required select/text fields
        if (!formData.department || (typeof formData.department === 'string' && formData.department.trim() === '')) {
            newErrors.department = 'Department is required';
        }
        if (!formData.employment_status || (typeof formData.employment_status === 'string' && formData.employment_status.trim() === '')) {
            newErrors.employment_status = 'Employment Status is required';
        }
        if (!formData.status || (typeof formData.status === 'string' && formData.status.trim() === '')) {
            newErrors.status = 'Status is required';
        }

        // Required date fields
        const isValidDate = (d: Date | string | number | null | undefined): boolean => {
            if (!d) return false;
            const dt = d instanceof Date ? d : new Date(d);
            return !isNaN(dt.getTime());
        };
        if (!formData.date_of_birth || !isValidDate(formData.date_of_birth)) {
            newErrors.date_of_birth = !formData.date_of_birth ? 'Date of Birth is required' : 'Date of Birth must be a valid date';
        }
        if (!formData.join_date || !isValidDate(formData.join_date)) {
            newErrors.join_date = !formData.join_date ? 'Join Date is required' : 'Join Date must be a valid date';
        }

        // Conditional: end_contract required when employment_status is Contract
        if (formData.employment_status === 'Contract') {
            if (!formData.end_contract || !isValidDate(formData.end_contract)) {
                newErrors.end_contract = !formData.end_contract ? 'End Contract is required for Contract employment' : 'End Contract must be a valid date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthorized) {
            toast({
                title: 'Access denied',
                description: `Your role (${user?.role ?? 'unknown'}) cannot edit employees.`,
                variant: 'destructive',
            });
            return;
        }
        if (!validate()) return;
        setLoading(true);

        try {
            await api.put(`/api/employees/${formData.employee_id}`, formData);

            toast({
                title: 'Success',
                description: 'Employee updated successfully',
                variant: 'default',
            });

            if (onUpdated) onUpdated(formData); // notify parent if needed
            setIsDirty(false);
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update employee';
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (isDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
                const form = document.getElementById('editForm') as HTMLFormElement | null;
                if (form && isAuthorized) {
                    form.requestSubmit();
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isDirty, isAuthorized]);

    return (
        <>
        <Modal onClose={handleCancel}>
            <div className="p-6 box-border flex flex-col h-[750px] max-h-[80vh] w-[520px] ml-6">
                <h2 className="text-lg font-semibold mb-4">Edit {formData.name}'s Data</h2>
                <div className="overflow-y-auto flex-grow p-4">
                    {!isAuthorized && (
                        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
                            <p className="font-medium">You don’t have permission to edit employees.</p>
                            <p className="text-sm mt-1">Current role: <span className="font-semibold">{user?.role ?? 'Unknown'}</span>. Please contact an administrator.</p>
                        </div>
                    )}
                    {Object.keys(errors).some(k => requiredLabelMap[k as string]) && (
                        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
                            <p className="font-medium">Missing required fields:</p>
                            <ul className="list-disc ml-5 mt-1">
                                {Object.keys(errors)
                                    .filter(k => requiredLabelMap[k as string])
                                    .map(k => (
                                        <li key={k}>{requiredLabelMap[k as string]}</li>
                                    ))}
                            </ul>
                        </div>
                    )}
                    <form id="editForm" onSubmit={handleSubmit} className="space-y-4 max-w-md">
                        <div>
                            <label className="block mb-1 font-medium">Insurance Endorsement</label>
                            <label className="inline-flex items-center mr-4">
                                <input
                                    type="radio"
                                    name="insurance_endorsement"
                                    value="Y"
                                    checked={formData.insurance_endorsement === 'Y'}
                                    onChange={e => handleChange('insurance_endorsement', e.target.value as Employee['insurance_endorsement'])}
                                />
                                <span className="ml-2">Yes</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="insurance_endorsement"
                                    value="N"
                                    checked={formData.insurance_endorsement === 'N'}
                                    onChange={e => handleChange('insurance_endorsement', e.target.value as Employee['insurance_endorsement'])}
                                />
                                <span className="ml-2">No</span>
                            </label>
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Insurance Owlexa</label>
                            <label className="inline-flex items-center mr-4">
                                <input
                                    type="radio"
                                    name="insurance_owlexa"
                                    value="Y"
                                    checked={formData.insurance_owlexa === 'Y'}
                                    onChange={e => handleChange('insurance_owlexa', e.target.value as Employee['insurance_owlexa'])}
                                />
                                <span className="ml-2">Yes</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="insurance_owlexa"
                                    value="N"
                                    checked={formData.insurance_owlexa === 'N'}
                                    onChange={e => handleChange('insurance_owlexa', e.target.value as Employee['insurance_owlexa'])}
                                />
                                <span className="ml-2">No</span>
                            </label>
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Insurance FPG</label>
                            <label className="inline-flex items-center mr-4">
                                <input
                                    type="radio"
                                    name="insurance_fpg"
                                    value="Y"
                                    checked={formData.insurance_fpg === 'Y'}
                                    onChange={e => handleChange('insurance_fpg', e.target.value as Employee['insurance_fpg'])}
                                />
                                <span className="ml-2">Yes</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    name="insurance_fpg"
                                    value="N"
                                    checked={formData.insurance_fpg === 'N'}
                                    onChange={e => handleChange('insurance_fpg', e.target.value as Employee['insurance_fpg'])}
                                />
                                <span className="ml-2">No</span>
                            </label>
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Employee ID</label>
                            <Input
                                type="text"
                                value={formData.employee_id}
                                onChange={e => handleChange('employee_id', e.target.value)}
                                readOnly
                            />
                            {errors.employee_id && (
                                <p className="text-red-600 text-xs mt-1">{errors.employee_id}</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">IMIP ID</label>
                            <Input
                                type="text"
                                value={formData.imip_id}
                                onChange={e => handleChange('imip_id', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Name *</label>
                            <Input
                                type="text"
                                value={formData.name}
                                onChange={e => handleChange('name', e.target.value)}
                            />
                            {errors.name && (
                                <p className="text-red-600 text-xs mt-1">{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Place of Birth</label>
                            <Input
                                type="text"
                                value={formData.place_of_birth}
                                onChange={e => handleChange('place_of_birth', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Date of Birth *</label>
                            <Input
                                type="date"
                                value={
                                    formData.date_of_birth && !isNaN(new Date(formData.date_of_birth).getTime())
                                        ? new Date(formData.date_of_birth).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={e => handleChange('date_of_birth', parseDateInput(e.target.value))}
                            />
                            {errors.date_of_birth && (
                                <p className="text-red-600 text-xs mt-1">{errors.date_of_birth}</p>
                            )}
                        </div>

                        <div>
                            <label className="block mb-1 font-medium" htmlFor="marital_status">
                                Marital Status
                            </label>
                            <select
                                id="marital_status"
                                value={formData.marital_status}
                                onChange={e => handleChange('marital_status', e.target.value)}
                                className="block w-full border border-gray-300 rounded px-3 py-2"
                            >
                                <option value="" disabled>
                                    Select marital status
                                </option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 font-medium" htmlFor="tax_status">
                                Tax Status
                            </label>
                            <select
                                id="tax_status"
                                value={formData.tax_status}
                                onChange={e => handleChange('tax_status', e.target.value)}
                                className="block w-full border border-gray-300 rounded px-3 py-2"
                            >
                                <option value="" disabled>
                                    Select tax status
                                </option>
                                <option value="TK0">TK/0</option>
                                <option value="K0">K/0</option>
                                <option value="K1">K/1</option>
                                <option value="K2">K/2</option>
                                <option value="K3">K/3</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Spouse Name</label>
                            <Input
                                type="text"
                                value={formData.spouse_name}
                                onChange={e => handleChange('spouse_name', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Child Name 1</label>
                            <Input
                                type="text"
                                value={formData.child_name_1}
                                onChange={e => handleChange('child_name_1', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Child Name 2</label>
                            <Input
                                type="text"
                                value={formData.child_name_2}
                                onChange={e => handleChange('child_name_2', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Child Name 3</label>
                            <Input
                                type="text"
                                value={formData.child_name_3}
                                onChange={e => handleChange('child_name_3', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium" htmlFor="religion">
                                Religion
                            </label>
                            <select
                                id="religion"
                                value={formData.religion}
                                onChange={e => handleChange('religion', e.target.value)}
                                className="block w-full border border-gray-300 rounded px-3 py-2"
                            >
                                <option value="" disabled>
                                    Select religion
                                </option>
                                <option value="Islam">Islam</option>
                                <option value="Protestant">Protestant</option>
                                <option value="Catholic">Catholic</option>
                                <option value="Hindu">Hindu</option>
                                <option value="Buddhist">Buddhist</option>
                                <option value="Confucianism">Confucianism</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Nationality</label>
                            <Input
                                type="text"
                                value={formData.nationality}
                                onChange={e => handleChange('nationality', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium" htmlFor="blood_type">
                                Blood Type
                            </label>
                            <select
                                id="blood_type"
                                value={formData.blood_type}
                                onChange={e => handleChange('blood_type', e.target.value as Employee['blood_type'])}
                                className="block w-full border border-gray-300 rounded px-3 py-2"
                            >
                                <option value="" disabled>
                                    Select blood type
                                </option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="AB">AB</option>
                                <option value="O">O</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Phone Number</label>
                            <Input
                                value={formData.phone_number}
                                onChange={e => handleChange('phone_number', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Emergency Contact Name</label>
                            <Input
                                type="text"
                                value={formData.emergency_contact_name}
                                onChange={e => handleChange('emergency_contact_name', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Emergency Contact Phone</label>
                            <Input
                                value={formData.emergency_contact_phone}
                                onChange={e => handleChange('emergency_contact_phone', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Email</label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={e => handleChange('email', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Kartu Keluarga No</label>
                            <Input
                                value={formData.kartu_keluarga_no}
                                onChange={e => handleChange('kartu_keluarga_no', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">KTP No</label>
                            <Input
                                value={formData.ktp_no}
                                onChange={e => handleChange('ktp_no', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block mb-1 font-medium">Address</label>
                            <Input
                                type="text"
                                value={formData.address}
                                onChange={e => handleChange('address', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">City</label>
                            <Input
                                type="text"
                                value={formData.city}
                                onChange={e => handleChange('city', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Point of Hire</label>
                            <Input
                                type="text"
                                value={formData.point_of_hire}
                                onChange={e => handleChange('point_of_hire', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Point of Origin</label>
                            <Input
                                type="text"
                                value={formData.point_of_origin}
                                onChange={e => handleChange('point_of_origin', e.target.value)}
                            />
                        </div>
                        <div>
                            <div>
                                <label className="block mb-1 font-medium" htmlFor="education">
                                    Education Level
                                </label>
                                <select
                                    id="education"
                                    value={formData.education}
                                    onChange={e => handleChange('education', e.target.value)}
                                    className="w-full border border-gray-300 rounded p-2"
                                >
                                    <option value="" disabled>
                                        Select education level
                                    </option>
                                    <option value="SD">SD (Elementary School)</option>
                                    <option value="SMP">SMP (Junior High School)</option>
                                    <option value="SMA">SMA (Senior High School)</option>
                                    <option value="Diploma">Diploma (D1/D2/D3)</option>
                                    <option value="S1">S1 (Bachelor's Degree)</option>
                                    <option value="S2">S2 (Master's Degree)</option>
                                    <option value="S3">S3 (Doctoral Degree)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Schedule Type</label>
                            <Input
                                type="text"
                                value={formData.schedule_type}
                                onChange={e => handleChange('schedule_type', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">First Join Date Merdeka</label>
                            <Input
                                type="date"
                                value={
                                    formData.first_join_date_merdeka && !isNaN(new Date(formData.first_join_date_merdeka).getTime())
                                        ? new Date(formData.first_join_date_merdeka).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={e => handleChange('first_join_date_merdeka', parseDateInput(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Transfer Merdeka</label>
                            <Input
                                type="date"
                                value={
                                    formData.transfer_merdeka && !isNaN(new Date(formData.transfer_merdeka).getTime())
                                        ? new Date(formData.transfer_merdeka).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={e => handleChange('transfer_merdeka', parseDateInput(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">First Join Date</label>
                            <Input
                                type="date"
                                value={
                                    formData.first_join_date && !isNaN(new Date(formData.first_join_date).getTime())
                                        ? new Date(formData.first_join_date).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={e => handleChange('first_join_date', parseDateInput(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Join Date *</label>
                            <Input
                                type="date"
                                value={
                                    formData.join_date && !isNaN(new Date(formData.join_date).getTime())
                                        ? new Date(formData.join_date).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={e => handleChange('join_date', parseDateInput(e.target.value))}
                            />
                            {errors.join_date && (
                                <p className="text-red-600 text-xs mt-1">{errors.join_date}</p>
                            )}
                        </div>
                        <div>
                            <label className="block mb-1 font-medium" htmlFor="employment_status">
                                Employment Status *
                            </label>
                            <select
                                id="employment_status"
                                value={formData.employment_status}
                                onChange={e => handleChange('employment_status', e.target.value)}
                                className="w-full border border-gray-300 rounded p-2"
                            >
                                <option value="" disabled>
                                    Select employment status
                                </option>
                                <option value="Permanent">Permanent</option>
                                <option value="Contract">Contract</option>
                            </select>
                            {errors.employment_status && (
                                <p className="text-red-600 text-xs mt-1">{errors.employment_status}</p>
                            )}
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">{formData.employment_status === 'Contract' ? 'End Contract *' : 'End Contract'}</label>
                            <Input
                                type="date"
                                value={
                                    formData.end_contract && !isNaN(new Date(formData.end_contract).getTime())
                                        ? new Date(formData.end_contract).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={e => handleChange('end_contract', parseDateInput(e.target.value))}
                            />
                            {errors.end_contract && (
                                <p className="text-red-600 text-xs mt-1">{errors.end_contract}</p>
                            )}
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Company Office</label>
                            <Input
                                type="text"
                                value={formData.company_office}
                                onChange={e => handleChange('company_office', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Work Location</label>
                            <Input
                                type="text"
                                value={formData.work_location}
                                onChange={e => handleChange('work_location', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium" htmlFor="department">
                                Department *
                            </label>
                            <select
                                id="department"
                                value={formData.department}
                                onChange={e => handleChange('department', e.target.value)}
                                className="w-full border border-gray-300 rounded p-2"
                            >
                                <option value="" disabled>
                                    Select department
                                </option>
                                <option value="Acid Plant">Acid Plant</option>
                                <option value="Chloride Plant">Chloride Plant</option>
                                <option value="Copper Cathode Plant">Copper Cathode Plant</option>
                                <option value="Environmental">Environmental</option>
                                <option value="External Affair">External Affair</option>
                                <option value="Finance">Finance</option>
                                <option value="Human Resources">Human Resources</option>
                                <option value="Management">Management</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Occupational Health and Safety">Occupational Health and Safety</option>
                                <option value="Pyrite Plant">Pyrite Plant</option>
                                <option value="Supply Chain Management">Supply Chain Management</option>
                                <option value="Technical Service">Technical Service</option>
                            </select>
                            {errors.department && (
                                <p className="text-red-600 text-xs mt-1">{errors.department}</p>
                            )}
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Section</label>
                            <Input
                                type="text"
                                value={formData.section}
                                onChange={e => handleChange('section', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Division</label>
                            <Input
                                type="text"
                                value={formData.division}
                                onChange={e => handleChange('division', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Direct Report</label>
                            <Input
                                type="text"
                                value={formData.direct_report}
                                onChange={e => handleChange('direct_report', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Job Title</label>
                            <Input
                                type="text"
                                value={formData.job_title}
                                onChange={e => handleChange('job_title', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Grade</label>
                            <Input
                                type="number"
                                value={formData.grade}
                                onChange={e => handleChange('grade', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Position Grade</label>
                            <Input
                                type="text"
                                value={formData.position_grade}
                                onChange={e => handleChange('position_grade', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium" htmlFor="group_job_title">
                                Group Job Title
                            </label>
                            <select
                                id="group_job_title"
                                value={formData.group_job_title}
                                onChange={e => handleChange('group_job_title', e.target.value)}
                                className="w-full border border-gray-300 rounded p-2"
                            >
                                <option value="" disabled>
                                    Select group job title
                                </option>
                                <option value="Staff">Staff</option>
                                <option value="Non Staff">Non Staff</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Bank Name</label>
                            <Input
                                type="text"
                                value={formData.bank_name}
                                onChange={e => handleChange('bank_name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Account Name</label>
                            <Input
                                type="text"
                                value={formData.account_name}
                                onChange={e => handleChange('account_name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Account No</label>
                            <Input
                                value={formData.account_no}
                                onChange={e => handleChange('account_no', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">NPWP</label>
                            <Input
                                value={formData.npwp}
                                onChange={e => handleChange('npwp', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">BPJS Ketenagakerjaan</label>
                            <Input
                                value={formData.bpjs_tk}
                                onChange={e => handleChange('bpjs_tk', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">BPJS Kesehatan</label>
                            <Input
                                value={formData.bpjs_kes}
                                onChange={e => handleChange('bpjs_kes', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium" htmlFor="status_bpjs_kes">
                                Status BPJS Kesehatan
                            </label>
                            <select
                                id="status_bpjs_kes"
                                value={formData.status_bpjs_kes}
                                onChange={e => handleChange('status_bpjs_kes', e.target.value)}
                                className="w-full border border-gray-300 rounded p-2"
                            >
                                <option value="" disabled>
                                    Select status
                                </option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Travel In</label>
                            <Input
                                type="date"
                                value={
                                    formData.travel_in && !isNaN(new Date(formData.travel_in).getTime())
                                        ? new Date(formData.travel_in).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={e => handleChange('travel_in', parseDateInput(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Travel Out</label>
                            <Input
                                type="date"
                                value={
                                    formData.travel_out && !isNaN(new Date(formData.travel_out).getTime())
                                        ? new Date(formData.travel_out).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={e => handleChange('travel_out', parseDateInput(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Terminated Date</label>
                            <Input
                                type="date"
                                value={
                                    formData.terminated_date && !isNaN(new Date(formData.terminated_date).getTime())
                                        ? new Date(formData.terminated_date).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={e => handleChange('terminated_date', parseDateInput(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Terminated Type</label>
                            <Input
                                type="text"
                                value={formData.terminated_type}
                                onChange={e => handleChange('terminated_type', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Terminated Reason</label>
                            <Input
                                type="text"
                                value={formData.terminated_reason}
                                onChange={e => handleChange('terminated_reason', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Blacklist MTI</label>
                            <select
                                value={formData.blacklist_mti}
                                onChange={e => handleChange('blacklist_mti', e.target.value as Employee['blacklist_mti'])}
                                className="block w-full border border-gray-300 rounded px-3 py-2"
                            >
                                <option value="Y">Yes</option>
                                <option value="N">No</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Blacklist IMIP</label>
                            <select
                                value={formData.blacklist_imip}
                                onChange={e => handleChange('blacklist_imip', e.target.value as Employee['blacklist_imip'])}
                                className="block w-full border border-gray-300 rounded px-3 py-2"
                            >
                                <option value="Y">Yes</option>
                                <option value="N">No</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Kitas No</label>
                            <Input
                                type="text"
                                value={formData.kitas_no}
                                onChange={e => handleChange('kitas_no', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Passport No</label>
                            <Input
                                type="text"
                                value={formData.passport_no}
                                onChange={e => handleChange('passport_no', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Status Employement *</label>
                            <select
                                value={formData.status}
                                onChange={e => handleChange('status', e.target.value as Employee['status'])}
                                className="block w-full border border-gray-300 rounded px-3 py-2"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                            {errors.status && (
                                <p className="text-red-600 text-xs mt-1">{errors.status}</p>
                            )}
                        </div>
                    </form>
                </div>
                <div className="flex justify-end space-x-2 flex-shrink-0 border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="default" form="editForm" disabled={!isAuthorized || loading} aria-disabled={!isAuthorized || loading}>
                        Save
                    </Button>
                </div>
            </div>
        </Modal>
        {showDiscardDialog && (
            <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved edits. If you leave now, changes will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowDiscardDialog(false)}>Keep editing</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setShowDiscardDialog(false); setIsDirty(false); onClose(); }}>
                            Discard changes
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
        </>
    );
};

export default EmployeeEditForm;
import { api } from '@/lib/apiClient';