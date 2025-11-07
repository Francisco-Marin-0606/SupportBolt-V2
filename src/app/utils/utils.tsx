export const formatDateTime = (date: string | Date): string => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return dateObj.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  };

export const formatUTCDateTime = (date: string | Date): string => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const year = dateObj.getUTCFullYear();
    const hours = String(dateObj.getUTCHours()).padStart(2, '0');
    const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}:${minutes}`;
};

// Agrega meses conservando fin de mes cuando aplique (p. ej., 31 Ene -> 28/29 Feb)
export const addMonths = (date: string | Date, months: number): Date => {
    const base = typeof date === 'string' ? new Date(date) : new Date(date);
    const year = base.getFullYear();
    const month = base.getMonth();
    const day = base.getDate();

    const totalMonths = month + months;
    const targetYear = year + Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;

    const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(day, lastDayOfTargetMonth);

    return new Date(
        targetYear,
        targetMonth,
        targetDay,
        base.getHours(),
        base.getMinutes(),
        base.getSeconds(),
        base.getMilliseconds()
    );
};

// Agrega años conservando fin de mes cuando aplique (p. ej., 29 Feb bisiesto)
export const addYears = (date: string | Date, years: number): Date => {
    const base = typeof date === 'string' ? new Date(date) : new Date(date);
    const year = base.getFullYear();
    const month = base.getMonth();
    const day = base.getDate();

    const targetYear = year + years;
    const lastDayOfTargetMonth = new Date(targetYear, month + 1, 0).getDate();
    const targetDay = Math.min(day, lastDayOfTargetMonth);

    return new Date(
        targetYear,
        month,
        targetDay,
        base.getHours(),
        base.getMinutes(),
        base.getSeconds(),
        base.getMilliseconds()
    );
};

export const getNextPaymentDate = (lastMembership?: {
  membershipDate: string;
  billingDate?: string;
  type: string;
}): string => {
  if (!lastMembership) {
    return new Date().toISOString();
  }
  
  if (lastMembership.billingDate) {
    return lastMembership.billingDate;
  }
  
  const membershipDate = new Date(lastMembership.membershipDate);
  const nextPaymentDate = addMonths(membershipDate, 1);
  return nextPaymentDate.toISOString();
};