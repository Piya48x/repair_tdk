import React from "react";
import { X as XIcon } from "lucide-react";

const CalendarView = ({
    tickets,
    theme,
    setShowCalendar,
    setSelectedDate,
}) => {
    const today = new Date();
    const daysInMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
    ).getDate();
    const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
    ).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const ticketsOnDate = (day) => {
        return tickets.filter((t) => {
            const ticketDate = new Date(t.created_at);
            return (
                ticketDate.getDate() === day &&
                ticketDate.getMonth() === today.getMonth() &&
                ticketDate.getFullYear() === today.getFullYear()
            );
        }).length;
    };

    return (
        <div
            className={`${theme === "dark"
                    ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700"
                    : "bg-white border-slate-200"
                } rounded-2xl shadow-xl border p-5`}
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3
                        className={`font-bold ${theme === "dark" ? "text-white" : "text-slate-900"
                            } text-xl`}
                    >
                        {today.toLocaleDateString("th-TH", {
                            month: "long",
                            year: "numeric",
                        })}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">ปฏิทินงานซ่อม</p>
                </div>
                <button
                    onClick={() => setShowCalendar(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                    <XIcon size={22} className="text-slate-400" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
                {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
                    <div
                        key={day}
                        className="text-center py-2 text-sm font-bold text-slate-500"
                    >
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => (
                    <div
                        key={index}
                        className={`min-h-12 p-2 ${day ? "cursor-pointer group" : ""}`}
                        onClick={() =>
                            day &&
                            setSelectedDate(
                                new Date(today.getFullYear(), today.getMonth(), day),
                            )
                        }
                    >
                        {day && (
                            <>
                                <div
                                    className={`relative text-center text-sm font-medium rounded-xl transition-all duration-300 ${day === today.getDate()
                                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105"
                                            : theme === "dark"
                                                ? "text-slate-300 group-hover:bg-slate-800"
                                                : "text-slate-700 group-hover:bg-slate-100"
                                        }`}
                                >
                                    <div className="py-2">{day}</div>
                                    {ticketsOnDate(day) > 0 && (
                                        <div className="absolute -top-1 -right-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                            {ticketsOnDate(day) > 1 && (
                                                <div
                                                    className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                                                    style={{ animationDelay: "0.2s" }}
                                                ></div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarView;

