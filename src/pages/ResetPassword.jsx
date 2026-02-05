import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function parseHash(hash) {
  if (!hash) return {};
  const withoutHash = hash.startsWith('#') ? hash.substring(1) : hash;
  return Object.fromEntries(
    withoutHash.split('&').map(pair =>
      pair.split('=').map(decodeURIComponent)
    )
  );
}

export default function ResetPassword({ onSuccess }) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const hashData = parseHash(window.location.hash);

        // 🔴 handle expired / invalid link early
        if (hashData.error_code === 'otp_expired') {
          setError('ลิงก์หมดอายุ กรุณาขอรีเซ็ตรหัสผ่านใหม่');
          setStatus('error');
          return;
        }

        if (hashData.access_token) {
          await supabase.auth.setSession({
            access_token: hashData.access_token,
            refresh_token: hashData.refresh_token,
          });
          setStatus('ready');
          return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code && supabase.auth.exchangeCodeForSession) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus('ready');
          return;
        }

        setError('ไม่พบ token สำหรับรีเซ็ตรหัสผ่าน (ลิงก์อาจหมดอายุหรือถูกแก้ไข)');
        setStatus('error');
      } catch (err) {
        console.error(err);
        setError(err?.message || 'เกิดข้อผิดพลาด');
        setStatus('error');
      }
    }
    init();
  }, []);

  const handleSubmit = async () => {
    // 🔐 validation
    if (!newPassword || !confirmPassword) {
      setError('กรุณากรอกรหัสผ่านให้ครบทั้งสองช่อง');
      return;
    }

    if (newPassword.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setStatus('done');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.message || 'ไม่สามารถตั้งรหัสผ่านใหม่ได้');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading')
    return <div className="p-8 text-center">กำลังเตรียมหน้ารีเซ็ตรหัสผ่าน...</div>;

  if (status === 'error')
    return <div className="p-8 text-center text-red-600">{error}</div>;

  if (status === 'done')
    return <div className="p-8 text-center text-green-600">
      รีเซ็ตรหัสผ่านสำเร็จ! คุณสามารถกลับไปล็อกอินได้แล้ว
    </div>;

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-2">ตั้งรหัสผ่านใหม่</h2>
      <p className="text-sm text-gray-600 mb-4">
        กรุณากรอกรหัสผ่านใหม่และยืนยันอีกครั้ง
      </p>

      {/* รหัสผ่านใหม่ */}
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full pl-3 pr-3 py-2 border rounded-lg mb-3"
        placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
      />

      {/* ยืนยันรหัสผ่าน */}
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full pl-3 pr-3 py-2 border rounded-lg mb-3"
        placeholder="ยืนยันรหัสผ่าน"
      />

      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg"
      >
        {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
      </button>
    </div>
  );
}
