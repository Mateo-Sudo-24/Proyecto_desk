import React, { useState } from "react";
import useFetch from "../../hooks/useFetch";
import { Send, Mail } from "lucide-react";

const SalesSendProforma = ({ orderId, onClose, onSuccess }) => {
  const { fetchDataBackend } = useFetch();
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!window.confirm("¿Está seguro de enviar la proforma al cliente?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetchDataBackend("/employee/sales/send-proforma", {
        orderId: parseInt(orderId)
      }, "POST");

      if (response.success) {
        alert("Proforma enviada exitosamente al cliente");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al enviar la proforma");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Send className="text-green-500" size={22} />
        Enviar Proforma
      </h2>

      <p className="text-gray-600 text-sm mb-4">
        Se enviará la proforma de la orden #{orderId} por correo electrónico al cliente.
        Una vez enviada, el estado de la orden cambiará a "Proforma Enviada".
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-blue-700">
          <Mail size={16} />
          <span className="text-sm font-medium">Acción irreversible</span>
        </div>
        <p className="text-blue-600 text-sm mt-1">
          Al confirmar, se enviará la proforma por email y se actualizará el estado de la orden.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSend}
          disabled={loading}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send size={16} />
          {loading ? "Enviando..." : "Enviar Proforma"}
        </button>
      </div>
    </div>
  );
};

export default SalesSendProforma;
