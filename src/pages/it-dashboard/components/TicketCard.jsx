import React from 'react';

const TicketCard = ({ ticket, theme, handleViewDetails }) => {
    return (
        <div
            className={`p-4 bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-slate-200 dark:border-slate-700`}
            onClick={() => handleViewDetails(ticket)}
        >
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{ticket.title}</h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{ticket.description}</p>
            <div className="mt-2 flex justify-between text-xs">
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>{ticket.priority}</span>
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>{ticket.status}</span>
            </div>
        </div>
    );
};

export default TicketCard;

