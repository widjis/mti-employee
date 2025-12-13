import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Employee } from '@/types/user';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddEmployeeFormProps {
    onAdd: (newEmployee: Employee) => void;
    onClose: () => void;
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

const AddEmployeeForm: React.FC<AddEmployeeFormProps> = ({ onClose, onAdd }) => {
    const [form, setForm] = useState<Employee>(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await api.post('/api/employees', form);
            toast({
                title: 'Success',
                description: 'Employee added successfully',
                variant: 'default',
            });
            setForm(initialState);
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            setError(message);
            toast({
                title: 'Error',
                description: message || 'Failed to add employee',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (form.date_of_birth) {
            const dob = new Date(form.date_of_birth);
            if (!isNaN(dob.getTime())) {
                const age = calculateYearsDiff(dob.toISOString());
                setForm(prev => ({ ...prev, age: age ? Number(age) : 0 }));
            }
        }
    }, [form.date_of_birth]);

    useEffect(() => {
        if (form.first_join_date) {
            let dateString: string;

            if (form.first_join_date instanceof Date) {
                dateString = form.first_join_date.toISOString();
            } else {
                // If join_date is already a string, use it directly
                dateString = form.first_join_date;
            }

            const years = calculateYearsDiff(dateString);
            setForm(prev => ({ ...prev, years_in_service: years ? Number(years) : 0 }));
        }
    }, [form.first_join_date]);


    return (
        <Modal onClose={onClose}>
            <div className="p-6 box-border flex flex-col h-[750px] max-h-[80vh] w-[520px] ml-6">
                <h2 className="text-lg font-semibold mb-4">Add New Employee</h2>
                <div className="overflow-y-auto flex-grow p-4">
                    <form id="addForm" onSubmit={handleSubmit} className="space-y-4 max-w-md">
                        <div>
                            <label className="block mb-1 font-medium">Insurance Endorsement</label>
                            <select
                                name="insurance_endorsement"
                                value={form.insurance_endorsement}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled>Select option</option>
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Insurance Owlexa</label>
                            <select
                                name="insurance_owlexa"
                                value={form.insurance_owlexa}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled>Select option</option>
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Insurance FPG</label>
                            <select
                                name="insurance_fpg"
                                value={form.insurance_fpg}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled>Select option</option>
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Employee ID</label>
                            <input
                                name="employee_id"
                                value={form.employee_id}
                                onChange={handleChange}
                                required
                                className="w-full border rounded p-2"
                                placeholder="Enter employee ID"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">IMIP ID</label>
                            <input
                                name="imip_id"
                                value={form.imip_id}
                                onChange={handleChange}
                                required
                                className="w-full border rounded p-2"
                                placeholder="Enter IMIP ID"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Name</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                className="w-full border rounded p-2"
                                placeholder="Enter full name"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Gender</label>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled>Select gender</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Place of Birth</label>
                            <input
                                name="place_of_birth"
                                value={form.place_of_birth}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter place of birth"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Date of Birth</label>
                            <input
                                name="date_of_birth"
                                type="date"
                                value={
                                    form.date_of_birth && !isNaN(new Date(form.date_of_birth).getTime())
                                        ? new Date(form.date_of_birth).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Select date of birth"
                            />
                        </div>
                        {/* Age removed */}
                        <div>
                            <label className="block mb-1 font-medium">Marital Status</label>
                            <select
                                name="marital_status"
                                value={form.marital_status}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled>Select marital status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Tax Status</label>
                            <select
                                name="tax_status"
                                value={form.tax_status}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled>Select tax status</option>
                                <option value="TK0">TK/0</option>
                                <option value="K0">K/0</option>
                                <option value="K1">K/1</option>
                                <option value="K2">K/2</option>
                                <option value="K3">K/3</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Spouse Name</label>
                            <input
                                name="spouse_name"
                                value={form.spouse_name}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter spouse name"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Child Name 1</label>
                            <input
                                name="child_name_1"
                                value={form.child_name_1}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter child name 1"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Child Name 2</label>
                            <input
                                name="child_name_2"
                                value={form.child_name_2}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter child name 2"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Child Name 3</label>
                            <input
                                name="child_name_3"
                                value={form.child_name_3}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter child name 3"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Religion</label>
                            <select
                                name="religion"
                                value={form.religion}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled>Select religion</option>
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
                            <input
                                name="nationality"
                                value={form.nationality}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter nationality"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Blood Type</label>
                            <select
                                name="blood_type"
                                value={form.blood_type}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled>Select blood type</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="AB">AB</option>
                                <option value="O">O</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Phone Number</label>
                            <input
                                name="phone_number"
                                value={form.phone_number}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Emergency Contact Name</label>
                            <input
                                name="emergency_contact_name"
                                value={form.emergency_contact_name}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter emergency contact name"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Emergency Contact Phone</label>
                            <input
                                name="emergency_contact_phone"
                                value={form.emergency_contact_phone}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter emergency contact phone"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Email</label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter email address"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Kartu Keluarga No</label>
                            <input
                                name="kartu_keluarga_no"
                                value={form.kartu_keluarga_no}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter kartu keluarga number"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">KTP No</label>
                            <input
                                name="ktp_no"
                                value={form.ktp_no}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter KTP number"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Address</label>
                            <input
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter address"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">City</label>
                            <input
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter city"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Point of Hire</label>
                            <input
                                name="point_of_hire"
                                value={form.point_of_hire}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter point of hire"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Point of Origin</label>
                            <input
                                name="point_of_origin"
                                value={form.point_of_origin}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter point of origin"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Education Level</label>
                            <select
                                name="education"
                                value={form.education}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
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
                        <div>
                            <label className="block mb-1 font-medium">Schedule Type</label>
                            <input
                                name="schedule_type"
                                value={form.schedule_type}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter schedule type"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">First Join Date Merdeka</label>
                            <input
                                name="first_join_date_merdeka"
                                type="date"
                                value={
                                    form.first_join_date_merdeka && !isNaN(new Date(form.first_join_date_merdeka).getTime())
                                        ? new Date(form.first_join_date_merdeka).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Select first join date Merdeka"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Transfer Merdeka</label>
                            <input
                                name="transfer_merdeka"
                                type="date"
                                value={
                                    form.transfer_merdeka && !isNaN(new Date(form.transfer_merdeka).getTime())
                                        ? new Date(form.transfer_merdeka).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Select transfer Merdeka date"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">First Join Date</label>
                            <input
                                name="first_join_date"
                                type="date"
                                value={
                                    form.first_join_date && !isNaN(new Date(form.first_join_date).getTime())
                                        ? new Date(form.first_join_date).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Select first join date"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Join Date</label>
                            <input
                                name="join_date"
                                type="date"
                                value={
                                    form.join_date && !isNaN(new Date(form.join_date).getTime())
                                        ? new Date(form.join_date).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Select join date"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Employment Status</label>
                            <select
                                name="employment_status"
                                value={form.employment_status}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled> Select employment status </option>
                                <option value="Permanent">Permanent</option>
                                <option value="Contract">Contract</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">End Contract</label>
                            <input
                                name="end_contract"
                                type="date"
                                value={
                                    form.end_contract && !isNaN(new Date(form.end_contract).getTime())
                                        ? new Date(form.end_contract).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Select end contract date"
                            />
                        </div>
                        {/* Years in service removed */}
                        <div>
                            <label className="block mb-1 font-medium">Company Office</label>
                            <input
                                name="company_office"
                                value={form.company_office}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter company office"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Work Location</label>
                            <input
                                name="work_location"
                                value={form.work_location}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter work location"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Department</label>
                            <select
                                name="department"
                                value={form.department}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled> Select department </option>
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
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Section</label>
                            <input
                                name="section"
                                value={form.section}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter section"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Division</label>
                            <input
                                name="division"
                                value={form.division}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter division"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Direct Report</label>
                            <input
                                name="direct_report"
                                value={form.direct_report}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter direct report"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Job Title</label>
                            <input
                                name="job_title"
                                value={form.job_title}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter job title"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Grade</label>
                            <input
                                name="grade"
                                value={form.grade}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter grade"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Position Grade</label>
                            <input
                                name="position_grade"
                                value={form.position_grade}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter position grade"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Group Job Title</label>
                            <select
                                name="group_job_title"
                                value={form.group_job_title}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled> Select group job title</option>
                                <option value="Staff">Staff</option>
                                <option value="Non Staff">Non Staff</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Bank Name</label>
                            <input
                                name="bank_name"
                                value={form.bank_name}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter bank name"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Account Name</label>
                            <input
                                name="account_name"
                                value={form.account_name}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter account name"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Account No</label>
                            <input
                                name="account_no"
                                value={form.account_no}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter account number"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">NPWP</label>
                            <input
                                name="npwp"
                                value={form.npwp}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter NPWP"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">BPJS Ketenagakerjaan</label>
                            <input
                                name="bpjs_tk"
                                value={form.bpjs_tk}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter BPJS TK"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">BPJS Kesehatan</label>
                            <input
                                name="bpjs_kes"
                                value={form.bpjs_kes}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter BPJS KES"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Status BPJS Kesehatan</label>
                            <select
                                name="status_bpjs_kes"
                                value={form.status_bpjs_kes}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="" disabled>Select status BPJS Kesehatan</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Travel In</label>
                            <input
                                name="travel_in"
                                type="date"
                                value={
                                    form.travel_in && !isNaN(new Date(form.travel_in).getTime())
                                        ? new Date(form.travel_in).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Select travel in date"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Travel Out</label>
                            <input
                                name="travel_out"
                                type="date"
                                value={
                                    form.travel_out && !isNaN(new Date(form.travel_out).getTime())
                                        ? new Date(form.travel_out).toISOString().substring(0, 10)
                                        : ''
                                }
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Select travel out date"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">KITAS No</label>
                            <input
                                name="kitas_no"
                                value={form.kitas_no}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter KITAS number"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Passport No</label>
                            <input
                                name="passport_no"
                                value={form.passport_no}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                                placeholder="Enter passport number"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Status</label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                className="w-full border rounded p-2"
                            >
                                <option value="Active">Active</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div className="flex justify-end space-x-2 flex-shrink-0 border-t pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="default" form="addForm">
                        Add Employee
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AddEmployeeForm;
import { api } from '@/lib/apiClient';
