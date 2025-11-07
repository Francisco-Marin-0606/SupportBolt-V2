// src/components/dataview/dataview.tsx
import Loading from "@/components/loading/Loading";
import React, { useMemo, useState } from "react";
import Icon from "../icon/Icon";
import EmptyState from "./EmptyState";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./TableComponents";

export interface Column<T> {
  field: keyof T;
  header: string;
  filterable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface KeyConditional {
  field: string;
  values: string[];
}

export interface Action<T> {
  icon: string;
  label: string;
  tooltip?: string;
  color?: string;
  keyConditional?: KeyConditional;
  condition?: (value: T) => boolean;
  action: (item: T) => void;
}

export interface DataViewProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  defaultSortField?: keyof T;
  defaultSortDirection?: "asc" | "desc";
  isLoading?: boolean;
  loadingText?: string;
  searchFunction?: (query: string) => Promise<T[]>;
}

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

const DataView = <T extends Record<string, unknown>>({
  data = [],
  columns = [],
  actions = [],
  defaultSortField = "" as keyof T,
  defaultSortDirection = "desc",
  isLoading = false,
  loadingText = "Cargando datos...",
  searchFunction,
}: DataViewProps<T>) => {
  // Estados para manejo de ordenamiento y búsqueda
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultSortField as string,
    direction: defaultSortDirection,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSearch = async () => {
    if (searchFunction) {
      const results = await searchFunction(searchTerm);
      // You might want to handle the results here
      // For example, you could update the data prop or handle it through a callback
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Función para manejar el ordenamiento
  const handleSort = (key: keyof T) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: key as string, direction });
  };

  // Función para verificar si una acción debe mostrarse
  const shouldShowAction = (action: Action<T>, item: T): boolean => {
    // Verificar condición personalizada si existe
    if (action.condition && !action.condition(item)) {
      return false;
    }

    // Verificar keyConditional si existe
    if (action.keyConditional) {
      const { field, values } = action.keyConditional;
      const itemValue = item[field as keyof T];
      if (!itemValue || !values.includes(String(itemValue))) {
        return false;
      }
    }

    return true;
  };

  // Función para renderizar el contenido de una celda
  const renderCell = (column: Column<T>, item: T): React.ReactNode => {
    if (column.render) {
      return column.render(item[column.field], item);
    }
    return item[column.field] as React.ReactNode;
  };

  // Procesamiento de datos con búsqueda, filtros y ordenamiento
  const processedData = useMemo(() => {
    let filteredData = [...data];

    // Aplicar filtros por columna
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        filteredData = filteredData.filter((item) => {
          const itemValue = item[field as keyof T];
          return (
            itemValue &&
            String(itemValue).toLowerCase().includes(value.toLowerCase())
          );
        });
      }
    });

    // Aplicar ordenamiento
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T];
        const bValue = b[sortConfig.key as keyof T];

        if (aValue === bValue) return 0;

        const comparison = aValue > bValue ? 1 : -1;
        return sortConfig.direction === "desc" ? -comparison : comparison;
      });
    }

    return filteredData;
  }, [data, searchTerm, filters, sortConfig, columns]);

  return (
    <div className="space-y-4">
      {/* Contenedor principal con sombra y bordes redondeados */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        {/* Barra superior con búsqueda */}
        {/* Contenedor de la tabla con scroll horizontal */}
        <div className="relative overflow-x-auto">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
              <Loading text={loadingText} />
            </div>
          )}
          <div className="inline-block min-w-full align-middle">
            <Table className="min-w-full divide-y divide-gray-300">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  {columns.map((column) => (
                    <TableHead
                      key={column.field as string}
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer hover:bg-gray-100"
                      onClick={() => !isLoading && handleSort(column.field)}
                    >
                      <div className="group inline-flex items-center gap-x-3">
                        <span>{column.header}</span>
                        {sortConfig.key === column.field ? (
                          <Icon
                            name={
                              sortConfig.direction === "asc"
                                ? "ArrowUp"
                                : "ArrowDown"
                            }
                            className="text-gray-400"
                          />
                        ) : (
                          <Icon
                            name="ArrowUp"
                            className="invisible group-hover:visible text-gray-400"
                          />
                        )}
                      </div>
                    </TableHead>
                  ))}
                  {actions.length > 0 && (
                    <TableHead className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Acciones
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200 bg-white">
                {processedData.map((item, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <TableCell
                        key={column.field as string}
                        className="py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6"
                      >
                        {renderCell(column, item)}
                      </TableCell>
                    ))}
                    {actions.length > 0 && (
                      <TableCell className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2">
                          {actions
                            .filter((action) => shouldShowAction(action, item))
                            .map((action, actionIndex) => (
                              <button
                                key={actionIndex}
                                onClick={() => action.action(item)}
                                className="text-blue-600 hover:text-blue-900"
                                title={action.tooltip || action.label}
                              >
                                <Icon name={action.icon} className="mr-1" />
                                <span className="sr-only">{action.label}</span>
                              </button>
                            ))}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {processedData.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                      className="py-16 text-center"
                    >
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataView;
