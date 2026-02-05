 const renderTicketList = () => {
  if (loading && tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 w-full">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
        </div>
        <p
          className={`font-medium mt-4 animate-pulse ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
        >
          กำลังโหลดข้อมูล...
        </p>
      </div>
    );
  }

  if (filteredTickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 w-full">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <Search size={40} className="text-gray-600" />
        </div>
        <p
          className={`text-lg font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
        >
          ไม่พบรายการงาน
        </p>
        <p
          className={`text-sm mt-2 text-center ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
        >
          {searchQuery || (activeTab === "HISTORY" && dateRange.start)
            ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง"
            : "พักผ่อนรอเสียงแจ้งเตือนได้เลย"}
        </p>
        {(searchQuery || (activeTab === "HISTORY" && dateRange.start)) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setDateRange({ start: null, end: null });
            }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg"
          >
            ล้างการค้นหา
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`px-4 py-6 w-full ${isMobile ? "pb-32" : "pb-12"}`}>
      
      {/* 🛠 Toolbar: แสดงเฉพาะหน้าประวัติ (HISTORY) */}
      {activeTab === "HISTORY" && (
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-md transition-all ${viewMode === "card" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500"}`}
              title="มุมมองการ์ด"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500"}`}
              title="มุมมองตาราง"
            >
              <List size={20} />
            </button>
          </div>

          <button
            onClick={() => handleExportExcelWithImages()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg transition-all duration-300 text-sm font-medium shadow-md"
          >
            <DownloadCloud size={18} />
            Export Excel (CSV)
          </button>
        </div>
      )}

      {/* 📋 ส่วนแสดงผลข้อมูล */}
     {viewMode === "table" && activeTab === "HISTORY" ? (
  /* --- มุมมองตาราง (Table View) ปรับปรุงสีสำหรับ Dark Mode --- */
  <div className={`overflow-x-auto rounded-2xl border ${theme === "dark" ? "border-gray-700 bg-gray-900 shadow-2xl" : "border-gray-200 bg-white shadow-xl"}`}>
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className={`${theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-700"} text-xs uppercase tracking-wider`}>
          <th className="px-4 py-4 font-bold border-b border-gray-700">Ticket ID</th>
          <th className="px-4 py-4 font-bold border-b border-gray-700">หัวข้อปัญหา</th>
          <th className="px-4 py-4 font-bold border-b border-gray-700">ผู้แจ้ง / แผนก</th>
          <th className="px-4 py-4 font-bold border-b border-gray-700">สถานที่</th>
          <th className="px-4 py-4 font-bold border-b border-gray-700">หมวดหมู่</th>
          <th className="px-4 py-4 font-bold border-b border-gray-700">วันเสร็จสิ้น</th>
          <th className="px-4 py-4 font-bold border-b border-gray-700">ช่างรับงาน</th>
          <th className="px-4 py-4 font-bold border-b border-gray-700 text-center">จัดการ</th>
        </tr>
      </thead>
      <tbody className={`divide-y ${theme === "dark" ? "divide-gray-800" : "divide-gray-100"}`}>
        {filteredTickets.map((ticket) => (
          <tr key={ticket.id} className={`transition-colors ${theme === "dark" ? "hover:bg-gray-800/60" : "hover:bg-gray-50"}`}>
            {/* Ticket ID */}
            <td className="px-4 py-4 font-mono text-sm font-bold text-blue-400">
              IT-{ticket.id.toString().padStart(5, "0")}
            </td>

            {/* Title & Priority */}
            <td className="px-4 py-4">
              <p className={`text-sm font-semibold line-clamp-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {ticket.title}
              </p>
              <div className={`text-[10px] mt-1.5 px-2 py-0.5 rounded-md inline-block font-bold uppercase ${
                ticket.priority === "urgent"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : ticket.priority === "normal"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}>
                {getPriorityText(ticket.priority)}
              </div>
            </td>

            {/* Reporter Info */}
            <td className="px-4 py-4">
              <div className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {ticket.reporter_name}
              </div>
              <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                {ticket.reporter_dept}
              </div>
              <div className={`text-[10px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                ID: {ticket.reporter_emp_id}
              </div>
            </td>

            {/* Location */}
            <td className={`px-4 py-4 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-400" />
                {ticket.location || "ไม่ระบุ"}
              </div>
            </td>

            {/* Category */}
            <td className={`px-4 py-4 ${theme === "dark" ? "text-white" : "text-gray-700"}`}>
              <div className="flex items-center gap-2">
                <span className="opacity-70">{getDeviceIcon(ticket.device_type || ticket.category)}</span>
                <span className="text-sm font-medium">{ticket.category || "ไม่ระบุ"}</span>
              </div>
            </td>

            {/* Completion Date */}
            <td className="px-4 py-4 text-sm">
              <div className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {ticket.closed_at ? new Date(ticket.closed_at).toLocaleDateString("th-TH") : "-"}
              </div>
              <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                {ticket.closed_at ? new Date(ticket.closed_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : ""}
              </div>
            </td>

            {/* Technician */}
            <td className="px-4 py-4 text-sm">
              <div className={`font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-700"}`}>
                {ticket.assigned_name || "-"}
              </div>
              <div className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                {ticket.assigned_employee_id}
              </div>
            </td>

            {/* Actions */}
            <td className="px-4 py-4">
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => handleViewDetails(ticket)}
                  className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "text-blue-400 hover:bg-blue-400/10" : "text-blue-600 hover:bg-blue-50"}`}
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleOpenNavigation(ticket.location)}
                  className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "text-emerald-400 hover:bg-emerald-400/10" : "text-emerald-600 hover:bg-emerald-50"}`}
                >
                  <MapPin size={18} />
                </button>
                <button
                  onClick={() => handleDeleteTicket(ticket)}
                  className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "text-rose-400 hover:bg-rose-400/10" : "text-rose-600 hover:bg-rose-50"}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* Footer ตาราง */}
    <div className={`px-6 py-4 border-t ${theme === "dark" ? "border-gray-800 bg-gray-900/80" : "border-gray-100 bg-gray-50"}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
          แสดง <span className={theme === "dark" ? "text-white" : "text-gray-900"}>{filteredTickets.length}</span> รายการ
        </div>
        <button
          onClick={() => handleExportExcelWithImages()}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20"
        >
          <Download size={16} />
          ส่งออกรายงาน (Excel)
        </button>
      </div>
    </div>
  </div>
) : (
        /* --- มุมมองการ์ด (Card View - โค้ดเดิมของคุณ) --- */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredTickets.map((ticket, index) => (
            <div
              key={ticket.id}
              className={`flex flex-col h-full rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                theme === "dark"
                  ? "bg-gray-800 border border-gray-700"
                  : "bg-white border border-gray-200"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header - Status & Priority */}
              <div
                className={`px-4 py-3 rounded-t-2xl ${
                  ticket.status === "NEW"
                    ? "bg-gradient-to-r from-rose-500/10 to-pink-500/10"
                    : ticket.status === "IN_PROGRESS"
                      ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10"
                      : "bg-gradient-to-r from-emerald-500/10 to-green-500/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        ticket.status === "NEW"
                          ? "bg-rose-500"
                          : ticket.status === "IN_PROGRESS"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                    ></div>
                    <span
                      className={`text-xs font-bold ${
                        ticket.status === "NEW"
                          ? "text-rose-400"
                          : ticket.status === "IN_PROGRESS"
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }`}
                    >
                      {getStatusText(ticket.status)}
                    </span>
                    {ticket.priority === "urgent" && (
                      <span className="px-2 py-0.5 bg-rose-500 text-white text-xs rounded-full animate-pulse">
                        ด่วน!
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {new Date(ticket.created_at).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p
                      className={`text-[10px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {new Date(ticket.created_at).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4 flex-1 flex flex-col">
                {/* Title & Ticket ID */}
                <div>
                  <h3
                    className={`font-bold text-base mb-1 line-clamp-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    {ticket.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    {/* แสดง Ticket ID แบบ IT-XXXXX */}
                    <p
                      className={`text-xs font-mono font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
                    >
                      IT-{ticket.id.toString().padStart(5, "0")}
                    </p>
                    <div
                      className={`text-xs px-2 py-1 rounded ${
                        ticket.priority === "urgent"
                          ? "bg-rose-500/20 text-rose-400"
                          : ticket.priority === "normal"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {getPriorityText(ticket.priority)}
                    </div>
                  </div>
                </div>

                {/* Reporter Info - Clear UI */}
                <div
                  className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {ticket.reporter_name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User
                          size={12}
                          className={
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }
                        />
                        <p
                          className={`font-medium text-sm truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                        >
                          {ticket.reporter_name || "ไม่ระบุชื่อ"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${theme === "dark" ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}
                        >
                          {ticket.reporter_emp_id || "ไม่ระบุรหัส"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${theme === "dark" ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"}`}
                        >
                          {ticket.reporter_dept || "ไม่ระบุแผนก"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technician Info - Clear UI */}
                {(ticket.status === "IN_PROGRESS" ||
                  ticket.status === "CLOSED") &&
                  ticket.assigned_name && (
                    <div
                      className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700" : "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            ticket.assigned_to === currentUser?.id
                              ? "bg-gradient-to-br from-emerald-500 to-green-600"
                              : "bg-gradient-to-br from-amber-500 to-yellow-600"
                          } text-white font-bold text-sm`}
                        >
                          {ticket.assigned_name?.charAt(0) || "T"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <UserCheck
                              size={12}
                              className={
                                ticket.assigned_to === currentUser?.id
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }
                            />
                            <p
                              className={`font-medium text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                            >
                              {ticket.assigned_name}
                            </p>
                            {ticket.assigned_to === currentUser?.id && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                                คุณ
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                          >
                            รหัส: {ticket.assigned_employee_id || "ไม่ระบุ"}
                          </p>
                          {ticket.started_at && (
                            <p className="text-xs text-amber-500 mt-1">
                              รับเมื่อ:{" "}
                              {new Date(ticket.started_at).toLocaleTimeString(
                                "th-TH",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Location & Device - Enhanced UI */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/30" : "bg-gray-100"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={14} className="text-blue-400" />
                      <span
                        className={`text-xs font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                      >
                        สถานที่
                      </span>
                    </div>
                    <p
                      className={`text-sm font-medium truncate ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {ticket.location || "ไม่ระบุ"}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/30" : "bg-gray-100"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getDeviceIcon(ticket.device_type || ticket.category)}
                      <span
                        className={`text-xs font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                      >
                        อุปกรณ์
                      </span>
                    </div>
                    <p
                      className={`text-sm font-medium truncate ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {ticket.category || "ไม่ระบุ"}
                    </p>
                  </div>
                </div>

                {/* Description Preview */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText
                      size={14}
                      className={
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }
                    />
                    <span
                      className={`text-xs font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      รายละเอียดปัญหา
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-900/50 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}
                  >
                    <p
                      className={`text-sm line-clamp-3 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
                    >
                      {ticket.description || "ไม่มีรายละเอียด"}
                    </p>
                  </div>
                </div>

                {/* Timeline Progress */}
                <div className="relative pt-4">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex justify-between">
                    <div className="text-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1 relative">
                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                      </div>
                      <p className="text-[10px] text-gray-500">แจ้ง</p>
                      <p
                        className={`text-xs font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                      >
                        {new Date(ticket.created_at).toLocaleTimeString(
                          "th-TH",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        โดย {ticket.reporter_name?.split(" ")[0] || "ผู้ใช้"}
                      </p>
                    </div>
                    <div className="text-center">
                      <div
                        className={`w-3 h-3 rounded-full mx-auto mb-1 relative ${ticket.started_at ? "bg-amber-500" : "bg-gray-300"}`}
                      >
                        {ticket.started_at && (
                          <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-75"></div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500">รับงาน</p>
                      <p
                        className={`text-xs font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                      >
                        {ticket.started_at
                          ? new Date(ticket.started_at).toLocaleTimeString(
                              "th-TH",
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "รอ..."}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {ticket.assigned_name
                          ? `โดย ${ticket.assigned_name}`
                          : "รอช่าง"}
                      </p>
                    </div>
                    <div className="text-center">
                      <div
                        className={`w-3 h-3 rounded-full mx-auto mb-1 relative ${ticket.closed_at ? "bg-emerald-500" : "bg-gray-300"}`}
                      >
                        {ticket.closed_at && (
                          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500">เสร็จ</p>
                      <p
                        className={`text-xs font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                      >
                        {ticket.closed_at
                          ? new Date(ticket.closed_at).toLocaleTimeString(
                              "th-TH",
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "รอ..."}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {ticket.closed_at ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {ticket.status === "NEW" && (
                    <button
                      onClick={() => handleAcceptJob(ticket.id)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <CheckCircle size={18} />
                      <span>รับงานนี้</span>
                    </button>
                  )}
                  {ticket.status === "IN_PROGRESS" &&
                    ticket.assigned_to === currentUser?.id && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleOpenNavigation(ticket.location)}
                          className={`py-3 rounded-lg font-medium flex items-center justify-center gap-2 border ${
                            theme === "dark"
                              ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                              : "border-gray-300 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <Navigation size={16} />
                          <span className="text-sm">นำทาง</span>
                        </button>
                        <button
                          onClick={() => handleCloseJob(ticket)}
                          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                        >
                          <Camera size={16} />
                          <span className="text-sm">ปิดงาน</span>
                        </button>
                      </div>
                    )}
                  {ticket.status === "IN_PROGRESS" &&
                    ticket.assigned_to !== currentUser?.id && (
                      <div
                        className={`p-3 rounded-lg text-center border ${
                          theme === "dark"
                            ? "border-amber-700/30 bg-amber-500/10"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <UserCheck size={14} className="text-amber-500" />
                          <p
                            className={`text-sm ${theme === "dark" ? "text-amber-300" : "text-amber-600"}`}
                          >
                            {ticket.assigned_name || "ช่างคนอื่น"} รับงานนี้แล้ว
                          </p>
                        </div>
                        <p
                          className={`text-xs mt-1 ${theme === "dark" ? "text-amber-400/80" : "text-amber-600/80"}`}
                        >
                          รหัสพนักงาน:{" "}
                          {ticket.assigned_employee_id || "ไม่ระบุ"}
                        </p>
                      </div>
                    )}
                  {ticket.status === "CLOSED" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                        >
                          ระยะเวลาซ่อม:
                          <span
                            className={`ml-1 font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                          >
                            {ticket.started_at && ticket.closed_at
                              ? calculateDuration(
                                  ticket.started_at,
                                  ticket.closed_at,
                                )
                              : "ไม่ระบุ"}
                          </span>
                        </div>
                        {ticket.closed_by_name && (
                          <div
                            className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                          >
                            ช่าง:{" "}
                            <span className="font-medium">
                              {ticket.closed_by_name}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(ticket)}
                          className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1 ${
                            theme === "dark"
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          <Eye size={14} />
                          รายละเอียด
                        </button>
                        <button
                          onClick={() => handleOpenNavigation(ticket.location)}
                          className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1 ${
                            theme === "dark"
                              ? "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50"
                              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                          }`}
                        >
                          <MapPin size={14} />
                          ที่ตั้ง
                        </button>
                        <button
                          onClick={() => handleDeleteTicket(ticket)}
                          className={`p-2.5 rounded-lg font-medium text-sm flex items-center justify-center ${
                            theme === "dark"
                              ? "bg-rose-900/30 text-rose-400 hover:bg-rose-900/50"
                              : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                          }`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};