import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { canAccessRoute } from "../../../lib/roleAccess";
import AccessRequest from "../../AccessRequest";
import CreateTicket from "../../CreateTicket";
import MeetingRoomBooking from "../../MeetingRoomBooking";
import MyStatus from "../../MyStatus";
import NotebookCenter from "../../NotebookCenter";
import PickUpEquipment from "../../PickUpEquipment";
import TicketHistory from "../../TicketHistory";
import WorkNotes from "../../WorkNotes";

const PORTAL_PAGES = [
  {
    id: "create-ticket",
    path: "/dashboard/create-ticket",
    component: CreateTicket,
    roles: ["user", "it_support", "it_manager", "executive", "admin"],
  },
  {
    id: "pick-up-equipment",
    path: "/dashboard/pick-up-equipment",
    component: PickUpEquipment,
    roles: ["user", "it_support", "executive", "admin"],
  },
  {
    id: "notebook-center",
    path: "/dashboard/notebook-center",
    component: NotebookCenter,
    roles: ["user", "it_support", "executive", "admin", "auditor"],
  },
  {
    id: "work-notes",
    path: "/dashboard/work-notes",
    component: WorkNotes,
    roles: ["user", "it_support", "executive", "admin", "auditor"],
  },
  {
    id: "meeting-room-booking",
    path: "/dashboard/meeting-room-booking",
    component: MeetingRoomBooking,
    roles: ["user", "it_support", "executive", "admin"],
  },
  {
    id: "ticket-history",
    path: "/dashboard/ticket-history",
    component: TicketHistory,
    roles: ["user", "it_support", "executive", "admin", "auditor"],
  },
  {
    id: "my-status",
    path: "/dashboard/my-status",
    component: MyStatus,
    roles: ["user", "it_support", "it_manager", "executive", "admin", "auditor"],
  },
  {
    id: "access-request",
    path: "/dashboard/access-request",
    component: AccessRequest,
    roles: ["user", "it_support", "executive", "admin", "auditor"],
  },
];

export default function EmployeePortalPageHost({
  currentPath,
  currentRole,
  onOpenChat,
}) {
  const navigate = useNavigate();
  const activePage = useMemo(
    () => PORTAL_PAGES.find((page) => page.path === currentPath) || null,
    [currentPath],
  );
  const activePageAllowed = Boolean(activePage && canAccessRoute(currentRole, activePage.roles));
  const [visitedPageIds, setVisitedPageIds] = useState(() => (
    activePageAllowed ? [activePage.id] : []
  ));

  useEffect(() => {
    if (!activePage) return;

    if (!activePageAllowed) {
      navigate("/dashboard", { replace: true });
      return;
    }

    setVisitedPageIds((previous) => (
      previous.includes(activePage.id) ? previous : [...previous, activePage.id]
    ));
  }, [activePage, activePageAllowed, navigate]);

  const mountedPageIds = activePageAllowed && activePage && !visitedPageIds.includes(activePage.id)
    ? [...visitedPageIds, activePage.id]
    : visitedPageIds;

  return PORTAL_PAGES
    .filter((page) => mountedPageIds.includes(page.id))
    .map((page) => {
      const PageComponent = page.component;
      const isActive = activePageAllowed && activePage?.id === page.id;

      return (
        <section
          key={page.id}
          hidden={!isActive}
          data-portal-page={page.id}
          className="min-w-0"
        >
          <PageComponent embedded onOpenChat={onOpenChat} />
        </section>
      );
    });
}
