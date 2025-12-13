import React, { useState, useEffect } from 'react';
import { Employee } from '@/types/user';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddEmployeeFormContentProps {
    onAdd: (newEmployee: Employee) => void;
    onClose: () => void;
    showButtons?: boolean;
}

const calculateYearsDiff = (fromDateStr: string) => {
    if (!fromDateStr) return '';
    const fromDate = new Date(fromDateStr);
    const today = new Date();

    let years = today.getFullYear() - fromDate.getFullYear();

    // Adjust for month/day
    const monthDiff = today.getMonth() - fromDate.getMonth();
    const dayDiff = today.getDate() - fromDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        years--;
    }

    return years >= 0 ? years.toString() : '';
};

const initialState: Employee = {
    employee_id: '',
    name: '',
    imip_id: '',
    gender: '',
    place_of_birth: '',
    date_of_birth: null,
    age: null,
    marital_status: '',
    tax_status: '',
    spouse_name: '',
    child_name_1: '',
    child_name_2: '',
    child_name_3: '',
    religion: '',
    nationality: '',
    blood_type: '',
    phone_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    email: '',
    kartu_keluarga_no: '',
    ktp_no: '',
    address: '',
    city: '',
    point_of_hire: '',
    point_of_origin: '',
    education: '',
    schedule_type: '',
    first_join_date_merdeka: null,
    transfer_merdeka: null,
    first_join_date: null,
    join_date: null,
    employment_status: '',
    end_contract: null,
    years_in_service: null,
    company_office: '',
    work_location: '',
    division: '',
    department: '',
    section: '',
    direct_report: '',
    job_title: '',
    grade: '',
    position_grade: '',
    group_job_title: '',
    bank_name: '',
    account_name: '',
    account_no: '',
    npwp: '',
    bpjs_tk: '',
    bpjs_kes: '',
    status_bpjs_kes: '',
    travel_in: null,
    travel_out: null,
    terminated_date: null,
    terminated_type: '',
    terminated_reason: '',
    blacklist_mti: '',
    blacklist_imip: '',
    kitas_no: '',
    passport_no: '',
    insurance_endorsement: '',
    insurance_owlexa: '',
    insurance_fpg: '',
    status: ''
};

