import { useField } from "formik";
import usePasswordToggle from "../../hooks/usePasswordToggle";
import Select, { StylesConfig, GroupBase } from "react-select";
import makeAnimated from "react-select/animated";

const animatedComponents = makeAnimated();

interface BaseProps {
  name: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const TextInput = ({
  label,
  ...props
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) => {
  const [field, meta] = useField(props);
  return (
    <div className="input-wrap">
      <input
        className="text-input block w-full border border-gray-400 h-12 rounded-md px-3"
        {...field}
        {...props}
      />
      {meta.touched && meta.error ? (
        <div className="error text-red-600 text-sm">{meta.error}</div>
      ) : null}
    </div>
  );
};

export const TextLabelInput = ({
  label,
  ...props
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) => {
  const [field, meta] = useField(props);
  return (
    <div className="input-wrap">
      {label && (
        <label
          className="text-gray-800 font-semibold text-sm mt-1 block mb-1"
          htmlFor={props.name}
        >
          {label}
        </label>
      )}
      <input
        className="text-input block w-full border border-gray-400 h-12 rounded-md px-3 outline-none"
        {...field}
        {...props}
      />
      {meta.touched && meta.error ? (
        <div className="error text-red-600 text-sm">{meta.error}</div>
      ) : null}
    </div>
  );
};

export const TextAreaInput = ({
  label,
  ...props
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const [field, meta] = useField(props);
  return (
    <div className="input-wrap">
      {label && (
        <label
          className="text-gray-800 font-semibold text-sm mt-1 block mb-1"
          htmlFor={props.name}
        >
          {label}
        </label>
      )}
      <textarea
        className="text-input block w-full border border-gray-400 h-28 pt-3 rounded-md px-3"
        {...field}
        {...props}
      ></textarea>
      {meta.touched && meta.error ? (
        <div className="error text-red-600 text-sm">{meta.error}</div>
      ) : null}
    </div>
  );
};

export const PasswordInput = ({
  label,
  ...props
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) => {
  const [field, meta] = useField(props);
  const [passwordInputType, passwordIcon] = usePasswordToggle();
  return (
    <div className="input-wrap">
      {label && (
        <label
          className="text-gray-600 font-semibold text-sm mt-1 block mb-1"
          htmlFor={props.name}
        >
          {label}
        </label>
      )}
      <div className="relative w-full flex items-center">
        <input
          className="text-input border border-gray-400 block w-full h-12 rounded-md px-3"
          {...field}
          {...props}
          type={passwordInputType}
        />
        <div className="absolute right-5 cursor-pointer">{passwordIcon}</div>
      </div>
      {meta.touched && meta.error ? (
        <div className="error text-red-600 text-sm">{meta.error}</div>
      ) : null}
    </div>
  );
};

export const MyCheckbox = ({
  children,
  ...props
}: BaseProps & { children: React.ReactNode }) => {
  const [field, meta] = useField({ ...props, type: "checkbox" });
  return (
    <div>
      <label className="checkbox-input my-2 flex items-start">
        <input
          className="block mt-1 mr-1 border"
          {...field}
          {...props}
          type="checkbox"
        />
        <div className="text-sm text-gray-700">{children}</div>
      </label>
      {meta.touched && meta.error ? (
        <div className="error text-red-600 text-sm">{meta.error}</div>
      ) : null}
    </div>
  );
};

const customSelectStyles: StylesConfig<any, any, GroupBase<any>> = {
  control: (provided) => ({
    ...provided,
    minHeight: "48px",
    height: "auto",
    border: "1px solid #9CA3AF",
    borderRadius: "6px",
    boxShadow: "none",
    "&:hover": {
      border: "1px solid #9CA3AF",
    },
    "&:focus-within": {
      border: "1px solid #3B82F6",
      boxShadow: "0 0 0 1px #3B82F6",
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: "2px 12px",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "#EFF6FF",
    borderRadius: "4px",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#1E40AF",
    fontSize: "14px",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: "#1E40AF",
    "&:hover": {
      backgroundColor: "#DBEAFE",
      color: "#1E40AF",
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#9CA3AF",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#374151",
  }),
};

export const MultiSelectInput = ({
  label,
  options,
  ...props
}: BaseProps & { options: any[] }) => {
  const [field, meta, helpers] = useField(props.name);

  const handleChange = (selectedOptions: any) => {
    helpers.setValue(selectedOptions || []);
  };

  return (
    <div className="input-wrap">
      {label && (
        <label
          className="text-gray-800 font-semibold text-sm mt-1 block mb-1"
          htmlFor={props.name}
        >
          {label}
        </label>
      )}
      <Select
        {...props}
        value={field.value}
        onChange={handleChange}
        options={options}
        isMulti
        closeMenuOnSelect={false}
        components={animatedComponents}
        styles={customSelectStyles}
        placeholder={`Select ${label?.toLowerCase() || "options"}...`}
      />
      {meta.touched && meta.error ? (
        <div className="error text-red-600 text-sm">{meta.error}</div>
      ) : null}
    </div>
  );
};

export const SingleSelectInput = ({
  label,
  options,
  onChange: onChangeProp,
  ...props
}: BaseProps & {
  options: any[];
  isLoading?: boolean;
  onChange?: (option: any) => void;
}) => {
  const [field, meta, helpers] = useField(props.name);

  const handleChange = (selectedOption: any) => {
    helpers.setValue(selectedOption ? selectedOption.value : "");
    if (onChangeProp) onChangeProp(selectedOption);
  };

  const selectedOption = options.find((o) => o.value === field.value) ?? null;

  return (
    <div className="input-wrap">
      {label && (
        <label
          className="text-gray-800 font-semibold text-sm mt-1 block mb-1"
          htmlFor={props.name}
        >
          {label}
        </label>
      )}
      <Select
        {...props}
        value={selectedOption}
        onChange={handleChange}
        options={options}
        closeMenuOnSelect={true}
        components={animatedComponents}
        styles={customSelectStyles}
        placeholder={`Select ${label?.toLowerCase() || "option"}...`}
      />
      {meta.touched && meta.error ? (
        <div className="error text-red-600 text-sm">{meta.error}</div>
      ) : null}
    </div>
  );
};
