import React from 'react';
import { User, Building, Mail, Phone, Briefcase } from 'lucide-react';

const UserProfileCard = ({ user, loading }) => {
    if (loading) {
        return (
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 shadow-sm animate-pulse">
                <div className="w-24 h-4 bg-slate-200 rounded"></div>
                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 shadow-sm hover:shadow-md transition-all group cursor-default">
            <div className="text-right hidden xl:block">
                <div className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                    {user?.name || 'Guest User'}
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                    <Building className="w-3 h-3" />
                    {user?.department || 'Visitor'}
                </div>
            </div>
            <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-white overflow-hidden">
                        {user?.avatar ? (
                            <img
                                src={user.avatar}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                                <User className="w-6 h-6 text-blue-600" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
        </div>
    );
};

export const UserQuickInfo = ({ user }) => {
    if (!user) return null;

    return (
        <div className="mt-6 flex flex-wrap gap-3 animate-in slide-in-from-bottom-2 fade-in duration-700">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm hover:bg-white transition-colors">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">{user.position || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm hover:bg-white transition-colors">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">{user.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm hover:bg-white transition-colors">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{user.phone || 'ไม่ระบุ'}</span>
            </div>
        </div>
    );
};

export default UserProfileCard;
