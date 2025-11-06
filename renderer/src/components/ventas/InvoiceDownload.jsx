import React, { useState } from "react";
import { Download, FileText, File } from "lucide-react";

const InvoiceDownload = ({ orderId, onClose }) => {
  const [loading, setLoading] = useState(false);

  const downloadFile = async (endpoint, filename) => {
    setLoading(true);
    try {
      // Obtener token del store
      const token = localStorage.getItem("userToken");

      const response = await fetch(`http://localhost:4000/api${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Archivo descargado exitosamente');
    } catch (error) {
      console.error('Error al descargar:', error);
      alert(`Error al descargar el archivo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    downloadFile(`/orders/${orderId}/download-invoice`, `factura_orden_${orderId}.pdf`);
  };

  const handleDownloadXML = () => {
    downloadFile(`/orders/${orderId}/download-invoice-xml`, `factura_orden_${orderId}.xml`);
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Download className="text-blue-500" size={22} />
        Descargar Factura
      </h2>

      <p className="text-gray-600 text-sm mb-4">
        Descargue la factura de la orden #{orderId} en formato PDF o XML.
      </p>

      <div className="space-y-3">
        <button
          onClick={handleDownloadPDF}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <FileText size={18} />
          {loading ? "Descargando..." : "Descargar PDF"}
        </button>

        <button
          onClick={handleDownloadXML}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <File size={18} />
          {loading ? "Descargando..." : "Descargar XML"}
        </button>

        <button
          onClick={onClose}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors mt-4"
        >
          Cerrar
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Nota:</strong> El archivo XML contiene la factura electrónica compatible con el SRI de Ecuador.
        </p>
      </div>
    </div>
  );
};

export default InvoiceDownload;