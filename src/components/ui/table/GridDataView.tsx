"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Input } from "../input/Input";
import { Skeleton } from "../skeleton";
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
  headerMobile?: string; // Header corto para móvil
  filterable?: boolean;
  render?: (value: unknown, row: T, isExpanded?: boolean) => React.ReactNode;
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

export interface GridDataViewProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  limit?: number;
  defaultSortField?: keyof T;
  defaultSortDirection?: "asc" | "desc";
  isLoading?: boolean;
  loadingText?: string;
  isCreate?: boolean;
  createText?: string;
  createAction?: () => void;
  searchFunction?: (query: string) => Promise<T[]>;
  onRowClick?: (item: T) => void;
  onNewTab?: (item: T) => void;
  showSearch?: boolean;
  onSortChange?: (field: keyof T, direction: "asc" | "desc") => void;
  initialSearchValue?: string;
  additionalFilters?: React.ReactNode; // Nueva prop para filtros adicionales
}

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

const GridDataView = <T extends Record<string, unknown>>({
  data,
  columns = [],
  actions = [],
  defaultSortField = "" as keyof T,
  defaultSortDirection = "desc",
  isLoading = false,
  searchFunction,
  onRowClick,
  onNewTab,
  showSearch = true,
  onSortChange,
  limit = 20,
  initialSearchValue = "",
  isCreate = false,
  createText = "Crear",
  createAction = () => {},
  additionalFilters, // Nueva prop
}: GridDataViewProps<T>) => {
  const safeData = data || [];
  // Estados para manejo de ordenamiento y búsqueda
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultSortField as string,
    direction: defaultSortDirection,
  });
  const [searchTerm, setSearchTerm] = useState(initialSearchValue);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Estado para columnas expandidas
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    new Set()
  );

  // Efecto para actualizar el estado interno cuando cambian las props de ordenamiento
  useEffect(() => {
    setSortConfig({
      key: defaultSortField as string,
      direction: defaultSortDirection,
    });
  }, [defaultSortField, defaultSortDirection]);

  const handleSearch = async () => {
    if (searchFunction) {
      try {
        await searchFunction(searchTerm);
      } catch (error) {
        console.error("Error en la búsqueda:", error);
      }
    }
  };

  const handleSearchInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    if (searchFunction) {
      try {
        await searchFunction(newSearchTerm);
      } catch (error) {
        console.error("Error en la búsqueda:", error);
      }
    }
  };

  // Función para manejar el ordenamiento
  const handleSort = (key: keyof T) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: key as string, direction });
    onSortChange?.(key, direction);
  };

  // Función para expandir/contraer columnas
  const toggleColumnExpansion = (columnKey: string) => {
    const newExpandedColumns = new Set(expandedColumns);
    if (newExpandedColumns.has(columnKey)) {
      newExpandedColumns.delete(columnKey);
    } else {
      newExpandedColumns.add(columnKey);
    }
    setExpandedColumns(newExpandedColumns);
  };

  // Función para obtener el ancho de la columna
  const getColumnWidth = (columnKey: string, isExpanded: boolean) => {
    if (isExpanded) {
      // Anchos específicos por columna cuando están expandidas
      if (columnKey === "_id") {
        return "w-[150px] min-w-[150px] max-w-[180px]";
      }
      if (columnKey === "email") {
        return "w-[200px] min-w-[200px] max-w-[250px]";
      }
      if (columnKey === "names") {
        return "w-[250px] min-w-[250px] max-w-[300px]";
      }
      return "w-[180px] min-w-[180px] max-w-[220px]";
    }

    // Detección automática del número de columnas para mejor responsividad
    const totalColumns = columns.length;

    if (totalColumns >= 7) {
      // Para 7+ columnas (como audios): distribución más equitativa
      if (columnKey === "email" || columnKey === "names") {
        return "w-[25%] min-w-0 sm:w-[200px] sm:min-w-[180px] sm:max-w-[250px]";
      }
      if (columnKey === "_id") {
        return "w-[10%] min-w-0 sm:w-[80px] sm:min-w-[80px] sm:max-w-[100px]";
      }
      return "w-[12%] min-w-0 sm:w-[120px] sm:min-w-[100px] sm:max-w-[150px]";
    } else {
      // Para 6 columnas o menos (como usuarios): distribución original
      if (columnKey === "names") {
        return "w-[30%] min-w-0 sm:w-[180px] sm:min-w-[180px] sm:max-w-[220px]";
      }
      if (columnKey === "_id") {
        return "w-[12%] min-w-0 sm:w-[100px] sm:min-w-[100px] sm:max-w-[120px]";
      }
      if (columnKey === "email") {
        return "w-[12%] min-w-0 sm:w-[120px] sm:min-w-[120px] sm:max-w-[140px]";
      }
      return "w-[15%] min-w-0 sm:w-[110px] sm:min-w-[110px] sm:max-w-[130px]";
    }
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
  const renderCell = (
    column: Column<T>,
    item: T,
    isExpanded?: boolean
  ): React.ReactNode => {
    if (column.render) {
      return column.render(item[column.field], item, isExpanded);
    }
    return item[column.field] as React.ReactNode;
  };

  // Procesamiento de datos con búsqueda, filtros y ordenamiento
  const processedData = useMemo(() => {
    let filteredData = [...safeData];

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

        // Manejar valores nulos o undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Convertir a string para comparación
        const aStr = String(aValue);
        const bStr = String(bValue);

        if (aStr === bStr) return 0;

        const comparison = aStr > bStr ? 1 : -1;
        return sortConfig.direction === "desc" ? -comparison : comparison;
      });
    }

    return filteredData;
  }, [data, filters, sortConfig]);

  // Función para determinar la variante del badge según el estado
  const getStatusVariant = (
    status: string
  ): "success" | "error" | "warning" | "info" | "default" => {
    const statusLower = status.toLowerCase();
    if (statusLower === "activa" || statusLower === "active") return "success";
    if (statusLower === "cancelada" || statusLower === "cancelled")
      return "error";
    if (statusLower === "pendiente" || statusLower === "pending")
      return "warning";
    return "default";
  };

  // Función para determinar la variante del badge según la fuente
  const getSourceVariant = (
    source: string
  ): "success" | "error" | "warning" | "info" | "default" => {
    const sourceLower = source.toLowerCase();
    if (sourceLower === "stripe") return "info";
    if (sourceLower === "paypal") return "info";
    return "default";
  };

  return (
    <div className="space-y-4">
      {/* Contenedor principal con sombra y bordes redondeados */}
      <div className="bg-white shadow-sm ring-black ring-opacity-5 rounded-[30px]">
        {/* Barra superior con búsqueda */}
        {showSearch && (
          <div className="py-3 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4 m-4 flex-1">
                <div className="flex items-center max-w-md">
                  <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                    <Input
                      id="search"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={handleSearchInputChange}
                      className="block w-full rounded-[60px] border-0 py-1.5 pl-10 ring-2 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-lg sm:leading-4"
                    />
                  </div>
                </div>
                
                {/* Filtros adicionales */}
                {additionalFilters && (
                  <div className="flex items-center gap-2">
                    {additionalFilters}
                  </div>
                )}
              </div>
              
              {isCreate && (
                <button
                  onClick={createAction}
                  className="ml-3 inline-flex items-center px-4 py-2 mr-7 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
                >
                  {createText}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Contenedor de la tabla con scroll horizontal */}
        <div className="relative overflow-x-auto py-4 px-4">
          <div className="inline-block min-w-full align-middle">
            <Table className="min-w-full divide-y divide-gray-100">
              <TableHeader>
                <TableRow key="header" className="bg-white">
                  {columns.map((column) => (
                    <TableHead
                      key={column.field as string}
                      className="py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort(column.field)}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`${
                            sortConfig.key === column.field
                              ? "text-gray-900 font-bold"
                              : "text-gray-400 font-normal"
                          }`}
                        >
                          {column.header}
                        </span>
                        {sortConfig.key === column.field && (
                          <span className="font-bold text-[16px] text-gray-900">
                            {sortConfig.direction === "asc" ? (
                              <ChevronUp />
                            ) : (
                              <ChevronDown />
                            )}
                          </span>
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
              <TableBody className="divide-y divide-gray-100 bg-white">
                {isLoading
                  ? // Skeleton rows solo cuando está cargando
                    Array.from({ length: limit || 20 }).map((_, index) => (
                      <TableRow
                        key={`skeleton-${index}`}
                        className="animate-pulse"
                      >
                        {columns.map((column, colIndex) => (
                          <TableCell
                            key={`skeleton-cell-${colIndex}`}
                            className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6 text-center"
                          >
                            <Skeleton className="h-4 w-[80%] mx-auto" />
                          </TableCell>
                        ))}
                        {actions.length > 0 && (
                          <TableCell className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                            <div className="flex gap-2">
                              <Skeleton className="h-8 w-8 rounded-md" />
                              <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  : processedData.length === 0
                  ? // Mensaje de "sin resultados" cuando no hay datos
                    (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                          className="py-16 text-center"
                        >
                          <EmptyState
                            title="No se encontraron resultados"
                            description="No hay datos disponibles para mostrar en este momento."
                          />
                        </TableCell>
                      </TableRow>
                    )
                  : // Datos normales cuando hay resultados
                    processedData.map((item, index) => (
                      <TableRow
                        key={`row-${index}-${item.id || index}`}
                        className={`hover:bg-gray-150 ${
                          onRowClick ? "cursor-pointer" : ""
                        }`}
                        onClick={() => onRowClick && onRowClick(item)}
                        onMouseDown={(e) => {
                          // Botón del medio (rueda) del mouse
                          if (e.button === 1 && onRowClick) {
                            e.preventDefault();
                            // Abrir en nueva pestaña
                            onNewTab && onNewTab(item);
                          }
                        }}
                      >
                        {columns.map((column) => (
                          <TableCell
                            key={column.field as string}
                            className="py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6 text-center"
                          >
                            {renderCell(column, item)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridDataView;
