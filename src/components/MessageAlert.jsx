import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function MessageAlert({ message }) {
  if (!message?.text) return null;
  const isSuccess = message.type === 'success';
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${isSuccess ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
      {isSuccess ? <CheckCircle size={18} className="inline mr-2" /> : <AlertCircle size={18} className="inline mr-2" />}
      <span>{message.text}</span>
    </div>
  );
}