const AddEmployeeFormContent: React.FC<AddEmployeeFormContentProps> = ({ onClose, onAdd, showButtons = true }) => {
    const [formData, setFormData] = useState<Employee>(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = <K extends keyof Employee>(field: K, value: Employee[K]) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleDateChange = (field: keyof Employee, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value ? new Date(value) : null
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await api.post('/api/employees', formData);
            onAdd(formData);

            // Reset form
            setFormData(initialState);
        } catch (error) {
            console.error('Error adding employee:', error);
            toast({
                title: "Error",
                description: "Failed to add employee. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-calculate age when date of birth changes
    useEffect(() => {
        if (formData.date_of_birth) {
            const today = new Date();
            const birthDate = new Date(formData.date_of_birth);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            setFormData(prev => ({ ...prev, age }));
        }
    }, [formData.date_of_birth]);

    // Auto-calculate years in service when first join date changes
    useEffect(() => {
        if (formData.first_join_date) {
            const yearsInService = parseInt(calculateYearsDiff(formData.first_join_date.toISOString().split('T')[0]));
            setFormData(prev => ({ ...prev, years_in_service: yearsInService || null }));
        }
    }, [formData.first_join_date]);

    return (
        <div className="space-y-6">
            <form id="addForm" onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="employee_id">Employee ID *</Label>
                            <Input
                                id="employee_id"
                                value={formData.employee_id}
                                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                                placeholder="Enter employee ID"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Enter full name"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="imip_id">IMIP ID</Label>
                            <Input
                                id="imip_id"
                                value={formData.imip_id}
                                onChange={(e) => handleInputChange('imip_id', e.target.value)}
                                placeholder="Enter IMIP ID"
                            />
                        </div>
                        <div>
                            <Label htmlFor="gender">Gender</Label>
                            <select
                                id="gender"
                                value={formData.gender}
                                onChange={(e) => handleInputChange('gender', e.target.value as Employee['gender'])}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select gender</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="place_of_birth">Place of Birth</Label>
                            <Input
                                id="place_of_birth"
                                value={formData.place_of_birth}
                                onChange={(e) => handleInputChange('place_of_birth', e.target.value)}
                                placeholder="Enter place of birth"
                            />
                        </div>
                        <div>
                            <Label htmlFor="date_of_birth">Date of Birth</Label>
                            <Input
                                id="date_of_birth"
                                type="date"
                                value={formData.date_of_birth ? formData.date_of_birth.toISOString().split('T')[0] : ''}
                                onChange={(e) => handleDateChange('date_of_birth', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="age">Age</Label>
                            <Input
                                id="age"
                                type="number"
                                value={formData.age || ''}
                                onChange={(e) => handleInputChange('age', parseInt(e.target.value) || null)}
                                placeholder="Age (auto-calculated)"
                                readOnly
                            />
                        </div>
                        <div>
                            <Label htmlFor="marital_status">Marital Status</Label>
                            <select
                                id="marital_status"
                                value={formData.marital_status}
                                onChange={(e) => handleInputChange('marital_status', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select marital status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="tax_status">Tax Status</Label>
                            <Input
                                id="tax_status"
                                value={formData.tax_status}
                                onChange={(e) => handleInputChange('tax_status', e.target.value)}
                                placeholder="Enter tax status"
                            />
                        </div>
                        <div>
                            <Label htmlFor="spouse_name">Spouse Name</Label>
                            <Input
                                id="spouse_name"
                                value={formData.spouse_name}
                                onChange={(e) => handleInputChange('spouse_name', e.target.value)}
                                placeholder="Enter spouse name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="child_name_1">Child Name 1</Label>
                            <Input
                                id="child_name_1"
                                value={formData.child_name_1}
                                onChange={(e) => handleInputChange('child_name_1', e.target.value)}
                                placeholder="Enter first child name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="child_name_2">Child Name 2</Label>
                            <Input
                                id="child_name_2"
                                value={formData.child_name_2}
                                onChange={(e) => handleInputChange('child_name_2', e.target.value)}
                                placeholder="Enter second child name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="child_name_3">Child Name 3</Label>
                            <Input
                                id="child_name_3"
                                value={formData.child_name_3}
                                onChange={(e) => handleInputChange('child_name_3', e.target.value)}
                                placeholder="Enter third child name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="religion">Religion</Label>
                            <select
                                id="religion"
                                value={formData.religion}
                                onChange={(e) => handleInputChange('religion', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select religion</option>
                                <option value="Islam">Islam</option>
                                <option value="Protestant">Protestant</option>
                                <option value="Catholic">Catholic</option>
                                <option value="Hindu">Hindu</option>
                                <option value="Buddhist">Buddhist</option>
                                <option value="Confucianism">Confucianism</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="nationality">Nationality</Label>
                            <Input
                                id="nationality"
                                value={formData.nationality}
                                onChange={(e) => handleInputChange('nationality', e.target.value)}
                                placeholder="Enter nationality"
                            />
                        </div>
                        <div>
                            <Label htmlFor="blood_type">Blood Type</Label>
                            <select
                                id="blood_type"
                                value={formData.blood_type}
                                onChange={(e) => handleInputChange('blood_type', e.target.value as Employee['blood_type'])}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select blood type</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="AB">AB</option>
                                <option value="O">O</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="kartu_keluarga_no">Kartu Keluarga Number</Label>
                            <Input
                                id="kartu_keluarga_no"
                                value={formData.kartu_keluarga_no}
                                onChange={(e) => handleInputChange('kartu_keluarga_no', e.target.value)}
                                placeholder="Enter KK number"
                            />
                        </div>
                        <div>
                            <Label htmlFor="ktp_no">KTP Number</Label>
                            <Input
                                id="ktp_no"
                                value={formData.ktp_no}
                                onChange={(e) => handleInputChange('ktp_no', e.target.value)}
                                placeholder="Enter KTP number"
                            />
                        </div>
                        <div>
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                placeholder="Enter full address"
                            />
                        </div>
                        <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                                placeholder="Enter city"
                            />
                        </div>
                        <div>
                            <Label htmlFor="point_of_hire">Point of Hire</Label>
                            <Input
                                id="point_of_hire"
                                value={formData.point_of_hire}
                                onChange={(e) => handleInputChange('point_of_hire', e.target.value)}
                                placeholder="Enter point of hire"
                            />
                        </div>
                        <div>
                            <Label htmlFor="point_of_origin">Point of Origin</Label>
                            <Input
                                id="point_of_origin"
                                value={formData.point_of_origin}
                                onChange={(e) => handleInputChange('point_of_origin', e.target.value)}
                                placeholder="Enter point of origin"
                            />
                        </div>
                        <div>
                            <Label htmlFor="education">Education Level</Label>
                            <select
                                id="education"
                                value={formData.education}
                                onChange={(e) => handleInputChange('education', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select education level</option>
                                <option value="SD">SD (Elementary School)</option>
                                <option value="SMP">SMP (Junior High School)</option>
                                <option value="SMA">SMA (Senior High School)</option>
                                <option value="Diploma">Diploma (D1/D2/D3)</option>
                                <option value="S1">S1 (Bachelor's Degree)</option>
                                <option value="S2">S2 (Master's Degree)</option>
                                <option value="S3">S3 (Doctoral Degree)</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="schedule_type">Schedule Type</Label>
                            <Input
                                id="schedule_type"
                                value={formData.schedule_type}
                                onChange={(e) => handleInputChange('schedule_type', e.target.value)}
                                placeholder="Enter schedule type"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="phone_number">Phone Number</Label>
                            <Input
                                id="phone_number"
                                value={formData.phone_number}
                                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="Enter email address"
                            />
                        </div>
                        <div>
                            <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                            <Input
                                id="emergency_contact_name"
                                value={formData.emergency_contact_name}
                                onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                                placeholder="Enter emergency contact name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                            <Input
                                id="emergency_contact_phone"
                                value={formData.emergency_contact_phone}
                                onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                                placeholder="Enter emergency contact phone"
                            />
                        </div>
                    </div>
                </div>

                {/* Employment Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Employment Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="company_office">Company Office</Label>
                            <Input
                                id="company_office"
                                value={formData.company_office}
                                onChange={(e) => handleInputChange('company_office', e.target.value)}
                                placeholder="Enter company office"
                            />
                        </div>
                        <div>
                            <Label htmlFor="work_location">Work Location</Label>
                            <Input
                                id="work_location"
                                value={formData.work_location}
                                onChange={(e) => handleInputChange('work_location', e.target.value)}
                                placeholder="Enter work location"
                            />
                        </div>
                        <div>
                            <Label htmlFor="department">Department</Label>
                            <Input
                                id="department"
                                value={formData.department}
                                onChange={(e) => handleInputChange('department', e.target.value)}
                                placeholder="Enter department"
                            />
                        </div>
                        <div>
                            <Label htmlFor="section">Section</Label>
                            <Input
                                id="section"
                                value={formData.section}
                                onChange={(e) => handleInputChange('section', e.target.value)}
                                placeholder="Enter section"
                            />
                        </div>
                        <div>
                            <Label htmlFor="division">Division</Label>
                            <Input
                                id="division"
                                value={formData.division}
                                onChange={(e) => handleInputChange('division', e.target.value)}
                                placeholder="Enter division"
                            />
                        </div>
                        <div>
                            <Label htmlFor="direct_report">Direct Report</Label>
                            <Input
                                id="direct_report"
                                value={formData.direct_report}
                                onChange={(e) => handleInputChange('direct_report', e.target.value)}
                                placeholder="Enter direct report"
                            />
                        </div>
                        <div>
                            <Label htmlFor="job_title">Job Title</Label>
                            <Input
                                id="job_title"
                                value={formData.job_title}
                                onChange={(e) => handleInputChange('job_title', e.target.value)}
                                placeholder="Enter job title"
                            />
                        </div>
                        <div>
                            <Label htmlFor="employment_status">Employment Status</Label>
                            <select
                                id="employment_status"
                                value={formData.employment_status}
                                onChange={(e) => handleInputChange('employment_status', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select employment status</option>
                                <option value="Permanent">Permanent</option>
                                <option value="Contract">Contract</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="join_date">Join Date</Label>
                            <Input
                                id="join_date"
                                type="date"
                                value={formData.join_date ? formData.join_date.toISOString().split('T')[0] : ''}
                                onChange={(e) => handleDateChange('join_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="first_join_date">First Join Date</Label>
                            <Input
                                id="first_join_date"
                                type="date"
                                value={formData.first_join_date ? formData.first_join_date.toISOString().split('T')[0] : ''}
                                onChange={(e) => handleDateChange('first_join_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="first_join_date_merdeka">First Join Date Merdeka</Label>
                            <Input
                                id="first_join_date_merdeka"
                                type="date"
                                value={formData.first_join_date_merdeka ? formData.first_join_date_merdeka.toISOString().split('T')[0] : ''}
                                onChange={(e) => handleDateChange('first_join_date_merdeka', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="transfer_merdeka">Transfer Merdeka</Label>
                            <Input
                                id="transfer_merdeka"
                                type="date"
                                value={formData.transfer_merdeka ? formData.transfer_merdeka.toISOString().split('T')[0] : ''}
                                onChange={(e) => handleDateChange('transfer_merdeka', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="years_in_service">Years in Service</Label>
                            <Input
                                id="years_in_service"
                                type="number"
                                value={formData.years_in_service || ''}
                                onChange={(e) => handleInputChange('years_in_service', parseInt(e.target.value) || null)}
                                placeholder="Years (auto-calculated)"
                                readOnly
                            />
                        </div>
                        <div>
                            <Label htmlFor="end_contract">End Contract</Label>
                            <Input
                                id="end_contract"
                                type="date"
                                value={formData.end_contract ? formData.end_contract.toISOString().split('T')[0] : ''}
                                onChange={(e) => handleDateChange('end_contract', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="grade">Grade</Label>
                            <Input
                                id="grade"
                                value={formData.grade}
                                onChange={(e) => handleInputChange('grade', e.target.value)}
                                placeholder="Enter grade"
                            />
                        </div>
                        <div>
                            <Label htmlFor="position_grade">Position Grade</Label>
                            <Input
                                id="position_grade"
                                value={formData.position_grade}
                                onChange={(e) => handleInputChange('position_grade', e.target.value)}
                                placeholder="Enter position grade"
                            />
                        </div>
                        <div>
                            <Label htmlFor="group_job_title">Group Job Title</Label>
                            <Input
                                id="group_job_title"
                                value={formData.group_job_title}
                                onChange={(e) => handleInputChange('group_job_title', e.target.value)}
                                placeholder="Enter group job title"
                            />
                        </div>
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => handleInputChange('status', e.target.value as Employee['status'])}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Finance Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Finance Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="bank_name">Bank Name</Label>
                            <Input
                                id="bank_name"
                                value={formData.bank_name}
                                onChange={(e) => handleInputChange('bank_name', e.target.value)}
                                placeholder="Enter bank name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="account_name">Account Name</Label>
                            <Input
                                id="account_name"
                                value={formData.account_name}
                                onChange={(e) => handleInputChange('account_name', e.target.value)}
                                placeholder="Enter account name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="account_no">Account Number</Label>
                            <Input
                                id="account_no"
                                value={formData.account_no}
                                onChange={(e) => handleInputChange('account_no', e.target.value)}
                                placeholder="Enter account number"
                            />
                        </div>
                        <div>
                            <Label htmlFor="npwp">NPWP</Label>
                            <Input
                                id="npwp"
                                value={formData.npwp}
                                onChange={(e) => handleInputChange('npwp', e.target.value)}
                                placeholder="Enter NPWP"
                            />
                        </div>
                    </div>
                </div>

                {/* Insurance */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Insurance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="bpjs_tk">BPJS TK</Label>
                            <Input
                                id="bpjs_tk"
                                value={formData.bpjs_tk}
                                onChange={(e) => handleInputChange('bpjs_tk', e.target.value)}
                                placeholder="Enter BPJS TK"
                            />
                        </div>
                        <div>
                            <Label htmlFor="bpjs_kes">BPJS KES</Label>
                            <Input
                                id="bpjs_kes"
                                value={formData.bpjs_kes}
                                onChange={(e) => handleInputChange('bpjs_kes', e.target.value)}
                                placeholder="Enter BPJS KES"
                            />
                        </div>
                        <div>
                            <Label htmlFor="status_bpjs_kes">Status BPJS KES</Label>
                            <Input
                                id="status_bpjs_kes"
                                value={formData.status_bpjs_kes}
                                onChange={(e) => handleInputChange('status_bpjs_kes', e.target.value)}
                                placeholder="Enter BPJS KES status"
                            />
                        </div>
                        <div>
                            <Label htmlFor="insurance_endorsement">Insurance Endorsement</Label>
                            <select
                                id="insurance_endorsement"
                                value={formData.insurance_endorsement}
                                onChange={(e) => handleInputChange('insurance_endorsement', e.target.value as Employee['insurance_endorsement'])}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select option</option>
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="insurance_owlexa">Insurance Owlexa</Label>
                            <select
                                id="insurance_owlexa"
                                value={formData.insurance_owlexa}
                                onChange={(e) => handleInputChange('insurance_owlexa', e.target.value as Employee['insurance_owlexa'])}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select option</option>
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="insurance_fpg">Insurance FPG</Label>
                            <select
                                id="insurance_fpg"
                                value={formData.insurance_fpg}
                                onChange={(e) => handleInputChange('insurance_fpg', e.target.value as Employee['insurance_fpg'])}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select option</option>
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Travel */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Travel</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="travel_in">Travel In</Label>
                            <Input
                                id="travel_in"
                                type="date"
                                value={formData.travel_in ? formData.travel_in.toISOString().split('T')[0] : ''}
                                onChange={(e) => handleDateChange('travel_in', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="travel_out">Travel Out</Label>
                            <Input
                                id="travel_out"
                                type="date"
                                value={formData.travel_out ? formData.travel_out.toISOString().split('T')[0] : ''}
                                onChange={(e) => handleDateChange('travel_out', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Termination */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Termination</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="terminated_date">Terminated Date</Label>
                            <Input
                                id="terminated_date"
                                type="date"
                                value={formData.terminated_date ? formData.terminated_date.toISOString().split('T')[0] : ''}
                                onChange={(e) => handleDateChange('terminated_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="terminated_type">Terminated Type</Label>
                            <Input
                                id="terminated_type"
                                value={formData.terminated_type}
                                onChange={(e) => handleInputChange('terminated_type', e.target.value)}
                                placeholder="Enter terminated type"
                            />
                        </div>
                        <div>
                            <Label htmlFor="terminated_reason">Terminated Reason</Label>
                            <Input
                                id="terminated_reason"
                                value={formData.terminated_reason}
                                onChange={(e) => handleInputChange('terminated_reason', e.target.value)}
                                placeholder="Enter terminated reason"
                            />
                        </div>
                    </div>
                </div>

                {/* Blacklist */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Blacklist</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="blacklist_mti">Blacklist MTI</Label>
                            <select
                                id="blacklist_mti"
                                value={formData.blacklist_mti}
                                onChange={(e) => handleInputChange('blacklist_mti', e.target.value as Employee['blacklist_mti'])}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select option</option>
                                <option value="Y">Yes</option>
                                <option value="N">No</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="blacklist_imip">Blacklist IMIP</Label>
                            <select
                                id="blacklist_imip"
                                value={formData.blacklist_imip}
                                onChange={(e) => handleInputChange('blacklist_imip', e.target.value as Employee['blacklist_imip'])}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select option</option>
                                <option value="Y">Yes</option>
                                <option value="N">No</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Immigration */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Immigration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="kitas_no">KITAS Number</Label>
                            <Input
                                id="kitas_no"
                                value={formData.kitas_no}
                                onChange={(e) => handleInputChange('kitas_no', e.target.value)}
                                placeholder="Enter KITAS number"
                            />
                        </div>
                        <div>
                            <Label htmlFor="passport_no">Passport Number</Label>
                            <Input
                                id="passport_no"
                                value={formData.passport_no}
                                onChange={(e) => handleInputChange('passport_no', e.target.value)}
                                placeholder="Enter passport number"
                            />
                        </div>
                    </div>
                </div>
            </form>
            
            {showButtons && (
                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" form="addForm" disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add Employee'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default AddEmployeeFormContent;
import { api } from '@/lib/apiClient';