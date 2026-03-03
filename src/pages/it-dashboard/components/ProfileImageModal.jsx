import React from "react";
import { X } from "lucide-react";

const ProfileImageModal = ({ isOpen, currentUser, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div className="relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
        >
          <X size={32} />
        </button>
        {currentUser?.avatar ? (
          <img
            src={currentUser.avatar}
            className="w-48 h-48 rounded-3xl object-cover border-4 border-white/20 shadow-2xl"
            alt={currentUser.name}
          />
        ) : (
          <div
            className="w-48 h-48 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600
            flex items-center justify-center text-white text-6xl font-black shadow-2xl border-4 border-white/20"
          >
            {currentUser?.name?.charAt(0)}
          </div>
        )}
        <div className="mt-4 text-center">
          <h3 className="text-white text-xl font-bold">{currentUser?.name}</h3>
          <p className="text-blue-400">{currentUser?.position}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageModal;
