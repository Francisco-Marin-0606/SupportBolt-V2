// src/components/dataview/dataview.tsx
import Loading from "@/components/loading/Loading";
import React, { useMemo, useState } from "react";
import Icon from "../icon/Icon";
import { Input } from "../input/Input";
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
}: DataViewProps<T>) => {
  // Estados para manejo de ordenamiento y búsqueda
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultSortField as string,
    direction: defaultSortDirection,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

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

    // Aplicar búsqueda global
    if (searchTerm) {
      filteredData = filteredData.filter((item) =>
        columns.some((column) => {
          const value = item[column.field];
          return (
            value &&
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          );
        })
      );
    }

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
    // ✅ CÓDIGO ARREGLADO
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T];
        const bValue = b[sortConfig.key as keyof T];

        // Manejar valores nulos o undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Convertir a string y hacer comparación case-insensitive
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (aStr === bStr) return 0;

        const comparison = aStr > bStr ? 1 : -1;
        return sortConfig.direction === "desc" ? -comparison : comparison;
      });
    }

    return filteredData;
  }, [data, searchTerm, filters, sortConfig, columns]);

  // Función no utilizada, se mantiene como referencia
  // const getButtonStyles = (color?: Action['color']) => {
  //   const baseStyles = "inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold ring-1 ring-inset";

  //   const colorStyles: ColorStyles = {
  //     primary: "bg-blue-50 text-blue-700 ring-blue-600/20 hover:bg-blue-100",
  //     secondary: "bg-purple-50 text-purple-700 ring-purple-600/20 hover:bg-purple-100",
  //     destructive: "bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100",
  //     default: "bg-gray-50 text-gray-700 ring-gray-600/20 hover:bg-gray-100"
  //   };

  //   return `${baseStyles} ${colorStyles[color || 'default']}`;
  // };

  return (
    <div className="space-y-4">
      {/* Contenedor principal con sombra y bordes redondeados */}
      <div className="bg-white shadow-md ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-100">
        {/* Barra superior con búsqueda */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center max-w-md">
            <label htmlFor="search" className="sr-only">
              Buscar
            </label>
            <div className="relative w-full text-gray-400 focus-within:text-gray-600">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon name="Search" size={16} className="text-blue-500" />
              </div>
            </div>
          </div>
        </div>

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
                      className="py-4 pl-4 pr-3 text-left text-sm font-semibold text-gray-800 sm:pl-6 cursor-pointer hover:bg-gray-100 border-b-2 border-gray-200"
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
                            className="text-blue-500"
                          />
                        ) : (
                          <Icon
                            name="ArrowUp"
                            className="invisible group-hover:visible text-gray-400"
                          />
                        )}
                      </div>
                      {column.filterable && (
                        <div className="mt-2">
                          <Input
                            placeholder={`Filtrar ${column.header}`}
                            value={filters[column.field as string] || ""}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                [column.field as string]: e.target.value,
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-xs rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      )}
                    </TableHead>
                  ))}
                  {actions.length > 0 && (
                    <TableHead className="py-4 pl-4 pr-3 text-left text-sm font-semibold text-gray-800 sm:pl-6 border-b-2 border-gray-200">
                      Acciones
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200 bg-white">
                {processedData.map((item, index) => (
                  <TableRow
                    key={index}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.field as string}
                        className="py-4 pl-4 pr-3 text-sm text-gray-700 sm:pl-6 border-b border-gray-100"
                      >
                        {renderCell(column, item)}
                      </TableCell>
                    ))}
                    {actions.length > 0 && (
                      <TableCell className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 border-b border-gray-100">
                        <div className="flex justify-end gap-3">
                          {actions
                            .filter((action) => shouldShowAction(action, item))
                            .map((action, actionIndex) => (
                              <button
                                key={actionIndex}
                                onClick={() => action.action(item)}
                                className={
                                  action.color === "destructive"
                                    ? "text-red-600 hover:text-red-800 transition-colors duration-150"
                                    : "text-blue-600 hover:text-blue-800 transition-colors duration-150"
                                }
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
