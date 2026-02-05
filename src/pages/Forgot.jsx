import React from 'react';

export default function Forgot({ email, setEmail, onForgot, loading, handleKeyPress }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-gray-700 text-sm">กรอกอีเมลที่คุณใช้ลงทะเบียน เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
        <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} onKeyPress={(e)=>handleKeyPress(e, onForgot)} className="w-full pl-3 pr-3 py-2 border rounded-lg" placeholder="you@example.com"/>
      </div>

      <button onClick={onForgot} disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl">
        {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
      </button>
    </div>
  );
}