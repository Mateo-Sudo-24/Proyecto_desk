// src/pages/ReceptionForm.jsx
import React from "react";
import { useForm } from "react-hook-form";
import useFetch from "../../hooks/useFetch";
import Swal from "sweetalert2";

const ReceptionForm = () => {
  const { fetchDataBackend } = useFetch();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      clientTypeId: "",
      displayName: "",
      organizationName: "",
      idNumber: "",
      email: "",
      phone: "",
      address: "",
      contactName: "",
      deliveryAddress: "",
      isPublicService: false,
    },
  });

  // Observamos el tipo de cliente
  const clientType = watch("clientTypeId"); // 1 = Empresa, 2 = Persona Natural

const onSubmit = async (data) => {
  try {
    const payload = {
      clientTypeId: Number(data.clientTypeId), // string a number
      displayName: data.clientTypeId === "2" ? data.displayName : undefined,
      organizationName: data.clientTypeId === "1" ? data.organizationName : undefined,
      idNumber: data.idNumber || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      address: data.address || undefined,
      contactName: data.contactName || undefined,
      isPublicService: !!data.isPublicService, // checkbox a boolean
      deliveryAddress: data.deliveryAddress || undefined,
    };

    console.log("Payload enviado:", payload); // 🔹 revisa en consola

    const res = await fetchDataBackend(
      "/employee/receptionist/client",
      payload,
      "POST"
    );

    console.log("Respuesta backend:", res);

  } catch (error) {
    console.error("Error al enviar cliente:", error);
  }
};


  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Registrar/Actualizar Cliente
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Selector Tipo de Cliente */}
          <div className="col-span-full">
            <label className="block mb-1 font-medium">Tipo de Cliente</label>
            <select
              {...register("clientTypeId", { required: "Tipo obligatorio" })}
              className="w-full p-2 border rounded"
            >
              <option value="">Selecciona tipo de cliente</option>
              <option value="1">Empresa</option>
              <option value="2">Persona Natural</option>
            </select>
            {errors.clientTypeId && (
              <span className="text-red-600">{errors.clientTypeId.message}</span>
            )}
          </div>

          {/* Campos para Empresa */}
          {clientType === "1" && (
            <>
              <input
                type="text"
                placeholder="Nombre de organización"
                {...register("organizationName", { required: "Obligatorio para empresas" })}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Nombre de contacto"
                {...register("contactName")}
                className="p-2 border rounded"
              />
              <label className="flex items-center gap-2 col-span-full">
                <input type="checkbox" {...register("isPublicService")} />
                Servicio público
              </label>
              <input
                type="text"
                placeholder="Dirección de entrega"
                {...register("deliveryAddress")}
                className="p-2 border rounded col-span-full"
              />
            </>
          )}

          {/* Campos para Persona Natural */}
          {clientType === "2" && (
            <>
              <input
                type="text"
                placeholder="Nombre completo"
                {...register("displayName", { required: "Obligatorio para persona natural" })}
                className="p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Número de identificación"
                {...register("idNumber", { required: "Cédula obligatoria" })}
                className="p-2 border rounded"
              />
            </>
          )}

          {/* Campos comunes */}
          <input
            type="email"
            placeholder="Correo electrónico"
            {...register("email", {
              pattern: {
                value: /^\S+@\S+$/i,
                message: "Correo inválido",
              },
            })}
            className="p-2 border rounded"
          />
          {errors.email && <span className="text-red-600">{errors.email.message}</span>}

          <input
            type="text"
            placeholder="Teléfono"
            {...register("phone")}
            className="p-2 border rounded"
          />

          <input
            type="text"
            placeholder="Dirección"
            {...register("address")}
            className="p-2 border rounded"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="col-span-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            {isSubmitting ? "Guardando..." : "Guardar Cliente"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReceptionForm;
