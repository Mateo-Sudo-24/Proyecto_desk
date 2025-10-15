import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { FiEdit2, FiEye, FiTrash2, FiSearch, FiPlus } from "react-icons/fi";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";


import { useForm } from 'react-hook-form'

const UserManagementTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  
  const mockUsers = [
    {
      id: 1,
      username: "john_doe",
      email: "john@example.com",
      role: "Admin",
      status: "Active",
      createdDate: new Date(2023, 0, 15)
    },
    {
      id: 2,
      username: "jane_smith",
      email: "jane@example.com",
      role: "User",
      status: "Inactive",
      createdDate: new Date(2023, 1, 20)
    }
  ];

  const loggedInUser = {
    username: "admin_user"
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = useMemo(() => {
    let users = [...mockUsers];
    if (sortConfig.key) {
      users.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return users;
  }, [mockUsers, sortConfig]);

  const filteredUsers = useMemo(() => {
    return sortedUsers.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [sortedUsers, searchTerm, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleCreateUser = (data) => {
    const newUser = {
      ...data,
      id: mockUsers.length + 1,
      createdDate: new Date(),
      createdBy: loggedInUser.username,
      updatedAt: null,
      deletedAt: null
    };
    mockUsers.push(newUser);
    setShowCreateModal(false);
  };

  const handleUpdateUser = (data) => {
    const userIndex = mockUsers.findIndex(u => u.id === selectedUser.id);
    if (userIndex !== -1) {
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        ...data,
        updatedAt: new Date(),
        updatedBy: loggedInUser.username
      };
    }
    setShowUpdateModal(false);
  };

  const handleDeleteUser = () => {
    const userIndex = mockUsers.findIndex((u) => u.id === selectedUser.id);
    if (userIndex !== -1) {
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        deletedAt: new Date(),
        deletedBy: loggedInUser.username,
        status: "Inactive"
      };
    }
    setShowDeleteModal(false);
  };  

  const CreateUserModal = ({ onClose }) => {
    const { register, handleSubmit, reset } = useForm({
      defaultValues: {
        username: "",
        email: "",
        role: "staff",
        status: "Active"
      }
    });

    const onSubmit = (data) => {
      handleCreateUser(data);
      reset();
    };

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}>
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold mb-4">Crear Usuario</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Username</label>
              <input {...register("username", { required: true })} type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input {...register("email", { required: true })} type="email"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium">Role</label>
              <select {...register("role")} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button type="button" onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Crear
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const UpdateUserModal = ({ onClose }) => {
    const { register, handleSubmit, reset } = useForm({
      defaultValues: selectedUser || { username: "", email: "", role: "staff" }
    });

    const onSubmit = (data) => {
      handleUpdateUser(data);
      reset();
    };

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}>
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold mb-4">Actualizar Usuario</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Username</label>
              <input {...register("username", { required: true })} type="text"
                className="mt-1 block w-full rounded-md border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input {...register("email", { required: true })} type="email"
                className="mt-1 block w-full rounded-md border-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium">Role</label>
              <select {...register("role")} className="mt-1 block w-full rounded-md border-gray-300">
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button type="button" onClick={onClose}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Actualizar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const StatusBadge = ({ status }) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
    >
      {status}
    </span>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
        >
          <FiPlus /> Crear Usuario
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              {[
                { key: "id", label: "ID" },
                { key: "username", label: "Usuario" },
                { key: "email", label: "Email" },
                { key: "role", label: "Rol" },
                { key: "status", label: "Estado" },
                { key: "createdDate", label: "Fecha creacion" },
                { key: "actions", label: " " }
              ].map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => column.key !== "actions" && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortConfig.key === column.key && (
                      sortConfig.direction === "asc" ? 
                        <IoMdArrowDropup className="text-gray-400" /> :
                        <IoMdArrowDropdown className="text-gray-400" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUsers.map((user, idx) => (
              <tr
                key={user.id}
                className={`hover:bg-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(user.createdDate, "MMM dd, yyyy")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-4">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      title="View Details"
                    >
                      <FiEye className="w-5 h-5" />
                    </button>
                    <button
                      className="text-green-600 hover:text-green-800"
                      title="Edit User"
                      onClick={() => setShowUpdateModal(true)}
                    >
                      <FiEdit2 className="w-5 h-5" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      title="Delete User"
                      onClick={() => handleDeleteClick(user)}
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center space-x-2 mb-4 sm:mb-0">
          <span className="text-sm text-gray-700">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} entries
          </span>
          <select
            className="border rounded-md p-1"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[5, 10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>

        <div className="flex space-x-2">
          <button
            className="px-3 py-1 border rounded-md disabled:opacity-50"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`px-3 py-1 border rounded-md ${currentPage === page ? "bg-blue-500 text-white" : ""}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ))}
          <button
            className="px-3 py-1 border rounded-md disabled:opacity-50"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} />
      )}

      {showUpdateModal && (
        <UpdateUserModal onClose={() => setShowUpdateModal(false)} />
      )}

      {showDeleteModal && (
        <DeleteConfirmationModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
};

export default UserManagementTable;