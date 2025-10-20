import React from "react";
import TicketList from "../components/Usuarios/Tickets/TicketList";
import TicketDetails from "../components/Usuarios/Tickets/TicketDetails";
import TicketFormResponse from "../components/Usuarios/Tickets/TicketFormResponse";
import TicketStats from "../components/Usuarios/Tickets/TicketStats";

const DashboardUsuarioTickets = () => {
  return (
    <div className="p-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="col-span-1 lg:col-span-2">
        <TicketList />
      </div>
      <TicketDetails />
      <TicketFormResponse />
      <TicketStats />
    </div>
  );
};

export default DashboardUsuarioTickets;
