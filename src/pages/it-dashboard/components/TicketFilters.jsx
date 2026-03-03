import React from 'react';

const TicketFilters = ({
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    showDateFilter,
    setShowDateFilter,
    dateRange,
    setDateRange,
}) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-2 md:space-y-0">
            {/* Tab navigation */}
            <div className="flex space-x-2">
                {['INCOMING', 'ACTIVE', 'HISTORY'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            {/* Search */}
            <input
                type="text"
                placeholder="ค้นหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border rounded px-2 py-1 w-48"
            />
            {/* Date filter toggle */}
            <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded"
            >
                {showDateFilter ? 'ซ่อนช่วงเวลา' : 'แสดงช่วงเวลา'}
            </button>
            {/* Date range picker placeholder (actual modal handled elsewhere) */}
            {showDateFilter && (
                <div className="mt-2">
                    {/* This could open a modal; for now just show dates */}
                    <span className="mr-2">จาก:</span>
                    <input
                        type="date"
                        value={dateRange.start || ''}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="border rounded px-2 py-1"
                    />
                    <span className="mx-2">ถึง:</span>
                    <input
                        type="date"
                        value={dateRange.end || ''}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="border rounded px-2 py-1"
                    />
                </div>
            )}
        </div>
    );
};

export default TicketFilters;

