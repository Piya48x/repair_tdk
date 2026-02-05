import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  Monitor, Globe, Printer, Mail, Lock, Camera, CheckCircle,
  ArrowLeft, Loader2, User, AlertCircle, Building,
  RotateCcw, FlipHorizontal, FlipVertical, Video, Image as ImageIcon,
  X, Maximize2, Minimize2, Zap, Sparkles, Smartphone, Tablet, Laptop, Settings
} from "lucide-react";
import Webcam from "react-webcam";

/* ================= CONFIG ================= */
const CATEGORIES = [
  { id: "Hardware", label: "Computer", icon: Monitor, activeColor: "bg-blue-600", gradient: "from-blue-500 to-blue-700" },
  { id: "Network", label: "Network", icon: Globe, activeColor: "bg-cyan-600", gradient: "from-cyan-500 to-cyan-700" },
  { id: "Printer", label: "Printer", icon: Printer, activeColor: "bg-orange-600", gradient: "from-orange-500 to-orange-700" },
  { id: "Email", label: "Email", icon: Mail, activeColor: "bg-purple-600", gradient: "from-purple-500 to-purple-700" },
  { id: "System", label: "System", icon: Lock, activeColor: "bg-slate-800", gradient: "from-slate-700 to-slate-900" },
];

const ISSUES = {
  Hardware: ["เปิดไม่ติด", "เครื่องช้า", "อุปกรณ์เสริม", "หน้าจอแตก", "เสียงดังผิดปกติ"],
  Network: ["WiFi ไม่ได้", "เน็ตช้า", "เข้า Server ไม่ได้", "อินเทอร์เน็ตขาด", "VPN ใช้งานไม่ได้"],
  Printer: ["พิมพ์ไม่ออก", "หมึกหมด", "กระดาษติด", "พิมพ์สีเพี้ยน", "เครื่องส่งเสียงดัง"],
  Email: ["ส่งไม่ได้", "Outlook ค้าง", "ลืมรหัส", "สแปมมากเกิน", "แนบไฟล์ไม่ได้"],
  System: ["Login ไม่ได้", "ขอสิทธิ์", "โปรแกรม Error", "ไวรัส/มัลแวร์", "Windows Update"],
};

const URGENCY = [
  { 
    id: "Low", 
    label: "รอได้", 
    color: "text-emerald-600", 
    bg: "bg-emerald-50", 
    border: "border-emerald-200",
    icon: "⏳",
    description: "สามารถรอได้ 1-3 วัน"
  },
  { 
    id: "Normal", 
    label: "เร็วหน่อยก็ดี", 
    color: "text-amber-600", 
    bg: "bg-amber-50", 
    border: "border-amber-200",
    icon: "⚡",
    description: "ควรแก้ไขภายในวันนี้"
  },
  { 
    id: "Urgent", 
    label: "ให้ไว้น้อง", 
    color: "text-rose-600", 
    bg: "bg-rose-50", 
    border: "border-rose-200",
    icon: "🚨",
    description: "ต้องการความช่วยเหลือด่วน"
  },
];

