import React from "react";
import SalesOrdersList from "../components/ventas/SalesOrdersList";
import SalesProformaForm from "../components/ventas/SalesProformaForm";
import SalesSendProforma from "../components/ventas/SalesSendProforma";

const DashboardVentas = () => {
  return (
    <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-1 md:col-span-2">
        <SalesOrdersList />
      </div>
      <SalesProformaForm />
      <SalesSendProforma />
    </div>
  );
};

export default DashboardVentas;
