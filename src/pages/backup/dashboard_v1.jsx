import React, { useState } from 'react';
import { Monitor, Globe, Printer, Mail, Lock, Camera, CheckCircle } from 'lucide-react';

const Dashboard = ({onLogout}) => {
  const [formData, setFormData] = useState({
    category: '',
    issue: '',
    urgency: 'Normal',
    attachment: null
  });
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const categories = [
    { id: 'computer', name: 'คอมพิวเตอร์', icon: Monitor, color: 'bg-blue-500' },
    { id: 'network', name: 'Network', icon: Globe, color: 'bg-green-500' },
    { id: 'printer', name: 'Printer', icon: Printer, color: 'bg-purple-500' },
    { id: 'email', name: 'Email', icon: Mail, color: 'bg-red-500' },
    { id: 'system', name: 'System', icon: Lock, color: 'bg-orange-500' }
  ];

  const commonIssues = {
    computer: ['เปิดเครื่องไม่ติด', 'เครื่องช้า', 'จอไม่แสดงผล', 'โปรแกรมไม่ทำงาน'],
    network: ['เชื่อมต่อ WiFi ไม่ได้', 'อินเทอร์เน็ตช้า', 'ขาดการเชื่อมต่อ'],
    printer: ['ไม่สามารถพิมพ์ได้', 'กระดาษติด', 'หมึกหมด', 'พิมพ์ไม่ชัด'],
    email: ['เข้าระบบไม่ได้', 'ส่งเมลไม่ได้', 'รับเมลไม่ได้'],
    system: ['ลืมรหัสผ่าน', 'ไม่สามารถเข้าใช้งานได้', 'ขอสิทธิ์เข้าใช้งาน']
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, attachment: file });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Generate Ticket ID
    const timestamp = Date.now();
    const newTicketId = `TKT-${timestamp.toString().slice(-8)}`;
    
    // Auto-collect data
    const submissionData = {
      ...formData,
      ticketId: newTicketId,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.XXX', // In real app, get from backend
      device: navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown'
    };

    console.log('Submission Data:', submissionData);
    
    // Show success
    setTicketId(newTicketId);
    setSubmitted(true);

    // Reset form after 5 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        category: '',
        issue: '',
        urgency: 'Normal',
        attachment: null
      });
    }, 5000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-fadeIn">
          <div className="mb-6">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto animate-bounce" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">แจ้งซ่อมสำเร็จ!</h2>
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl p-6 mb-4">
            <p className="text-sm opacity-90 mb-2">Ticket ID ของคุณ</p>
            <p className="text-3xl font-bold tracking-wider">{ticketId}</p>
          </div>
          <p className="text-gray-600 mb-2">เราจะดำเนินการแก้ไขโดยเร็วที่สุด</p>
          <p className="text-sm text-gray-500">กรุณาเก็บ Ticket ID ไว้เพื่อตติดตามสถานะ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">🛠️ แจ้งซ่อม IT Support</h1>
            <p className="opacity-90">กรอกข้อมูลเพื่อแจ้งปัญหาของคุณ</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                1. เลือกประเภทปัญหา
              </label>
              <div className="grid grid-cols-5 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id, issue: '' })}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${
                      formData.category === cat.id
                        ? `${cat.color} text-white shadow-lg scale-105`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <cat.icon className="w-8 h-8 mb-2" />
                    <span className="text-xs font-medium text-center">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Description */}
            {formData.category && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  2. อธิบายปัญหา
                </label>
                <div className="space-y-2 mb-3">
                  {commonIssues[formData.category]?.map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => setFormData({ ...formData, issue })}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        formData.issue === issue
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
                <textarea
                  value={formData.issue}
                  onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                  placeholder="หรือพิมพ์อธิบายปัญหาของคุณ..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                  required
                />
              </div>
            )}

            {/* Urgency Level */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                3. ระดับความเร่งด่วน
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Low', 'Normal', 'Urgent'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: level })}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      formData.urgency === level
                        ? level === 'Urgent'
                          ? 'bg-red-500 text-white shadow-lg'
                          : level === 'Normal'
                          ? 'bg-yellow-500 text-white shadow-lg'
                          : 'bg-green-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                4. แนบรูปภาพ / วิดีโอ (ถ้ามี)
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">
                <Camera className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">
                  {formData.attachment ? formData.attachment.name : 'คลิกเพื่ออัพโหลดไฟล์'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!formData.category || !formData.issue}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            >
              🚀 ส่งแจ้งซ่อม
            </button>
          </form>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>ระบบจะบันทึกข้อมูล: เวลา, IP Address และอุปกรณ์โดยอัตโนมัติ</p>
        </div>
      </div>
            <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          ออกจากระบบ
        </button>
    </div>
  );
};

export default Dashboard;