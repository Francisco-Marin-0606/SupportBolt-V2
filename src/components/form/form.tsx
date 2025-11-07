import { useState } from 'react';

type FormSection = {
  id: string;
  title: string;
  fields: FormField[];
};

type FormField = {
  id: string;
  label: string;
  type: string;
};

type FormDataState = Record<string, string>;

type FormDynamicProps = {
  sections: FormSection[];
  initialValues?: Partial<FormDataState>;
  onSubmit: (values: FormDataState) => void;
  buttonText?: string;
};

const FormDynamic = ({
  sections,
  initialValues,
  onSubmit,
  buttonText
}: FormDynamicProps) => {
  const [formData, setFormData] = useState<FormDataState>(initialValues as FormDataState || {});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="container mx-auto p-4">
      <form onSubmit={handleSubmit}>
        {sections.map((section, index) => (
          <div key={index} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-text-primary">{section.title}</h2>
            {section.fields.map((field, i) => (
              <div key={i} className="mb-4">
                <label htmlFor={`${field.id}`} className="block text-sm font-medium text-text-secondary">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  id={field.id}
                  name={field.id}
                  value={formData[`${field.id}`] || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
focus:border-blue-500 focus:ring-blue-500 text-text-secondary"
                />
              </div>
            ))}
          </div>
        ))}
        <button
          type="submit"
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {buttonText || 'Submit'}
        </button>
      </form>
    </div>
  );
}

export default FormDynamic;