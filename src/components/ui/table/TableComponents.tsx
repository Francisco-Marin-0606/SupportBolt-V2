// src/components/ui/table-components.tsx
import React from "react";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  className?: string;
}

interface TableSectionProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  className?: string;
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
  className?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className = "", ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableSectionProps
>(({ className = "", ...props }, ref) => (
  <thead ref={ref} className={`bg-muted ${className}`} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(
  ({ className = "", ...props }, ref) => (
    <tbody
      ref={ref}
      className={`[&_tr:last-child]:border-0 ${className}`}
      {...props}
    />
  )
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className = "", ...props }, ref) => (
    <tr
      ref={ref}
      className={`border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${className}`}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableHeaderCellElement, TableHeadProps>(
  ({ className = "", ...props }, ref) => (
    <th
      ref={ref}
      className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className = "", ...props }, ref) => (
    <td
      ref={ref}
      className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