const CreateTicket = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [facingMode, setFacingMode] = useState("user");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });
  const [animationStep, setAnimationStep] = useState(0);

  const [form, setForm] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    category: "",
    issue: "",
    urgency: "Normal",
    attachment: null,
    cameraImage: null,
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketRef, setTicketRef] = useState("");
  const [cameraError, setCameraError] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [showCameraControls, setShowCameraControls] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  // Detect device type and screen size
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024
      });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    // Animation sequence
    const animTimer = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 3);
    }, 2000);

    return () => {
      window.removeEventListener('resize', checkDevice);
      clearInterval(animTimer);
    };
  }, []);

  // Get user data
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return;

      const email = data.user.email;
      const username = email.split("@")[0];
      const empId = username.replace(/\D/g, "") || "EMP";
      
      const userMetadata = data.user.user_metadata || {};
      
      setForm(p => ({ 
        ...p, 
        employeeId: empId,
        employeeName: userMetadata.full_name || username.toUpperCase(),
        department: userMetadata.department || "ไม่ระบุแผนก"
      }));
    };
    init();
  }, []);

  // Handle file upload
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("ไฟล์ขนาดเกิน 5MB กรุณาเลือกรูปที่มีขนาดเล็กกว่า");
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    setForm(p => ({ ...p, attachment: file }));
    setPreview(URL.createObjectURL(file));
    setIsCameraActive(false);
  };

  // Webcam capture
  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    // Convert base64 to blob
    fetch(imageSrc)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setForm(p => ({ ...p, attachment: file, cameraImage: imageSrc }));
        setPreview(imageSrc);
        setCapturedImages(prev => [...prev.slice(-2), imageSrc]); // Keep last 3 images
        
        // Success animation feedback
        const captureBtn = document.querySelector('.capture-btn');
        if (captureBtn) {
          captureBtn.classList.add('scale-90');
          setTimeout(() => captureBtn.classList.remove('scale-90'), 300);
        }
      });
  }, [webcamRef]);

  // Toggle camera
  const toggleCamera = () => {
    if (isCameraActive) {
      setIsCameraActive(false);
      setCameraError(null);
    } else {
      setCameraLoading(true);
      setIsCameraActive(true);
      setShowCameraControls(true);
      setTimeout(() => setCameraLoading(false), 500);
    }
  };

  // Switch camera (front/back)
  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  // Camera error handling
  const handleCameraError = (error) => {
    console.error("Camera error:", error);
    setCameraError("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง");
    setIsCameraActive(false);
    setCameraLoading(false);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

 
  // ค้นหาฟังก์ชัน handleSubmit ใน CreateTicket.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.category || !form.issue) {
    alert("กรุณากรอกประเภทอุปกรณ์และอาการที่พบ");
    return;
  }
  setLoading(true);

  try {
    const { data: auth } = await supabase.auth.getUser();
    let fileUrl = null;

    if (form.attachment) {
      const ext = form.attachment.name.split(".").pop();
      const path = `${auth.user.id}/${Date.now()}.${ext}`;
      await supabase.storage.from("ticket-attachments").upload(path, form.attachment);
      fileUrl = supabase.storage.from("ticket-attachments").getPublicUrl(path).data.publicUrl;
    }

    // --- แก้ไขส่วนนี้ ---
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        creator_id: auth.user.id,
        reporter_name: form.employeeName,
        reporter_emp_id: form.employeeId,
        reporter_dept: form.department,
        reporter_phone: "",
        reporter_email: auth.user.email,
        title: form.issue.slice(0, 50),
        description: form.issue,
        category: form.category,
        priority: form.urgency.toLowerCase(),
        status: "NEW",
        image_url: fileUrl,
        image_source: form.cameraImage ? 'camera' : 'upload',
        device_type: deviceInfo.isMobile ? 'mobile' : deviceInfo.isTablet ? 'tablet' : 'desktop'
      })
      .select("ticket_no") // สั่งให้คืนค่า ticket_no ที่ DB สร้างให้
      .single();

    if (error) throw error;
    
    // ตั้งค่ารหัสที่ได้จาก database ไปยัง State เพื่อแสดงในหน้า Success
    setTicketRef(data.ticket_no); 
    setSuccess(true);
    // ------------------
    
    if (typeof window !== 'undefined' && window.Audio) {
      try {
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
        audio.volume = 0.3;
        audio.play();
      } catch (e) {
        console.log("Audio play failed", e);
      }
    }
  } catch (err) {
    console.error("Submit error:", err);
    alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + err.message);
  } finally {
    setLoading(false);
  }
};

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50 p-4 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 text-center max-w-md w-full border border-emerald-100 transform transition-all duration-500 scale-100 hover:scale-[1.02]">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg relative">
              <CheckCircle className="text-white" size={48} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 animate-bounce-subtle">
              ส่งเรื่องเรียบร้อย! 🎉
            </h2>
            <p className="text-slate-500 text-lg mb-6 px-4">
              ระบบได้รับเรื่องแล้ว เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุด
            </p>
            
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10 font-black text-6xl">#</div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mb-2">Ticket Reference</p>
              <p className="text-5xl md:text-6xl font-black text-white tracking-tighter">
                #{ticketRef}
              </p>
              <p className="text-indigo-100 text-sm mt-4">
                สามารถใช้รหัสนี้ในการติดตามสถานะ
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>กลับหน้าหลัก</span>
                <ArrowLeft size={20} />
              </button>
              
              <button
                onClick={() => {
                  setSuccess(false);
                  setForm({
                    employeeId: form.employeeId,
                    employeeName: form.employeeName,
                    department: form.department,
                    category: "",
                    issue: "",
                    urgency: "Normal",
                    attachment: null,
                    cameraImage: null,
                  });
                  setPreview(null);
                  setCapturedImages([]);
                }}
                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                ส่งเรื่องใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Camera view
  const renderCameraView = () => (
    <div className={`relative rounded-2xl overflow-hidden border-2 ${isCameraActive ? 'border-blue-500' : 'border-gray-200'} shadow-xl transition-all duration-300`}>
      {cameraLoading ? (
        <div className="w-full h-64 md:h-80 bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-sm">กำลังเปิดกล้อง...</p>
          </div>
        </div>
      ) : cameraError ? (
        <div className="w-full h-64 md:h-80 bg-gray-900 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-rose-600" size={24} />
            </div>
            <p className="text-white mb-4">{cameraError}</p>
            <button
              onClick={() => {
                setCameraError(null);
                toggleCamera();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      ) : (
        <>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: facingMode,
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }}
            onUserMediaError={handleCameraError}
            className="w-full h-64 md:h-80 object-cover"
            mirrored={facingMode === "user"}
          />
          
          {/* Camera overlay grid */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          
          {/* Camera controls */}
          {showCameraControls && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              <button
                onClick={switchCamera}
                className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-110 active:scale-95"
                title="สลับกล้อง"
              >
                <FlipHorizontal size={20} className="text-gray-700" />
              </button>
              
              <button
                onClick={capture}
                className="capture-btn p-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-110 active:scale-95"
                title="ถ่ายภาพ"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Camera size={24} className="text-white" />
                </div>
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all hover:scale-110 active:scale-95"
                title={isFullscreen ? "ยุบหน้าจอ" : "ขยายเต็มจอ"}
              >
                {isFullscreen ? (
                  <Minimize2 size={20} className="text-gray-700" />
                ) : (
                  <Maximize2 size={20} className="text-gray-700" />
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Preview gallery
  const renderPreviewGallery = () => {
    if (!preview && capturedImages.length === 0) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-500" />
          <p className="text-sm font-bold text-slate-700 uppercase">ภาพประกอบ</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {preview && (
            <div className="relative group">
              <img 
                src={preview} 
                alt="Current preview" 
                className="w-full h-32 object-cover rounded-xl border-2 border-blue-300 shadow-lg group-hover:scale-[1.02] transition-transform"
              />
              <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                ปัจจุบัน
              </div>
              <button
                onClick={() => {
                  setPreview(null);
                  setForm(p => ({ ...p, attachment: null, cameraImage: null }));
                }}
                className="absolute top-2 left-2 p-1.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          {capturedImages.map((img, index) => (
            <div key={index} className="relative group">
              <img 
                src={img} 
                alt={`Capture ${index + 1}`} 
                className="w-full h-32 object-cover rounded-xl border border-gray-300 opacity-75 hover:opacity-100 transition-opacity"
              />
              <button
                onClick={() => {
                  setPreview(img);
                  // Convert base64 to file
                  fetch(img)
                    .then(res => res.blob())
                    .then(blob => {
                      const file = new File([blob], `selected_${Date.now()}.jpg`, { type: 'image/jpeg' });
                      setForm(p => ({ ...p, attachment: file, cameraImage: img }));
                    });
                }}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium"
              >
                เลือกใช้ภาพนี้
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Device indicator
  const renderDeviceIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-6">
   
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between sticky top-0 z-50">
  <div className="flex items-center gap-4">
    <button 
      onClick={() => navigate("/dashboard")}
      className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <ArrowLeft size={20} className="text-gray-700" />
    </button>
    
    <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
    
    <div>
      <h1 className="text-xl font-bold text-gray-900">สร้างใบแจ้งซ่อม</h1>
      <p className="text-sm text-gray-600 mt-0.5 hidden md:block">ระบบแจ้งซ่อม • บริษัท ที.ดี.เค. อินดัสเตรียล</p>
    </div>
  </div>
  
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-500 hidden md:block">
      {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
    </span>
    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
      U
    </div>
  </div>
</div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 mt-6 md:mt-8">
        {renderDeviceIndicator()}

        {/* User Info Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg border border-slate-100 mb-8 transform transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg rotate-3 animate-float-subtle">
                <User className="text-white" size={deviceInfo.isMobile ? 24 : 32} />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                <CheckCircle size={12} className="text-white" />
              </div>
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-1">
                {form.employeeName}
              </h2>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200">
                  ID: {form.employeeId}
                </span>
                
                {form.department && form.department !== "ไม่ระบุแผนก" && (
                  <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200 flex items-center gap-1">
                    <Building size={10} />
                    {form.department}
                  </span>
                )}
              </div>
              
              {(!form.department || form.department === "ไม่ระบุแผนก") && (
                <p className="text-xs text-amber-600 mt-3 font-medium flex items-center gap-1 animate-pulse">
                  <AlertCircle size={12} />
                  กรุณาเพิ่มข้อมูลแผนกในโปรไฟล์ของคุณ
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 md:space-y-10">
          {/* Category Selector */}
          <section className="animate-slide-up">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
              <div>
                <p className="text-sm md:text-base font-black text-slate-700 uppercase tracking-wide">ประเภทอุปกรณ์</p>
                <p className="text-xs text-slate-500">เลือกประเภทอุปกรณ์ที่ต้องการแจ้งซ่อม</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {CATEGORIES.map((c) => {
                const isActive = form.category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, category: c.id, issue: "" }))}
                    className={`group relative flex flex-col items-center gap-3 p-4 md:p-5 rounded-2xl md:rounded-3xl transition-all duration-300 transform ${
                      isActive 
                        ? `bg-gradient-to-r ${c.gradient} text-white shadow-xl scale-105 -translate-y-1`
                        : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100 hover:border-blue-300 hover:scale-[1.02]"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
                      </div>
                    )}
                    
                    <div className={`p-3 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? "bg-white/20 backdrop-blur-sm" 
                        : "bg-slate-100 group-hover:bg-blue-50"
                    }`}>
                      <c.icon size={deviceInfo.isMobile ? 20 : 24} className={isActive ? "animate-pulse" : ""} />
                    </div>
                    
                    <span className={`text-xs md:text-sm font-bold ${isActive ? "opacity-100" : "opacity-60"}`}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Issue Details */}
          {form.category && (
            <section className="animate-slide-up">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <div className="w-2 h-8 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></div>
                <div>
                  <p className="text-sm md:text-base font-black text-slate-700 uppercase tracking-wide">อาการที่พบ</p>
                  <p className="text-xs text-slate-500">เลือกอาการหรือระบุรายละเอียดเพิ่มเติม</p>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
                  {ISSUES[form.category]?.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, issue: i }))}
                      className={`px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all duration-300 ${
                        form.issue === i
                          ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md scale-105"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                
                <textarea
                  required
                  rows={4}
                  value={form.issue}
                  onChange={(e) => setForm(p => ({ ...p, issue: e.target.value }))}
                  className="w-full rounded-xl md:rounded-2xl bg-slate-50 p-4 md:p-5 text-sm md:text-base border-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none resize-none"
                  placeholder="ระบุรายละเอียดเพิ่มเติม เช่น เลขเครื่อง, รุ่นอุปกรณ์, อาการโดยละเอียด..."
                />
              </div>
            </section>
          )}

          {/* Urgency & Camera */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Urgency */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-6 bg-gradient-to-b from-rose-500 to-pink-600 rounded-full"></div>
                <p className="text-sm md:text-base font-black text-slate-700 uppercase">ความเร่งด่วน</p>
              </div>
              
              <div className="space-y-3 md:space-y-4">
                {URGENCY.map((u) => {
                  const isActive = form.urgency === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, urgency: u.id }))}
                      className={`w-full flex items-center justify-between p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all duration-300 transform ${
                        isActive 
                          ? `${u.bg} ${u.border} ${u.color} scale-[1.02] shadow-lg`
                          : "bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:scale-[1.01]"
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`text-2xl ${isActive ? '' : 'opacity-50'}`}>
                          {u.icon}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-sm md:text-base">{u.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{u.description}</div>
                        </div>
                      </div>
                      
                      {isActive && (
                        <div className={`w-3 h-3 rounded-full ${u.color.replace('text', 'bg')} animate-pulse`}></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Camera & Upload */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full"></div>
                  <p className="text-sm md:text-base font-black text-slate-700 uppercase">ภาพประกอบ</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 hidden md:block">อัปโหลดหรือถ่ายภาพ</span>
                </div>
              </div>
              
              {/* Camera View */}
              {isCameraActive && renderCameraView()}
              
              {/* Upload/Camera Controls */}
              {!isCameraActive && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className="group p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <Camera className="text-white" size={24} />
                        </div>
                        <p className="text-sm font-bold text-blue-700">ถ่ายภาพ</p>
                        <p className="text-xs text-blue-500 mt-1">ใช้กล้องถ่ายภาพ</p>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="group p-5 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <ImageIcon className="text-white" size={24} />
                        </div>
                        <p className="text-sm font-bold text-emerald-700">อัปโหลด</p>
                        <p className="text-xs text-emerald-500 mt-1">เลือกรูปจากอุปกรณ์</p>
                      </div>
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFile}
                    capture={deviceInfo.isMobile ? "environment" : undefined}
                  />
                </div>
              )}
              
              {/* Preview Gallery */}
              {renderPreviewGallery()}
              
              {/* Camera Controls Footer */}
              {isCameraActive && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                  >
                    <X size={16} />
                    ปิดกล้อง
                  </button>
                  
                  <div className="text-xs text-slate-500">
                    📸 กดปุ่มกลมเพื่อถ่ายภาพ
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Submit Button */}
          <div className="pt-4 md:pt-6">
            <button
              type="submit"
              disabled={loading || !form.category || !form.issue}
              className={`w-full py-4 md:py-5 rounded-2xl md:rounded-3xl font-bold text-white shadow-xl transition-all duration-300 transform ${
                loading || !form.category || !form.issue
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] hover:shadow-2xl"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-lg">กำลังส่งข้อมูล...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Zap className="w-6 h-6" />
                  <span className="text-lg">ส่งข้อมูลแจ้งซ่อม</span>
                  <Zap className="w-6 h-6" />
                </div>
              )}
            </button>
            
            <p className="text-center text-xs text-slate-500 mt-4">
              ระบบจะบันทึกข้อมูลของคุณและแจ้งไปยังแผนกไอทีทันที
            </p>
          </div>
        </form>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float-subtle {
          0%, 100% {
            transform: translateY(0) rotate(3deg);
          }
          50% {
            transform: translateY(-5px) rotate(3deg);
          }
        }
        
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
        
        .animate-float-subtle {
          animation: float-subtle 3s ease-in-out infinite;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        
        /* Smooth scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* Selection */
        ::selection {
          background: rgba(99, 102, 241, 0.2);
          color: #1f2937;
        }
        
        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CreateTicket;