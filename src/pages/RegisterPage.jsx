import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import toast, { Toaster } from 'react-hot-toast';
import { 
  IconHome, IconHelmet, IconBuildingStore, IconTools, 
  IconArrowRight, IconArrowLeft, IconCheck, IconEye, 
  IconEyeOff, IconMapPin, IconCurrentLocation, IconShieldCheck,
  IconCircleCheck, IconCircle
} from '@tabler/icons-react';
import MapPicker from '../components/MapPicker';
import { useAuth } from '../context/AuthContext';

// --- Sub-components ---

const StepIndicator = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Role' },
    { id: 2, label: 'Details' },
    { id: 3, label: 'Location' },
    { id: 4, label: 'Review' }
  ];

  return (
    <div className="flex items-center justify-between w-full mb-8 px-4">
      {steps.map((s, idx) => (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-2 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
              currentStep > s.id 
                ? 'bg-primary border-primary text-white' 
                : currentStep === s.id 
                  ? 'bg-accent border-accent text-white' 
                  : 'bg-white border-gray-300 text-gray-400'
            }`}>
              {currentStep > s.id ? <IconCheck size={20} /> : s.id}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              currentStep === s.id ? 'text-accent' : 'text-gray-400'
            }`}>{s.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mt-[-20px] mx-[-10px] transition-all duration-300 ${
              currentStep > s.id ? 'bg-primary' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const BrandingPanel = ({ role }) => {
  const getSubtext = () => {
    switch(role) {
      case 'customer': return "Plan & visualize your construction project with ease.";
      case 'contractor': return "Manage projects, hire workers, and source materials seamlessly.";
      case 'dealer': return "Reach thousands of contractors and grow your business.";
      case 'professional': return "Get hired for top construction jobs in your area.";
      default: return "India's first AI-powered construction marketplace.";
    }
  };

  return (
    <div className="hidden lg:flex lg:w-[38%] bg-primary text-white p-12 flex-col justify-between relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-blue-400/10 rounded-full blur-2xl" />

      <div className="relative z-10">
        <Link to="/" className="flex items-center gap-2 mb-16">
          <div className="bg-accent p-2 rounded-xl">
            <IconHelmet size={32} className="text-white" />
          </div>
          <span className="text-3xl font-black tracking-tight">Brickly</span>
        </Link>

        <motion.div
           key={role}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="mb-8"
        >
          <h2 className="text-4xl font-black mb-4 leading-tight">
            {role ? `Welcome, ${role.charAt(0).toUpperCase() + role.slice(1)}!` : "Join the future of construction."}
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            {getSubtext()}
          </p>
        </motion.div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="bg-green-500/20 p-2 rounded-lg"><IconShieldCheck size={20} className="text-green-400" /></div>
            <div>
              <p className="font-bold text-sm">Secure Platform</p>
              <p className="text-xs text-blue-200">Verified users & encrypted data</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="bg-orange-500/20 p-2 rounded-lg"><IconTools size={20} className="text-orange-400" /></div>
            <div>
              <p className="font-bold text-sm">AI-Powered Tools</p>
              <p className="text-xs text-blue-200">Smart matching & cost estimation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 text-blue-200 text-xs font-medium">
        &copy; 2026 Brickly Technologies Pvt Ltd. All rights reserved.
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const [step, setStep] = useState(1);
  const [role, setRole] = useState(roleParam || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    password: '', confirmPassword: '',
    address: '',
    companyName: '', yearsInBusiness: '', specialization: '',
    shopName: '', ownerName: '',
    categories: [],
    gstNumber: '',
    jobRole: '', jobRoleCustom: '',
    yearsOfExperience: '',
    qualification: '',
    locationPreference: '',
    about: '',
  });

  const [otpStep, setOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [locationData, setLocationData] = useState({
    lat: null, lng: null,
    displayName: '',
    city: '', state: '', country: '', pincode: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (roleParam && ['customer', 'contractor', 'dealer', 'professional'].includes(roleParam)) {
      setRole(roleParam);
    }
  }, [roleParam]);

  useEffect(() => {
    let interval;
    if (otpStep && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [otpStep, timer]);

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
      case 'ownerName':
      case 'shopName':
      case 'companyName':
        if (!value || value.length < 2) error = 'Minimum 2 characters required';
        break;
      case 'email':
        if (!value || !/\S+@\S+\.\S+/.test(value)) error = 'Enter a valid email address';
        break;
      case 'phone':
        if (!value || !/^\d{10}$/.test(value)) error = 'Enter exactly 10 digits';
        break;
      case 'password':
        if (!value || value.length < 8) error = 'Minimum 8 characters';
        else if (!/[0-9]/.test(value)) error = 'Must include at least one number';
        else if (!/[a-zA-Z]/.test(value)) error = 'Must include at least one letter';
        break;
      case 'confirmPassword':
        if (value !== form.password) error = 'Passwords do not match';
        break;
      case 'address':
        if (!value || value.length < 10) error = 'Provide at least 10 characters for full address';
        break;
      case 'jobRole':
        if (!value) error = 'Please select a trade';
        break;
      case 'jobRoleCustom':
        if (form.jobRole === 'Other' && (!value || value.length < 2)) error = 'Please specify your trade';
        break;
      case 'yearsOfExperience':
        if (value === '' || value === null || value === undefined) error = 'Required';
        else if (value < 0) error = 'Cannot be negative';
        break;
      default:
        break;
    }
    return error;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      const newCategories = checked 
        ? [...form.categories, value]
        : form.categories.filter(c => c !== value);
      setForm(prev => ({ ...prev, categories: newCategories }));
      if (newCategories.length > 0) setErrors(prev => ({ ...prev, categories: '' }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const getPasswordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let strength = 0;
    if (p.length >= 8) strength += 33;
    if (/[0-9]/.test(p)) strength += 22;
    if (/[A-Z]/.test(p)) strength += 22;
    if (/[^A-Za-z0-9]/.test(p)) strength += 23;
    return Math.min(strength, 100);
  };

  const isStep2Valid = () => {
    const req = {
      customer: ['name', 'email', 'phone', 'password', 'confirmPassword', 'address'],
      contractor: ['name', 'email', 'phone', 'password', 'confirmPassword', 'address'],
      dealer: ['shopName', 'ownerName', 'email', 'phone', 'password', 'confirmPassword', 'address'],
      professional: ['name', 'email', 'phone', 'password', 'confirmPassword', 'jobRole', 'yearsOfExperience']
    };

    const roleFields = req[role] || [];
    const hasEmpty = roleFields.some(f => {
      const val = form[f];
      return val === '' || val === null || val === undefined;
    });
    const hasErrors = roleFields.some(f => !!validateField(f, form[f]));
    
    if (role === 'dealer' && form.categories.length === 0) return false;
    if (role === 'professional' && form.jobRole === 'Other' && !form.jobRoleCustom) return false;

    return !hasEmpty && !hasErrors;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        role,
        name: role === 'dealer' ? form.ownerName : form.name,
        shopName: form.shopName,
        companyName: form.companyName || form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        address: form.address,
        lat: locationData.lat,
        lng: locationData.lng,
        displayName: locationData.displayName,
        city: locationData.city,
        state: locationData.state,
        country: locationData.country,
        pincode: locationData.pincode,
        yearsInBusiness: form.yearsInBusiness,
        specialization: form.specialization,
        categories: form.categories,
        gstNumber: form.gstNumber,
        jobRole: form.jobRole === 'Other' ? form.jobRoleCustom : form.jobRole,
        yearsOfExperience: form.yearsOfExperience,
        qualification: form.qualification,
        locationPreference: form.locationPreference,
        about: form.about,
      };

      const res = await api.post('/api/auth/register', payload, { timeout: 60000 });
      toast.success(res.data.message);
      setOtpStep(true);
      setTimer(600);
      setCanResend(false);
    } catch (err) {
      console.error("Registration error:", err);
      const msg = err.code === 'ECONNABORTED' 
        ? "The server is taking too long to respond. This might be due to slow email delivery. Please wait a moment and try again."
        : err.response?.data?.message || 'Registration failed. Please check your internet and try again.';
      toast.error(msg, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      toast.error("Please enter all 6 digits");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await api.post('/api/auth/verify-account', {
        email: form.email,
        otp
      });
      
      toast.success("Account verified successfully!");
      login(res.data.token, res.data.user);
      setTimeout(() => navigate('/home', { replace: true }), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed";
      toast.error(msg);
      if (msg.toLowerCase().includes('expired')) {
        setCanResend(true);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setCanResend(false);
    setTimer(600);
    try {
      await api.post('/api/otp/send-otp', {
        email: form.email,
        name: form.name
      });
      toast.success("New OTP sent!");
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      toast.error("Failed to resend OTP");
      setCanResend(true);
    }
  };

  const nextStep = () => {
    if (step === 2 && !isStep2Valid()) {
      toast.error("Please fix all errors before proceeding");
      return;
    }
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  // --- Step Render Functions ---

  const renderStep1Role = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8">
        <h3 className="text-2xl font-black text-primary mb-1">Who are you?</h3>
        <p className="text-gray-500">Select your role to continue</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[
          { id: 'customer', title: 'Customer', desc: 'Plan & visualize your construction project', icon: IconHome },
          { id: 'contractor', title: 'Contractor', desc: 'Manage projects, hire workers, source materials', icon: IconHelmet },
          { id: 'dealer', title: 'Material Dealer', desc: 'List products and receive orders from contractors', icon: IconBuildingStore },
          { id: 'professional', title: 'CraftLink Professional', desc: 'Find construction jobs and get hired', icon: IconTools },
        ].map((r) => (
          <button
            key={r.id}
            onClick={() => setRole(r.id)}
            className={`flex flex-col p-5 rounded-2xl border-2 text-left transition-all group ${
              role === r.id 
                ? 'border-accent bg-orange-50 ring-4 ring-orange-100' 
                : 'border-gray-100 hover:border-accent/30 hover:bg-gray-50'
            }`}
          >
            <div className={`p-3 rounded-xl mb-4 w-fit transition-colors ${
              role === r.id ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-accent/10 group-hover:text-accent'
            }`}>
              <r.icon size={24}/>
            </div>
            <h4 className={`font-bold mb-1 ${role === r.id ? 'text-accent' : 'text-primary'}`}>{r.title}</h4>
            <p className="text-xs text-gray-400 leading-snug">{r.desc}</p>
          </button>
        ))}
      </div>
      <button
        disabled={!role}
        onClick={nextStep}
        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
          role ? 'bg-primary text-white hover:bg-slate-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        Continue <IconArrowRight size={20} />
      </button>
    </div>
  );

  const renderStep2Details = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-2xl font-black text-primary">Your Details</h3>
        <span className="text-xs font-bold px-3 py-1 bg-blue-100 text-primary rounded-full uppercase tracking-tighter">
          {role}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {(role === 'customer' || role === 'contractor' || role === 'professional') && (
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">Full Name *</label>
            <input 
              name="name" value={form.name} onChange={handleInputChange} onBlur={handleBlur}
              placeholder="e.g. Rahul Menon" 
              className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100'} outline-none focus:ring-4 transition-all`}
            />
            {errors.name && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{errors.name}</p>}
          </div>
        )}

        {role === 'dealer' && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">Shop / Business Name *</label>
              <input 
                name="shopName" value={form.shopName} onChange={handleInputChange} onBlur={handleBlur}
                placeholder="e.g. Lakshmi Building Supplies" 
                className={`w-full px-4 py-3 rounded-xl border ${errors.shopName ? 'border-red-500' : 'border-gray-200'} outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
              />
              {errors.shopName && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{errors.shopName}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">Owner Full Name *</label>
              <input 
                name="ownerName" value={form.ownerName} onChange={handleInputChange} onBlur={handleBlur}
                placeholder="e.g. Suresh Kumar" 
                className={`w-full px-4 py-3 rounded-xl border ${errors.ownerName ? 'border-red-500' : 'border-gray-200'} outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
              />
              {errors.ownerName && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{errors.ownerName}</p>}
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-sm font-bold text-gray-700">Email Address *</label>
          <input 
            type="email" name="email" value={form.email} onChange={handleInputChange} onBlur={handleBlur}
            placeholder="you@example.com" 
            className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-500' : 'border-gray-200'} outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
          />
          {errors.email && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{errors.email}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-gray-700">Contact Number *</label>
          <input 
            type="tel" name="phone" value={form.phone} onChange={handleInputChange} onBlur={handleBlur}
            placeholder="10-digit mobile number" 
            className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-gray-200'} outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
          />
          {errors.phone && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{errors.phone}</p>}
        </div>

        <div className="space-y-1 relative">
          <label className="text-sm font-bold text-gray-700">Password *</label>
          <div className="relative">
             <input 
              type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleInputChange} onBlur={handleBlur}
              placeholder="Minimum 8 characters" 
              className={`w-full pl-4 pr-12 py-3 rounded-xl border ${errors.password ? 'border-red-500' : 'border-gray-200'} outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
            </button>
          </div>
          {/* Strength Meter */}
          <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden flex">
            <div 
              className={`h-full transition-all duration-500 ${getPasswordStrength() > 66 ? 'bg-green-500' : getPasswordStrength() > 33 ? 'bg-orange-500' : 'bg-red-500'}`}
              style={{ width: `${getPasswordStrength()}%` }}
            />
          </div>
          {errors.password && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{errors.password}</p>}
        </div>

        <div className="space-y-1 relative">
          <label className="text-sm font-bold text-gray-700">Confirm Password *</label>
          <div className="relative">
            <input 
              type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleInputChange} onBlur={handleBlur}
              className={`w-full pl-4 pr-12 py-3 rounded-xl border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'} outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
            />
             <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirmPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{errors.confirmPassword}</p>}
        </div>

        {role !== 'professional' && (
           <div className="md:col-span-2 space-y-1">
            <label className="text-sm font-bold text-gray-700">
              {role === 'customer' ? 'Residential Address *' : role === 'contractor' ? 'Company / Office Address *' : 'Shop Address *'}
            </label>
            <textarea 
              rows={3} name="address" value={form.address} onChange={handleInputChange} onBlur={handleBlur}
              placeholder={role === 'customer' ? "House/flat no., street, area, city" : "Full address with city"}
              className={`w-full px-4 py-3 rounded-xl border ${errors.address ? 'border-red-500' : 'border-gray-200'} outline-none focus:ring-4 focus:ring-blue-100 transition-all resize-none`}
            />
            {errors.address && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{errors.address}</p>}
          </div>
        )}

        {/* Contractor specific optional fields */}
        {role === 'contractor' && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">Years in Business</label>
              <input type="number" name="yearsInBusiness" value={form.yearsInBusiness} onChange={handleInputChange} placeholder="e.g. 5" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">Specialization</label>
              <input name="specialization" value={form.specialization} onChange={handleInputChange} placeholder="e.g. Residential buildings" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
            </div>
          </>
        )}

        {/* Professional specific fields */}
        {role === 'professional' && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">Job Role / Trade *</label>
              <select 
                name="jobRole" value={form.jobRole} onChange={handleInputChange} onBlur={handleBlur}
                className={`w-full px-4 py-3 rounded-xl border ${errors.jobRole ? 'border-red-500' : 'border-gray-200'} outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
              >
                <option value="">-- Select your trade --</option>
                {['Plumber', 'Electrician', 'Mason', 'Carpenter', 'Welder', 'Painter', 'Civil Engineer', 'Architect', 'Interior Designer', 'Foreman', 'Tiler', 'Roofer', 'AC Technician', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.jobRole && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{errors.jobRole}</p>}
            </div>
            {form.jobRole === 'Other' && (
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700">Specify Trade *</label>
                <input name="jobRoleCustom" value={form.jobRoleCustom} onChange={handleInputChange} onBlur={handleBlur} placeholder="Type your skill" className={`w-full px-4 py-3 rounded-xl border ${errors.jobRoleCustom ? 'border-red-500' : 'border-gray-200'} transition-all outline-none focus:ring-4 focus:ring-blue-100`} />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">Years of Experience *</label>
              <input type="number" name="yearsOfExperience" value={form.yearsOfExperience} onChange={handleInputChange} onBlur={handleBlur} placeholder="e.g. 4" className={`w-full px-4 py-3 rounded-xl border ${errors.yearsOfExperience ? 'border-red-500' : 'border-gray-200'} transition-all outline-none focus:ring-4 focus:ring-blue-100`} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">Highest Qualification</label>
              <select name="qualification" value={form.qualification} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all">
                {['Below 10th', '10th Pass', '12th Pass', 'ITI / Diploma', 'Graduate', 'Post Graduate', 'Other'].map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Dealer Categories Grid */}
      {role === 'dealer' && (
        <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <label className="text-sm font-black text-primary mb-4 block">Business Categories *</label>
          <div className="grid grid-cols-2 gap-4">
            {[
              'Cement & Concrete', 'Steel & Metal', 'Bricks & Blocks', 'Sand & Aggregates',
              'Tiles & Flooring', 'Wood & Timber', 'Electrical Materials', 'Plumbing Supplies',
              'Paint & Finishing', 'Glass & Windows', 'Roofing Materials', 'Other'
            ].map(cat => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" value={cat} checked={form.categories.includes(cat)} onChange={handleInputChange} className="peer hidden" />
                  <div className="w-5 h-5 rounded border-2 border-gray-300 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                    <IconCheck size={14} className="text-white opacity-0 peer-checked:opacity-100" />
                  </div>
                </div>
                <span className="text-sm text-gray-600 group-hover:text-primary">{cat}</span>
              </label>
            ))}
          </div>
          {errors.categories && <p className="text-[10px] font-bold text-red-500 mt-2 uppercase">{errors.categories}</p>}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="text-sm font-black text-primary mb-1 block">GST Number (Optional)</label>
            <div className="relative">
              <input 
                name="gstNumber" value={form.gstNumber} onChange={handleInputChange} 
                placeholder="15-digit GST number"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-mono uppercase"
              />
              {form.gstNumber && form.gstNumber.length > 0 && (
                 <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                    <IconShieldCheck size={14} /> ✓ GST Verified badge will appear on your profile
                 </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Providing your GST number earns you a <span className="font-bold text-primary">Verified Supplier</span> badge</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button onClick={prevStep} className="flex-1 py-4 rounded-xl border-2 border-gray-100 font-bold text-primary hover:bg-gray-50 flex items-center justify-center gap-2 transition-all">
          <IconArrowLeft size={20} /> Back
        </button>
        <button 
          onClick={nextStep}
          disabled={!isStep2Valid()}
          className={`flex-[2] py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            isStep2Valid() ? 'bg-primary text-white hover:bg-slate-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Next Step <IconArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  const renderStep3Location = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8">
        <h3 className="text-2xl font-black text-primary mb-1">Pin your exact location</h3>
        <p className="text-sm text-gray-500">
          {role === 'customer' && "We use this to find verified contractors near you"}
          {role === 'contractor' && "Customers and material dealers will discover you based on this"}
          {role === 'dealer' && "Contractors nearby will find your shop using this location"}
          {role === 'professional' && "Contractors in your area will see and hire you"}
        </p>
      </div>

      <div className="mb-6">
        <MapPicker 
          onLocationSelect={setLocationData} 
          initialLocation={locationData}
        />
      </div>

      <div className={`p-5 rounded-2xl border-2 mb-8 flex items-start gap-4 transition-all ${
        locationData.lat ? 'border-green-100 bg-green-50/50' : 'border-dashed border-gray-200 bg-gray-50/50'
      }`}>
        <div className={`p-3 rounded-xl ${locationData.lat ? 'bg-green-100 text-green-600' : 'bg-white text-gray-400'}`}>
          <IconMapPin size={24} />
        </div>
        <div className="flex-1">
          {locationData.lat ? (
            <>
              <p className="text-sm font-black text-primary mb-1 line-clamp-2">{locationData.displayName}</p>
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                  Lat: {locationData.lat.toFixed(6)} | Lng: {locationData.lng.toFixed(6)}
                </p>
                {locationData.accuracy && (
                  <span className="text-[10px] font-bold text-accent bg-orange-50 px-2 py-0.5 rounded-full">
                    GPS Accuracy: ±{Math.round(locationData.accuracy)}m
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-400">No location pinned yet</p>
              <p className="text-xs text-gray-400">Click the map or use the <IconCurrentLocation size={14} className="inline inline-block align-text-bottom" /> button on the map</p>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={prevStep} className="flex-1 py-4 rounded-xl border-2 border-gray-100 font-bold text-primary hover:bg-gray-50 flex items-center justify-center gap-2 transition-all">
          <IconArrowLeft size={20} /> Back
        </button>
        <button 
          onClick={nextStep}
          disabled={!locationData.lat}
          className={`flex-[2] py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            locationData.lat ? 'bg-primary text-white hover:bg-slate-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Review Details <IconArrowRight size={20} />
        </button>
      </div>
    </div>
  );

  const renderStep4Review = () => {
    const sections = [
      {
        title: "Account",
        step: 2,
        data: [
          { label: "Role", value: role, isBadge: true },
          { label: "Name", value: role === 'dealer' ? form.ownerName : form.name },
          { label: "Email", value: form.email },
          { label: "Phone", value: form.phone },
        ]
      },
      {
        title: "Address",
        step: 2,
        data: [
          { label: "Full Address", value: form.address || "N/A" }
        ]
      },
      {
        title: "Location",
        step: 3,
        data: [
          { label: "Map Location", value: locationData.displayName, bold: true },
          { label: "Details", value: `Lat: ${locationData.lat?.toFixed(4)}, Lng: ${locationData.lng?.toFixed(4)}, PIN: ${locationData.pincode || 'N/A'}`, mono: true }
        ]
      }
    ];

    if (role !== 'customer') {
      const roleDetails = {
        title: "Role Details",
        step: 2,
        data: []
      };
      if (role === 'contractor') {
        roleDetails.data.push({ label: "Business Since", value: form.yearsInBusiness ? `${form.yearsInBusiness} Years` : 'Not specified' });
        roleDetails.data.push({ label: "Specialization", value: form.specialization || 'General' });
      } else if (role === 'dealer') {
        roleDetails.data.push({ label: "Shop", value: form.shopName });
        roleDetails.data.push({ label: "Categories", value: form.categories.join(', '), isPill: true });
        if (form.gstNumber) roleDetails.data.push({ label: "GST number", value: `${form.gstNumber} (Verified)`, isVerified: true });
      } else if (role === 'professional') {
        roleDetails.data.push({ label: "Trade", value: form.jobRole === 'Other' ? form.jobRoleCustom : form.jobRole });
        roleDetails.data.push({ label: "Experience", value: `${form.yearsOfExperience} Years` });
        roleDetails.data.push({ label: "Qualification", value: form.qualification });
      }
      sections.push(roleDetails);
    }

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-primary mb-1">Review your details</h3>
          <p className="text-gray-500">Everything look correct? Create your account below.</p>
        </div>

        <div className="space-y-4 mb-8">
          {sections.map((sec, i) => (
            <div key={i} className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm relative group overflow-hidden">
               <div className="absolute top-0 right-0 p-3">
                 <button onClick={() => setStep(sec.step)} className="text-[10px] font-black uppercase text-gray-400 hover:text-accent transition-colors">Edit</button>
               </div>
               <h5 className="text-xs font-black uppercase tracking-widest text-primary/40 mb-3">{sec.title}</h5>
               <div className="space-y-2">
                 {sec.data.map((item, idx) => (
                   <div key={idx} className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.label}</span>
                      {item.isBadge ? (
                        <span className={`w-fit mt-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          role === 'customer' ? 'bg-blue-100 text-blue-600' :
                          role === 'contractor' ? 'bg-slate-900 text-white' :
                          role === 'dealer' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                        }`}>{item.value}</span>
                      ) : (
                        <span className={`text-sm ${item.bold ? 'font-black text-primary' : 'font-medium text-gray-700'} ${item.mono ? 'font-mono text-[10px]' : ''}`}>
                          {item.value}
                        </span>
                      )}
                   </div>
                 ))}
               </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={prevStep} className="flex-1 py-4 rounded-xl border-2 border-gray-100 font-bold text-primary hover:bg-gray-50 transition-all">
            Back
          </button>
          <button 
            disabled={loading}
            onClick={handleSubmit} 
            className={`flex-[3] py-4 rounded-xl font-black text-lg shadow-xl shadow-orange-100 transition-all flex items-center justify-center gap-2 ${
              loading ? 'bg-accent/70 cursor-not-allowed text-white' : 'bg-accent text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {loading ? 'Creating Account...' : 'Create My Account'}
            {!loading && <IconCheck size={24} />}
          </button>
        </div>
      </div>
    );
  };

  const renderOTPVerification = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-orange-100 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
          <IconShieldCheck size={32} />
        </div>
        <h3 className="text-2xl font-black text-primary mb-2">Verify your email</h3>
        <p className="text-gray-500 text-sm">
          We've sent a 6-digit code to <span className="font-bold text-primary">{form.email}</span>
        </p>
      </div>

      <div className="flex justify-between gap-2 mb-8">
        {otpDigits.map((digit, idx) => (
          <input
            key={idx}
            id={`otp-${idx}`}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(idx, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
            className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-black rounded-xl border-2 border-gray-100 focus:border-accent focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
          />
        ))}
      </div>

      <div className="text-center mb-8">
        <p className="text-sm font-medium text-gray-400 mb-2">
          Code expires in: <span className="font-bold text-primary">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</span>
        </p>
        <button
          disabled={!canResend}
          onClick={handleResendOTP}
          className={`text-sm font-bold transition-colors ${
            canResend ? 'text-accent hover:text-orange-600 underline' : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          Resend OTP
        </button>
      </div>

      <button
        disabled={isVerifying}
        onClick={handleVerifyOTP}
        className={`w-full py-4 rounded-xl font-black text-lg shadow-xl shadow-orange-100 transition-all flex items-center justify-center gap-2 ${
          isVerifying ? 'bg-accent/70 cursor-not-allowed text-white' : 'bg-accent text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {isVerifying ? 'Verifying...' : 'Verify & Continue'}
        {!isVerifying && <IconArrowRight size={24} />}
      </button>

      <button
        onClick={() => setOtpStep(false)}
        className="w-full mt-4 text-xs font-bold text-gray-400 hover:text-primary transition-colors"
      >
        Change Email Address
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Toaster position="top-right" />
      <BrandingPanel role={role} />

      <div className="flex-1 flex flex-col p-6 lg:p-16 overflow-y-auto">
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
          <div className="bg-accent p-1.5 rounded-lg">
            <IconHelmet size={24} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-primary">Brickly</span>
        </Link>

        <div className="max-w-xl mx-auto w-full">
          <StepIndicator currentStep={step} />

          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-slate-200/50 p-8 md:p-10">
            {otpStep ? (
              renderOTPVerification()
            ) : (
              <>
                {step === 1 && renderStep1Role()}
                {step === 2 && renderStep2Details()}
                {step === 3 && renderStep3Location()}
                {step === 4 && renderStep4Review()}
              </>
            )}

            {!otpStep && (
              <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                <p className="text-sm font-medium text-gray-400">
                  Already have an account? {' '}
                  <Link to="/login" className="text-primary font-black hover:text-accent transition-colors underline decoration-2 underline-offset-4 decoration-accent/20 hover:decoration-accent">Sign in &rarr;</Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
