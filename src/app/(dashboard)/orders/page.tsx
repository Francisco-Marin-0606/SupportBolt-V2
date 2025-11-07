// src/app/(dashboard)/dashboard/page.tsx
"use client";

import { textStyles } from "@/app/styles/themes";
import { Modal } from "@/components/modal/Modal";
import DataView, { Action, Column } from "@/components/ui/table/DataView";
import EmptyState from "@/components/ui/table/EmptyState";
import { useEffect, useState } from "react";

export interface Order {
  id: string;
  customerName: string;
  status: "created" | "pending" | "completed" | "sended" | "error" | "review";
  total: number;
  createdAt: string;
  marketplace?: string;
  messages?: Array<{
    id: string;
    content: string;
    timestamp: string;
    sender: string;
  }>;
  [key: string]: unknown; // Añadir índice de firma para compatibilidad con Record<string, unknown>
}

export default function OrdersPage() {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [order, setOrder] = useState<Order | undefined>();

  // Datos de ejemplo
  const sampleOrders: Order[] = [
    {
      id: "ORD-001",
      customerName: "Juan Pérez",
      status: "completed",
      total: 150.99,
      createdAt: "2024-01-10T10:30:00Z",
      marketplace: "falabella",
      messages: [
        {
          id: "MSG-001",
          content: "¿Cuándo llegará mi pedido?",
          timestamp: "2024-01-11T14:20:00Z",
          sender: "customer",
        },
        {
          id: "MSG-002",
          content: "Su pedido será entregado mañana",
          timestamp: "2024-01-11T15:05:00Z",
          sender: "support",
        },
      ],
    },
    {
      id: "ORD-002",
      customerName: "María González",
      status: "pending",
      total: 89.5,
      createdAt: "2024-01-11T15:45:00Z",
      marketplace: "meli",
    },
    {
      id: "ORD-003",
      customerName: "Carlos Rodríguez",
      status: "created",
      total: 210.75,
      createdAt: "2024-01-12T09:15:00Z",
      marketplace: "ripley",
      messages: [
        {
          id: "MSG-003",
          content: "Necesito cambiar la dirección de entrega",
          timestamp: "2024-01-12T11:30:00Z",
          sender: "customer",
        },
      ],
    },
    {
      id: "ORD-004",
      customerName: "Ana Martínez",
      status: "sended",
      total: 45.25,
      createdAt: "2024-01-13T14:20:00Z",
      marketplace: "paris",
    },
    {
      id: "ORD-005",
      customerName: "Pedro Sánchez",
      status: "error",
      total: 120.0,
      createdAt: "2024-01-14T16:30:00Z",
      messages: [], // Este no tiene marketplace, no debería mostrar la acción de mensajes
    },
  ];

  const [orders] = useState<Order[]>(sampleOrders);
  const [loading, setLoading] = useState(true);

  // Configuración de columnas
  const columns: Column<Order>[] = [
    {
      field: "id",
      header: "ID Pedido",
      filterable: true,
    },
    {
      field: "customerName",
      header: "Cliente",
    },
    {
      field: "status",
      header: "Estado",
      filterable: true,
      render: (value, row) => {
        const statusStyles: Record<string, string> = {
          created: "bg-blue-100 text-blue-800",
          pending: "bg-yellow-100 text-yellow-800",
          completed: "bg-green-100 text-green-800",
          sended: "bg-purple-100 text-purple-800",
          error: "bg-red-100 text-red-800",
          review: "bg-gray-100 text-gray-800",
        };

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              statusStyles[row.status] || ""
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      field: "total",
      header: "Total",
      render: (value) => `$${Number(value).toFixed(2)}`,
    },
    {
      field: "createdAt",
      header: "Fecha",
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
    {
      field: "marketplace",
      header: "Marketplace",
      filterable: true,
    },
  ];

  // Configuración de acciones
  const actions: Action<Order>[] = [
    {
      icon: "Eye",
      label: "Ver",
      tooltip: "Ver detalles",
      action: handleViewOrder,
    },
    {
      icon: "PencilLine",
      label: "Editar",
      tooltip: "Editar pedido",
      action: handleEditOrder,
    },
    {
      icon: "Trash2",
      label: "Eliminar",
      tooltip: "Eliminar pedido",
      color: "destructive",
      action: handleDeleteOrder,
    },
    {
      icon: "MessageSquare",
      label: "Mensajes",
      tooltip: "Ver mensajes",
      keyConditional: {
        field: "marketplace",
        values: ["falabella", "meli", "ripley", "paris"],
      },
      action: handleShowMessages,
    },
  ];

  // Funciones de manejo
  function handleViewOrder(order: Order): void {
    setShowOrderModal(true);
    setOrder(order);

    // Implementa la lógica para ver la orden
  }

  function handleEditOrder(order: Order): void {
    console.log("Editar orden:", order);
    // Implementa la lógica para editar la orden
  }

  function handleDeleteOrder(order: Order): void {
    console.log("Eliminar orden:", order);
    // Implementa la lógica para eliminar la orden
  }

  function handleShowMessages(order: Order): void {
    console.log("Ver mensajes:", order);
  }

  // Efecto para cargar los datos
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Simulamos una llamada a API con un pequeño delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div>
      <div className="space-y-6 mb-5">
        <h1 className={textStyles.h1}>Pedidos</h1>
        <p className={`${textStyles.body} text-text-secondary mt-2`}>
          Gestiona todos los pedidos de la plataforma
        </p>
      </div>

      <DataView<Order>
        data={orders}
        columns={columns}
        actions={actions}
        isLoading={loading}
        defaultSortField="createdAt"
        defaultSortDirection="desc"
      />

      {showOrderModal && order && (
        <Modal onClose={() => setShowOrderModal(false)}>
          <div className="space-y-4">
            <h2 className={`${textStyles.h3} text-center`}>
              Detalles del Pedido
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-lg shadow-md border border-gray-100">
                <h3 className="font-semibold mb-3 text-primary">
                  Información General
                </h3>
                <div className="space-y-3">
                  <p className="flex justify-between">
                    <span className="text-gray-600">ID:</span>{" "}
                    <span className="font-medium">{order.id}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>{" "}
                    <span className="font-medium">{order.customerName}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Total:</span>{" "}
                    <span className="font-medium">
                      ${order.total.toFixed(2)}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>{" "}
                    <span className="font-medium">
                      {new Date(order?.createdAt ?? 0).toLocaleDateString()}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>{" "}
                    <span className="font-medium">{order.status}</span>
                  </p>
                  {order.marketplace && (
                    <p className="flex justify-between">
                      <span className="text-gray-600">Marketplace:</span>{" "}
                      <span className="font-medium">{order.marketplace}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg shadow-md border border-gray-100">
                <h3 className="font-semibold mb-3 text-primary">Mensajes</h3>
                {order.messages && order.messages.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {order.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg shadow-sm ${
                          message.sender === "customer"
                            ? "bg-blue-50 ml-6 border-l-4 border-blue-400"
                            : "bg-gray-50 mr-6 border-r-4 border-gray-400"
                        }`}
                      >
                        <p className="text-sm font-medium">{message.content}</p>
                        <p className="text-xs text-gray-500 text-right mt-2">
                          {new Date(message?.timestamp ?? 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No hay mensajes disponibles"
                    description="Este pedido no tiene mensajes asociados."
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors duration-200 border border-gray-200"
                onClick={() => setShowOrderModal(false)}
              >
                Cerrar
              </button>
              <button
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200 shadow-sm"
                onClick={() => {
                  console.log("Acción en el pedido:", order);
                  setShowOrderModal(false);
                }}
              >
                Procesar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* 

            <div className="space-y-4">
              <p><strong>ID:</strong> {order?.id}</p>
              <p><strong>Cliente:</strong> {order?.customerName}</p>
              <p><strong>Total:</strong> ${order?.total.toFixed(2)}</p>
              <p><strong>Fecha:</strong> {new Date(order?.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="mt-4">
                <p><strong>Mensajes:</strong></p>
                { {orders.messages?.map((message) => (
                  <div key={message.id} className="bg-gray-100 p-3 rounded">
                    <p>{message.text}</p>
                  </div>
                ))} }
              </div>
    */
