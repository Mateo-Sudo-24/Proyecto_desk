import React, { useState, useEffect } from "react";
import useFetch from "../../hooks/useFetch";
import SalesProformaForm from "./SalesProformaForm";
import SalesSendProforma from "./SalesSendProforma";
import InvoiceDownload from "./InvoiceDownload";
import { FileText, Send, Download } from "lucide-react";

const SalesOrdersList = () => {
  const { fetchDataBackend } = useFetch();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proformaOrderId, setProformaOrderId] = useState(null);
  const [sendProformaOrderId, setSendProformaOrderId] = useState(null);
  const [downloadInvoiceOrderId, setDownloadInvoiceOrderId] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetchDataBackend("/employee/sales/orders", null, "GET", false);
        if (response.success) {
          setOrders(response.data.orders);
        } else {
          setError("Error al cargar las órdenes");
        }
      } catch (err) {
        setError(err.message || "Error al cargar las órdenes");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [fetchDataBackend]);

  const handleProformaSuccess = () => {
    fetchOrders(); // Recargar la lista
  };

  const handleSendProformaSuccess = () => {
    fetchOrders(); // Recargar la lista
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Órdenes de Ventas</h2>
        <div className="text-center p-4">Cargando órdenes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Órdenes de Ventas</h2>
        <div className="text-center p-4 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Órdenes de Ventas</h2>
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-100 text-left text-gray-600 text-sm">
          <tr>
            <th className="p-2 border-b">ID Orden</th>
            <th className="p-2 border-b">Cliente</th>
            <th className="p-2 border-b">Equipo</th>
            <th className="p-2 border-b">Estado</th>
            <th className="p-2 border-b">Fecha</th>
            <th className="p-2 border-b">Precio Total</th>
            <th className="p-2 border-b">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr className="text-center">
              <td colSpan="6" className="p-4 text-gray-500">
                No hay órdenes disponibles.
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.OrderId} className="hover:bg-gray-50">
                <td className="p-2 border-b">{order.OrderId}</td>
                <td className="p-2 border-b">{order.client?.DisplayName || "N/A"}</td>
                <td className="p-2 border-b">
                  {order.equipment?.equipmentType?.Name || "N/A"} - {order.equipment?.SerialNumber || ""}
                </td>
                <td className="p-2 border-b">{order.status?.Name || "N/A"}</td>
                <td className="p-2 border-b">
                  {new Date(order.IntakeDate).toLocaleDateString()}
                </td>
                <td className="p-2 border-b">${order.TotalPrice?.toFixed(2) || "0.00"}</td>
                <td className="p-2 border-b">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setProformaOrderId(order.OrderId)}
                      className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs flex items-center gap-1"
                      title="Generar Proforma"
                    >
                      <FileText size={14} />
                      Proforma
                    </button>
                    <button
                      onClick={() => setSendProformaOrderId(order.OrderId)}
                      className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs flex items-center gap-1"
                      title="Enviar Proforma"
                    >
                      <Send size={14} />
                      Enviar
                    </button>
                    {order.invoice && (
                      <button
                        onClick={() => setDownloadInvoiceOrderId(order.OrderId)}
                        className="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs flex items-center gap-1"
                        title="Descargar Factura"
                      >
                        <Download size={14} />
                        Factura
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal para generar proforma */}
      {proformaOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <SalesProformaForm
              orderId={proformaOrderId}
              onClose={() => setProformaOrderId(null)}
              onSuccess={handleProformaSuccess}
            />
          </div>
        </div>
      )}

      {/* Modal para enviar proforma */}
      {sendProformaOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <SalesSendProforma
              orderId={sendProformaOrderId}
              onClose={() => setSendProformaOrderId(null)}
              onSuccess={handleSendProformaSuccess}
            />
          </div>
        </div>
      )}

      {/* Modal para descargar factura */}
      {downloadInvoiceOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <InvoiceDownload
              orderId={downloadInvoiceOrderId}
              onClose={() => setDownloadInvoiceOrderId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrdersList;
