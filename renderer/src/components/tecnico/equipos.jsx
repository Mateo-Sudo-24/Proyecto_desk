import React, { useState, useMemo, useCallback, useRef, useEffect  } from "react";
import { FiUpload, FiCheck, FiEdit2, FiEye, FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiCalendar, FiSearch, FiPlus, FiX } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDropzone } from "react-dropzone";
// 🔹 Mock data (puedes reemplazarlo por fetch/axios)
const mockEquipments = [
  {
    EquipmentId: 1,
    Client: { ClientId: 1, Name: "Empresa A" },
    equipmentType: { EquipmentTypeId: 1, Name: "Laptop" },
    Brand: "Dell",
    Model: "Latitude 7420",
    SerialNumber: "SN123456",
    Description: "Laptop para oficina",
    CreatedAt: new Date("2024-01-15"),
    Image: "https://via.placeholder.com/300"
  },
  {
    EquipmentId: 2,
    Client: { ClientId: 2, Name: "Empresa B" },
    equipmentType: { EquipmentTypeId: 2, Name: "Impresora" },
    Brand: "HP",
    Model: "LaserJet 4200",
    SerialNumber: "SN654321",
    Description: "Impresora de alto rendimiento",
    CreatedAt: new Date("2024-02-10"),
    Image: "https://via.placeholder.com/300"
  },
];


