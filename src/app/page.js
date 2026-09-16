'use client';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

const LAB_KEYS = [
  { key: 'chest_xray_url', nameKey: 'chest_xray_name', label: 'Chest X-Ray' },
  { key: 'cbc_url', nameKey: 'cbc_name', label: 'Complete Blood Count (CBC)' },
  { key: 'urinalysis_url', nameKey: 'urinalysis_name', label: 'Urinalysis' },
  { key: 'fecalysis_url', nameKey: 'fecalysis_name', label: 'Fecalysis' },
  { key: 'hbsag_url', nameKey: 'hbsag_name', label: 'HBsAg' },
  { key: 'anti_hbs_url', nameKey: 'anti_hbs_name', label: 'Anti-HBs' },
  { key: 'serum_pregnancy_url', nameKey: 'serum_pregnancy_name', label: 'Serum Pregnancy' },
];

export default function ClinicApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('student');
  const [loading, setLoading] = useState(true);

  // Auth State
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('student');
  const [authMessage, setAuthMessage] = useState('');

  // Top Global Header Navigation (HOME, DATABASE, SCHEDULING)
  const [mainPage, setMainPage] = useState('home');

  // Student Database Ribbon Tabs
  const [activeTab, setActiveTab] = useState('student_info');

  // Annual Physical Assessment Sub-Tabs
  const [assessmentSubTab, setAssessmentSubTab] = useState('lab_results');

  // Staff Patient Selector State
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Scheduling Workflow States
  const [appointmentType, setAppointmentType] = useState('Consultation');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [procedureType, setProcedureType] = useState('Dental Cleaning');
  const [scheduleStep, setScheduleStep] = useState('select');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('09:00 AM');
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [appointments, setAppointments] = useState([]);

  // Student Record States
  const [studentInfo, setStudentInfo] = useState({
    surname: '',
    first_name: '',
    middle_initial: '',
    full_name: '',
    dob: '',
    sex: 'Female',
    program_year_level: '',
    address: '',
    contact_number: '',
    email: '',
    preferred_hospital: '',
    emergency_name: '',
    emergency_contact: '',
    emergency_email: '',
    emergency_relation: '',
    allergies: 'None',
    family_history: '',
    vaccination_history: 'Complete',
    history_past_illness: 'None',
    id_photo_url: '',
  });

  const [assessment, setAssessment] = useState({
    blood_pressure: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    med_cert_url: '',
    med_cert_name: '',
    chest_xray_url: '',
    chest_xray_name: '',
    cbc_url: '',
    cbc_name: '',
    urinalysis_url: '',
    urinalysis_name: '',
    fecalysis_url: '',
    fecalysis_name: '',
    hbsag_url: '',
    hbsag_name: '',
    anti_hbs_url: '',
    anti_hbs_name: '',
    serum_pregnancy_url: '',
    serum_pregnancy_name: '',
  });

  const [consultations, setConsultations] = useState([]);
  const [newConsultation, setNewConsultation] = useState({
    date_of_consultation: new Date().toISOString().split('T')[0],
    vital_signs: '',
    chief_complaint: '',
    doctor_order: '',
  });

  useEffect(() => {
    checkUserSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });
    return () => authListener?.subscription?.unsubscribe();
  }, []);

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserProfile(session.user);
    } else {
      setLoading(false);
    }
  };

  const loadUserProfile = async (user) => {
    setCurrentUser(user);
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role || 'student';
    setUserRole(role);

    if (role === 'doctor' || role === 'admin') {
      await fetchAllStudentsList();
      await fetchAppointments(null, true);
    } else {
      setSelectedStudentId(user.id);
      await loadStudentData(user.id, user.email);
      await fetchAppointments(user.id, false);
    }
    setLoading(false);
  };

  const fetchAllStudentsList = async () => {
    const { data } = await supabase.from('students').select('id, full_name, surname, first_name, email, program_year_level');
    if (data && data.length > 0) {
      setAllStudents(data);
      setSelectedStudentId(data[0].id);
      await loadStudentData(data[0].id, data[0].email);
    }
  };

  const fetchAppointments = async (studentId, isDoctorRole) => {
    try {
      let query = supabase.from('appointments').select('*').order('date', { ascending: true });
      if (!isDoctorRole && studentId) {
        query = query.eq('student_id', studentId);
      }
      const { data, error } = await query;
      if (!error && data) {
        setAppointments(data);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  };

  const loadStudentData = async (targetId, defaultEmail = '') => {
    if (!targetId) return;

    try {
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (student) {
        setStudentInfo(prev => ({
          ...prev,
          ...student,
          email: student.email || defaultEmail || prev.email,
        }));
      } else {
        setStudentInfo(prev => ({
          ...prev,
          email: defaultEmail || '',
        }));
      }

      const { data: assess } = await supabase
        .from('physical_assessments')
        .select('*')
        .eq('student_id', targetId)
        .maybeSingle();

      if (assess) {
        setAssessment(prev => ({ ...prev, ...assess }));
      } else {
        const defaultAssess = {
          student_id: targetId,
          blood_pressure: '',
          heart_rate: '',
          respiratory_rate: '',
          oxygen_saturation: '',
          med_cert_url: '',
          med_cert_name: '',
          chest_xray_url: '',
          chest_xray_name: '',
          cbc_url: '',
          cbc_name: '',
          urinalysis_url: '',
          urinalysis_name: '',
          fecalysis_url: '',
          fecalysis_name: '',
          hbsag_url: '',
          hbsag_name: '',
          anti_hbs_url: '',
          anti_hbs_name: '',
          serum_pregnancy_url: '',
          serum_pregnancy_name: '',
        };
        await supabase.from('physical_assessments').insert([defaultAssess]);
        setAssessment(defaultAssess);
      }

      const { data: consults } = await supabase
        .from('consultations')
        .select('*')
        .eq('student_id', targetId)
        .order('created_at', { ascending: false });

      setConsultations(consults || []);
    } catch (err) {
      console.error('Error loading student data:', err);
    }
  };

  const handleSelectStudent = (id) => {
    setSelectedStudentId(id);
    const chosen = allStudents.find(s => s.id === id);
    loadStudentData(id, chosen?.email);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthMessage('');
    setLoading(true);

    const formattedEmail = authEmail.includes('@')
      ? authEmail.trim()
      : `${authEmail.trim().replace(/\s+/g, '')}@student.tua.edu.ph`;

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email: formattedEmail,
        password: authPassword,
      });
      if (error) {
        setAuthMessage(error.message);
        setLoading(false);
        return;
      }
      if (data?.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, email: formattedEmail, role: registerRole }]);
        if (registerRole === 'student') {
          await supabase.from('students').insert([{ id: data.user.id, email: formattedEmail, full_name: authEmail }]);
          await supabase.from('physical_assessments').insert([{ student_id: data.user.id }]);
        }
        await loadUserProfile(data.user);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: authPassword,
      });
      if (error) {
        setAuthMessage(error.message);
        setLoading(false);
        return;
      }
      if (data?.user) {
        await loadUserProfile(data.user);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedStudentId('');
    setAppointments([]);
    setMainPage('home');
  };

  const handleFileUpload = async (file, fieldKey, targetTable, fileNameKey = null) => {
    if (!file) return;
    if (!selectedStudentId) {
      return alert('Please select an active student record first.');
    }

    try {
      const exactOriginalFileName = file.name;
      const fileExt = exactOriginalFileName.split('.').pop();
      const storagePath = `${selectedStudentId}/${fieldKey}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('clinic-docs')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        return alert('Storage upload failed: ' + uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from('clinic-docs')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      if (targetTable === 'students') {
        const updatePayload = {
          id: selectedStudentId,
          [fieldKey]: publicUrl,
          updated_at: new Date().toISOString()
        };

        const { error: dbError } = await supabase
          .from('students')
          .upsert(updatePayload, { onConflict: 'id' });

        if (dbError) throw dbError;
        setStudentInfo(prev => ({ ...prev, [fieldKey]: publicUrl }));
      } else {
        const updatePayload = {
          student_id: selectedStudentId,
          [fieldKey]: publicUrl,
          updated_at: new Date().toISOString()
        };

        if (fileNameKey) {
          updatePayload[fileNameKey] = exactOriginalFileName;
        }

        const { error: dbError } = await supabase
          .from('physical_assessments')
          .upsert(updatePayload, { onConflict: 'student_id' });

        if (dbError) {
          await supabase
            .from('physical_assessments')
            .upsert({ student_id: selectedStudentId, [fieldKey]: publicUrl }, { onConflict: 'student_id' });
        }

        setAssessment(prev => ({
          ...prev,
          [fieldKey]: publicUrl,
          ...(fileNameKey ? { [fileNameKey]: exactOriginalFileName } : {})
        }));
      }

      alert('File uploaded and replaced successfully!');
    } catch (err) {
      console.error('Database Save Error:', err);
      alert('Database save failed: ' + err.message);
    }
  };

  const handleSaveStudentInfo = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    const fullName = `${studentInfo.surname ? studentInfo.surname + ', ' : ''}${studentInfo.first_name || ''} ${studentInfo.middle_initial || ''}`.trim();
    
    const { error } = await supabase.from('students').upsert(
      {
        id: selectedStudentId,
        ...studentInfo,
        full_name: fullName,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );
    setLoading(false);
    if (error) alert('Error saving student info: ' + error.message);
    else alert('Student Information saved successfully!');
  };

  const handleSaveVitals = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    const { error } = await supabase.from('physical_assessments').upsert(
      {
        student_id: selectedStudentId,
        ...assessment,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'student_id' }
    );
    setLoading(false);
    if (error) alert('Error updating vitals: ' + error.message);
    else alert('Vitals updated successfully!');
  };

  const handleSaveConsultation = async () => {
    if (!selectedStudentId) return alert('Select a student first.');
    if (!newConsultation.chief_complaint || !newConsultation.doctor_order) {
      return alert('Fill in Chief Complaint and Doctor Order.');
    }
    setLoading(true);
    const { error } = await supabase.from('consultations').insert([{
      student_id: selectedStudentId,
      doctor_id: currentUser.id,
      date_of_consultation: newConsultation.date_of_consultation,
      vital_signs: newConsultation.vital_signs,
      chief_complaint: newConsultation.chief_complaint,
      doctor_order: newConsultation.doctor_order,
    }]);
    setLoading(false);

    if (error) {
      alert('Error saving consultation: ' + error.message);
    } else {
      alert('Consultation recorded!');
      setNewConsultation({
        date_of_consultation: new Date().toISOString().split('T')[0],
        vital_signs: '',
        chief_complaint: '',
        doctor_order: ''
      });
      loadStudentData(selectedStudentId, studentInfo.email);
    }
  };

  // Database-backed Appointment Booking
  const handleFinalizeBooking = async (e) => {
    e.preventDefault();
    const detail = appointmentType === 'Consultation' ? specialization : procedureType;
    const currentName = studentInfo.surname 
      ? `${studentInfo.surname}, ${studentInfo.first_name}` 
      : (studentInfo.full_name || currentUser.email);
    const studentIdNumber = currentUser.email ? currentUser.email.split('@')[0] : 'N/A';

    setLoading(true);
    const newRecord = {
      student_id: currentUser.id,
      student_name: currentName,
      student_id_num: studentIdNumber,
      type: appointmentType,
      detail,
      date: appointmentDate,
      time: appointmentTime,
      status: 'Confirmed'
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert([newRecord])
      .select();

    setLoading(false);

    if (error) {
      alert('Error booking appointment: ' + error.message);
    } else {
      setAppointments(prev => [...(data || [newRecord]), ...prev]);
      alert(`Appointment Confirmed and Saved!\n${appointmentType}: ${detail}\nDate: ${appointmentDate} at ${appointmentTime}`);
      setScheduleStep('select');
      await fetchAppointments(currentUser.id, false);
    }
  };

  // Update Status in Supabase
  const handleUpdateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    }
  };

  // Delete/Cancel Appointment in Supabase
  const handleCancelAppointment = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Failed to cancel appointment: ' + error.message);
    } else {
      setAppointments(prev => prev.filter(a => a.id !== id));
      alert('Appointment cancelled.');
    }
  };

  const getDisplayFileName = (url, storedName, fallbackLabel) => {
    if (storedName) return storedName;
    if (!url) return '';
    try {
      const parts = url.split('/');
      const rawName = parts[parts.length - 1];
      const cleanName = decodeURIComponent(rawName).replace(/^\d+_\d+_|^[a-zA-Z0-9_-]+_\d+\./, '');
      return cleanName || `${fallbackLabel}.pdf`;
    } catch {
      return `${fallbackLabel}.pdf`;
    }
  };

  const pendingLabs = LAB_KEYS.filter(lab => !assessment[lab.key]);
  const isStaff = userRole === 'doctor' || userRole === 'admin';

  // LOGIN & REGISTER VIEW
  if (!currentUser) {
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-center p-4 bg-cover bg-center relative font-sans"
        style={{
          backgroundImage: `url('/campus-bg.png'), url('/clinic-portal/campus-bg.png'), url('https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />

        <div className="relative z-10 w-full max-w-[340px] bg-[#fff6f4] border border-black px-7 py-10 shadow-2xl flex flex-col items-center">
          <h1 className="text-4xl font-extrabold tracking-wider text-black uppercase mb-8 select-none">
            {isRegistering ? 'REGISTER' : 'SIGN IN'}
          </h1>

          {authMessage && (
            <div className="w-full bg-red-100 border border-red-300 text-red-700 text-xs p-2 rounded mb-4 text-center">
              {authMessage}
            </div>
          )}

          <form onSubmit={handleAuth} className="w-full flex flex-col items-center space-y-4">
            <div className="w-full">
              <input
                type="text"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="STUDENT ID NUMBER"
                className="w-full text-center text-xs font-semibold tracking-wider placeholder:text-gray-400 uppercase py-2.5 px-4 rounded-full border border-black bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3824] transition shadow-xs"
              />
            </div>

            <div className="w-full">
              <input
                type="password"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="PASSWORD"
                className="w-full text-center text-xs font-semibold tracking-wider placeholder:text-gray-400 uppercase py-2.5 px-4 rounded-full border border-black bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3824] transition shadow-xs"
              />
            </div>

            {isRegistering && (
              <div className="w-full">
                <select
                  value={registerRole}
                  onChange={e => setRegisterRole(e.target.value)}
                  className="w-full text-center text-xs font-semibold py-2 px-3 rounded-full border border-black bg-white focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="doctor">Clinic Doctor / Admin</option>
                </select>
              </div>
            )}

            <div className="w-full pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1b3824] hover:bg-[#14291a] active:scale-[0.98] text-white font-bold tracking-widest text-xs py-2.5 rounded-lg uppercase shadow-md transition-all"
              >
                {loading ? 'PLEASE WAIT...' : (isRegistering ? 'REGISTER' : 'LOGIN')}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-[11px] text-gray-700">
            {isRegistering ? (
              <p>
                Have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setAuthMessage(''); }}
                  className="font-bold underline hover:text-black"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                New user?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); setAuthMessage(''); }}
                  className="font-bold underline hover:text-black"
                >
                  Register Account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto bg-white border border-slate-300 shadow-md">
        
        {/* TOP GLOBAL SAGE-GREEN TITLE & NAVIGATION BANNER */}
        <div className="bg-[#a3ba91] px-6 py-4 flex flex-wrap items-center justify-between border-b border-[#8da57b] gap-4">
          
          <div className="flex items-center space-x-8">
            <button
              onClick={() => setMainPage('home')}
              className={`text-2xl md:text-3xl font-black tracking-tight uppercase transition select-none ${
                mainPage === 'home' ? 'text-[#1c3822] underline underline-offset-8 decoration-4' : 'text-white/85 hover:text-white'
              }`}
            >
              HOME
            </button>

            <button
              onClick={() => setMainPage('database')}
              className={`text-2xl md:text-3xl font-black tracking-tight uppercase transition select-none ${
                mainPage === 'database' ? 'text-[#1c3822] underline underline-offset-8 decoration-4' : 'text-white/85 hover:text-white'
              }`}
            >
              STUDENT DATABASE
            </button>

            <button
              onClick={() => setMainPage('scheduling')}
              className={`text-2xl md:text-3xl font-black tracking-tight uppercase transition select-none ${
                mainPage === 'scheduling' ? 'text-[#1c3822] underline underline-offset-8 decoration-4' : 'text-white/85 hover:text-white'
              }`}
            >
              SCHEDULING
            </button>
          </div>

          <div className="flex items-center space-x-4 text-[#1c3822]">
            {isStaff && mainPage === 'database' && (
              <div className="flex items-center space-x-2 mr-2">
                <span className="text-xs font-bold uppercase">Patient:</span>
                <select
                  value={selectedStudentId}
                  onChange={e => handleSelectStudent(e.target.value)}
                  className="text-xs font-semibold py-1 px-2 border border-[#1c3822] bg-white rounded"
                >
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.surname ? `${s.surname}, ${s.first_name}` : (s.full_name || s.email)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button 
              title="Previous Page" 
              onClick={() => {
                if (mainPage === 'scheduling') setMainPage('database');
                else if (mainPage === 'database') setMainPage('home');
              }} 
              className="hover:opacity-75 font-bold text-xl leading-none"
            >
              ←
            </button>
            <button 
              title="Next Page" 
              onClick={() => {
                if (mainPage === 'home') setMainPage('database');
                else if (mainPage === 'database') setMainPage('scheduling');
              }} 
              className="hover:opacity-75 font-bold text-xl leading-none"
            >
              →
            </button>
            <button 
              title="Refresh Record" 
              onClick={async () => {
                await loadStudentData(selectedStudentId, studentInfo.email);
                await fetchAppointments(isStaff ? null : currentUser?.id, isStaff);
              }} 
              className="hover:opacity-75 text-xl leading-none"
            >
              ↻
            </button>
            <button 
              title="Go to Home" 
              onClick={() => setMainPage('home')} 
              className="hover:opacity-75 text-xl leading-none"
            >
              ⌂
            </button>
            <button 
              title="Sign Out" 
              onClick={handleSignOut} 
              className="hover:opacity-75 text-xs font-bold uppercase bg-white/70 hover:bg-white px-2 py-1 rounded border border-[#1c3822]"
            >
              Logout
            </button>
          </div>
        </div>

        {/* ================= VIEW 1: HOME PAGE ================= */}
        {mainPage === 'home' && (
          <div className="p-8 md:p-12 space-y-12 bg-white min-h-[580px]">
            <div className="space-y-6">
              <h2 className="text-2xl font-black tracking-tight text-[#1c3822] uppercase">
                ANNOUNCEMENT
              </h2>

              <div className="pl-6 space-y-5 text-slate-800">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    OPLAN Anti-Leptospirosis
                  </h3>
                  <p className="pl-6 text-sm text-slate-700 font-medium">
                    Free consultations and medications from September 8-10.
                  </p>
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Annual Physical Exam Schedule
                  </h3>
                  <div className="pl-6 pt-1 space-y-1 text-sm font-medium text-slate-700">
                    <p>St. Luke’s College of Nursing</p>
                    <p>College of Medical Technology</p>
                    <p>College of Allied Health and Sciences</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-200">
              <h2 className="text-2xl font-black tracking-tight text-[#1c3822] uppercase">
                MEET YOUR MEDICAL-DENTAL OFFICE STAFF
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                <div className="border border-slate-200 rounded-xl p-5 text-center bg-slate-50 shadow-xs flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-slate-200 border-2 border-[#1c3822] mb-3 flex items-center justify-center font-bold text-slate-500 uppercase text-xs">
                    Dr. Photo
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Dr. Maria Santos, MD</h4>
                  <p className="text-xs text-slate-500 font-medium">University Physician</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-5 text-center bg-slate-50 shadow-xs flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-slate-200 border-2 border-[#1c3822] mb-3 flex items-center justify-center font-bold text-slate-500 uppercase text-xs">
                    Dr. Photo
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Dr. Arthur Reyes, DMD</h4>
                  <p className="text-xs text-slate-500 font-medium">Head Dentist</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-5 text-center bg-slate-50 shadow-xs flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-slate-200 border-2 border-[#1c3822] mb-3 flex items-center justify-center font-bold text-slate-500 uppercase text-xs">
                    Nurse Photo
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Nurse Clarisse Diaz, RN</h4>
                  <p className="text-xs text-slate-500 font-medium">Head Clinic Nurse</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-5 text-center bg-slate-50 shadow-xs flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-slate-200 border-2 border-[#1c3822] mb-3 flex items-center justify-center font-bold text-slate-500 uppercase text-xs">
                    MedTech Photo
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Mark Villanueva, RMT</h4>
                  <p className="text-xs text-slate-500 font-medium">Medical Technologist</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 2: STUDENT DATABASE ================= */}
        {mainPage === 'database' && (
          <div>
            <div className="bg-[#a3ba91] px-4 flex items-end overflow-x-auto select-none pt-1">
              <button
                onClick={() => setActiveTab('student_info')}
                className={`relative py-2.5 px-6 font-bold text-xs md:text-sm tracking-wide uppercase transition-all duration-150 rounded-t-lg ${
                  activeTab === 'student_info'
                    ? 'bg-white text-slate-900 border-t-2 border-l-2 border-r-2 border-slate-400 z-20 shadow-sm'
                    : 'bg-[#1b3824] text-white hover:bg-[#152c1c] z-10'
                }`}
                style={{
                  clipPath: 'polygon(0% 100%, 8% 0%, 92% 0%, 100% 100%)',
                  paddingLeft: '1.75rem',
                  paddingRight: '1.75rem',
                }}
              >
                STUDENT INFORMATION
              </button>

              <button
                onClick={() => setActiveTab('assessment')}
                className={`relative py-2.5 px-6 font-bold text-xs md:text-sm tracking-wide uppercase transition-all duration-150 rounded-t-lg -ml-2 ${
                  activeTab === 'assessment'
                    ? 'bg-white text-slate-900 border-t-2 border-l-2 border-r-2 border-slate-400 z-20 shadow-sm'
                    : 'bg-[#1b3824] text-white hover:bg-[#152c1c] z-10'
                }`}
                style={{
                  clipPath: 'polygon(0% 100%, 8% 0%, 92% 0%, 100% 100%)',
                  paddingLeft: '1.75rem',
                  paddingRight: '1.75rem',
                }}
              >
                ANNUAL PHYSICAL ASSESSMENT
              </button>

              <button
                onClick={() => setActiveTab('consultation')}
                className={`relative py-2.5 px-6 font-bold text-xs md:text-sm tracking-wide uppercase transition-all duration-150 rounded-t-lg -ml-2 ${
                  activeTab === 'consultation'
                    ? 'bg-white text-slate-900 border-t-2 border-l-2 border-r-2 border-slate-400 z-20 shadow-sm'
                    : 'bg-[#d99e46] text-white hover:bg-[#c28c3b] z-10'
                }`}
                style={{
                  clipPath: 'polygon(0% 100%, 8% 0%, 92% 0%, 100% 100%)',
                  paddingLeft: '1.75rem',
                  paddingRight: '1.75rem',
                }}
              >
                CONSULTATIONS
              </button>
            </div>

            {activeTab === 'assessment' && (
              <div className="bg-white border-b border-slate-200 py-3 px-8 flex justify-center items-center space-x-6 text-sm font-extrabold tracking-wide uppercase text-slate-900 select-none">
                <button
                  onClick={() => setAssessmentSubTab('lab_results')}
                  className={`hover:text-[#1c3822] transition ${
                    assessmentSubTab === 'lab_results' ? 'text-[#1c3822] underline underline-offset-8 decoration-2' : 'text-slate-800'
                  }`}
                >
                  LABORATORY RESULTS
                </button>
                <span className="text-slate-400 font-normal">|</span>
                <button
                  onClick={() => setAssessmentSubTab('physical_assessment')}
                  className={`hover:text-[#1c3822] transition ${
                    assessmentSubTab === 'physical_assessment' ? 'text-[#1c3822] underline underline-offset-8 decoration-2' : 'text-slate-800'
                  }`}
                >
                  PHYSICAL ASSESSMENT
                </button>
                <span className="text-slate-400 font-normal">|</span>
                <button
                  onClick={() => setAssessmentSubTab('med_cert')}
                  className={`hover:text-[#1c3822] transition ${
                    assessmentSubTab === 'med_cert' ? 'text-[#1c3822] underline underline-offset-8 decoration-2' : 'text-slate-800'
                  }`}
                >
                  MEDICAL CERTIFICATE
                </button>
              </div>
            )}

            <div className="p-6 md:p-8 bg-white min-h-[580px]">
              {/* TAB 1: STUDENT INFORMATION */}
              {activeTab === 'student_info' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-3 space-y-6 text-sm text-slate-800">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="font-extrabold text-slate-900">Surname</span>
                      <input
                        disabled={isStaff}
                        value={studentInfo.surname}
                        onChange={e => setStudentInfo({...studentInfo, surname: e.target.value})}
                        placeholder="e.g. Bicierro"
                        className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent min-w-[120px]"
                      />

                      <span className="font-extrabold text-slate-900 ml-2">First Name</span>
                      <input
                        disabled={isStaff}
                        value={studentInfo.first_name}
                        onChange={e => setStudentInfo({...studentInfo, first_name: e.target.value})}
                        placeholder="e.g. Sofia Clarice"
                        className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent min-w-[140px]"
                      />

                      <span className="font-extrabold text-slate-900 ml-2">Middle Initial</span>
                      <input
                        disabled={isStaff}
                        value={studentInfo.middle_initial}
                        onChange={e => setStudentInfo({...studentInfo, middle_initial: e.target.value})}
                        placeholder="-"
                        className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent w-12 text-center"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="font-extrabold text-slate-900">Date of Birth</span>
                      <input
                        disabled={isStaff}
                        type="text"
                        value={studentInfo.dob}
                        onChange={e => setStudentInfo({...studentInfo, dob: e.target.value})}
                        placeholder="e.g. September 29, 2004"
                        className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent min-w-[160px]"
                      />

                      <span className="font-extrabold text-slate-900 ml-2">Sex</span>
                      <input
                        disabled={isStaff}
                        value={studentInfo.sex}
                        onChange={e => setStudentInfo({...studentInfo, sex: e.target.value})}
                        placeholder="Female"
                        className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent w-20"
                      />

                      <span className="font-extrabold text-slate-900 ml-2">Program & Year Level</span>
                      <input
                        disabled={isStaff}
                        value={studentInfo.program_year_level}
                        onChange={e => setStudentInfo({...studentInfo, program_year_level: e.target.value})}
                        placeholder="BS Nursing 4th Year"
                        className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent flex-1 min-w-[160px]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-extrabold text-slate-900">Address</span>
                      <input
                        disabled={isStaff}
                        value={studentInfo.address}
                        onChange={e => setStudentInfo({...studentInfo, address: e.target.value})}
                        placeholder="24 Unit 304 Allim Building, Samat Cor Banawe, Brgy Sto. Domingo, Quezon City"
                        className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent flex-1 min-w-[320px]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="font-extrabold text-slate-900">Contact Number</span>
                      <input
                        disabled={isStaff}
                        value={studentInfo.contact_number}
                        onChange={e => setStudentInfo({...studentInfo, contact_number: e.target.value})}
                        placeholder="+63 915 415 1745"
                        className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent min-w-[140px]"
                      />

                      <span className="font-extrabold text-slate-900 ml-2">Email Address</span>
                      <input
                        disabled
                        value={studentInfo.email}
                        className="border-b border-dotted border-slate-400 px-1 text-slate-700 bg-transparent flex-1 min-w-[200px]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-extrabold text-slate-900">Preferred Hospital in Case of Emergency</span>
                      <input
                        disabled={isStaff}
                        value={studentInfo.preferred_hospital}
                        onChange={e => setStudentInfo({...studentInfo, preferred_hospital: e.target.value})}
                        placeholder="St. Luke's Medical Center"
                        className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent flex-1 min-w-[200px]"
                      />
                    </div>

                    <div className="pt-2">
                      <h2 className="text-base font-black tracking-tight text-[#1c3822] uppercase mb-2">
                        EMERGENCY CONTACT
                      </h2>

                      <div className="pl-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-3">
                          <span className="font-extrabold text-slate-900">Full Name</span>
                          <input
                            disabled={isStaff}
                            value={studentInfo.emergency_name}
                            onChange={e => setStudentInfo({...studentInfo, emergency_name: e.target.value})}
                            placeholder="Ma. Klarisa B. Cagahastian"
                            className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent flex-1"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4">
                          <span className="font-extrabold text-slate-900">Contact Number</span>
                          <input
                            disabled={isStaff}
                            value={studentInfo.emergency_contact}
                            onChange={e => setStudentInfo({...studentInfo, emergency_contact: e.target.value})}
                            placeholder="+63 915 415 1745"
                            className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent min-w-[140px]"
                          />

                          <span className="font-extrabold text-slate-900 ml-2">Email Address</span>
                          <input
                            disabled={isStaff}
                            value={studentInfo.emergency_email}
                            onChange={e => setStudentInfo({...studentInfo, emergency_email: e.target.value})}
                            placeholder="sofiaclaricebcagahastian@tua.edu.ph"
                            className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent flex-1"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3">
                          <span className="font-extrabold text-slate-900">Relationship</span>
                          <input
                            disabled={isStaff}
                            value={studentInfo.emergency_relation}
                            onChange={e => setStudentInfo({...studentInfo, emergency_relation: e.target.value})}
                            placeholder="Parent"
                            className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent w-40"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <h2 className="text-base font-black tracking-tight text-[#1c3822] uppercase mb-2">
                        HISTORY
                      </h2>

                      <div className="pl-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-3">
                          <span className="font-extrabold text-slate-900">Allergies</span>
                          <input
                            disabled={isStaff}
                            value={studentInfo.allergies}
                            onChange={e => setStudentInfo({...studentInfo, allergies: e.target.value})}
                            placeholder="None"
                            className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent flex-1"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3">
                          <span className="font-extrabold text-slate-900">Family History</span>
                          <input
                            disabled={isStaff}
                            value={studentInfo.family_history}
                            onChange={e => setStudentInfo({...studentInfo, family_history: e.target.value})}
                            placeholder="Asthma (Maternal), Hypertension (Paternal)"
                            className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent flex-1"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3">
                          <span className="font-extrabold text-slate-900">Vaccination History</span>
                          <input
                            disabled={isStaff}
                            value={studentInfo.vaccination_history}
                            onChange={e => setStudentInfo({...studentInfo, vaccination_history: e.target.value})}
                            placeholder="Complete"
                            className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent flex-1"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3">
                          <span className="font-extrabold text-slate-900">History of Past Illness</span>
                          <input
                            disabled={isStaff}
                            value={studentInfo.history_past_illness}
                            onChange={e => setStudentInfo({...studentInfo, history_past_illness: e.target.value})}
                            placeholder="None"
                            className="border-b border-dotted border-slate-400 focus:border-slate-800 outline-none px-1 text-slate-700 bg-transparent flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {!isStaff && (
                      <div className="pt-4">
                        <button
                          onClick={handleSaveStudentInfo}
                          disabled={loading}
                          className="bg-[#1c3822] hover:bg-[#14291a] text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition"
                        >
                          {loading ? 'Saving...' : 'Save Student Information'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-1 flex flex-col items-center pt-2">
                    <div className="w-48 h-56 border-2 border-slate-400 bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm relative">
                      {studentInfo.id_photo_url ? (
                        <img 
                          src={studentInfo.id_photo_url} 
                          alt="Student ID Photo" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="text-center p-4">
                          <span className="text-xs text-gray-400 font-semibold block uppercase">2x2 Photo</span>
                        </div>
                      )}
                    </div>

                    {!isStaff && (
                      <label className="mt-3 cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-[11px] uppercase tracking-wide py-1.5 px-3 rounded shadow-xs">
                        {studentInfo.id_photo_url ? 'Replace Photo' : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            handleFileUpload(e.target.files[0], 'id_photo_url', 'students');
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ANNUAL PHYSICAL ASSESSMENT */}
              {activeTab === 'assessment' && (
                <div>
                  {assessmentSubTab === 'lab_results' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
                      <div className="md:col-span-2 space-y-4">
                        <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase mb-4">
                          LABORATORY RESULTS
                        </h2>

                        <div className="space-y-3 text-sm">
                          {LAB_KEYS.map(lab => (
                            <div key={lab.key} className="flex items-center justify-between py-1">
                              <span className="font-extrabold text-slate-900 w-64">{lab.label}</span>
                              
                              <div className="flex-1 flex items-center gap-3">
                                {assessment[lab.key] ? (
                                  <div className="flex items-center gap-2 max-w-full">
                                    <a
                                      href={assessment[lab.key]}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-slate-500 hover:text-slate-800 underline font-medium text-xs truncate max-w-[280px]"
                                      title={getDisplayFileName(assessment[lab.key], assessment[lab.nameKey], lab.label)}
                                    >
                                      {getDisplayFileName(assessment[lab.key], assessment[lab.nameKey], lab.label)}
                                    </a>

                                    {!isStaff && (
                                      <label className="text-[11px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer underline shrink-0 ml-1">
                                        (Replace)
                                        <input
                                          type="file"
                                          onChange={e => {
                                            handleFileUpload(e.target.files[0], lab.key, 'physical_assessments', lab.nameKey);
                                            e.target.value = '';
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </div>
                                ) : (
                                  !isStaff ? (
                                    <label className="text-slate-400 hover:text-slate-700 underline cursor-pointer text-xs font-medium">
                                      Upload File Here
                                      <input
                                        type="file"
                                        onChange={e => {
                                          handleFileUpload(e.target.files[0], lab.key, 'physical_assessments', lab.nameKey);
                                          e.target.value = '';
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Pending submission</span>
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-1 border-l-2 border-slate-700 pl-8">
                        <h3 className="text-lg font-black tracking-tight text-slate-900 mb-6">
                          Pending Results
                        </h3>

                        {pendingLabs.length === 0 ? (
                          <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                            All laboratory results completed.
                          </p>
                        ) : (
                          <ul className="space-y-3 text-sm font-medium text-slate-800">
                            {pendingLabs.map(lab => (
                              <li key={lab.key}>
                                {lab.label}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {assessmentSubTab === 'physical_assessment' && (
                    <div className="max-w-2xl space-y-6 pt-2">
                      <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase mb-4">
                        VITAL SIGNS ASSESSMENT
                      </h2>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Blood Pressure</label>
                          <input
                            disabled={!isStaff}
                            value={assessment.blood_pressure || ''}
                            onChange={e => setAssessment({...assessment, blood_pressure: e.target.value})}
                            className="w-full border p-2 rounded disabled:bg-slate-50 text-sm"
                            placeholder="120/80 mmHg"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Heart Rate</label>
                          <input
                            disabled={!isStaff}
                            value={assessment.heart_rate || ''}
                            onChange={e => setAssessment({...assessment, heart_rate: e.target.value})}
                            className="w-full border p-2 rounded disabled:bg-slate-50 text-sm"
                            placeholder="72 bpm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Respiratory Rate</label>
                          <input
                            disabled={!isStaff}
                            value={assessment.respiratory_rate || ''}
                            onChange={e => setAssessment({...assessment, respiratory_rate: e.target.value})}
                            className="w-full border p-2 rounded disabled:bg-slate-50 text-sm"
                            placeholder="18 cpm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Oxygen Saturation</label>
                          <input
                            disabled={!isStaff}
                            value={assessment.oxygen_saturation || ''}
                            onChange={e => setAssessment({...assessment, oxygen_saturation: e.target.value})}
                            className="w-full border p-2 rounded disabled:bg-slate-50 text-sm"
                            placeholder="98%"
                          />
                        </div>
                      </div>

                      {isStaff && (
                        <button
                          onClick={handleSaveVitals}
                          className="bg-[#1c3822] hover:bg-[#14291a] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded shadow-xs"
                        >
                          Save Vital Signs
                        </button>
                      )}
                    </div>
                  )}

                  {assessmentSubTab === 'med_cert' && (
                    <div className="max-w-2xl space-y-6 pt-2">
                      <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase mb-4">
                        OFFICIAL MEDICAL CERTIFICATE
                      </h2>

                      {isStaff ? (
                        <div className="border border-slate-200 p-5 rounded bg-slate-50 space-y-4">
                          <label className="text-xs text-slate-600 block font-semibold uppercase tracking-wider">
                            {assessment.med_cert_url ? 'Replace Cleared Medical Certificate:' : 'Upload Cleared Medical Certificate:'}
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              onChange={e => {
                                handleFileUpload(e.target.files[0], 'med_cert_url', 'physical_assessments', 'med_cert_name');
                                e.target.value = '';
                              }}
                              className="text-xs"
                            />
                            {assessment.med_cert_url && (
                              <a 
                                href={assessment.med_cert_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-blue-600 text-xs font-bold underline"
                              >
                                {assessment.med_cert_name || 'View Issued Certificate'}
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          {assessment.med_cert_url ? (
                            <div className="space-y-4">
                              <p className="text-sm text-emerald-800 font-semibold">
                                ✓ Your medical certificate has been issued and cleared by the university clinic.
                              </p>
                              <a 
                                href={assessment.med_cert_url} 
                                download 
                                target="_blank" 
                                rel="noreferrer" 
                                className="bg-[#1c3822] hover:bg-[#14291a] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded inline-block shadow-sm transition"
                              >
                                Download Official Medical Certificate ({assessment.med_cert_name || 'Certificate.pdf'})
                              </a>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 italic">
                              No official medical certificate has been issued yet. Complete all pending laboratory results to obtain clearance.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CONSULTATIONS */}
              {activeTab === 'consultation' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-extrabold text-lg text-[#1c3822] uppercase tracking-wide">
                      Consultation History
                    </h3>
                    <span className="text-xs text-gray-400 font-medium">
                      {isStaff ? 'Administrator Mode' : 'Read-Only Mode'}
                    </span>
                  </div>

                  {isStaff && (
                    <div className="bg-slate-50 p-5 border border-slate-200 rounded-lg space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Add New Consultation Record</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Date of Consultation</label>
                          <input
                            type="date"
                            value={newConsultation.date_of_consultation}
                            onChange={e => setNewConsultation({...newConsultation, date_of_consultation: e.target.value})}
                            className="border p-2 rounded w-full bg-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Vital Signs</label>
                          <input
                            placeholder="e.g. BP: 120/80, HR: 72 bpm"
                            value={newConsultation.vital_signs}
                            onChange={e => setNewConsultation({...newConsultation, vital_signs: e.target.value})}
                            className="border p-2 rounded w-full bg-white text-sm"
                          />
                        </div>
                        <textarea
                          placeholder="Chief Complaint"
                          value={newConsultation.chief_complaint}
                          onChange={e => setNewConsultation({...newConsultation, chief_complaint: e.target.value})}
                          className="border p-2 rounded col-span-2 h-16 text-sm bg-white"
                        />
                        <textarea
                          placeholder="Doctor's Order / Prescription"
                          value={newConsultation.doctor_order}
                          onChange={e => setNewConsultation({...newConsultation, doctor_order: e.target.value})}
                          className="border p-2 rounded col-span-2 h-20 text-sm bg-white"
                        />
                      </div>
                      <button
                        onClick={handleSaveConsultation}
                        className="bg-[#1c3822] hover:bg-[#14291a] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded shadow-xs"
                      >
                        Save Consultation Record
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {consultations.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No past consultation records found for this student.</p>
                    ) : (
                      consultations.map(c => (
                        <div key={c.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-2xs">
                          <div className="flex justify-between text-xs text-gray-500 border-b pb-2 mb-2">
                            <span><b>Date:</b> {c.date_of_consultation}</span>
                            <span><b>Vitals:</b> {c.vital_signs || 'Not recorded'}</span>
                          </div>
                          <p className="text-sm mb-2"><b>Chief Complaint:</b> {c.chief_complaint}</p>
                          <p className="text-sm text-emerald-950 bg-emerald-50/70 border border-emerald-100 p-3 rounded">
                            <b>Doctor's Order:</b> {c.doctor_order}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ================= VIEW 3: SCHEDULING ================= */}
        {mainPage === 'scheduling' && (
          <div className="p-8 md:p-14 bg-white min-h-[580px]">
            {isStaff ? (
              /* DOCTOR / ADMIN VIEW: PERSISTENT APPOINTMENT MANAGEMENT TABLE */
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-[#1c3822] uppercase">
                      SCHEDULED CLINIC APPOINTMENTS
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage and verify incoming student bookings and procedure schedules.
                    </p>
                  </div>

                  <span className="bg-[#1c3822] text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {appointments.length} Appointments Total
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-[#a3ba91]/30 text-[#1c3822] font-black uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Student Details</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Specific Service</th>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {appointments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                            No scheduled appointments found.
                          </td>
                        </tr>
                      ) : (
                        appointments.map(appt => (
                          <tr key={appt.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-slate-900 block text-sm">
                                {appt.student_name || 'Student Record'}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                ID: {appt.student_id_num || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {appt.type}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700">
                              {appt.detail}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{appt.date}</div>
                              <div className="text-[11px] text-slate-500 font-medium">{appt.time}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase inline-block ${
                                appt.status === 'Confirmed' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : appt.status === 'Completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {appt.status !== 'Confirmed' && (
                                <button
                                  onClick={() => handleUpdateStatus(appt.id, 'Confirmed')}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] px-2.5 py-1 rounded transition"
                                >
                                  Confirm
                                </button>
                              )}

                              {appt.status === 'Confirmed' && (
                                <button
                                  onClick={() => handleUpdateStatus(appt.id, 'Completed')}
                                  className="bg-[#1c3822] hover:bg-[#14291a] text-white font-bold text-[11px] px-2.5 py-1 rounded transition"
                                >
                                  Mark Done
                                </button>
                              )}

                              <button
                                onClick={() => handleCancelAppointment(appt.id)}
                                className="text-red-600 hover:text-red-800 font-bold text-[11px] underline ml-1"
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* STUDENT VIEW: BOOKING CARD + PERSISTENT VIEW MODAL BUTTON */
              <div className="flex flex-col items-center justify-start">
                <div className="w-full max-w-[360px] bg-[#fff6f4] border border-black px-7 py-8 shadow-md">
                  <h2 className="text-center text-3xl font-extrabold tracking-wider text-black font-sans uppercase mb-8 select-none">
                    BOOK APPOINTMENT
                  </h2>

                  {scheduleStep === 'select' ? (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Appointment Type
                        </label>
                        <select
                          value={appointmentType}
                          onChange={e => setAppointmentType(e.target.value)}
                          className="w-full border border-slate-300 bg-white text-xs font-semibold py-2 px-3 rounded shadow-xs focus:outline-none focus:ring-1 focus:ring-[#1b3824]"
                        >
                          <option value="Consultation">Consultation</option>
                          <option value="Procedure">Procedure</option>
                        </select>
                      </div>

                      {appointmentType === 'Consultation' ? (
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1.5">
                            Specialization
                          </label>
                          <select
                            value={specialization}
                            onChange={e => setSpecialization(e.target.value)}
                            className="w-full border border-slate-300 bg-white text-xs font-semibold py-2 px-3 rounded shadow-xs focus:outline-none focus:ring-1 focus:ring-[#1b3824]"
                          >
                            <option value="General Medicine">General Medicine</option>
                            <option value="Dentistry">Dentistry</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1.5">
                            Procedure Type
                          </label>
                          <select
                            value={procedureType}
                            onChange={e => setProcedureType(e.target.value)}
                            className="w-full border border-slate-300 bg-white text-xs font-semibold py-2 px-3 rounded shadow-xs focus:outline-none focus:ring-1 focus:ring-[#1b3824]"
                          >
                            <option value="Dental Cleaning">Dental Cleaning</option>
                            <option value="Hepatitis Vaccination">Hepatitis Vaccination</option>
                          </select>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setScheduleStep('datetime')}
                          className="w-full bg-[#1b3824] hover:bg-[#14291a] active:scale-[0.98] text-white font-bold tracking-widest text-xs py-2.5 rounded uppercase shadow-sm transition"
                        >
                          CONTINUE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleFinalizeBooking} className="space-y-5">
                      <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 p-2.5 rounded font-medium">
                        Selected: <b>{appointmentType}</b> — {appointmentType === 'Consultation' ? specialization : procedureType}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Preferred Date
                        </label>
                        <input
                          type="date"
                          required
                          value={appointmentDate}
                          onChange={e => setAppointmentDate(e.target.value)}
                          className="w-full border border-slate-300 bg-white text-xs p-2 rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Preferred Time Slot
                        </label>
                        <select
                          value={appointmentTime}
                          onChange={e => setAppointmentTime(e.target.value)}
                          className="w-full border border-slate-300 bg-white text-xs p-2 rounded"
                        >
                          <option>08:30 AM</option>
                          <option>09:00 AM</option>
                          <option>10:00 AM</option>
                          <option>11:00 AM</option>
                          <option>01:30 PM</option>
                          <option>02:30 PM</option>
                          <option>03:30 PM</option>
                        </select>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setScheduleStep('select')}
                          className="w-1/3 bg-gray-200 hover:bg-gray-300 text-slate-700 font-bold text-xs py-2.5 rounded uppercase transition"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-2/3 bg-[#1b3824] hover:bg-[#14291a] text-white font-bold tracking-widest text-xs py-2.5 rounded uppercase shadow-sm transition"
                        >
                          {loading ? 'SAVING...' : 'CONFIRM'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAppointmentsModal(true)}
                    className="bg-[#1c3822] hover:bg-[#14291a] text-white font-bold text-xs uppercase tracking-wider py-2.5 px-6 rounded-md shadow-sm transition flex items-center gap-2"
                  >
                    <span>📅 View My Scheduled Appointments</span>
                    <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                      {appointments.length}
                    </span>
                  </button>
                </div>

                {showAppointmentsModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="bg-[#a3ba91] px-6 py-4 flex justify-between items-center border-b border-[#8da57b]">
                        <h3 className="font-black text-[#1c3822] uppercase tracking-wide text-base">
                          Your Scheduled Appointments ({appointments.length})
                        </h3>
                        <button
                          onClick={() => setShowAppointmentsModal(false)}
                          className="text-[#1c3822] hover:text-black font-extrabold text-xl leading-none"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="p-6 max-h-[420px] overflow-y-auto space-y-3">
                        {appointments.length === 0 ? (
                          <p className="text-sm text-slate-500 italic text-center py-6">
                            No appointments currently scheduled.
                          </p>
                        ) : (
                          appointments.map(appt => (
                            <div
                              key={appt.id}
                              className="border border-slate-200 p-3.5 rounded-lg flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition shadow-2xs text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    {appt.type}: {appt.detail}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                    appt.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {appt.status}
                                  </span>
                                </div>
                                <p className="text-slate-500 mt-1 font-medium">
                                  📅 <b>{appt.date}</b> at <b>{appt.time}</b>
                                </p>
                              </div>

                              <button
                                onClick={() => handleCancelAppointment(appt.id)}
                                className="text-red-600 hover:text-red-800 hover:underline font-bold text-xs shrink-0 ml-3"
                              >
                                Cancel
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
                        <button
                          onClick={() => setShowAppointmentsModal(false)}
                          className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider py-1.5 px-4 rounded transition"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}