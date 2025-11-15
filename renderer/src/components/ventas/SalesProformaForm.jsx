import React, { useState } from "react";
import useFetch from "../../hooks/useFetch";
import { FileText, Plus, Trash, Calculator } from "lucide-react";

const SalesProformaForm = ({ orderId, onClose, onSuccess }) => {
  const { fetchDataBackend } = useFetch();
  const [parts, setParts] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!parts.trim() || !totalPrice) {
      alert("Por favor complete todos los campos");
      return;
    }

    const price = parseFloat(totalPrice);
    if (isNaN(price) || price <= 0) {
      alert("El precio total debe ser un número positivo");
      return;
    }

    setLoading(true);
    try {
      const response = await fetchDataBackend("/employee/sales/parts-price", {
        orderId: parseInt(orderId),
        parts: parts.trim(),
        totalPrice: price
      }, "POST");

      if (response.success) {
        alert("Proforma generada exitosamente");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al generar la proforma");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileText className="text-blue-500" size={22} />
        Generar Proforma
      </h2>

      <p className="text-gray-600 text-sm mb-4">
        Complete los detalles de partes y precio para generar la proforma de la orden #{orderId}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Partes y Repuestos *
          </label>
          <textarea
            value={parts}
            onChange={(e) => setParts(e.target.value)}
            placeholder="Describa las partes, repuestos y trabajos realizados..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio Total *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Calculator size={16} />
            {loading ? "Generando..." : "Generar Proforma"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SalesProformaForm;