export const EditEquipmentModal = ({ equipmentData, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    client: "",
    equipmentType: "",
    brand: "",
    model: "",
    serialNumber: "",
    description: "",
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const formRef = useRef(null);

  // 🔑 Cargar datos iniciales cuando se abre el modal
  useEffect(() => {
    if (equipmentData) {
      setFormData({
        client: equipmentData.Client?.Name || "",
        equipmentType: equipmentData.equipmentType?.Name || "",
        brand: equipmentData.Brand || "",
        model: equipmentData.Model || "",
        serialNumber: equipmentData.SerialNumber || "",
        description: equipmentData.Description || "",
      });
      setPreview(equipmentData.Image || "");
    }
  }, [equipmentData]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "El archivo no debe superar los 5MB" }));
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    setErrors((prev) => ({ ...prev, image: "" }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".gif"] },
    multiple: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 1500)); // simulación
      setSuccess(true);
      onSubmit?.({ ...formData, Image: preview }); // ✅ incluye imagen
      setTimeout(onClose, 1200);
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: "Error al editar equipo" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Editar Equipo</h2>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* UPLOAD IMAGE */}
          <div {...getRootProps()} className={`border-2 border-dashed p-4 rounded-xl cursor-pointer ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}>
            <input {...getInputProps()} />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="max-h-52 w-full object-cover rounded-lg shadow" />
                <button
                  type="button"
                  onClick={() => { setImage(null); setPreview(""); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                >
                  <FiX />
                </button>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <FiUpload className="mx-auto h-10 w-10 text-gray-400" />
                <p className="text-sm text-gray-600">Arrastra o haz clic para subir imagen</p>
              </div>
            )}
          </div>

          {/* CAMPOS */}
          <div className="grid grid-cols-2 gap-4">
            <input name="client" placeholder="Cliente" value={formData.client} onChange={handleChange} className={`border rounded-md px-3 py-2 ${errors.client ? "border-red-500" : "border-gray-300"}`} />
            <input name="equipmentType" placeholder="Tipo de equipo" value={formData.equipmentType} onChange={handleChange} className={`border rounded-md px-3 py-2 ${errors.equipmentType ? "border-red-500" : "border-gray-300"}`} />
            <input name="brand" placeholder="Marca" value={formData.brand} onChange={handleChange} className={`border rounded-md px-3 py-2 ${errors.brand ? "border-red-500" : "border-gray-300"}`} />
            <input name="model" placeholder="Modelo" value={formData.model} onChange={handleChange} className={`border rounded-md px-3 py-2 ${errors.model ? "border-red-500" : "border-gray-300"}`} />
            <input name="serialNumber" placeholder="Número de serie" value={formData.serialNumber} onChange={handleChange} className={`border rounded-md px-3 py-2 ${errors.serialNumber ? "border-red-500" : "border-gray-300"}`} />
          </div>

          <textarea name="description" placeholder="Descripción" value={formData.description} onChange={handleChange} className="border border-gray-300 rounded-md w-full px-3 py-2" rows="3" />

          {/* BOTONES */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
              {loading ? <CgSpinner className="animate-spin h-5 w-5 mx-auto" /> : "Guardar"}
            </button>
          </div>

          {success && <div className="mt-2 p-2 bg-green-50 text-green-600 rounded-md flex items-center"><FiCheck className="mr-2" /> Editado con éxito</div>}
          {errors.submit && <div className="mt-2 p-2 bg-red-50 text-red-600 rounded-md">{errors.submit}</div>}
        </form>
      </div>
    </div>
  );
};


// 🟢 Modal para ver imagen en grande
export const ViewImageModal = ({ onClose, imageUrl }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="relative max-w-3xl max-h-[80vh]">
      <img src={imageUrl} alt="Equipo" className="rounded-lg shadow-lg max-h-[80vh] object-contain" />
      <button onClick={onClose} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black">
        <FiX />
      </button>
    </div>
  </div>
);
// 🔹 TABLA PRINCIPAL
const EquipmentTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState({});
  const [dateRange, setDateRange] = useState([null, null]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showImageModal, setShowImageModal] = useState(null);

  const [equipments, setEquipments] = useState(mockEquipments);

  const [startDate, endDate] = dateRange;
  const itemsPerPage = 5;

  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      const matchesDate =
        !startDate || !endDate || (eq.CreatedAt >= startDate && eq.CreatedAt <= endDate);
      const matchesType = selectedType === "all" || eq.equipmentType.Name === selectedType;
      const matchesSearch =
        eq.Brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.Model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.SerialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDate && matchesType && matchesSearch;
    });
  }, [equipments, startDate, endDate, selectedType, searchTerm]);

  const totalPages = Math.ceil(filteredEquipments.length / itemsPerPage);
  const currentData = filteredEquipments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleRowExpansion = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const equipmentTypes = [...new Set(equipments.map((eq) => eq.equipmentType.Name))];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      {/* FILTROS */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={setDateRange}
            className="px-3 py-2 border rounded-md"
            placeholderText="Filtrar por fecha"
          />
          <FiCalendar className="text-gray-500" />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">Todos los tipos</option>
          {equipmentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <div className="flex items-center border rounded-md px-2">
          <FiSearch className="text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Buscar por marca/modelo/serie"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="outline-none py-1"
          />
        </div>

      </div>

      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10"></th>
              {["Cliente", "Tipo", "Marca", "Modelo", "Serie", "Fecha", "Acciones"].map(
                (header, index) => (
                  <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((eq) => (
              <React.Fragment key={eq.EquipmentId}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button onClick={() => toggleRowExpansion(eq.EquipmentId)} className="text-gray-500 hover:text-gray-700">
                      {expandedRows[eq.EquipmentId] ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm">{eq.Client.Name}</td>
                  <td className="px-6 py-4 text-sm">{eq.equipmentType.Name}</td>
                  <td className="px-6 py-4 text-sm">{eq.Brand}</td>
                  <td className="px-6 py-4 text-sm">{eq.Model}</td>
                  <td className="px-6 py-4 text-sm">{eq.SerialNumber}</td>
                  <td className="px-6 py-4 text-sm">{format(eq.CreatedAt, "dd/MM/yyyy")}</td>
                  <td className="px-6 py-4 text-sm flex gap-3">
                    <button onClick={() => setShowEditModal(eq)} className="text-indigo-600 hover:text-indigo-900">
                      <FiEdit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowImageModal(eq.Image)} className="text-gray-600 hover:text-gray-900">
                      <FiEye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                {expandedRows[eq.EquipmentId] && (
                  <tr className="bg-gray-50">
                    <td colSpan="7" className="px-6 py-4">
                      <div className="text-sm text-gray-700">
                        <h4 className="font-semibold mb-2">Descripción</h4>
                        <p>{eq.Description || "Sin descripción"}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      <div className="flex items-center justify-between mt-4 px-4">
        <span className="text-sm text-gray-700">Página {currentPage} de {totalPages}</span>
        <div className="flex items-center space-x-2">
          <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50">
            <FiChevronLeft />
          </button>
          <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50">
            <FiChevronRight />
          </button>
        </div>
      </div>

      {/* MODALES */}
      {showEditModal && (
        <EditEquipmentModal
          equipmentData={showEditModal}
          onClose={() => setShowEditModal(null)}
          onSubmit={(data) => {
            setEquipments((prev) =>
              prev.map((eq) => (eq.EquipmentId === showEditModal.EquipmentId ? { ...eq, ...data } : eq))
            );
            setShowEditModal(null);
          }}
        />
      )}

      {showImageModal && (
        <ViewImageModal imageUrl={showImageModal} onClose={() => setShowImageModal(null)} />
      )}
    </div>
  );
};

export default EquipmentTable;
