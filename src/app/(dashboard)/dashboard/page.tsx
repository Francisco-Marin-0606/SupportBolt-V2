'use client';
// src/app/(dashboard)/dashboard/page.js
import { textStyles } from '@/app/styles/themes';

export default function DashboardPage() {  
  return (
    <div className="space-y-6">
      <div>
        <h1 className={`${textStyles.h1} mb-2`}>Dashboard</h1>
        <p className={textStyles.body}>
          Bienvenido a tu panel de control
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className={`${textStyles.h4} mb-1`}>Usuarios Activos</h3>
          <p className={`text-primary ${textStyles.display2} `}>1,234</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className={`${textStyles.h4} mb-1`}>Ingresos Mensuales</h3>
          <p className={`${textStyles.display2} text-tertiary`}>$5,678</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className={`${textStyles.h4} mb-1`}>Proyectos Activos</h3>
          <p className={`${textStyles.display2} text-primary`}>42</p>
        </div>
      </div>
    </div>
  );
}