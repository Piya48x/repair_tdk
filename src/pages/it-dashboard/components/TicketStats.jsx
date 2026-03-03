import React from 'react';

const StatCard = ({ title, value, icon }) => (
    <div className="flex items-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow">
        <div className="mr-4 text-2xl">{icon}</div>
        <div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{title}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const TicketStats = ({ stats, theme }) => {
    const icons = {
        todayCompleted: '✅',
        weeklyAvg: '📊',
        responseTime: '⏱️',
        satisfaction: '😊',
        urgentCount: '⚠️',
        inProgressCount: '🔧',
    };
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <StatCard title="งานที่เสร็จวันนี้" value={stats.todayCompleted} icon={icons.todayCompleted} />
            <StatCard title="ค่าเฉลี่ยสัปดาห์" value={stats.weeklyAvg} icon={icons.weeklyAvg} />
            <StatCard title="เวลาเฉลี่ย (นาที)" value={stats.responseTime} icon={icons.responseTime} />
            <StatCard title="ความพึงพอใจ" value={`${stats.satisfaction}%`} icon={icons.satisfaction} />
            <StatCard title="งานเร่งด่วน" value={stats.urgentCount} icon={icons.urgentCount} />
            <StatCard title="กำลังทำ" value={stats.inProgressCount} icon={icons.inProgressCount} />
        </div>
    );
};

export default TicketStats;

