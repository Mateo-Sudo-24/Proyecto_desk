import React from "react";
import { FiX } from "react-icons/fi";

const ViewImageModal = ({ onClose, imageUrl }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="relative max-w-3xl max-h-[80vh]">
      <img
        src={imageUrl}
        alt="Equipo"
        className="rounded-lg shadow-lg max-h-[80vh] object-contain"
      />
      <button
        onClick={onClose}
        className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full"
      >
        <FiX />
      </button>
    </div>
  </div>
);

export default ViewImageModal;
