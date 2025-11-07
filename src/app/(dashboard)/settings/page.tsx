// src/app/(dashboard)/dashboard/page.js
'use client'
import { textStyles } from '@/app/styles/themes';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className={textStyles.h1}>Configuraciones</h1>
        <p className={`${textStyles.body} text-text-secondary mt-2`}>
          Ordena tus configuraciones
        </p>
      </div>
    </div>
  );
}